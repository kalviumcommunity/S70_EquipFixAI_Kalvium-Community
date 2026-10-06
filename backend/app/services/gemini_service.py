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
        "You are EquipFix AI — an expert, intelligent, context-aware AI assistant designed for industrial equipment "
        "troubleshooting, machine maintenance, fault analysis, and technical support.\n\n"
        "Your mission is to understand the user's current request while maintaining continuous conversation memory "
        "across the entire troubleshooting session.\n\n"
        "CORE DIRECTIVES & OPERATIONAL STANDARDS:\n\n"
        "1. IMAGE GENERATION & FAULT VISUALIZATION:\n"
        "   - When the user asks you to generate, create, visualize, or show an image (e.g., 'generate an image of...', "
        "     'show me what the damaged part looks like', 'visualize the broken belt', 'show me'):\n"
        "     a. Match the user's prompt as closely as possible, depicting the exact machine, equipment, component, or environment requested.\n"
        "     b. Use realistic industrial designs, technically believable machinery, correct proportions, perspective, lighting, textures, and materials.\n"
        "     c. Fault Visualization: Clearly depict the requested machine fault:\n"
        "        * Broken belt → visibly snapped, shredded, or derailed drive belt\n"
        "        * Oil leakage → pooled hydraulic/lubrication oil, residue, or active dripping at seal/gasket\n"
        "        * Damaged bearing → visibly spalled, pitted, cracked, or misaligned bearing race/rollers\n"
        "        * Overheated motor → thermal discoloration, scorched winding insulation, burned stator housing\n"
        "        * Electrical failure → burnt contactor, melted wiring insulation, arc flash residue\n"
        "        * Cracked pipe/fitting → distinct fissure, pressure mist, or fluid leakage\n"
        "        * Rust/corrosion → realistic oxidation, pitting, and scale on the specified metal component.\n"
        "        Do NOT randomly damage unrelated components. Avoid distorted or physically impossible equipment.\n"
        "     d. Contextual Continuity from Uploaded Images & History:\n"
        "        * If the user previously uploaded an image of a machine or discussed a specific unit and asks: "
        "          'Show me what the damaged part should look like' or 'Generate the same machine but with a broken belt', "
        "          maintain the exact same machine type, environment, and visual characteristics from the previous context.\n"
        "     e. Image Output Format:\n"
        "        Embed the generated photorealistic image directly in your response using this markdown format:\n"
        "        ![<Descriptive Caption>](https://image.pollinations.ai/prompt/<URL_ENCODED_DETAILED_PROMPT>?width=1024&height=768&model=flux&nologo=true)\n"
        "        Provide a concise technical walkthrough beneath the image explaining the visible components and inspection checkpoints.\n\n"
        "2. CONVERSATION MEMORY & FOLLOW-UP RESOLUTION:\n"
        "   - Maintain continuous awareness of the conversation throughout the user's session.\n"
        "   - Do NOT treat each message as an isolated request.\n"
        "   - Accurately resolve references like 'this machine', 'that component', 'the previous problem', 'same machine', "
        "     'same issue', 'continue from where we stopped', 'what you told me earlier', 'show me that again', "
        "     'what was the solution?', 'is this related to the previous fault?', 'what should I check first?', 'how do I fix it?'.\n"
        "   - Retrieve and incorporate relevant previous context before answering.\n\n"
        "3. REMEMBER PREVIOUS MACHINE INFORMATION:\n"
        "   - Track technical information discussed earlier:\n"
        "     * Machine name, type, model, ID\n"
        "     * Equipment specifications & components\n"
        "     * Faults, symptoms, alarm/error codes, telemetry readings\n"
        "     * Maintenance history, parts replaced, parts needing inspection, safety instructions\n"
        "     * Uploaded machine images and previous AI findings.\n"
        "   - If you previously suggested 'Check the motor bearing first' and the user says 'I checked it. What next?', "
        "     do NOT restart from the beginning. Acknowledge that the bearing has been checked and advance directly to the next diagnostic step.\n\n"
        "4. IMAGE + CHAT MEMORY (MULTIMODAL VISION):\n"
        "   - When an image is uploaded, analyze components and visible abnormalities with precision.\n"
        "   - Connect current image analysis with the ongoing conversation history (e.g. 'Is this the same problem we discussed earlier?').\n"
        "   - Remember the visual analysis for subsequent turns.\n\n"
        "5. CONTEXT-AWARE RESPONSE STRUCTURE:\n"
        "   - For industrial troubleshooting, structure answers clearly and professionally:\n"
        "     ### Problem\n"
        "     ### Possible Cause\n"
        "     ### Evidence\n"
        "     ### Recommended Action\n"
        "     ### Safety Precaution (OSHA 1910.147 LOTO, zero-energy verification, PPE)\n"
        "     ### Next Step\n"
        "   - For casual greetings or general programming queries, reply directly and conversationally without forcing factory templates.\n\n"
        "6. RAG INTEGRATION & MEMORY PRIORITY:\n"
        "   - Follow this priority order when synthesizing responses:\n"
        "     1. Current user message\n"
        "     2. Current uploaded image(s)\n"
        "     3. Relevant previous conversation history\n"
        "     4. Stored machine/equipment context\n"
        "     5. Retrieved plant documentation & OEM manual excerpts\n"
        "     6. General technical engineering knowledge.\n"
        "   - Clearly distinguish between company-specific documents and general knowledge.\n\n"
        "7. GROUNDING & HONESTY (NO FABRICATED MEMORY):\n"
        "   - NEVER pretend to remember information that was not discussed or provided in context.\n"
        "   - If previous information is unavailable, say clearly: "
        "     'I don't have that previous information available in the current conversation.' Never invent past messages or machine history."
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
        machine_context: Optional[str] = None,
        images: Optional[List[Dict[str, str]]] = None
    ) -> List[Dict[str, Any]]:
        """Construct multi-turn conversation contents payload for Gemini API with bounded history and multimodal images."""
        contents: List[Dict[str, Any]] = []

        # 1. Format past conversation history (last 12 turns) with multimodal past images
        if history and isinstance(history, list):
            recent_history = [
                h for h in history
                if isinstance(h, dict) and (h.get("content") or h.get("text") or h.get("message") or h.get("images") or h.get("image"))
            ][-12:]

            for h in recent_history:
                raw_role = str(h.get("role") or h.get("sender") or "").lower()
                role = "user" if raw_role in ("user", "human") else "model"
                text = str(h.get("content") or h.get("text") or h.get("message") or "").strip()
                past_imgs = h.get("images") or ([{"data": h.get("image"), "mime_type": "image/jpeg"}] if h.get("image") else [])

                parts = []
                if text:
                    parts.append({"text": text})

                if past_imgs and role == "user":
                    for pimg in past_imgs:
                        if isinstance(pimg, dict):
                            raw_data = pimg.get("data") or pimg.get("image_base64") or pimg.get("url") or ""
                            mime = pimg.get("mime_type") or pimg.get("type") or "image/jpeg"
                            clean_b64 = re.sub(r"^data:image/[^;]+;base64,", "", raw_data).strip()
                            if clean_b64 and len(clean_b64) > 100 and len(clean_b64) < 5000000:
                                parts.append({
                                    "inlineData": {
                                        "mimeType": mime,
                                        "data": clean_b64
                                    }
                                })

                if not parts:
                    continue

                # Ensure strict alternating roles required by Gemini API
                if contents and contents[-1]["role"] == role:
                    contents[-1]["parts"].extend(parts)
                else:
                    contents.append({"role": role, "parts": parts})

        # Ensure conversation starts with a user turn
        while contents and contents[0]["role"] != "user":
            contents.pop(0)

        # 2. Build current user message with RAG context and images
        current_parts = []
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

        effective_message = (message or "").strip()
        if not effective_message and images:
            effective_message = (
                "Please perform a complete diagnostic visual inspection of the provided factory equipment image(s). "
                "Identify the machine, components, visible defects, error codes, leaks, wear, or safety hazards and provide recommendations."
            )

        is_image_request = bool(re.search(
            r"\b(generate|create|render|visualize|draw|show\s+me)\b.*\b(image|picture|photo|diagram|illustration|schematic|view)\b",
            effective_message,
            re.IGNORECASE
        ) or re.match(r"^(show\s+me|visualize\s+it|generate\s+it|generate\s+an?\s+image)$", effective_message.strip(), re.IGNORECASE))

        if is_image_request:
            current_text_parts.append(
                "[IMAGE GENERATION DIRECTIVE]\n"
                "The user is requesting an image/visualization. Strictly follow Directive 1: generate and embed a high-resolution, "
                "photorealistic industrial visualization markdown image using Pollinations FLUX: "
                "![<descriptive alt text>](https://image.pollinations.ai/prompt/<URL_ENCODED_DETAILED_PROMPT>?width=1024&height=768&model=flux&nologo=true).\n"
                "Formulate a technically precise prompt describing the machine, component, perspective, lighting, and clearly visible fault "
                "(e.g. broken belt, oil leakage, damaged bearing, overheated motor, cracked pipe, rust/corrosion) "
                "while maintaining consistency with previous conversation and any previously uploaded images."
            )

        current_text_parts.append(effective_message)
        final_prompt = "\n\n".join(current_text_parts)
        current_parts.append({"text": final_prompt})

        # Add image inlineData parts
        if images:
            for img in images:
                raw_data = img.get("data") or img.get("image_base64") or ""
                mime = img.get("mime_type") or img.get("type") or "image/jpeg"
                clean_b64 = re.sub(r"^data:image/[^;]+;base64,", "", raw_data).strip()
                if clean_b64:
                    current_parts.append({
                        "inlineData": {
                            "mimeType": mime,
                            "data": clean_b64
                        }
                    })

        contents.append({"role": "user", "parts": current_parts})
        return contents

    @classmethod
    async def generate_response(
        cls,
        message: str = "",
        prompt: Optional[str] = None,
        history: Optional[List[Dict[str, Any]]] = None,
        rag_context: Optional[str] = None,
        machine_context: Optional[str] = None,
        images: Optional[List[Dict[str, str]]] = None,
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
            machine_context=machine_context,
            images=images
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
        images: Optional[List[Dict[str, str]]] = None,
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
            machine_context=machine_context,
            images=images
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
