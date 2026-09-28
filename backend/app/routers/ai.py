import os
import re
import json
import httpx
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
    AIQueryRequest, AIQueryResponse, AIFeedbackRequest, AIQueryHistoryItem, AICitation, AIPreviousRepair,
    AIChatRequest, AIChatResponse, AIVerifyKeyRequest, AIVerifyKeyResponse
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


@router.post("/verify-key", response_model=AIVerifyKeyResponse)
def verify_api_key(
    req: AIVerifyKeyRequest,
    current_user: User = Depends(get_current_user)
):
    """Verify live connectivity for Gemini or OpenAI API keys without browser CORS restrictions."""
    key = req.api_key.strip().replace('"', '').replace("'", "")
    if not key:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="API key cannot be empty.")

    provider = (req.provider or "gemini").lower()
    model = req.model or ("gemini-2.0-flash" if provider == "gemini" else "gpt-4o-mini")

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


@router.post("/chat", response_model=AIChatResponse)
def execute_ai_chat(
    req: AIChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """High-speed real-time conversational AI copilot endpoint.
    Executes live model inference using user's configured API key (Gemini/OpenAI) or local grounded RAG.
    """
    message = req.get_message()
    if not message:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Message cannot be empty.")

    # 1. Resolve API Key from request payload or backend environment
    api_key = (
        req.api_key
        or os.getenv("GEMINI_API_KEY")
        or os.getenv("GOOGLE_API_KEY")
        or os.getenv("OPENAI_API_KEY")
        or os.getenv("LLM_API_KEY")
        or ""
    ).strip().replace('"', '').replace("'", "")

    provider = (req.provider or "gemini").lower()
    selected_model = req.model or ("gemini-2.0-flash" if provider == "gemini" else "gpt-4o-mini")

    # 2. Extract Plant Grounding Context (Machine details, telemetry, relevant document chunks)
    machine = None
    classification = StructuredTools.classify_query(message)

    if req.machine_id:
        machine = db.query(Machine).filter(Machine.id == req.machine_id).first()
    elif classification.get("machine_code"):
        machine = db.query(Machine).filter(Machine.machine_code.ilike(classification["machine_code"].strip())).first()
        if machine:
            req.machine_id = machine.id

    machine_context = ""
    if machine:
        machine_context = (
            f"Machine Code: {machine.machine_code} | Name: {machine.name} | "
            f"Type: {machine.type} | Department: {machine.department} | "
            f"Status: {machine.status.value} | Location: {machine.location}"
        )

    try:
        retriever = RAGRetriever()
        retrieval_data = retriever.retrieve(
            db=db,
            query=message,
            machine_id=req.machine_id,
            work_order_id=req.work_order_id,
            top_k=4
        )
        chunks = retrieval_data.get("chunks", [])
        doc_context = ""
        if chunks:
            doc_context = "\n---\n".join([
                f"[{c.get('document_title', 'Technical Manual')} - Section: {c.get('section_title', 'General')} (Page {c.get('page_number', 1)})]:\n{c.get('content', '')}"
                for c in chunks[:4]
            ])
        previous_repairs = retrieval_data.get("previous_repairs", [])
        repair_context = ""
        if previous_repairs:
            repair_context = "\n".join([
                f"- Verified Repair ({pr.get('date', 'N/A')}): Problem: {pr.get('summary')} | Cause: {pr.get('root_cause')} | Action: {pr.get('repair_action')}"
                for pr in previous_repairs[:3]
            ])
    except Exception:
        retrieval_data = {"chunks": []}
        doc_context = ""
        repair_context = ""

    # 3. System Instruction for EquipFix AI Copilot (Accurate, Grounded, Professional, No unwanted spam)
    system_instruction = (
        "You are EquipFix AI Copilot — an expert industrial maintenance diagnostics engineer and reliability specialist.\n"
        "Your mission is to provide technically accurate, source-grounded, actionable troubleshooting guidance for plant machinery.\n\n"
        "CORE ENGINEERING PRINCIPLES:\n"
        "1. FACTUAL GROUNDING: Rely strictly on plant equipment manuals, safety SOPs, and engineering facts provided below. If certain details are unknown, state so plainly without hallucination.\n"
        "2. SAFETY FIRST (OSHA 1910.147 LOTO): Enforce zero-energy state isolation (Lockout/Tagout) before any physical inspection, electrical testing, or mechanical disassembly.\n"
        "3. STRUCTURE & CLARITY: Format answers cleanly with markdown headings:\n"
        "   - ### 🔍 Root Cause Analysis\n"
        "   - ### 🛠️ Recommended Action Steps (numbered sequentially)\n"
        "   - ### ⚠️ Safety & Lockout/Tagout (LOTO) Compliance\n"
        "   - ### 📋 Parts & Tools Needed (if applicable)\n"
        "4. NO UNWANTED CONTENT: Do not spam excessive emojis. Do not output canned ASCII diagrams or dummy schematics unless the user explicitly asks for a diagram or schematic. Keep explanations concise, professional, and directly useful to the maintenance technician.\n"
    )
    if machine_context:
        system_instruction += f"\nPlant Equipment Context: {machine_context}\n"
    if doc_context:
        system_instruction += f"\nRelevant Plant Technical Documentation:\n{doc_context}\n"
    if repair_context:
        system_instruction += f"\nVerified Historical Maintenance Records:\n{repair_context}\n"

    # 4. Handle Execution with Google Gemini if API Key is Present
    if api_key and provider == "gemini":
        candidate_models = [selected_model, "gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"]
        seen_m = set()
        clean_models = []
        for m in candidate_models:
            clean_m = m.replace("models/", "")
            if clean_m not in seen_m:
                seen_m.add(clean_m)
                clean_models.append(clean_m)

        # Build clean conversation contents
        clean_contents = []
        for h in (req.history or []):
            h_role = "user" if h.role == "user" else "model"
            h_text = h.content.strip() if h.content else ""
            if not h_text:
                continue
            if clean_contents and clean_contents[-1]["role"] == h_role:
                clean_contents[-1]["parts"][0]["text"] += f"\n\n{h_text}"
            else:
                clean_contents.append({"role": h_role, "parts": [{"text": h_text}]})

        # Ensure first turn is "user"
        while clean_contents and clean_contents[0]["role"] != "user":
            clean_contents.pop(0)

        # Current user turn
        current_parts = [{"text": message}]
        if req.image_base64:
            clean_base64 = re.sub(r"^data:image/[^;]+;base64,", "", req.image_base64)
            current_parts.append({
                "inlineData": {
                    "mimeType": req.image_mime or "image/jpeg",
                    "data": clean_base64
                }
            })

        if clean_contents and clean_contents[-1]["role"] == "user":
            clean_contents[-1]["parts"].extend(current_parts)
        else:
            clean_contents.append({"role": "user", "parts": current_parts})

        # Standard payload with top-level systemInstruction
        payload = {
            "systemInstruction": {
                "parts": [{"text": system_instruction}]
            },
            "contents": clean_contents,
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 2048
            }
        }

        last_error = None
        for cur_model in clean_models:
            endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{cur_model}:generateContent?key={api_key}"
            try:
                with httpx.Client(timeout=14.0) as client:
                    resp = client.post(endpoint, json=payload)
                    # If model rejects systemInstruction (HTTP 400), retry with system instruction prepended to first user turn
                    if resp.status_code == 400 and "systemInstruction" in resp.text:
                        fallback_contents = [
                            {"role": c["role"], "parts": [{"text": p.get("text", "")} for p in c["parts"]]}
                            for c in clean_contents
                        ]
                        if fallback_contents:
                            fallback_contents[0]["parts"][0]["text"] = f"{system_instruction}\n\n{fallback_contents[0]['parts'][0]['text']}"
                        fallback_payload = {
                            "contents": fallback_contents,
                            "generationConfig": {"temperature": 0.2, "maxOutputTokens": 2048}
                        }
                        resp = client.post(endpoint, json=fallback_payload)

                    if resp.status_code == 200:
                        data = resp.json()
                        candidates = data.get("candidates", [])
                        if candidates:
                            parts = candidates[0].get("content", {}).get("parts", [])
                            text_out = "".join(p.get("text", "") for p in parts).strip()
                            if text_out:
                                return AIChatResponse(
                                    text=text_out,
                                    provider=f"Google Gemini ({cur_model})",
                                    model=cur_model,
                                    realtime=True,
                                    grounded_source=f"Gemini {cur_model} + Plant RAG Knowledge Base"
                                )
                    err_json = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
                    err_msg = err_json.get("error", {}).get("message", f"HTTP {resp.status_code}")
                    last_error = err_msg

                    if resp.status_code in (400, 403) and ("API key not valid" in err_msg or "API_KEY_INVALID" in err_msg or "PERMISSION_DENIED" in err_msg):
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Google Gemini API error: {err_msg}. Please check your API key."
                        )
            except HTTPException:
                raise
            except Exception as e:
                last_error = str(e)

        if last_error:
            # Fall back to grounded local response if external call failed
            logger_detail = f"Gemini API attempt encountered: {last_error}. Falling back to internal grounded knowledge base."
            pass

    # 5. Handle Execution with OpenAI if API Key is Present
    if api_key and provider == "openai":
        messages = [{"role": "system", "content": system_instruction}]
        for h in (req.history or []):
            h_role = "user" if h.role == "user" else "assistant"
            messages.append({"role": h_role, "content": h.content})

        user_content = [{"type": "text", "text": message}]
        if req.image_base64:
            data_url = req.image_base64 if req.image_base64.startswith("data:") else f"data:{req.image_mime or 'image/jpeg'};base64,{req.image_base64}"
            user_content.append({"type": "image_url", "image_url": {"url": data_url}})
        messages.append({"role": "user", "content": user_content})

        try:
            with httpx.Client(timeout=14.0) as client:
                resp = client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                    json={
                        "model": selected_model,
                        "messages": messages,
                        "max_tokens": 2048,
                        "temperature": 0.2
                    }
                )
                if resp.status_code == 200:
                    data = resp.json()
                    text_out = data["choices"][0]["message"]["content"]
                    return AIChatResponse(
                        text=text_out,
                        provider=f"OpenAI ({selected_model})",
                        model=selected_model,
                        realtime=True,
                        grounded_source=f"OpenAI {selected_model} + Plant RAG Knowledge Base"
                    )
                else:
                    err_msg = resp.json().get("error", {}).get("message", f"HTTP {resp.status_code}")
                    raise HTTPException(status_code=400, detail=f"OpenAI API error: {err_msg}")
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"OpenAI inference failed: {str(e)}")

    # 6. Fallback / No API Key: Intelligent Industrial Operations Copilot
    msg_lower = message.lower().strip()
    pure_greetings = ["hi", "hello", "hey", "who are you", "what can you do", "good morning", "good afternoon", "greetings"]
    is_greeting = msg_lower in pure_greetings or (
        any(msg_lower.startswith(g) for g in ["hi ", "hello ", "hey "]) and len(msg_lower.split()) <= 3
    )

    if is_greeting:
        return AIChatResponse(
            text=(
                "### 🤖 EquipFix AI Operations Director Copilot\n"
                "Hello! I am your AI Diagnostics & Plant Operations Assistant. I monitor real-time plant machinery, "
                "parse technical manuals, enforce OSHA 1910.147 LOTO compliance, and diagnose equipment anomalies.\n\n"
                "### 💡 Available Capabilities\n"
                "• 🔍 **Real-Time Fault Diagnostics**: Inquire about machine error codes, vibration spikes, or hydraulic leaks.\n"
                "• 🛡️ **OSHA LOTO Safety Standard**: Execute zero-energy isolation checklists with certified safety sign-off.\n"
                "• 📦 **Spare Parts & Inventory**: Look up compatible OEM parts and restock levels.\n"
                "• ⚡ **Direct AI Key**: Click **Configure AI Key** above to link your Google Gemini API key for instant multi-turn reasoning and visual inspection!"
            ),
            provider="EquipFix Industrial Engine",
            model="Local Rule Engine",
            realtime=False,
            grounded_source="EquipFix Core Knowledge Base"
        )

    # 7. Check if user asked a direct structured fact (e.g. machine status, spare parts stock)
    if classification.get("type") == "STRUCTURED":
        tool_name = classification["tool"]
        tool_params = classification["params"]
        tool_result = StructuredTools.execute_tool(db, tool_name, **tool_params)
        m_code = classification.get("machine_code") or (machine.machine_code if machine else "")

        fact_text = f"### 📊 Relational Database Record: {tool_name.replace('get_', '').replace('_', ' ').title()}\n"
        if "status" in tool_result:
            fact_text += f"- **Equipment**: {m_code}\n- **Operational Status**: `{tool_result.get('status')}`\n- **Location**: {tool_result.get('location', 'N/A')}\n"
            if tool_result.get("next_scheduled_maintenance"):
                fact_text += f"- **Next Scheduled Maintenance**: {tool_result.get('next_scheduled_maintenance')}\n"
            if tool_result.get("active_incidents_count") is not None:
                fact_text += f"- **Active Incidents**: {tool_result.get('active_incidents_count')}\n"
        elif "parts" in tool_result:
            fact_text += f"- **Parts Found**: {tool_result.get('total_parts', len(tool_result.get('parts', [])))}\n"
            for p in tool_result.get("parts", [])[:5]:
                fact_text += f"  • `{p.get('part_code')}`: **{p.get('name')}** — In Stock: **{p.get('current_stock')}** (Min: {p.get('minimum_stock')}) | Unit Cost: ${p.get('unit_cost')}\n"
        else:
            fact_text += f"```json\n{json.dumps(tool_result, indent=2, default=str)}\n```\n"

        return AIChatResponse(
            text=fact_text,
            provider="EquipFix Structured Fact Engine",
            model="PostgreSQL Relational Store",
            realtime=True,
            grounded_source="PostgreSQL Operational Tables"
        )

    # 8. Grounded Local RAG Synthesis (Clean, Accurate, NO unwanted dummy flowcharts)
    generator = GroundedGenerator()
    rag_res = generator.generate_response(
        query=message,
        retrieval_data=retrieval_data if "retrieval_data" in locals() else {"chunks": []},
        machine_code=machine.machine_code if machine else None,
        query_id=1,
        user_role=current_user.role.name if current_user.role else "TECHNICIAN"
    )

    formatted_text = f"### 🔍 Root Cause Analysis\n{rag_res.possible_cause}\n\n"
    if rag_res.recommended_checks:
        formatted_text += "### 🛠️ Recommended Action Steps\n" + "\n".join([f"🔹 **Step {i+1}**: {c}" for i, c in enumerate(rag_res.recommended_checks)]) + "\n\n"
    if rag_res.safety_warnings:
        formatted_text += "### ⚠️ Safety & Lockout/Tagout (LOTO) Compliance\n" + "\n".join(rag_res.safety_warnings) + "\n\n"
    if rag_res.sources:
        formatted_text += "### 📚 Plant Documentation Sources\n" + "\n".join([
            f"• **{s.document_title}** (Page {s.page_number}, {s.section_title}) — Relevance: {int(s.relevance_score * 100)}%"
            for s in rag_res.sources[:3]
        ]) + "\n"

    return AIChatResponse(
        text=formatted_text,
        provider="EquipFix Local RAG Engine",
        model="Industrial RAG",
        realtime=False,
        grounded_source="Internal Plant Manuals & Vector Store",
        query_id=rag_res.query_id
    )
