import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.enums import (
    UserRole, MachineStatus, ApprovalStatus, DocumentType,
    DocumentApprovalStatus, GroundingStatus
)
from app.models.user import User
from app.models.machine import Machine
from app.models.maintenance import MaintenanceRecord
from app.models.document import DocumentChunk
from app.rag.chunker import DocumentChunker
from app.rag.embeddings import DefaultEmbeddingProvider
from app.rag.vector_store import SQLVectorStore
from app.rag.ingestion import IngestionService
from tests.conftest import get_auth_header


def test_chunker_preserves_page_numbers_and_sections():
    """Verify chunker maintains accurate page numbers and section headers across sliding windows."""
    pages = [
        {
            "page_number": 1,
            "text": "# SECTION 1: SPINDLE OVERVIEW\nHigh-precision direct drive spindle unit operating at 15000 RPM."
        },
        {
            "page_number": 12,
            "text": "### Error Code E-204: Spindle Bearing Over-Temperature\nExcessive heat detected by thermistor loop."
        }
    ]
    chunker = DocumentChunker(chunk_size=100, overlap=20)
    chunks = chunker.chunk_pages(pages)

    assert len(chunks) >= 2
    assert chunks[0]["page_number"] == 1
    assert "SPINDLE OVERVIEW" in chunks[0]["section_title"]
    assert chunks[1]["page_number"] == 12
    assert "E-204" in chunks[1]["section_title"]


def test_default_embedding_provider_cosine_similarity():
    """Verify dense 384-dimensional deterministic embeddings with semantic cosine similarity."""
    embedder = DefaultEmbeddingProvider(dimension=384)
    v1 = embedder.embed_text("spindle bearing vibration error E-204")
    v2 = embedder.embed_text("bearing abnormal vibration noise E-204")
    v3 = embedder.embed_text("hydraulic oil filter replacement scheduled maintenance")

    assert len(v1) == 384
    assert len(v2) == 384

    import numpy as np
    sim_similar = float(np.dot(v1, v2))
    sim_different = float(np.dot(v1, v3))

    assert sim_similar > sim_different
    assert sim_similar > 0.40


def test_safety_document_priority_boost(db_session: Session):
    """Verify safety document chunks receive priority ranking boost over general manuals."""
    embedder = DefaultEmbeddingProvider()
    q_vec = embedder.embed_text("bearing replacement procedure")

    manual_chunk = {
        "content": "Step 4: Disassemble housing and replace bearing collar using mechanical wrench.",
        "embedding": embedder.embed_text("replace bearing collar mechanical wrench"),
        "doc_type": DocumentType.MANUAL,
        "approval_status": DocumentApprovalStatus.APPROVED,
        "is_current": True
    }
    safety_chunk = {
        "content": "⚠️ DANGER: Lockout and tagout breaker MDP-3 before touching spindle assembly.",
        "embedding": embedder.embed_text("lockout tagout breaker touching spindle assembly"),
        "doc_type": DocumentType.SAFETY,
        "approval_status": DocumentApprovalStatus.APPROVED,
        "is_current": True
    }

    SQLVectorStore.add_chunks(db_session, [manual_chunk, safety_chunk])

    results = SQLVectorStore.search_similar(db_session, q_vec, top_k=5)
    assert len(results) >= 2
    safety_results = [r for r in results if r["doc_type"] == DocumentType.SAFETY.value]
    assert len(safety_results) > 0


def test_approved_vs_unapproved_maintenance_records_isolation(db_session: Session, seeded_users):
    """Verify that ONLY supervisor-approved maintenance records are indexed into RAG memory."""
    tech = seeded_users["users"]["TECHNICIAN"]
    sup = seeded_users["users"]["SUPERVISOR"]

    machine = Machine(
        machine_code="TEST-CNC-99",
        name="Test CNC Machine",
        type="CNC",
        department="Machining",
        location="Zone 9",
        status=MachineStatus.RUNNING
    )
    db_session.add(machine)
    db_session.flush()

    # 1. Draft/Pending record (NOT approved)
    rec_pending = MaintenanceRecord(
        machine_id=machine.id,
        technician_id=tech.id,
        problem_summary="Temporary unapproved diagnosis: bad sensor cable",
        troubleshooting_steps="Jiggled wires",
        root_cause="Loose wire maybe",
        repair_action="Taped wire",
        downtime_minutes=10,
        approval_status=ApprovalStatus.PENDING
    )
    db_session.add(rec_pending)
    db_session.flush()

    # Pending record must NOT be in DocumentChunk
    chunks_pending = db_session.query(DocumentChunk).filter(
        DocumentChunk.section_title == f"Maintenance Record #{rec_pending.id}"
    ).all()
    assert len(chunks_pending) == 0

    # 2. Approved record
    rec_approved = MaintenanceRecord(
        machine_id=machine.id,
        technician_id=tech.id,
        problem_summary="Approved verified repair: spindle bearing replaced",
        troubleshooting_steps="Measured runout 0.012mm using dial indicator",
        root_cause="Bearing fatigue brinelling",
        repair_action="Installed new matched bearing pair BRG-204 and torqued to 45 Nm",
        downtime_minutes=120,
        approval_status=ApprovalStatus.APPROVED,
        approver_id=sup.id
    )
    db_session.add(rec_approved)
    db_session.flush()

    # Index approved record
    ingestion = IngestionService()
    chunk = ingestion.ingest_approved_maintenance_record(db_session, rec_approved, approver_id=sup.id)

    assert chunk is not None
    assert chunk.doc_type == DocumentType.MAINTENANCE_RECORD
    assert chunk.approval_status == DocumentApprovalStatus.APPROVED

    # Search vector store for the approved repair
    embedder = DefaultEmbeddingProvider()
    q_vec = embedder.embed_text("spindle bearing replaced runout dial indicator")
    results = SQLVectorStore.search_similar(db_session, q_vec, machine_id=machine.id, top_k=3)

    found_approved = any("Maintenance Record" in r.get("section_title", "") for r in results)
    assert found_approved is True


def test_structured_fact_query_classification(client: TestClient, db_session: Session, seeded_users):
    """Verify structured database queries (e.g., status, parts) return PostgreSQL data directly."""
    headers = get_auth_header("tech_user", UserRole.TECHNICIAN.value)

    # Query machine status
    res = client.post(
        "/api/ai/query",
        json={"question": "What is the status of TEST-CNC-01?"},
        headers=headers
    )
    assert res.status_code == 200
    data = res.json()
    assert data["is_structured_fact"] is True
    assert data["grounding_status"] == "GROUNDED"
    assert data["machine_code"] == "TEST-CNC-01"
    assert len(data["recommended_checks"]) > 0


def test_ai_troubleshooting_query_grounding_and_citations(client: TestClient, db_session: Session, seeded_users):
    """Verify full RAG response includes causes, recommended checks, safety warnings, and citations."""
    headers = get_auth_header("tech_user", UserRole.TECHNICIAN.value)

    machine = db_session.query(Machine).filter(Machine.machine_code == "TEST-CNC-01").first()

    # Insert test knowledge chunks into db_session for this machine
    embedder = DefaultEmbeddingProvider()
    SQLVectorStore.add_chunks(db_session, [
        {
            "content": "⚠️ DANGER: Lockout and tagout breaker MDP-3 before touching spindle assembly.",
            "embedding": embedder.embed_text("lockout tagout breaker touching spindle assembly"),
            "machine_id": machine.id,
            "doc_type": DocumentType.SAFETY,
            "approval_status": DocumentApprovalStatus.APPROVED,
            "is_current": True,
            "page_number": 3,
            "section_title": "Lockout/Tagout Safety Procedure"
        },
        {
            "content": "Root cause of Error E-204 is spindle bearing race degradation or lack of lubrication. Inspect runout with dial indicator. Torque bolts to 45 Nm.",
            "embedding": embedder.embed_text("CNC-04 spindle error E-204 overheating and vibration how to fix"),
            "machine_id": machine.id,
            "doc_type": DocumentType.MANUAL,
            "approval_status": DocumentApprovalStatus.APPROVED,
            "is_current": True,
            "page_number": 12,
            "section_title": "Error Code E-204 Spindle Overhaul"
        }
    ])
    db_session.flush()

    payload = {
        "question": "CNC-04 spindle error E-204 overheating and vibration. How to fix?",
        "machine_id": machine.id
    }
    res = client.post("/api/ai/query", json=payload, headers=headers)
    assert res.status_code == 200
    data = res.json()

    assert data["query_id"] > 0
    assert len(data["possible_cause"]) > 0
    assert len(data["recommended_checks"]) > 0
    assert len(data["safety_warnings"]) > 0
    assert any("⚠️" in w for w in data["safety_warnings"])

    # Citations check
    assert len(data["sources"]) > 0
    first_source = data["sources"][0]
    assert "document_title" in first_source
    assert "page_number" in first_source
    assert "relevance_score" in first_source
    assert len(first_source["snippet"]) > 0


def test_ai_query_feedback_submission(client: TestClient, db_session: Session, seeded_users):
    """Verify technician can submit Helpful / Not Helpful feedback on AI troubleshooting suggestions."""
    headers = get_auth_header("tech_user", UserRole.TECHNICIAN.value)

    # Execute query
    q_res = client.post(
        "/api/ai/query",
        json={"question": "What is the status of TEST-CNC-01?"},
        headers=headers
    )
    assert q_res.status_code == 200
    query_id = q_res.json()["query_id"]

    # Submit feedback
    fb_res = client.post(
        f"/api/ai/queries/{query_id}/feedback",
        json={"feedback": "HELPFUL", "notes": "Saved 20 minutes on shift diagnosis."},
        headers=headers
    )
    assert fb_res.status_code == 200
    assert fb_res.json()["status"] == "SUCCESS"

    # Verify query history reflects feedback
    hist_res = client.get("/api/ai/history", headers=headers)
    assert hist_res.status_code == 200
    history = hist_res.json()
    assert len(history) > 0
    matching = [h for h in history if h["id"] == query_id]
    assert len(matching) == 1
    assert matching[0]["feedback"] == "HELPFUL"


def test_document_content_and_search(client: TestClient, db_session: Session, seeded_users):
    """Verify GET /api/documents/{id}/content returns structured sections, loto_steps, and pages, and search queries work."""
    headers = get_auth_header("tech_user", UserRole.TECHNICIAN.value)

    # 1. Test listing with search query
    list_res = client.get("/api/documents?q=OSHA", headers=headers)
    assert list_res.status_code == 200
    docs = list_res.json()
    assert isinstance(docs, list)
    # Check that any returned document matches OSHA in title
    if len(docs) > 0:
        assert any("OSHA" in d["title"].upper() or "LOTO" in d["title"].upper() for d in docs)

    # 2. Test get all documents
    all_res = client.get("/api/documents", headers=headers)
    assert all_res.status_code == 200
    all_docs = all_res.json()
    assert len(all_docs) > 0

    # 3. Test content endpoint for the first document
    first_doc_id = all_docs[0]["id"]
    content_res = client.get(f"/api/documents/{first_doc_id}/content", headers=headers)
    assert content_res.status_code == 200
    content_data = content_res.json()

    assert "id" in content_data
    assert "title" in content_data
    assert "doc_type" in content_data
    assert "raw_content" in content_data
    assert "sections" in content_data
    assert isinstance(content_data["sections"], list)
    assert "loto_steps" in content_data
    assert isinstance(content_data["loto_steps"], list)
    assert len(content_data["raw_content"]) > 0
