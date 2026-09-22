import os
import json
import logging
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session

from app.models.document import Document, DocumentVersion, DocumentChunk
from app.models.maintenance import MaintenanceRecord
from app.models.enums import DocumentApprovalStatus, DocumentType, IndexingStatus, AuditAction
from app.models.audit import AuditLog
from app.rag.parser import DocumentParser
from app.rag.chunker import DocumentChunker
from app.rag.embeddings import get_embedding_provider
from app.rag.vector_store import SQLVectorStore

logger = logging.getLogger("equipfixai.rag.ingestion")


class IngestionService:
    """Pipelines documents and approved maintenance logs into the relational vector store."""

    def __init__(self):
        self.parser = DocumentParser()
        self.chunker = DocumentChunker(chunk_size=400, overlap=100)
        self.embedder = get_embedding_provider()

    def ingest_document_version(
        self,
        db: Session,
        version: DocumentVersion,
        user_id: Optional[int] = None
    ) -> int:
        """Parse, chunk, embed, and store all pages of a document version."""
        doc = version.document
        file_path = version.file_path

        if not os.path.exists(file_path):
            version.indexing_status = IndexingStatus.FAILED
            db.commit()
            raise FileNotFoundError(f"Source file not found at: {file_path}")

        try:
            # 1. Parse pages
            pages = self.parser.parse_file(file_path)

            # 2. Chunk text
            raw_chunks = self.chunker.chunk_pages(pages)
            if not raw_chunks:
                logger.warning(f"No textual chunks extracted from {file_path}")
                version.indexing_status = IndexingStatus.INDEXED
                db.commit()
                return 0

            # 3. Batch embed
            texts = [c["content"] for c in raw_chunks]
            embeddings = self.embedder.embed_batch(texts)

            # 4. Remove previous chunks for this version
            SQLVectorStore.delete_chunks_for_version(db, version.id)

            # 5. Prepare chunk payload
            doc_approval = (
                DocumentApprovalStatus.APPROVED
                if version.approval_status == DocumentApprovalStatus.APPROVED
                else DocumentApprovalStatus.PENDING
            )

            chunks_to_insert = []
            for idx, c in enumerate(raw_chunks):
                chunks_to_insert.append({
                    "document_id": doc.id,
                    "version_id": version.id,
                    "chunk_index": c["chunk_index"],
                    "page_number": c["page_number"],
                    "section_title": c["section_title"],
                    "content": c["content"],
                    "embedding": embeddings[idx],
                    "machine_id": doc.machine_id,
                    "doc_type": doc.doc_type,
                    "approval_status": doc_approval,
                    "is_current": version.is_current,
                    "metadata": {
                        "file_name": doc.file_name,
                        "title": doc.title,
                        "version": version.version_number
                    }
                })

            # 6. Save chunks
            SQLVectorStore.add_chunks(db, chunks_to_insert)

            # 7. Update indexing status
            version.indexing_status = IndexingStatus.INDEXED
            doc.indexing_status = IndexingStatus.INDEXED

            # 8. Record audit log
            audit = AuditLog(
                user_id=user_id,
                action=AuditAction.DOCUMENT_INGESTED,
                entity_type="document_version",
                entity_id=version.id,
                new_value=json.dumps({
                    "document_id": doc.id,
                    "title": doc.title,
                    "version": version.version_number,
                    "chunk_count": len(chunks_to_insert)
                })
            )
            db.add(audit)
            db.commit()

            return len(chunks_to_insert)

        except Exception as exc:
            logger.error(f"Failed to ingest document version {version.id}: {exc}", exc_info=True)
            version.indexing_status = IndexingStatus.FAILED
            db.commit()
            raise exc

    def ingest_approved_maintenance_record(
        self,
        db: Session,
        record: MaintenanceRecord,
        approver_id: Optional[int] = None
    ) -> Optional[DocumentChunk]:
        """Index an approved maintenance record into searchable vector memory."""
        machine_code = record.machine.machine_code if record.machine else "GENERAL"
        machine_name = record.machine.name if record.machine else "Equipment"

        content = (
            f"APPROVED HISTORICAL MAINTENANCE RECORD #{record.id}\n"
            f"Machine: {machine_code} - {machine_name}\n"
            f"Problem Summary: {record.problem_summary}\n"
            f"Root Cause Analysis: {record.root_cause}\n"
            f"Troubleshooting Steps Performed: {record.troubleshooting_steps}\n"
            f"Repair & Corrective Action Taken: {record.repair_action}\n"
            f"Downtime: {record.downtime_minutes} minutes\n"
            f"Supervisor Review Notes: {record.supervisor_notes or 'Standard verification approved.'}"
        )

        embedding = self.embedder.embed_text(content)

        # Check if already indexed
        existing = db.query(DocumentChunk).filter(
            DocumentChunk.doc_type == DocumentType.MAINTENANCE_RECORD,
            DocumentChunk.section_title == f"Maintenance Record #{record.id}"
        ).first()

        if existing:
            existing.content = content
            existing.embedding = str(embedding)
            existing.approval_status = DocumentApprovalStatus.APPROVED
            existing.is_current = True
            db.commit()
            return existing

        chunk_data = [{
            "document_id": None,
            "version_id": None,
            "chunk_index": 0,
            "page_number": 1,
            "section_title": f"Maintenance Record #{record.id}",
            "content": content,
            "embedding": embedding,
            "machine_id": record.machine_id,
            "doc_type": DocumentType.MAINTENANCE_RECORD,
            "approval_status": DocumentApprovalStatus.APPROVED,
            "is_current": True,
            "metadata": {
                "record_id": record.id,
                "work_order_id": record.work_order_id,
                "technician_id": record.technician_id,
                "approver_id": approver_id
            }
        }]

        created = SQLVectorStore.add_chunks(db, chunk_data)
        db.commit()
        return created[0] if created else None
