from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.document import Document, DocumentVersion
from app.models.machine import Machine
from app.models.user import User
from app.models.enums import DocumentType, AuditAction
from app.schemas.document import (
    DocumentCreate, DocumentResponse, DocumentVersionCreate, DocumentVersionResponse
)
from app.auth.deps import get_current_user, require_role
from app.services.audit_service import AuditService

router = APIRouter(prefix="/documents", tags=["Documents & SOPs"])


@router.get("", response_model=List[DocumentResponse])
def list_documents(
    doc_type: Optional[DocumentType] = None,
    machine_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List operational manuals, SOPs, and safety documents."""
    query = db.query(Document)
    if doc_type:
        query = query.filter(Document.doc_type == doc_type)
    if machine_id:
        query = query.filter(Document.machine_id == machine_id)
    return query.order_by(Document.title).all()


@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get single document with its version history."""
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document #{document_id} not found."
        )
    return doc


@router.post("", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
def create_document(
    doc_in: DocumentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["SUPERVISOR", "MANAGER"]))
):
    """Upload/register an equipment manual or SOP document (Supervisor/Manager)."""
    if doc_in.machine_id:
        machine = db.query(Machine).filter(Machine.id == doc_in.machine_id).first()
        if not machine:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Machine #{doc_in.machine_id} not found."
            )

    doc = Document(
        machine_id=doc_in.machine_id,
        title=doc_in.title,
        doc_type=doc_in.doc_type,
        file_url=doc_in.file_url,
        created_by_id=current_user.id
    )
    db.add(doc)
    db.flush()

    # Create initial version
    version = DocumentVersion(
        document_id=doc.id,
        version_number=doc_in.version_number,
        changelog=doc_in.changelog or "Initial document creation",
        file_url=doc_in.file_url,
        created_by_id=current_user.id
    )
    db.add(version)
    db.flush()

    AuditService.log_action(
        db=db,
        action=AuditAction.DOCUMENT_UPLOADED,
        entity_type="document",
        entity_id=doc.id,
        user_id=current_user.id,
        new_value={"title": doc.title, "type": doc.doc_type.value, "version": version.version_number}
    )

    db.commit()
    db.refresh(doc)
    return doc


@router.post("/{document_id}/versions", response_model=DocumentVersionResponse, status_code=status.HTTP_201_CREATED)
def add_document_version(
    document_id: int,
    ver_in: DocumentVersionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["SUPERVISOR", "MANAGER"]))
):
    """Upload a new version of an existing document."""
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document #{document_id} not found."
        )

    # Update current file_url on main document
    doc.file_url = ver_in.file_url

    version = DocumentVersion(
        document_id=doc.id,
        version_number=ver_in.version_number,
        changelog=ver_in.changelog,
        file_url=ver_in.file_url,
        created_by_id=current_user.id
    )
    db.add(version)
    db.flush()

    AuditService.log_action(
        db=db,
        action=AuditAction.DOCUMENT_UPLOADED,
        entity_type="document_version",
        entity_id=version.id,
        user_id=current_user.id,
        new_value={"doc_id": doc.id, "version": version.version_number}
    )

    db.commit()
    db.refresh(version)
    return version


@router.post("/{document_id}/ingest")
def ingest_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["SUPERVISOR", "MANAGER", "TECHNICIAN"]))
):
    """Trigger automated parsing, chunking, and embedding of a document into the RAG vector store."""
    from app.rag.ingestion import IngestionService
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document #{document_id} not found."
        )

    # Find the current version or latest version
    version = doc.current_version
    if not version and doc.versions:
        version = doc.versions[-1]

    if not version:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document has no uploaded versions to index."
        )

    try:
        service = IngestionService()
        chunks_count = service.ingest_document_version(db, version, user_id=current_user.id)
        return {
            "status": "SUCCESS",
            "document_id": doc.id,
            "title": doc.title,
            "version": version.version_number,
            "chunks_indexed": chunks_count,
            "message": f"Successfully indexed {chunks_count} chunks into relational vector store."
        }
    except FileNotFoundError as fnf:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(fnf))
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Ingestion failed: {exc}")

