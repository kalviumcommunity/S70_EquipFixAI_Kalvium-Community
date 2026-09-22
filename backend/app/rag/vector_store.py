import json
from typing import List, Dict, Any, Optional
import numpy as np
from sqlalchemy.orm import Session
from app.models.document import DocumentChunk
from app.models.enums import DocumentApprovalStatus, DocumentType


class SQLVectorStore:
    """Relational vector store handling document chunk persistence and cosine similarity search."""

    @staticmethod
    def add_chunks(
        db: Session,
        chunks_data: List[Dict[str, Any]]
    ) -> List[DocumentChunk]:
        """Insert a batch of document chunks with their embeddings into the database."""
        created_chunks = []
        for c in chunks_data:
            chunk = DocumentChunk(
                document_id=c.get("document_id"),
                version_id=c.get("version_id"),
                chunk_index=c.get("chunk_index", 0),
                page_number=c.get("page_number", 1),
                section_title=c.get("section_title"),
                content=c["content"],
                embedding=json.dumps(c["embedding"]),
                machine_id=c.get("machine_id"),
                doc_type=c.get("doc_type", DocumentType.MANUAL),
                approval_status=c.get("approval_status", DocumentApprovalStatus.APPROVED),
                is_current=c.get("is_current", True),
                metadata_json=json.dumps(c.get("metadata", {}))
            )
            db.add(chunk)
            created_chunks.append(chunk)
        db.flush()
        return created_chunks

    @staticmethod
    def search_similar(
        db: Session,
        query_vector: List[float],
        top_k: int = 5,
        machine_id: Optional[int] = None,
        doc_type: Optional[DocumentType] = None,
        only_approved: bool = True,
        only_current: bool = True
    ) -> List[Dict[str, Any]]:
        """Compute cosine similarity across active document chunks with metadata filtering."""
        query = db.query(DocumentChunk)

        if only_approved:
            query = query.filter(DocumentChunk.approval_status == DocumentApprovalStatus.APPROVED)
        if only_current:
            query = query.filter(DocumentChunk.is_current == True)
        if doc_type:
            query = query.filter(DocumentChunk.doc_type == doc_type)

        # Machine filter: retrieve chunks specific to this machine OR plant-wide chunks (machine_id IS NULL)
        if machine_id is not None:
            query = query.filter(
                (DocumentChunk.machine_id == machine_id) | (DocumentChunk.machine_id.is_(None))
            )

        chunks = query.all()
        if not chunks:
            return []

        q_vec = np.array(query_vector, dtype=np.float32)
        q_norm = np.linalg.norm(q_vec)
        if q_norm == 0:
            return []

        scored_results = []
        for chunk in chunks:
            try:
                emb = np.array(json.loads(chunk.embedding), dtype=np.float32)
                # Compute cosine similarity
                c_norm = np.linalg.norm(emb)
                if c_norm > 0:
                    score = float(np.dot(q_vec, emb) / (q_norm * c_norm))
                else:
                    score = 0.0

                # Priority boost for SAFETY procedures
                if chunk.doc_type == DocumentType.SAFETY:
                    score += 0.15

                scored_results.append({
                    "chunk": chunk,
                    "score": round(score, 4),
                    "page_number": chunk.page_number,
                    "section_title": chunk.section_title,
                    "content": chunk.content,
                    "doc_type": chunk.doc_type.value,
                    "document_title": chunk.document.title if chunk.document else "Maintenance Log",
                    "machine_id": chunk.machine_id,
                })
            except Exception:
                continue

        # Sort descending by score
        scored_results.sort(key=lambda x: x["score"], reverse=True)
        return scored_results[:top_k]

    @staticmethod
    def delete_chunks_for_version(db: Session, version_id: int):
        """Remove existing chunks when re-indexing a version."""
        db.query(DocumentChunk).filter(DocumentChunk.version_id == version_id).delete()
        db.flush()
