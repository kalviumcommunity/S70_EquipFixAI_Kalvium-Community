import json
from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.user import User
from app.models.ai import AIQuery, AISource
from app.models.machine import Machine
from app.models.enums import AuditAction, GroundingStatus
from app.auth.deps import get_current_user
from app.schemas.ai import (
    AIQueryRequest, AIQueryResponse, AIFeedbackRequest, AIQueryHistoryItem, AICitation, AIPreviousRepair
)
from app.rag.tools import StructuredTools
from app.rag.retriever import RAGRetriever
from app.rag.generator import GroundedGenerator
from app.services.audit_service import AuditService

router = APIRouter(prefix="/ai", tags=["AI & RAG Troubleshooting Engine"])


@router.post("/query", response_model=AIQueryResponse)
def execute_ai_query(
    req: AIQueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Floor technician AI assistant query endpoint.
    Automatically classifies queries into structured PostgreSQL facts or RAG semantic retrieval.
    """
    question = req.question.strip()
    if not question:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Question cannot be empty.")

    # 1. Classify query intent
    classification = StructuredTools.classify_query(question)

    # 2. Case A: Structured Relational Database Query
    if classification["type"] == "STRUCTURED":
        tool_name = classification["tool"]
        tool_params = classification["params"]
        tool_result = StructuredTools.execute_tool(db, tool_name, **tool_params)

        # Build readable answer from structured facts
        machine_code = classification.get("machine_code")
        possible_cause = f"Structured system report via tool `{tool_name}`: {json.dumps(tool_result, default=str)}"

        # Save query record
        query_record = AIQuery(
            machine_id=req.machine_id,
            work_order_id=req.work_order_id,
            user_id=current_user.id,
            query_text=question,
            response_text=possible_cause,
            grounding_status=GroundingStatus.GROUNDED,
            response_json=json.dumps(tool_result, default=str)
        )
        db.add(query_record)
        db.flush()

        AuditService.log_action(
            db=db,
            action=AuditAction.AI_QUERY_EXECUTED,
            entity_type="ai_query",
            entity_id=query_record.id,
            user_id=current_user.id,
            new_value={"type": "STRUCTURED", "tool": tool_name}
        )
        db.commit()

        # Build clean checks/points from result
        recommended_checks = []
        if "status" in tool_result:
            recommended_checks.append(f"Current operational state: {tool_result.get('status')}")
        if "location" in tool_result:
            recommended_checks.append(f"Equipment physical location: {tool_result.get('location')}")
        if "next_scheduled_maintenance" in tool_result:
            recommended_checks.append(f"Next preventive schedule: {tool_result.get('next_scheduled_maintenance')}")
        if "total_parts" in tool_result:
            for p in tool_result.get("parts", [])[:3]:
                recommended_checks.append(f"Part {p['part_code']} ({p['name']}): Stock {p['current_stock']} (Min {p['minimum_stock']})")

        return AIQueryResponse(
            query_id=query_record.id,
            question=question,
            machine_code=machine_code,
            possible_cause=f"Direct database record retrieved for {tool_name.replace('get_', '')}.",
            recommended_checks=recommended_checks or ["Inspect machine dashboard for real-time telemetry."],
            safety_warnings=[],
            relevant_previous_repairs=[],
            sources=[],
            grounding_status=GroundingStatus.GROUNDED,
            is_structured_fact=True,
            created_at=query_record.created_at
        )

    # 3. Case B: Semantic Troubleshooting RAG Query
    retriever = RAGRetriever()
    retrieval_data = retriever.retrieve(
        db=db,
        query=question,
        machine_id=req.machine_id,
        work_order_id=req.work_order_id,
        top_k=5
    )

    machine_code = None
    if req.machine_id:
        m = db.query(Machine).filter(Machine.id == req.machine_id).first()
        if m:
            machine_code = m.machine_code
    elif retrieval_data.get("machine_id"):
        m = db.query(Machine).filter(Machine.id == retrieval_data["machine_id"]).first()
        if m:
            machine_code = m.machine_code

    # Create temporary query record to acquire an ID
    query_record = AIQuery(
        machine_id=req.machine_id or retrieval_data.get("machine_id"),
        work_order_id=req.work_order_id,
        user_id=current_user.id,
        query_text=question,
        response_text="Generating response...",
        grounding_status=GroundingStatus.PARTIALLY_GROUNDED
    )
    db.add(query_record)
    db.flush()

    # Synthesize grounded answer
    generator = GroundedGenerator()
    response = generator.generate_response(
        query=question,
        retrieval_data=retrieval_data,
        machine_code=machine_code,
        query_id=query_record.id,
        user_role=current_user.role.name
    )

    # Save finalized response
    query_record.response_text = response.possible_cause
    query_record.grounding_status = response.grounding_status
    query_record.response_json = json.dumps({
        "possible_cause": response.possible_cause,
        "recommended_checks": response.recommended_checks,
        "safety_warnings": response.safety_warnings,
        "sources_count": len(response.sources)
    }, default=str)

    # Store individual citations in ai_sources
    for cite in response.sources:
        source_rec = AISource(
            ai_query_id=query_record.id,
            document_id=cite.document_id,
            chunk_id=None,
            page_number=cite.page_number,
            section_title=cite.section_title,
            relevance_score=cite.relevance_score,
            source_type=cite.source_type,
            snippet=cite.snippet
        )
        db.add(source_rec)

    AuditService.log_action(
        db=db,
        action=AuditAction.AI_QUERY_EXECUTED,
        entity_type="ai_query",
        entity_id=query_record.id,
        user_id=current_user.id,
        new_value={"grounding_status": response.grounding_status.value, "citations": len(response.sources)}
    )

    db.commit()
    db.refresh(query_record)

    return response


@router.post("/queries/{query_id}/feedback")
def submit_query_feedback(
    query_id: int,
    fb_in: AIFeedbackRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Record technician feedback (Helpful / Not Helpful) on AI suggestions."""
    query_record = db.query(AIQuery).filter(AIQuery.id == query_id).first()
    if not query_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"AI Query #{query_id} not found."
        )

    query_record.feedback = fb_in.feedback
    query_record.feedback_notes = fb_in.notes

    AuditService.log_action(
        db=db,
        action=AuditAction.AI_FEEDBACK_RECORDED,
        entity_type="ai_query",
        entity_id=query_record.id,
        user_id=current_user.id,
        new_value={"feedback": fb_in.feedback.value, "notes": fb_in.notes}
    )

    db.commit()
    return {"status": "SUCCESS", "message": "Feedback submitted successfully."}


@router.get("/history", response_model=List[AIQueryHistoryItem])
def get_query_history(
    machine_id: Optional[int] = None,
    work_order_id: Optional[int] = None,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve technician's recent AI troubleshooting history."""
    query = db.query(AIQuery)
    if machine_id:
        query = query.filter(AIQuery.machine_id == machine_id)
    if work_order_id:
        query = query.filter(AIQuery.work_order_id == work_order_id)

    # Technicians see their own queries; supervisors/managers can see all
    role_name = current_user.role.name if current_user.role else ""
    if role_name in ["TECHNICIAN", "OPERATOR"]:
        query = query.filter(AIQuery.user_id == current_user.id)

    items = query.order_by(AIQuery.created_at.desc()).limit(limit).all()

    results = []
    for item in items:
        results.append(AIQueryHistoryItem(
            id=item.id,
            query_text=item.query_text,
            machine_id=item.machine_id,
            work_order_id=item.work_order_id,
            grounding_status=item.grounding_status,
            feedback=item.feedback,
            created_at=item.created_at,
            sources_count=len(item.sources)
        ))
    return results


@router.post("/tools/execute")
def execute_tool_direct(
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Direct structured tool execution interface for diagnostics."""
    tool_name = payload.get("tool_name")
    params = payload.get("parameters", {})
    if not tool_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="tool_name is required.")

    result = StructuredTools.execute_tool(db, tool_name, **params)
    return {"tool": tool_name, "result": result}
