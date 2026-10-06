import os
import re
import json
import logging
from typing import List, Dict, Any, Optional, AsyncGenerator
import httpx
from app.config import settings

logger = logging.getLogger(__name__)

class GeminiServiceError(Exception):
    """Custom exception for Gemini API errors."""
    def __init__(self, message: str, status_code: int = 500, error_code: str = "GEMINI_ERROR"):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_code = error_code


class GeminiService:
    """Production-grade Google Gemini API client for EquipFixAI.
    Manages API key security, system instructions, multi-turn conversation memory,
    streaming SSE generation, and RAG context grounding without fake fallbacks.
    """

    DEFAULT_FALLBACK_MODELS = [
        "gemini-flash-lite-latest",
        "gemini-3.5-flash-lite",
        "gemini-3.6-flash",
        "gemini-3.8-flash",
        "gemini-flash-latest",
    ]

    BASE_SYSTEM_INSTRUCTION = (
        "You are EquipFix AI — an intelligent, versatile, and modern conversational AI assistant.\n\n"
        "CORE PRINCIPLES & DIRECTIVES:\n"
        "1. CLEAR, PRECISE & ADAPTIVE ANSWERS:\n"
        "   - Always answer the user's actual question FIRST. Be direct, clear, relevant, and easy to understand.\n"
        "   - Do NOT add unnecessary filler or repetitive preamble just to make responses longer.\n"
        "   - For simple questions (e.g. greetings, definitions, short inquiries): provide a concise, direct answer.\n"
        "   - For complex questions: provide a well-structured answer with headings, lists, or steps as appropriate.\n"
        "   - Adapt your style to the user's intent: direct answer, technical explanation, coding solution, "
        "     step-by-step instructions, comparison table, or troubleshooting.\n"
        "   - Do NOT force every response into the same rigid template.\n\n"
        "2. GENERAL CONVERSATION & PROGRAMMING:\n"
        "   - Handle general chat, greetings, casual questions, programming (Python, JavaScript, algorithms, etc.), "
        "     email drafting, and conceptual topics naturally and conversationally.\n"
        "   - NEVER force factory or manufacturing concepts into general conversations.\n"
        "   - For coding questions, provide clean, runnable code in markdown code blocks with the correct language identifier "
        "     (e.g., ```python), along with brief explanations.\n\n"
        "3. INDUSTRIAL & EQUIPMENT TROUBLESHOOTING:\n"
        "   - When answering equipment, machinery, manufacturing, or maintenance issues (e.g., motor overheating, "
        "     CNC vibration, belt slippage, bearing noise), provide practical, structured guidance:\n"
        "     ### Possible Causes\n"
        "     * Cause 1\n"
        "     * Cause 2\n"
        "     ### What to Check\n"
        "     1. Verification step 1\n"
        "     2. Inspection step 2\n"
        "     ### Recommended Action\n"
        "     * Practical corrective action\n"
        "     ### Safety\n"
        "     * Essential safety precautions (e.g., OSHA 1910.147 Lockout/Tagout - LOTO, PPE, zero-energy state).\n"
        "   - Never invent equipment models, sensor readings, maintenance history, or company SOPs.\n"
        "   - If key specifications are missing, ask the user for them rather than guessing.\n\n"
        "4. GROUNDING & HONESTY:\n"
        "   - Distinguish general knowledge from company-specific data. If company/plant documents are provided in the context, "
        "     use and cite them. If no documents were retrieved, clearly state that company-specific records were not available.\n\n"
        "5. CONVERSATION CONTEXT & CLARIFICATIONS:\n"
        "   - Maintain context across messages (e.g., correlating pronouns or measurements like '95°C' to the equipment discussed earlier).\n"
        "   - When asked to 'Explain differently' or 'Explain simpler', break down the previous answer in intuitive, "
        "     beginner-friendly terms without losing technical correctness.\n\n"
        "6. CLEAN MARKDOWN FORMATTING:\n"
        "   - Use clean Markdown: paragraphs, headings (###), bold (**text**), bullet points (* or -), numbered lists (1.), "
        "     tables (| Column 1 | Column 2 |), and code blocks (```lang)."
    )

    @classmethod
    def get_api_key(cls) -> str:
        """Retrieve Gemini API key strictly from server environment / settings."""
        key = (
            getattr(settings, "GEMINI_API_KEY", None)
            or os.getenv("GEMINI_API_KEY")
            or os.getenv("GOOGLE_API_KEY")
            or ""
        ).strip().replace('"', '').replace("'", "")
        return key

    @classmethod
    def get_configured_model(cls) -> str:
        """Retrieve model identifier from settings/env."""
        model = (
            getattr(settings, "GEMINI_MODEL", None)
            or os.getenv("GEMINI_MODEL")
            or "gemini-flash-lite-latest"
        ).strip().replace("models/", "")
        return model or "gemini-flash-lite-latest"

    @classmethod
    def get_model_candidates(cls, requested_model: Optional[str] = None) -> List[str]:
        """Ordered candidate models for resilient failover."""
        selected = (requested_model or cls.get_configured_model()).replace("models/", "").strip()
        candidates = []
        if selected:
            candidates.append(selected)

        for m in cls.DEFAULT_FALLBACK_MODELS:
            if m not in candidates:
                candidates.append(m)
        return candidates

    @classmethod
    def build_contents_payload(
        cls,
        message: str,
        history: Optional[List[Dict[str, Any]]] = None,
        rag_context: Optional[str] = None,
        machine_context: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Construct multi-turn conversation contents payload for Gemini API with bounded history."""
        contents: List[Dict[str, Any]] = []

        # 1. Format past conversation history (last 10 turns to avoid token overflow)
        if history and isinstance(history, list):
            recent_history = [
                h for h in history
                if isinstance(h, dict) and (h.get("content") or h.get("text") or h.get("message"))
            ][-10:]

            for h in recent_history:
                raw_role = str(h.get("role") or h.get("sender") or "").lower()
                role = "user" if raw_role in ("user", "human") else "model"
                text = str(h.get("content") or h.get("text") or h.get("message") or "").strip()

                if not text:
                    continue

                # Ensure strict alternating roles required by Gemini API
                if contents and contents[-1]["role"] == role:
                    contents[-1]["parts"][0]["text"] += f"\n\n{text}"
                else:
                    contents.append({"role": role, "parts": [{"text": text}]})

        # Ensure conversation starts with a user turn
        while contents and contents[0]["role"] != "user":
            contents.pop(0)

        # 2. Build current user message with RAG context if present
        current_text_parts = []
        if machine_context:
            current_text_parts.append(f"[EQUIPMENT CONTEXT]\n{machine_context}")
        if rag_context:
            current_text_parts.append(
                f"[VERIFIED APPLICATION / PLANT DOCUMENTATION EXCERPTS]\n"
                f"{rag_context}\n"
                f"Note: Use these excerpts where relevant. If they do not answer the query, "
                f"use general knowledge and state that internal documentation did not specify."
            )
        current_text_parts.append(message)
        final_prompt = "\n\n".join(current_text_parts)

        if contents and contents[-1]["role"] == "user":
            contents[-1]["parts"][0]["text"] += f"\n\n{final_prompt}"
        else:
            contents.append({"role": "user", "parts": [{"text": final_prompt}]})

        return contents

    @classmethod
    async def generate_response(
        cls,
        message: str = "",
        prompt: Optional[str] = None,
        history: Optional[List[Dict[str, Any]]] = None,
        rag_context: Optional[str] = None,
        machine_context: Optional[str] = None,
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2048
    ) -> Dict[str, Any]:
        """Synchronous / standard chat generation with Gemini API."""
        user_message = (message or prompt or "").strip()
        api_key = cls.get_api_key()
        if not api_key:
            raise GeminiServiceError(
                "Google Gemini API key is not configured on the server. Please set GEMINI_API_KEY in the backend environment.",
                status_code=503,
                error_code="MISSING_API_KEY"
            )

        contents = cls.build_contents_payload(
            message=user_message,
            history=history,
            rag_context=rag_context,
            machine_context=machine_context
        )

        models_to_try = cls.get_model_candidates(model)
        last_error_msg = "Unknown Gemini API error"

        async with httpx.AsyncClient(timeout=25.0) as client:
            for cur_model in models_to_try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{cur_model}:generateContent?key={api_key}"
                payload = {
                    "contents": contents,
                    "systemInstruction": {
                        "parts": [{"text": cls.BASE_SYSTEM_INSTRUCTION}]
                    },
                    "generationConfig": {
                        "temperature": temperature,
                        "maxOutputTokens": max_tokens
                    }
                }

                try:
                    resp = await client.post(url, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        candidates = data.get("candidates", [])
                        if candidates:
                            parts = candidates[0].get("content", {}).get("parts", [])
                            text = "".join(p.get("text", "") for p in parts if "text" in p).strip()
                            if text:
                                return {
                                    "success": True,
                                    "message": text,
                                    "text": text,
                                    "model": cur_model,
                                    "provider": f"Google Gemini ({cur_model})"
                                }
                    elif resp.status_code == 429:
                        last_error_msg = "Gemini API rate limit or quota exceeded. Please try again in a moment."
                        logger.warning(f"Gemini quota exceeded on model {cur_model}, trying next candidate...")
                        continue
                    elif resp.status_code in (401, 403):
                        logger.error(f"Gemini API authentication failed (HTTP {resp.status_code}).")
                        raise GeminiServiceError(
                            "Invalid or unauthorized Gemini API key on the backend.",
                            status_code=401,
                            error_code="INVALID_API_KEY"
                        )
                    elif resp.status_code in (400, 404):
                        err_json = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
                        err_msg = str(err_json.get("error", {}).get("message", "")).lower()
                        if "api key" in err_msg or "key_invalid" in err_msg:
                            raise GeminiServiceError(
                                "Invalid Gemini API key configured on backend.",
                                status_code=401,
                                error_code="INVALID_API_KEY"
                            )
                        last_error_msg = f"Model {cur_model} returned {resp.status_code}: {err_msg}"
                        continue
                    else:
                        last_error_msg = f"Gemini API returned HTTP {resp.status_code}"
                except httpx.RequestError as req_err:
                    last_error_msg = f"Network connection error to Gemini API: {str(req_err)}"
                    logger.warning(f"Network error on {cur_model}: {req_err}")
                    continue

        raise GeminiServiceError(
            f"Failed to generate AI response: {last_error_msg}",
            status_code=502,
            error_code="GEMINI_API_FAILURE"
        )

    @classmethod
    async def stream_response(
        cls,
        message: str = "",
        prompt: Optional[str] = None,
        history: Optional[List[Dict[str, Any]]] = None,
        rag_context: Optional[str] = None,
        machine_context: Optional[str] = None,
        model: Optional[str] = None,
        sources: Optional[List[Dict[str, Any]]] = None,
        temperature: float = 0.7,
        max_tokens: int = 2048
    ) -> AsyncGenerator[str, None]:
        """Real-time SSE token streaming from Gemini API."""
        user_message = (message or prompt or "").strip()
        api_key = cls.get_api_key()
        if not api_key:
            yield f"data: {json.dumps({'error': 'Google Gemini API key is not configured on the backend.', 'done': True})}\n\n"
            return

        contents = cls.build_contents_payload(
            message=user_message,
            history=history,
            rag_context=rag_context,
            machine_context=machine_context
        )

        models_to_try = cls.get_model_candidates(model)
        streamed_any = False

        async with httpx.AsyncClient(timeout=30.0) as client:
            for cur_model in models_to_try:
                if streamed_any:
                    break

                url = f"https://generativelanguage.googleapis.com/v1beta/models/{cur_model}:streamGenerateContent?key={api_key}&alt=sse"
                payload = {
                    "contents": contents,
                    "systemInstruction": {
                        "parts": [{"text": cls.BASE_SYSTEM_INSTRUCTION}]
                    },
                    "generationConfig": {
                        "temperature": temperature,
                        "maxOutputTokens": max_tokens
                    }
                }

                try:
                    async with client.stream("POST", url, json=payload) as resp:
                        if resp.status_code == 200:
                            async for line in resp.aiter_lines():
                                if line.startswith("data: "):
                                    json_str = line[6:].strip()
                                    if json_str:
                                        try:
                                            chunk_data = json.loads(json_str)
                                            candidates = chunk_data.get("candidates", [])
                                            if candidates:
                                                parts = candidates[0].get("content", {}).get("parts", [])
                                                chunk_text = "".join(p.get("text", "") for p in parts if "text" in p)
                                                if chunk_text:
                                                    streamed_any = True
                                                    yield f"data: {json.dumps({'text': chunk_text, 'done': False})}\n\n"
                                                if candidates[0].get("finishReason"):
                                                    break
                                        except Exception:
                                            pass
                            if streamed_any:
                                yield f"data: {json.dumps({'text': '', 'done': True, 'model': cur_model, 'sources': sources or []})}\n\n"
                                return
                        elif resp.status_code == 429:
                            continue
                        elif resp.status_code in (401, 403):
                            yield f"data: {json.dumps({'error': 'Invalid or unauthorized Gemini API key on backend.', 'done': True})}\n\n"
                            return
                        elif resp.status_code in (400, 404):
                            continue
                except Exception as stream_err:
                    logger.warning(f"Stream error on {cur_model}: {stream_err}")
                    if streamed_any:
                        return
                    continue

        if not streamed_any:
            yield f"data: {json.dumps({'error': 'Google Gemini API is currently experiencing high load. Please try again in a moment.', 'done': True})}\n\n"


gemini_service = GeminiService()
