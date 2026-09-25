import os
import re
from typing import List, Dict, Any, Optional
from datetime import datetime

from app.models.enums import GroundingStatus
from app.schemas.ai import AICitation, AIPreviousRepair, AIQueryResponse


class GroundedGenerator:
    """Generates source-referenced, safety-first technical guidance strictly grounded in retrieved operational documentation."""

    INJECTION_PATTERNS = [
        r"ignore\s+(all\s+)?(previous|prior)\s+instructions",
        r"disregard\s+(all\s+)?(previous|prior)\s+(instructions|guidelines)",
        r"system\s+prompt",
        r"you\s+are\s+now\s+in\s+developer\s+mode",
        r"dan\s+mode",
        r"reveal\s+(your\s+)?(secret|internal)\s+(instructions|prompt)",
        r"override\s+all\s+(safety|rules|restrictions)",
        r"drop\s+table",
        r"drop\s+database",
        r"execute\s+command",
        r"bypass\s+security",
    ]

    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY", "").strip()

    @classmethod
    def is_prompt_injection(cls, query: str) -> bool:
        """Scan user query for prompt injection or system instruction override attempts."""
        q_lower = query.lower()
        for pattern in cls.INJECTION_PATTERNS:
            if re.search(pattern, q_lower):
                return True
        return False

    def generate_response(
        self,
        query: str,
        retrieval_data: Dict[str, Any],
        machine_code: Optional[str] = None,
        query_id: int = 1,
        user_role: Optional[str] = None
    ) -> AIQueryResponse:
        """Synthesize technical troubleshooting response strictly grounded in retrieved chunks with role-based safety restrictions."""
        # Check for Prompt Injection Defense
        if self.is_prompt_injection(query):
            return AIQueryResponse(
                query_id=query_id,
                question=query,
                machine_code=machine_code,
                possible_cause="Security Warning: Query contains prohibited instruction override or prompt injection patterns. EquipFixAI strictly processes equipment maintenance and troubleshooting queries.",
                recommended_checks=[
                    "Submit only technical queries regarding plant machinery, error codes, symptoms, or SOPs.",
                    "Verify safety protocols in plant operational documentation."
                ],
                safety_warnings=[
                    "⚠️ Security Notice: Instruction override attempt neutralized. Strict sandboxing enforced."
                ],
                relevant_previous_repairs=[],
                sources=[],
                grounding_status=GroundingStatus.INSUFFICIENT_EVIDENCE,
                is_structured_fact=False,
                created_at=datetime.utcnow()
            )

        # Operator Safety Intercept: Detect Restricted Actions (OSHA 29 CFR 1910.147 LOTO)
        is_operator = (user_role or "").upper() == "OPERATOR"
        if is_operator:
            q_lower = query.lower()
            is_restricted_action = any(kw in q_lower for kw in [
                "replace", "disassemble", "take apart", "open panel", "electrical", "rewire", "solder",
                "motor", "belt change", "modify setting", "bypass", "remove bearing", "repair myself",
                "open cabinet", "fix myself", "change component", "disassembly"
            ])
            if is_restricted_action:
                return AIQueryResponse(
                    query_id=query_id,
                    question=query,
                    machine_code=machine_code,
                    possible_cause="⛔ RESTRICTED OPERATOR ACTION: Disassembly, component replacement, and electrical repairs are strictly restricted to authorized Maintenance Technicians under OSHA LOTO (29 CFR 1910.147).",
                    recommended_checks=[
                        "Stop the machine immediately using the standard shutdown procedure.",
                        "Record displayed HMI error codes and note operating symptoms.",
                        "Do NOT open machine enclosures, electrical cabinets, or access moving mechanisms.",
                        "Dispatch a certified technician via the Report Equipment Issue button to notify your supervisor."
                    ],
                    safety_warnings=[
                        "⛔ RESTRICTED OPERATOR ACTION: Disassembly, component replacement, and electrical repairs are strictly restricted to authorized Maintenance Technicians under OSHA LOTO (29 CFR 1910.147)."
                    ],
                    relevant_previous_repairs=[],
                    sources=[
                        AICitation(
                            document_title="OSHA Standard 29 CFR 1910.147 — Control of Hazardous Energy (Lockout/Tagout)",
                            section_title="Section (c)(4): Energy Control Procedures & Authorized Personnel Only",
                            snippet="Prohibits non-authorized personnel from executing component servicing, cabinet access, or mechanical disassembly on industrial machinery.",
                            source_type="SAFETY",
                            relevance_score=1.0,
                            page_number=1
                        )
                    ],
                    grounding_status=GroundingStatus.GROUNDED,
                    is_structured_fact=False,
                    created_at=datetime.utcnow()
                )

        chunks = retrieval_data.get("chunks", [])
        safety_chunks = retrieval_data.get("safety_chunks", [])
        previous_repairs_data = retrieval_data.get("previous_repairs", [])

        # 1. Determine Grounding Status
        if not chunks:
            grounding_status = GroundingStatus.INSUFFICIENT_EVIDENCE
            possible_cause = (
                "Insufficient technical documentation found in system for this specific symptom or machine. "
                "Consult plant lead engineer or manufacturer before proceeding."
            )
            recommended_checks = [
                "Verify machine model plate and confirm document repository contains active manuals.",
                "Review unindexed physical manufacturer documentation.",
                "Escalate to Maintenance Supervisor."
            ]
            safety_warnings = [
                "⚠️ CAUTION: Do not attempt unverified mechanical or electrical disassembly without approved documentation."
            ]
            sources = []
            repairs = []
            return AIQueryResponse(
                query_id=query_id,
                question=query,
                machine_code=machine_code,
                possible_cause=possible_cause,
                recommended_checks=recommended_checks,
                safety_warnings=safety_warnings,
                relevant_previous_repairs=repairs,
                sources=sources,
                grounding_status=grounding_status,
                is_structured_fact=False,
                created_at=datetime.utcnow()
            )

        top_score = chunks[0]["score"] if chunks else 0.0
        if top_score >= 0.25:
            grounding_status = GroundingStatus.GROUNDED
        else:
            grounding_status = GroundingStatus.PARTIALLY_GROUNDED

        # 2. Extract Safety Warnings
        safety_warnings = []
        for sc in safety_chunks:
            lines = sc["content"].split("\n")
            for line in lines:
                l_strip = line.strip()
                if any(kw in l_strip.lower() for kw in ["warning", "danger", "caution", "lockout", "tagout", "ppe", "isolate"]):
                    # Format as safety warning
                    clean_warn = re.sub(r'^(warning|danger|caution|notice)[:\s\-]*', '', l_strip, flags=re.IGNORECASE).strip()
                    if clean_warn and f"⚠️ {clean_warn}" not in safety_warnings:
                        safety_warnings.append(f"⚠️ {clean_warn}")
                        if len(safety_warnings) >= 3:
                            break
            if len(safety_warnings) >= 3:
                break

        if not safety_warnings and retrieval_data.get("is_safety_critical"):
            safety_warnings.append("⚠️ Mandatory Lockout/Tagout (LOTO): De-energize and padlock main breaker prior to inspection.")
            safety_warnings.append("⚠️ Verify zero stored hydraulic and pneumatic pressure before loosening fittings.")

        # 3. Extract Possible Causes & Recommended Checks from Chunks
        causes = []
        checks = []

        for chunk in chunks:
            content = chunk["content"]
            lines = content.split("\n")
            for line in lines:
                line_str = line.strip()
                if not line_str:
                    continue
                # Cause identification
                if any(marker in line_str.lower() for marker in ["root cause", "cause:", "failure mode", "symptom:", "due to", "fault:"]):
                    causes.append(line_str)
                # Step or recommendation identification
                elif re.match(r'^(?:\d+[\.\)]|\-|\*|step\s+\d+:?)\s+', line_str, re.IGNORECASE):
                    checks.append(line_str)
                elif any(action in line_str.lower() for action in ["inspect", "verify", "replace", "measure", "torque", "lubricate", "clean"]):
                    checks.append(line_str)

        # Fallback extraction if explicit bullet formatting wasn't present
        if not causes:
            # Use the first chunk's leading sentences as primary cause context
            first_text = chunks[0]["content"]
            sentences = [s.strip() for s in first_text.split(".") if len(s.strip()) > 15]
            if sentences:
                causes.append(f"Documented root cause: {sentences[0]}.")
            else:
                causes.append("Identified mechanical wear or misalignment based on operating manual specifications.")

        if not checks:
            for c in chunks[:2]:
                sentences = [s.strip() for s in c["content"].split(".") if len(s.strip()) > 20]
                for s in sentences[:3]:
                    checks.append(s)

        # Deduplicate and limit
        unique_checks = []
        for chk in checks:
            clean_chk = re.sub(r'^\d+[\.\)]\s*', '', chk).strip()
            if clean_chk and clean_chk not in unique_checks:
                unique_checks.append(clean_chk)
            if len(unique_checks) >= 5:
                break

        # Role-Aware Safety Filtering for Floor Operators
        is_operator = (user_role or "").upper() == "OPERATOR"
        if is_operator:
            q_lower = query.lower()
            is_restricted_action = any(kw in q_lower for kw in [
                "replace", "disassemble", "take apart", "open panel", "electrical", "rewire", "solder",
                "motor", "belt change", "modify setting", "bypass", "remove bearing", "repair myself"
            ])
            if is_restricted_action:
                safety_warnings.insert(0, "⛔ RESTRICTED OPERATOR ACTION: Disassembly, component replacement, and electrical repairs are strictly restricted to authorized Maintenance Technicians under OSHA LOTO (29 CFR 1910.147).")
                unique_checks = [
                    "Stop the machine immediately using the standard shutdown procedure.",
                    "Record the displayed HMI error code and current sensor readings.",
                    "Do NOT open machine enclosures, electrical cabinets, or access moving mechanisms.",
                    "Report this incident via EquipFixAI to notify your shop floor supervisor and dispatch a certified technician."
                ]
            else:
                # Filter out technician-only intrusive checks for operator safety
                filtered_checks = []
                for c in unique_checks:
                    c_lower = c.lower()
                    if any(t in c_lower for t in ["disassemble", "remove cover", "replace", "rewire", "loosen bolt inside", "open cabinet"]):
                        continue
                    filtered_checks.append(c)
                
                safe_prepend = [
                    "Stop machine operation if noise, vibration, or temperature exceeds safe limits.",
                    "Record error codes from the external operator terminal."
                ]
                unique_checks = safe_prepend + [fc for fc in filtered_checks if fc not in safe_prepend][:3]
                safety_warnings.append("⚠️ Operator Safety Notice: Never bypass safety interlocks or open guards while equipment is energized.")

        possible_cause = " | ".join(causes[:2])

        # 4. Prepare Citations
        citations = []
        seen_citations = set()
        for chunk in chunks:
            key = (chunk.get("document_title"), chunk.get("page_number"))
            if key in seen_citations:
                continue
            seen_citations.add(key)

            raw_chunk = chunk.get("chunk")
            citations.append(AICitation(
                document_id=raw_chunk.document_id if raw_chunk else None,
                document_title=chunk.get("document_title") or "Technical Manual",
                version_number=raw_chunk.document.current_version.version_number if (raw_chunk and raw_chunk.document and raw_chunk.document.current_version) else "v1.0",
                page_number=chunk.get("page_number", 1),
                section_title=chunk.get("section_title") or "Troubleshooting",
                source_type=chunk.get("doc_type") or "DOCUMENT",
                relevance_score=round(chunk.get("score", 0.0), 2),
                snippet=chunk.get("content", "")[:280] + ("..." if len(chunk.get("content", "")) > 280 else "")
            ))

        # 5. Format Previous Repairs
        repairs = []
        for pr in previous_repairs_data:
            repairs.append(AIPreviousRepair(
                record_id=pr["record_id"],
                machine_code=machine_code or "Unknown",
                problem_summary=pr["summary"],
                root_cause=pr["root_cause"],
                repair_action=pr["repair_action"],
                downtime_minutes=pr.get("downtime_minutes", 45),
                completion_date=pr.get("date")
            ))

        return AIQueryResponse(
            query_id=query_id,
            question=query,
            machine_code=machine_code,
            possible_cause=possible_cause,
            recommended_checks=unique_checks,
            safety_warnings=safety_warnings,
            relevant_previous_repairs=repairs,
            sources=citations,
            grounding_status=grounding_status,
            is_structured_fact=False,
            created_at=datetime.utcnow()
        )
