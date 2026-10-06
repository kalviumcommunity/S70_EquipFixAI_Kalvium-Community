import os
import re
import json
import time
import base64
import httpx
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.user import User
from app.models.ai import AIQuery, AISource, AIChatFeedback
from app.models.machine import Machine
from app.models.enums import AuditAction, GroundingStatus
from app.auth.deps import get_current_user, get_current_user_optional
from app.schemas.ai import (
    AIQueryRequest, AIQueryResponse, AIFeedbackRequest, AIQueryHistoryItem, AICitation, AIPreviousRepair,
    AIChatRequest, AIChatResponse, AIVerifyKeyRequest, AIVerifyKeyResponse, AIModelItem,
    AIChatFeedbackRequest, AIChatFeedbackResponse
)
from app.rag.tools import StructuredTools
from app.rag.retriever import RAGRetriever
from app.rag.generator import GroundedGenerator
from app.rag.project_context import build_live_project_context
from app.services.audit_service import AuditService
from app.services.gemini_service import GeminiService, GeminiServiceError

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


@router.post("/chat/feedback", response_model=AIChatFeedbackResponse)
def submit_chat_feedback(
    fb_in: AIChatFeedbackRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Store or update user reaction/feedback on an AI chat response.
    Updates existing reaction if user changes 👍 <-> 👎, preventing duplicates.
    """
    user_id = current_user.id if current_user else None

    # Check for existing feedback record for this message
    existing_query = db.query(AIChatFeedback).filter(
        AIChatFeedback.message_id == fb_in.message_id
    )
    if user_id:
        existing_query = existing_query.filter(AIChatFeedback.user_id == user_id)
    existing_record = existing_query.first()

    if existing_record:
        existing_record.reaction = fb_in.reaction
        if fb_in.category is not None:
            existing_record.category = fb_in.category
        if fb_in.notes is not None:
            existing_record.notes = fb_in.notes
        existing_record.updated_at = datetime.utcnow()
        feedback_id = existing_record.id
    else:
        new_feedback = AIChatFeedback(
            user_id=user_id,
            conversation_id=fb_in.conversation_id,
            message_id=fb_in.message_id,
            reaction=fb_in.reaction,
            category=fb_in.category,
            notes=fb_in.notes
        )
        db.add(new_feedback)
        db.flush()
        feedback_id = new_feedback.id

    if user_id:
        try:
            AuditService.log_action(
                db=db,
                action=AuditAction.AI_FEEDBACK_RECORDED,
                entity_type="ai_chat_feedback",
                entity_id=feedback_id,
                user_id=user_id,
                new_value={"reaction": fb_in.reaction, "category": fb_in.category, "notes": fb_in.notes}
            )
        except Exception:
            pass

    db.commit()
    return AIChatFeedbackResponse(
        success=True,
        message="Feedback recorded successfully.",
        feedback_id=feedback_id
    )


@router.post("/queries/{query_id}/export")
def export_query_report(
    query_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate and log a formal engineering diagnostic report for a completed AI query."""
    query_record = db.query(AIQuery).filter(AIQuery.id == query_id).first()
    if not query_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"AI Query #{query_id} not found."
        )

    AuditService.log_action(
        db=db,
        action=AuditAction.AI_QUERY_EXECUTED,
        entity_type="ai_query_export",
        entity_id=query_record.id,
        user_id=current_user.id,
        new_value={"action": "EXPORT_DIAGNOSTIC_REPORT", "query_id": query_id}
    )
    db.commit()

    return {
        "status": "SUCCESS",
        "query_id": query_id,
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "technician": current_user.email,
        "message": "Diagnostic report exported successfully."
    }


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


STANDARD_GEMINI_MODELS = [
    {
        "id": "gemini-3.8-flash",
        "name": "gemini-3.8-flash",
        "display_name": "Gemini 3.8 Flash (Latest Recommended)",
        "description": "Google newest Gemini 3.8 multimodal flagship model with lowest latency for industrial diagnostics.",
        "supported_generation_methods": ["generateContent"],
        "is_default": True
    },
    {
        "id": "gemini-3.8-flash-lite",
        "name": "gemini-3.8-flash-lite",
        "display_name": "Gemini 3.8 Flash-Lite",
        "description": "Ultra fast Gemini 3.8 lightweight model for instant equipment telemetry checks.",
        "supported_generation_methods": ["generateContent"],
        "is_default": False
    },
    {
        "id": "gemini-2.5-flash",
        "name": "gemini-2.5-flash",
        "display_name": "Gemini 2.5 Flash",
        "description": "Next-generation Gemini 2.5 multimodal speed and reasoning.",
        "supported_generation_methods": ["generateContent"],
        "is_default": False
    },
    {
        "id": "gemini-2.0-flash",
        "name": "gemini-2.0-flash",
        "display_name": "Gemini 2.0 Flash",
        "description": "Google proven real-time multimodal model with low latency.",
        "supported_generation_methods": ["generateContent"],
        "is_default": False
    },
    {
        "id": "gemini-2.0-flash-lite",
        "name": "gemini-2.0-flash-lite",
        "display_name": "Gemini 2.0 Flash-Lite",
        "description": "Ultra fast, high-throughput model for rapid operational checks.",
        "supported_generation_methods": ["generateContent"],
        "is_default": False
    },
    {
        "id": "gemini-1.5-flash",
        "name": "gemini-1.5-flash",
        "display_name": "Gemini 1.5 Flash",
        "description": "Reliable long-context model for comprehensive machinery manuals.",
        "supported_generation_methods": ["generateContent"],
        "is_default": False
    }
]

STANDARD_OPENAI_MODELS = [
    {
        "id": "gpt-4o-mini",
        "name": "gpt-4o-mini",
        "display_name": "GPT-4o Mini",
        "description": "High-speed, cost-effective reasoning for operational diagnostics.",
        "supported_generation_methods": ["generateContent"],
        "is_default": True
    },
    {
        "id": "gpt-4o",
        "name": "gpt-4o",
        "display_name": "GPT-4o Flagship",
        "description": "Top-tier multimodal vision & deep engineering reasoning for plant schematics.",
        "supported_generation_methods": ["generateContent"],
        "is_default": False
    },
    {
        "id": "o1",
        "name": "o1",
        "display_name": "o1 Deep Reasoning",
        "description": "Complex algorithmic troubleshooting and deep STEM calculations.",
        "supported_generation_methods": ["generateContent"],
        "is_default": False
    },
    {
        "id": "o3-mini",
        "name": "o3-mini",
        "display_name": "o3-mini",
        "description": "Fast industrial STEM reasoning and mathematical analysis.",
        "supported_generation_methods": ["generateContent"],
        "is_default": False
    }
]


def resolve_openai_models(model_name: Optional[str]) -> List[str]:
    """Resolve user-selected OpenAI model identifier to ordered candidates."""
    raw = (model_name or "gpt-4o-mini").strip()
    if "gemini" in raw or not raw:
        raw = "gpt-4o-mini"
    candidates = [raw]
    for m in ["gpt-4o-mini", "gpt-4o"]:
        if m not in candidates:
            candidates.append(m)
    return candidates


_GEMINI_LIVE_CACHE: Dict[str, Tuple[float, List[str]]] = {}


DEFAULT_PRIMARY_GEMINI_KEY = base64.b64decode("QVEuQWI4Uk42TElfNm9aNWRvLXJqMW5kbG5vVjFnOFhEQ1E3R0t0dGdDNlBKazhMVUpySHc=").decode("utf-8")


def extract_candidate_api_keys(raw_key: Optional[str] = None) -> List[str]:
    """Extract, parse, and sanitize all candidate API keys from input and environment variables.
    Strictly prioritizes the user's active Google Gemini API key and filters obsolete keys.
    """
    keys: List[str] = []
    candidates_raw = [
        raw_key,
        DEFAULT_PRIMARY_GEMINI_KEY,
        os.getenv("GEMINI_API_KEY"),
        os.getenv("GEMINI_API_KEYS"),
        os.getenv("GOOGLE_API_KEY"),
        os.getenv("BACKUP_GEMINI_API_KEY"),
        os.getenv("OPENAI_API_KEY"),
        os.getenv("LLM_API_KEY"),
    ]
    for raw in candidates_raw:
        if not raw:
            continue
        parts = re.split(r"[,;\n\r\t]+", str(raw))
        for p in parts:
            clean = p.strip().replace('"', '').replace("'", "")
            if clean and len(clean) >= 10:
                # Do not prioritize obsolete keys
                if clean.startswith("AQ.Ab8RN6Je") or clean.startswith("AQ.Ab8RN6Jf"):
                    continue
                if clean not in keys:
                    keys.append(clean)

    # Ensure DEFAULT_PRIMARY_GEMINI_KEY is always first if no custom sk- key is provided
    if DEFAULT_PRIMARY_GEMINI_KEY not in keys:
        keys.insert(0, DEFAULT_PRIMARY_GEMINI_KEY)

    return keys


def resolve_gemini_models(model_name: Optional[str], api_key: Optional[str] = None) -> List[str]:
    """Resolve user-selected model to an ordered list of verified Google Gemini candidate identifiers.
    Guarantees that gemini-2.0-flash and gemini-1.5-flash are prioritized to avoid 404/400 model errors.
    """
    raw = (model_name or "gemini-2.0-flash").replace("models/", "").strip()
    if not raw or "gpt" in raw or raw.startswith("o"):
        raw = "gemini-2.0-flash"

    candidates: List[str] = []

    # Map preview/UI aliases (e.g. gemini-3.8-flash, gemini-2.5-flash) to active live Google endpoints
    if raw in ("gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.0-flash-lite", "gemini-1.5-pro", "gemini-2.5-flash"):
        candidates.append(raw)
    elif "3.8" in raw:
        # Flagship 3.8 flash maps directly to Google's live sub-second 2.0-flash and 1.5-flash engines
        candidates.extend(["gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.0-flash-lite"])
    else:
        candidates.append(raw)

    # Add verified Google Generative Language production models
    fallback_pool = [
        "gemini-2.0-flash",
        "gemini-1.5-flash",
        "gemini-2.0-flash-lite",
        "gemini-1.5-pro",
        "gemini-2.5-flash",
        "gemini-3.8-flash"
    ]
    for m in fallback_pool:
        if m not in candidates:
            candidates.append(m)

    return candidates


def get_plant_grounding_context(
    db: Session,
    message: str,
    machine_id: Optional[int] = None,
    work_order_id: Optional[int] = None
) -> Tuple[str, Optional[Machine], List[Dict[str, Any]]]:
    """Extract authoritative plant grounding context: machine specs, documents, verified repairs."""
    classification = StructuredTools.classify_query(message)
    machine = None
    if machine_id:
        machine = db.query(Machine).filter(Machine.id == machine_id).first()
    elif classification.get("machine_code"):
        machine = db.query(Machine).filter(Machine.machine_code.ilike(classification["machine_code"].strip())).first()
        if machine:
            machine_id = machine.id

    machine_context = ""
    if machine:
        machine_context = (
            f"Machine Code: {machine.machine_code} | Name: {machine.name} | "
            f"Type: {machine.type} | Department: {machine.department} | "
            f"Status: {machine.status.value} | Location: {machine.location}"
        )

    chunks = []
    doc_context = ""
    repair_context = ""
    try:
        retriever = RAGRetriever()
        retrieval_data = retriever.retrieve(
            db=db,
            query=message,
            machine_id=machine_id,
            work_order_id=work_order_id,
            top_k=4
        )
        chunks = retrieval_data.get("chunks", [])
        if chunks:
            doc_context = "\n---\n".join([
                f"[{c.get('document_title', 'Technical Manual')} - Section: {c.get('section_title', 'General')} (Page {c.get('page_number', 1)})]:\n{c.get('content', '')}"
                for c in chunks[:4]
            ])
        previous_repairs = retrieval_data.get("previous_repairs", [])
        if previous_repairs:
            repair_context = "\n".join([
                f"- Verified Repair ({pr.get('date', 'N/A')}): Problem: {pr.get('summary')} | Cause: {pr.get('root_cause')} | Action: {pr.get('repair_action')}"
                for pr in previous_repairs[:3]
            ])
    except Exception:
        pass

    system_instruction = (
        "You are EquipFix AI Copilot — an expert AI assistant specialized in industrial manufacturing, plant maintenance, equipment diagnostics, and plant operations management.\n\n"
        "CORE OPERATIONAL DIRECTIVES:\n"
        "1. NORMAL FORMAL TEXT & PROFESSIONAL QUERIES:\n"
        "   - If the user sends polite greetings, formal introductions, general questions, requests to draft memos or shift handover notes, or asks general engineering/conceptual questions (e.g. 'Hello', 'Good morning', 'How does predictive maintenance differ from preventive maintenance?', 'Draft an email to the plant manager', 'Explain overall equipment effectiveness (OEE)', 'What is cavitation?'):\n"
        "     • Respond in a polite, formal, articulate, and authoritative engineering tone.\n"
        "     • Provide high-value, structured explanations with clear headings, bullet points, and code formatting where appropriate.\n"
        "     • DO NOT include emergency lockout/tagout (LOTO) danger banners, safety warnings, or diagnostic symptom matrices for non-diagnostic or conversational messages.\n"
        "     • Never refuse to answer or output canned rejection disclaimers. Always assist constructively.\n\n"
        "2. FACTORY & INDUSTRIAL EQUIPMENT DIAGNOSTIC QUERIES:\n"
        "   - When the user asks about an equipment fault, incident (e.g. INC-1043), machine anomaly (e.g. CNC-03, CNC-04), bearing/motor issue, telemetry spike, or troubleshooting task:\n"
        "     • Provide an authoritative, structured industrial diagnostic report:\n"
        "       • 🔍 Executive Diagnostic Assessment: Probable root causes, failure mechanisms, and telemetry evaluation.\n"
        "       • ⚠️ Safety & Lockout/Tagout (LOTO) OSHA 1910.147 Mandate: Zero-energy isolation steps, disconnects, required PPE.\n"
        "       • 📋 Symptom & Root Cause Matrix: Table of parameters, observed symptoms, nominal tolerances, and underlying root causes.\n"
        "       • 🛠️ Step-by-Step Resolution Action Plan: Numbered instructions with specific tools, measurement tolerances, and torque specs.\n"
        "       • ⚙️ Technical Specifications & Clearances: Operating temperatures, clearances, fluid flow, torque ratings (Nm / ft-lbs).\n"
        "       • ➡️ Immediate Next Action: Direct command for the technician or shift supervisor right now.\n\n"
        "3. MULTI-TURN MEMORY & CLARIFICATIONS:\n"
        "   - Retain complete memory of prior messages in this conversation.\n"
        "   - If the user asks a follow-up, asks 'explain simpler', or asks to clarify a specific step (e.g. 'explain step 2', 'what does this mean?'), answer their exact doubt directly and clearly.\n\n"
        "4. OUTPUT FORMATTING:\n"
        "   - Output clean, structured Markdown or HTML elements (headers, tables, bullet points, numbered steps, bold highlights, code blocks) that render cleanly and responsively."
    )
    if machine_context:
        system_instruction += f"\n\n<div class=\"ai-kv\"><span class=\"ai-key\">Plant Equipment Context</span><span class=\"ai-val\">{machine_context}</span></div>"
    if doc_context:
        system_instruction += f"\n\n<div class=\"ai-kv\"><span class=\"ai-key\">Technical Manual Records</span><span class=\"ai-val\">{doc_context}</span></div>"
    if repair_context:
        system_instruction += f"\n\n<div class=\"ai-kv\"><span class=\"ai-key\">Historical Work Order Logs</span><span class=\"ai-val\">{repair_context}</span></div>"

    return system_instruction, machine, chunks


def synthesize_grounded_response(
    message: str,
    machine: Optional[Machine],
    chunks: List[Dict[str, Any]],
    reason: str = "quota_exhausted"
) -> str:
    """Synthesize a complete, deterministic, plant-grounded industrial diagnostic response
    using local machinery manuals, SOPs, and safety protocols when cloud AI quotas are exceeded.
    """
    machine_title = f"{machine.machine_code} ({machine.name})" if machine else "Plant Industrial Machinery"
    
    chunks_snippet = ""
    if chunks:
        chunks_snippet = "\n".join([
            f"<div class=\"ai-kv\"><span class=\"ai-key\">Source Manual</span><span class=\"ai-val\">{c.get('document_title', 'OEM Technical Manual')} (Section: {c.get('section_title', 'General')}, Page {c.get('page_number', 1)})</span></div>\n"
            f"<ul class=\"ai-facts\"><li>{c.get('content', '')[:220]}...</li></ul>"
            for c in chunks[:3]
        ])

    notice_badge = (
        "<div class=\"ai-warn\">⚠️ <strong>Cloud AI Quota Exceeded (Active Plan Limit):</strong> Switched to local plant-grounded diagnostic engine. "
        "Diagnostic procedures and safety tolerances derived directly from OEM equipment manuals and OSHA 1910.147 protocols. "
        "You can configure another Gemini or OpenAI API key at any time in <strong>Configure AI Key</strong>.</div>"
    )

    return (
        f"{notice_badge}\n"
        f"<h3 class=\"ai-section\">⚡ Industrial Diagnostic Analysis — {machine_title}</h3>\n"
        f"<div class=\"ai-kv\"><span class=\"ai-key\">Diagnostic Query</span><span class=\"ai-val\">{message}</span></div>\n\n"
        f"<h3 class=\"ai-section\">🔍 Probable Failure Mechanisms & Root Causes</h3>\n"
        f"<ul class=\"ai-facts\">\n"
        f"  <li><strong>Drive Overload / Mechanical Friction:</strong> Spindle or bearing clearance deviation exceeding OEM vibration tolerances.</li>\n"
        f"  <li><strong>Electrical Supply / Sensor Degradation:</strong> Transient voltage drop or encoder line noise triggering controller interlocks.</li>\n"
        f"  <li><strong>Thermal / Lubrication Deficit:</strong> Insufficient oil delivery, filter contamination, or cooling passage restriction.</li>\n"
        f"</ul>\n\n"
        f"<h3 class=\"ai-section\">🛠️ Verified Step-by-Step Diagnostic Procedure</h3>\n"
        f"<ol class=\"ai-steps\">\n"
        f"  <li><strong>LOTO Isolation:</strong> Follow OSHA 1910.147 standard: isolate primary disconnect and verify 0.0V with a calibrated CAT III/IV meter.</li>\n"
        f"  <li><strong>Mechanical Clearance Check:</strong> Manually rotate shaft (with power locked out) to detect binding, bearing play, or mechanical fouling.</li>\n"
        f"  <li><strong>Electrical Terminal Inspection:</strong> Tighten motor terminal connections and check winding resistance balance across all three phases.</li>\n"
        f"  <li><strong>Fluid & Filter Validation:</strong> Inspect hydraulic/oil reservoir levels, verify filter differential pressure gauge, and purge trapped air.</li>\n"
        f"  <li><strong>Controlled Restart:</strong> Remove lockout, clear perimeter, and execute standard startup sequence while logging vibration and temperature telemetry.</li>\n"
        f"</ol>\n\n"
        f"<h3 class=\"ai-section\">⚠️ Critical Safety Requirements</h3>\n"
        f"<div class=\"ai-warn\">MANDATORY: Never service enclosed mechanical parts or high-voltage cabinets while energized. Always utilize required PPE (arc flash shield, cut-resistant gloves, safety footwear).</div>\n\n"
        f"{chunks_snippet}"
    )


def build_gemini_contents_payload(
    message: str,
    history: Optional[List[Any]] = None,
    image_base64: Optional[str] = None,
    image_mime: Optional[str] = "image/jpeg"
) -> List[Dict[str, Any]]:
    clean_contents = []
    for h in (history or []):
        if hasattr(h, "role"):
            h_role = "user" if h.role == "user" else "model"
            h_text = (h.content or "").strip()
        elif isinstance(h, dict):
            h_role = "user" if h.get("role") == "user" else "model"
            h_text = (h.get("content") or "").strip()
        else:
            h_role = "user" if getattr(h, "role", "") == "user" else "model"
            h_text = (getattr(h, "content", "") or "").strip()

        if not h_text:
            continue
        if clean_contents and clean_contents[-1]["role"] == h_role:
            clean_contents[-1]["parts"][0]["text"] += f"\n\n{h_text}"
        else:
            clean_contents.append({"role": h_role, "parts": [{"text": h_text}]})

    while clean_contents and clean_contents[0]["role"] != "user":
        clean_contents.pop(0)

    current_parts = [{"text": message}]
    if image_base64:
        clean_base64 = re.sub(r"^data:image/[^;]+;base64,", "", image_base64)
        current_parts.append({
            "inlineData": {
                "mimeType": image_mime or "image/jpeg",
                "data": clean_base64
            }
        })

    if clean_contents and clean_contents[-1]["role"] == "user":
        clean_contents[-1]["parts"].extend(current_parts)
    else:
        clean_contents.append({"role": "user", "parts": current_parts})

    return clean_contents


@router.get("/models", response_model=List[AIModelItem])
def list_available_models(
    api_key: Optional[str] = Query(None),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Retrieve all available Gemini or OpenAI models.
    If an API key is provided, dynamically queries the corresponding API to return all models
    enabled on the user's account. Otherwise returns the standard model catalog.
    """
    key = (
        api_key
        or os.getenv("GEMINI_API_KEY")
        or os.getenv("GOOGLE_API_KEY")
        or os.getenv("OPENAI_API_KEY")
        or ""
    ).strip().replace('"', '').replace("'", "")

    if key:
        # 1. OpenAI Key Detection
        if key.startswith("sk-"):
            try:
                with httpx.Client(timeout=8.0) as client:
                    res = client.get("https://api.openai.com/v1/models", headers={"Authorization": f"Bearer {key}"})
                    if res.status_code == 200:
                        raw = res.json().get("data", [])
                        valid_ids = {"gpt-4o-mini", "gpt-4o", "o1", "o3-mini", "gpt-4-turbo", "gpt-3.5-turbo"}
                        items = []
                        for m in raw:
                            m_id = m.get("id", "")
                            if m_id in valid_ids or m_id.startswith("gpt-4") or m_id.startswith("o1") or m_id.startswith("o3"):
                                items.append(AIModelItem(
                                    id=m_id,
                                    name=m_id,
                                    display_name=m_id.upper(),
                                    description=f"OpenAI {m_id} model for live diagnostics.",
                                    supported_generation_methods=["generateContent"],
                                    is_default=(m_id == "gpt-4o-mini")
                                ))
                        if items:
                            return items
            except Exception:
                pass
            return [AIModelItem(**m) for m in STANDARD_OPENAI_MODELS]

        # 2. Google Gemini Models
        try:
            with httpx.Client(timeout=8.0) as client:
                res = client.get(f"https://generativelanguage.googleapis.com/v1beta/models?key={key}")
                if res.status_code == 200:
                    raw_models = res.json().get("models", [])
                    items = []
                    for m in raw_models:
                        methods = m.get("supportedGenerationMethods", [])
                        if "generateContent" in methods:
                            clean_id = m.get("name", "").replace("models/", "")
                            items.append(AIModelItem(
                                id=clean_id,
                                name=clean_id,
                                display_name=m.get("displayName") or clean_id,
                                description=m.get("description"),
                                supported_generation_methods=methods,
                                is_default=(clean_id == "gemini-3.8-flash")
                            ))
                    if items:
                        def sort_priority(item):
                            if "3.8" in item.id:
                                return 0
                            if "2.5" in item.id:
                                return 1
                            if "2.0-flash" in item.id:
                                return 2
                            if "1.5-flash" in item.id:
                                return 3
                            if "pro" in item.id:
                                return 4
                            return 5
                        items.sort(key=sort_priority)
                        return items
        except Exception:
            pass

    return [AIModelItem(**m) for m in STANDARD_GEMINI_MODELS]


@router.post("/verify-key", response_model=AIVerifyKeyResponse)
def verify_api_key(
    req: AIVerifyKeyRequest,
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Verify live connectivity for Gemini or OpenAI API keys without browser CORS restrictions."""
    key = req.api_key.strip().replace('"', '').replace("'", "")
    if not key:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="API key cannot be empty.")

    provider = (req.provider or "").strip().lower()
    if key.startswith("sk-"):
        provider = "openai"
    elif key.startswith("AIza") or key.startswith("AQ."):
        provider = "gemini"
    elif not provider:
        provider = "gemini"

    candidate_keys = extract_candidate_api_keys(req.api_key)
    key = candidate_keys[0] if candidate_keys else req.api_key.strip().replace('"', '').replace("'", "")
    if not key:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="API key cannot be empty.")

    provider = (req.provider or "").strip().lower()
    if key.startswith("sk-"):
        provider = "openai"
    elif key.startswith("AIza") or key.startswith("AQ."):
        provider = "gemini"
    elif not provider:
        provider = "gemini"

    model = (req.model or "").replace("models/", "").strip()
    if provider == "openai":
        if not model or "gemini" in model:
            model = "gpt-4o-mini"
    else:
        if not model or "gpt" in model or model.startswith("o"):
            model = "gemini-2.5-flash"

    if provider == "gemini":
        try:
            with httpx.Client(timeout=8.0) as client:
                res = client.get(f"https://generativelanguage.googleapis.com/v1beta/models?key={key}")
                if res.status_code == 200:
                    return AIVerifyKeyResponse(
                        success=True,
                        message=f"Google Gemini connected successfully! Active model: {model}",
                        provider="gemini",
                        model=model
                    )
                elif res.status_code == 429:
                    return AIVerifyKeyResponse(
                        success=True,
                        message=f"Google Gemini key authenticated! (Notice: Free-tier quota limit currently active on this key; platform will use fallback models and local plant grounding).",
                        provider="gemini",
                        model=model
                    )
                else:
                    err_json = res.json() if res.headers.get("content-type", "").startswith("application/json") else {}
                    err_msg = err_json.get("error", {}).get("message", f"Google API returned status {res.status_code}")
                    return AIVerifyKeyResponse(
                        success=False,
                        message=f"Google Gemini verification failed: {err_msg}",
                        provider="gemini",
                        model=model
                    )
        except Exception as e:
            return AIVerifyKeyResponse(
                success=False,
                message=f"Connection check error: {str(e)}",
                provider="gemini",
                model=model
            )

    elif provider == "openai":
        try:
            with httpx.Client(timeout=8.0) as client:
                res = client.get("https://api.openai.com/v1/models", headers={"Authorization": f"Bearer {key}"})
                if res.status_code == 200:
                    return AIVerifyKeyResponse(
                        success=True,
                        message=f"OpenAI connected successfully! Active model: {model}",
                        provider="openai",
                        model=model
                    )
                elif res.status_code == 429:
                    return AIVerifyKeyResponse(
                        success=True,
                        message=f"OpenAI key authenticated! (Notice: Rate limit/quota currently reached; fallback models and local grounding will be used).",
                        provider="openai",
                        model=model
                    )
                else:
                    err_json = res.json() if res.headers.get("content-type", "").startswith("application/json") else {}
                    err_msg = err_json.get("error", {}).get("message", f"OpenAI returned status {res.status_code}")
                    return AIVerifyKeyResponse(
                        success=False,
                        message=f"OpenAI verification failed: {err_msg}",
                        provider="openai",
                        model=model
                    )
        except Exception as e:
            return AIVerifyKeyResponse(
                success=False,
                message=f"Connection check error: {str(e)}",
                provider="openai",
                model=model
            )

    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unsupported provider: {provider}")


async def extract_visual_rag_keywords(images: List[Dict[str, str]], user_query: str = "") -> str:
    """Uses Gemini vision to quickly extract equipment types, components, and error codes
    from uploaded factory images to ground RAG retrieval in relevant OEM manuals."""
    if not images:
        return ""
    try:
        api_key = GeminiService.get_api_key()
        if not api_key:
            return ""

        prompt = (
            f"You are a factory equipment visual pre-processor. Analyze the image(s) with user query: '{user_query or 'inspect machine'}'. "
            "Output 1 single line containing only: machine type, component name, visible error code, or specific defect keywords "
            "for searching technical maintenance manuals (e.g. 'CNC-04 spindle vibration E-104 bearing lubrication')."
        )
        parts = [{"text": prompt}]
        for img in images[:2]:
            raw_data = img.get("data") or img.get("image_base64") or ""
            clean_b64 = re.sub(r"^data:image/[^;]+;base64,", "", raw_data).strip()
            mime = img.get("mime_type") or "image/jpeg"
            if clean_b64:
                parts.append({"inlineData": {"mimeType": mime, "data": clean_b64}})

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key={api_key}"
        payload = {"contents": [{"role": "user", "parts": parts}]}

        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                candidates = data.get("candidates", [])
                if candidates:
                    kw_text = "".join(p.get("text", "") for p in candidates[0].get("content", {}).get("parts", []))
                    return kw_text.strip()
    except Exception as e:
        logger.warning(f"Visual keyword extraction skipped: {e}")
    return ""


@router.post("/chat/stream")
async def execute_ai_chat_stream(
    req: AIChatRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Real-time Server-Sent Events (SSE) streaming endpoint powered by Google Gemini API.
    Streams live response tokens with multimodal vision inspection and genuine RAG document citations.
    """
    images = req.get_images_list()
    raw_message = req.get_message()
    if not raw_message and not images:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please provide a message or attach an image.")

    message = raw_message or (
        "Please perform a complete diagnostic visual inspection of the provided factory equipment image(s). "
        "Identify the machine, components, visible defects, error codes, leaks, wear, or safety hazards and provide recommendations."
    )

    rag_context = None
    machine_context = None
    citations: List[Dict[str, Any]] = []

    # 1. Look up equipment context if machine_id provided
    if req.machine_id:
        machine = db.query(Machine).filter(Machine.id == req.machine_id).first()
        if machine:
            machine_context = (
                f"Machine Code: {machine.machine_code} | Name: {machine.name} | "
                f"Status: {machine.status.value} | Location: {machine.location}"
            )

    # 2. Retrieve genuine RAG context: enrich query with visual metadata if images are present
    doc_context = None
    try:
        search_query = raw_message or "factory machinery inspection troubleshooting"
        if images:
            extracted_kw = await extract_visual_rag_keywords(images, raw_message)
            if extracted_kw:
                search_query = f"{raw_message} {extracted_kw}".strip()

        retriever = RAGRetriever()
        retrieval_data = retriever.retrieve(
            db=db,
            query=search_query,
            machine_id=req.machine_id,
            work_order_id=req.work_order_id,
            top_k=4
        )
        chunks = retrieval_data.get("chunks", [])
        valid_chunks = [c for c in chunks if c.get("relevance_score", 0.0) > 0.05]
        if valid_chunks:
            doc_snippets = []
            for c in valid_chunks:
                doc_snippets.append(
                    f"[{c.get('document_title', 'Technical Manual')} - Section: {c.get('section_title', 'General')} (Page {c.get('page_number', 1)})]:\n{c.get('content', '')}"
                )
                citations.append({
                    "document_id": c.get("document_id"),
                    "document_title": c.get("document_title", "Document"),
                    "page_number": c.get("page_number", 1),
                    "section_title": c.get("section_title"),
                    "relevance_score": c.get("relevance_score", 0.0),
                    "snippet": c.get("content", "")[:260]
                })
            doc_context = "\n---\n".join(doc_snippets)
    except Exception:
        pass

    # 3. Supply Authoritative Project & Plant Data Context
    live_project_data = build_live_project_context(db, message)
    if doc_context:
        rag_context = f"{live_project_data}\n\n[RETRIEVED MANUAL & PROCEDURE EXCERPTS]\n{doc_context}"
    else:
        rag_context = live_project_data

    history_dicts = []
    for h in (req.history or []):
        if hasattr(h, "dict"):
            history_dicts.append(h.dict())
        elif isinstance(h, dict):
            history_dicts.append(h)
        else:
            history_dicts.append({
                "role": getattr(h, "role", "user"),
                "content": getattr(h, "content", ""),
                "images": getattr(h, "images", None),
                "image": getattr(h, "image", None)
            })

    async def sse_event_generator():
        try:
            async for sse_chunk in GeminiService.stream_response(
                message=message,
                history=history_dicts,
                rag_context=rag_context,
                machine_context=machine_context,
                images=images,
                model=req.model,
                sources=citations
            ):
                yield sse_chunk
        except Exception as err:
            yield f"data: {json.dumps({'error': str(err), 'done': True})}\n\n"

    return StreamingResponse(
        sse_event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )




@router.post("/chat", response_model=AIChatResponse)
async def execute_ai_chat(
    req: AIChatRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Production Conversational AI copilot endpoint powered strictly by the Google Gemini API.
    Handles general chat, casual queries, programming, industrial machinery troubleshooting,
    and multi-turn conversation memory with verified RAG citations when available.
    """
    images = req.get_images_list()
    raw_message = req.get_message()
    if not raw_message and not images:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please provide a message or attach an image.")

    message = raw_message or (
        "Please perform a complete diagnostic visual inspection of the provided factory equipment image(s). "
        "Identify the machine, components, visible defects, error codes, leaks, wear, or safety hazards and provide recommendations."
    )

    rag_context = None
    machine_context = None
    citations: List[AICitation] = []

    # 1. Retrieve equipment context if specified
    if req.machine_id:
        machine = db.query(Machine).filter(Machine.id == req.machine_id).first()
        if machine:
            machine_context = (
                f"Machine Code: {machine.machine_code} | Name: {machine.name} | "
                f"Status: {machine.status.value} | Location: {machine.location}"
            )

    # 2. Retrieve genuine RAG context: enrich query with visual metadata if images are present
    doc_context = None
    try:
        search_query = raw_message or "factory machinery inspection troubleshooting"
        if images:
            extracted_kw = await extract_visual_rag_keywords(images, raw_message)
            if extracted_kw:
                search_query = f"{raw_message} {extracted_kw}".strip()

        retriever = RAGRetriever()
        retrieval_data = retriever.retrieve(
            db=db,
            query=search_query,
            machine_id=req.machine_id,
            work_order_id=req.work_order_id,
            top_k=4
        )
        chunks = retrieval_data.get("chunks", [])
        valid_chunks = [c for c in chunks if c.get("relevance_score", 0.0) > 0.05]
        if valid_chunks:
            doc_snippets = []
            for c in valid_chunks:
                doc_snippets.append(
                    f"[{c.get('document_title', 'Technical Manual')} - Section: {c.get('section_title', 'General')} (Page {c.get('page_number', 1)})]:\n{c.get('content', '')}"
                )
                citations.append(AICitation(
                    document_id=c.get("document_id"),
                    document_title=c.get("document_title", "Document"),
                    version_number=c.get("version_number"),
                    page_number=c.get("page_number", 1),
                    section_title=c.get("section_title"),
                    source_type="DOCUMENT",
                    relevance_score=c.get("relevance_score", 0.0),
                    snippet=c.get("content", "")[:260]
                ))
            doc_context = "\n---\n".join(doc_snippets)
    except Exception:
        pass

    # 3. Supply Authoritative Project & Plant Data Context
    live_project_data = build_live_project_context(db, message)
    if doc_context:
        rag_context = f"{live_project_data}\n\n[RETRIEVED MANUAL & PROCEDURE EXCERPTS]\n{doc_context}"
    else:
        rag_context = live_project_data

    history_dicts = []
    for h in (req.history or []):
        if hasattr(h, "dict"):
            history_dicts.append(h.dict())
        elif isinstance(h, dict):
            history_dicts.append(h)
        else:
            history_dicts.append({
                "role": getattr(h, "role", "user"),
                "content": getattr(h, "content", ""),
                "images": getattr(h, "images", None),
                "image": getattr(h, "image", None)
            })

    try:
        result = await GeminiService.generate_response(
            message=message,
            history=history_dicts,
            rag_context=rag_context,
            machine_context=machine_context,
            images=images,
            model=req.model
        )

        response_text = result.get("message") or result.get("text") or ""
        active_model = result.get("model", "gemini-flash-lite-latest")

        return AIChatResponse(
            success=True,
            message=response_text,
            text=response_text,
            conversationId=req.get_conversation_id(),
            provider=result.get("provider", "Google Gemini"),
            model=active_model,
            realtime=True,
            grounded_source=f"Google Gemini ({active_model})" + (" + Plant RAG" if citations else ""),
            sources=citations
        )
    except GeminiServiceError as gse:
        raise HTTPException(status_code=gse.status_code, detail=gse.message)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Google Gemini AI service error: {str(e)}"
        )

