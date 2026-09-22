import re
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.models.enums import ApprovalStatus, DocumentType
from app.models.maintenance import MaintenanceRecord
from app.models.work_order import WorkOrder
from app.rag.embeddings import get_embedding_provider
from app.rag.vector_store import SQLVectorStore


class RAGRetriever:
    """Coordinates semantic vector search, metadata filtering, safety prioritization, and approved maintenance record retrieval."""

    def __init__(self):
        self.embedder = get_embedding_provider()

    def retrieve(
        self,
        db: Session,
        query: str,
        machine_id: Optional[int] = None,
        work_order_id: Optional[int] = None,
        top_k: int = 5
    ) -> Dict[str, Any]:
        """Perform machine-aware hybrid retrieval with safety-first ordering and historical maintenance record matching."""
        
        # 1. Resolve machine context if work_order_id is provided
        if work_order_id and not machine_id:
            wo = db.query(WorkOrder).filter(WorkOrder.id == work_order_id).first()
            if wo:
                machine_id = wo.machine_id

        # 2. Embed the query
        query_vector = self.embedder.embed_text(query)

        # 3. Retrieve semantic document chunks (Manuals, SOPs, Safety, Approved Records)
        # SQLVectorStore automatically filters only_approved=True, only_current=True,
        # matches (machine_id == machine_id OR machine_id IS NULL), and adds +0.15 for SAFETY docs.
        scored_chunks = SQLVectorStore.search_similar(
            db=db,
            query_vector=query_vector,
            top_k=top_k * 2,  # Fetch wider candidate pool for re-ranking
            machine_id=machine_id,
            only_approved=True,
            only_current=True
        )

        # 4. Check for safety-critical intent
        safety_keywords = [
            "lockout", "tagout", "loto", "spindle", "bearing", "replace", "overhaul",
            "high voltage", "pneumatic", "hydraulic", "pressure", "leak", "fire", "danger",
            "hazard", "disassemble", "power off", "isolate", "torque", "overheat"
        ]
        is_safety_critical = any(kw in query.lower() for kw in safety_keywords)

        # Prioritize safety chunks to the very front if safety-critical intent is present
        safety_chunks = []
        regular_chunks = []
        for c in scored_chunks:
            if c.get("doc_type") == DocumentType.SAFETY.value or "safety" in (c.get("document_title") or "").lower():
                safety_chunks.append(c)
            else:
                regular_chunks.append(c)

        if is_safety_critical and safety_chunks:
            # Place safety chunks first
            ordered_chunks = safety_chunks + regular_chunks
        else:
            ordered_chunks = scored_chunks

        selected_chunks = ordered_chunks[:top_k]

        # 5. Retrieve verified historical maintenance records for this machine
        previous_repairs = []
        if machine_id:
            # Query approved maintenance records
            m_records = db.query(MaintenanceRecord).filter(
                MaintenanceRecord.machine_id == machine_id,
                MaintenanceRecord.approval_status == ApprovalStatus.APPROVED
            ).order_by(MaintenanceRecord.completion_time.desc()).limit(10).all()

            # Score each record against query keywords/semantics
            q_words = set(query.lower().replace("-", " ").replace("_", " ").split())
            for rec in m_records:
                rec_text = f"{rec.problem_summary} {rec.root_cause} {rec.repair_action} {rec.troubleshooting_steps}".lower()
                # Check keyword overlap
                match_count = sum(1 for w in q_words if len(w) > 2 and w in rec_text)
                if match_count > 0 or len(previous_repairs) < 2:
                    previous_repairs.append({
                        "record_id": rec.id,
                        "date": rec.completion_time.strftime("%Y-%m-%d") if rec.completion_time else "N/A",
                        "summary": rec.problem_summary,
                        "root_cause": rec.root_cause,
                        "repair_action": rec.repair_action,
                        "technician": rec.technician.full_name if rec.technician else "Staff Technician",
                        "supervisor_notes": rec.supervisor_notes,
                        "relevance_match": match_count
                    })

            # Sort repairs by relevance match
            previous_repairs.sort(key=lambda x: x["relevance_match"], reverse=True)
            previous_repairs = previous_repairs[:3]

        return {
            "machine_id": machine_id,
            "query": query,
            "is_safety_critical": is_safety_critical,
            "chunks": selected_chunks,
            "safety_chunks": safety_chunks,
            "previous_repairs": previous_repairs
        }
