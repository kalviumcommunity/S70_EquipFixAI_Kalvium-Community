import os
import re
from typing import List, Optional, Dict, Any
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
from app.rag.parser import DocumentParser

router = APIRouter(prefix="/documents", tags=["Documents & SOPs"])


def resolve_document_file_path(file_url: str) -> Optional[str]:
    """Resolve file path to an actual file on disk."""
    if not file_url:
        return None

    if os.path.exists(file_url):
        return file_url

    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    filename = os.path.basename(file_url)
    candidate_1 = os.path.join(base_dir, "data", "documents", filename)
    if os.path.exists(candidate_1):
        return candidate_1

    candidate_2 = os.path.join(base_dir, file_url.lstrip("/"))
    if os.path.exists(candidate_2):
        return candidate_2

    return None


def sync_default_documents(db: Session):
    """Ensure core industrial technical manuals and OSHA LOTO standards are present in database."""
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    docs_dir = os.path.join(base_dir, "data", "documents")

    defaults = [
        {
            "title": "OSHA 29 CFR 1910.147 — Control of Hazardous Energy (LOTO) Master Standard",
            "doc_type": DocumentType.SAFETY,
            "filename": "OSHA_1910_147_Plant_LOTO_Standard.txt",
            "machine_code": None,
            "version": "4.0",
            "changelog": "Mandatory Plant-Wide OSHA 1910.147 Zero-Energy Regulation"
        },
        {
            "title": "Electrical Safety SOP: 480V Substation & Motor Control Center LOTO",
            "doc_type": DocumentType.SAFETY,
            "filename": "Electrical_480V_Substation_LOTO.txt",
            "machine_code": None,
            "version": "2.1",
            "changelog": "NFPA 70E Arc Flash Boundary & 3-Point Voltmeter Verification"
        },
        {
            "title": "Fluid Power Zero-Energy Control: Hydraulic & Pneumatic LOTO SOP",
            "doc_type": DocumentType.SAFETY,
            "filename": "Hydraulic_Pneumatic_Zero_Energy_SOP.txt",
            "machine_code": "PRESS-01",
            "version": "2.0",
            "changelog": "Accumulator De-pressurization & Mechanical Die Block Standards"
        },
        {
            "title": "Plant Safety SOP: High-Speed Spindle Lockout/Tagout (LOTO)",
            "doc_type": DocumentType.SAFETY,
            "filename": "Safety_SOP_LOTO_Spindle.txt",
            "machine_code": "CNC-04",
            "version": "1.0",
            "changelog": "High-Speed Spindle Electrical & Pneumatic Isolation Protocol"
        },
        {
            "title": "CNC-04 Spindle Maintenance & Replacement Manual",
            "doc_type": DocumentType.MANUAL,
            "filename": "CNC-04_Spindle_Manual_v1.2.txt",
            "machine_code": "CNC-04",
            "version": "1.2",
            "changelog": "Direct-Drive 15,000 RPM Spindle Maintenance & E-204 Bearing Replacement"
        },
        {
            "title": "Robotic Welder Cell Daily Inspection & Calibration SOP",
            "doc_type": DocumentType.SOP,
            "filename": "Robotic_Welder_SOP.txt",
            "machine_code": "ROBOT-01",
            "version": "1.0",
            "changelog": "6-Axis TCP Calibration & Torch Nozzle Maintenance"
        },
        {
            "title": "Hydraulic Stamping Press Troubleshooting Guide",
            "doc_type": DocumentType.TROUBLESHOOTING,
            "filename": "Hydraulic_Press_Troubleshooting.txt",
            "machine_code": "PRESS-01",
            "version": "1.0",
            "changelog": "200-Ton Tonnage Loss & Proportional Relief Valve Diagnostics"
        },
    ]

    admin_user = db.query(User).filter(User.username == "manager1").first() or db.query(User).first()
    admin_id = admin_user.id if admin_user else 1

    changed = False
    for item in defaults:
        file_path = os.path.join(docs_dir, item["filename"])
        if not os.path.exists(file_path):
            continue

        existing = db.query(Document).filter(Document.title == item["title"]).first()
        if not existing:
            existing = db.query(Document).filter(Document.file_url.like(f"%{item['filename']}%")).first()

        machine_id = None
        if item["machine_code"]:
            m = db.query(Machine).filter(Machine.machine_code == item["machine_code"]).first()
            if m:
                machine_id = m.id

        if not existing:
            new_doc = Document(
                machine_id=machine_id,
                title=item["title"],
                doc_type=item["doc_type"],
                file_url=file_path,
                indexing_status="INDEXED",
                created_by_id=admin_id
            )
            db.add(new_doc)
            db.flush()

            new_ver = DocumentVersion(
                document_id=new_doc.id,
                version_number=item["version"],
                changelog=item["changelog"],
                file_url=file_path,
                created_by_id=admin_id
            )
            db.add(new_ver)
            changed = True
        else:
            if not existing.file_url or not os.path.exists(existing.file_url):
                existing.file_url = file_path
                changed = True
            if existing.indexing_status != "INDEXED":
                existing.indexing_status = "INDEXED"
                changed = True

    if changed:
        try:
            db.commit()
        except Exception:
            db.rollback()


@router.get("", response_model=List[DocumentResponse])
def list_documents(
    doc_type: Optional[DocumentType] = None,
    machine_id: Optional[int] = None,
    q: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List operational manuals, SOPs, and safety documents with search."""
    sync_default_documents(db)
    query = db.query(Document)
    if doc_type:
        query = query.filter(Document.doc_type == doc_type)
    if machine_id:
        query = query.filter(Document.machine_id == machine_id)
    if q:
        clean_q = f"%{q.strip()}%"
        query = query.filter((Document.title.ilike(clean_q)) | (Document.file_url.ilike(clean_q)))
    return query.order_by(Document.title).all()


@router.get("/{document_id}/content")
def get_document_content(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve full text, parsed pages, sections, and metadata of a real technical manual or LOTO standard."""
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document #{document_id} not found."
        )

    file_path = resolve_document_file_path(doc.file_url)
    raw_content = ""
    pages = []
    sections = []

    if file_path and os.path.exists(file_path):
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                raw_content = f.read()

            pages_raw = DocumentParser.parse_file(file_path)
            pages = [{"page_number": p.get("page_number", idx + 1), "text": p.get("text", "")} for idx, p in enumerate(pages_raw)]
        except Exception as e:
            raw_content = f"Error reading document file: {e}"

    if not raw_content:
        raw_content = f"# {doc.title}\n\nDocument file currently being loaded. Please inspect system records or contact plant maintenance administration."
        pages = [{"page_number": 1, "text": raw_content}]

    # Parse sections from raw_content
    section_pattern = re.compile(r'(?:^|\n)(#{1,3}\s+[^\n]+|SECTION\s+\d+:[^\n]+)', re.IGNORECASE)
    parts = section_pattern.split(raw_content)

    if len(parts) > 1:
        if parts[0].strip():
            sections.append({
                "title": "Overview & Scope",
                "content": parts[0].strip()
            })
        for i in range(1, len(parts), 2):
            sec_title = parts[i].strip().replace('#', '').strip()
            sec_content = parts[i+1].strip() if i + 1 < len(parts) else ""
            sections.append({
                "title": sec_title,
                "content": sec_content
            })
    else:
        sections.append({
            "title": "Full Document",
            "content": raw_content.strip()
        })

    # Extract safety highlights / LOTO steps
    loto_steps = []
    step_pattern = re.compile(r'(?:Step\s+(\d+)[:\.]?\s*([^\n]+))', re.IGNORECASE)
    for match in step_pattern.finditer(raw_content):
        loto_steps.append({
            "step_number": int(match.group(1)),
            "description": match.group(2).strip()
        })

    latest_ver = doc.versions[-1] if doc.versions else None

    return {
        "id": doc.id,
        "title": doc.title,
        "doc_type": doc.doc_type.value if hasattr(doc.doc_type, "value") else str(doc.doc_type),
        "file_url": doc.file_url,
        "version_number": latest_ver.version_number if latest_ver else "1.0",
        "changelog": latest_ver.changelog if latest_ver else "",
        "indexing_status": doc.indexing_status.value if hasattr(doc.indexing_status, "value") else str(doc.indexing_status),
        "machine": {
            "id": doc.machine.id,
            "machine_code": doc.machine.machine_code,
            "name": doc.machine.name,
            "department": doc.machine.department
        } if doc.machine else None,
        "raw_content": raw_content,
        "pages": pages,
        "sections": sections,
        "loto_steps": loto_steps,
        "created_at": doc.created_at,
        "updated_at": doc.updated_at
    }


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

