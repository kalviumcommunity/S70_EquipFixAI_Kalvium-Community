"""
EquipFixAI Project & Plant Authoritative Knowledge Provider
Aggregates live database entities (Machines, Incidents, Work Orders, Parts Inventory,
Maintenance Schedules, Technical SOPs, and Platform Architecture) into comprehensive,
grounded context for the AI Copilot.
"""
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.models.machine import Machine
from app.models.incident import Incident
from app.models.work_order import WorkOrder
from app.models.part import Part
from app.models.maintenance import MaintenanceSchedule, MaintenanceRecord
from app.models.document import Document
from app.models.user import User


PROJECT_ARCHITECTURE_OVERVIEW = """
### EquipFixAI Platform Architecture & Project Overview:
- Project Name: EquipFixAI (Kalvium Community S70)
- Purpose: Next-generation AI-powered Computerized Maintenance Management System (CMMS) & predictive maintenance copilot for industrial manufacturing plants.
- Core Modules:
  1. Equipment & Machinery Registry: Comprehensive telemetry, status monitoring (RUNNING, DOWN, WARNING, MAINTENANCE), and MTTR tracking across plant bays.
  2. Incident Management: Rapid reporting, severity triage (LOW, MEDIUM, HIGH, CRITICAL), root-cause analysis, and technician assignment.
  3. Work Order Execution: Step-by-step repair logging, parts consumption, estimated vs actual hours, and supervisor sign-offs.
  4. Preventive Maintenance Schedules: Automated recurring maintenance triggers (DAILY, WEEKLY, MONTHLY, QUARTERLY, ANNUAL) preventing unplanned downtime.
  5. Spare Parts & MRO Inventory: Stock levels, minimum threshold alerts, warehouse aisle/bin locations, and unit costs.
  6. Technical Documentation & RAG: Vector-indexed OEM equipment manuals, standard operating procedures (SOPs), and OSHA 1910.147 Lockout/Tagout (LOTO) guidelines.
  7. Production AI Copilot: Real-time conversational AI powered by Google Gemini API with SSE streaming, vision multimodal analysis, and interactive feedback.
- Technology Stack:
  - Backend: FastAPI (Python 3.9+), SQLAlchemy ORM, SQLite / PostgreSQL, JWT authentication, RBAC.
  - Frontend: React 18, Vite, React Router 6, Lucide Icons, Recharts data visualization, Marked, DOMPurify.
  - User Roles: OPERATOR (reports incidents, basic view), TECHNICIAN (completes work orders, logs repairs), SUPERVISOR (approves work orders, manages inventory), MANAGER (plant-wide analytics, user management).
"""


def build_live_project_context(db: Session, query_text: str = "") -> str:
    """Dynamically builds a comprehensive summary of plant data from the live database
    to provide the Gemini model with authoritative project knowledge.
    """
    sections: List[str] = [PROJECT_ARCHITECTURE_OVERVIEW]

    try:
        # 1. Machines Directory
        machines = db.query(Machine).order_by(Machine.machine_code.asc()).all()
        if machines:
            mach_lines = ["### Plant Machinery & Equipment:"]
            for m in machines:
                mach_lines.append(
                    f"- **{m.machine_code}** ({m.name}): Type: {m.type or 'Industrial'}, Location: {m.location or 'Plant Floor'}, "
                    f"Department: {m.department or 'Operations'}, Status: **{m.status.value if hasattr(m.status, 'value') else m.status}**"
                )
            sections.append("\n".join(mach_lines))

        # 2. Incidents Summary
        incidents = db.query(Incident).order_by(Incident.created_at.desc()).limit(10).all()
        if incidents:
            inc_lines = ["### Recent Plant Incidents:"]
            for inc in incidents:
                m_code = inc.machine.machine_code if inc.machine else f"Machine #{inc.machine_id}"
                status_str = inc.status.value if hasattr(inc.status, 'value') else str(inc.status)
                sev_str = inc.severity.value if hasattr(inc.severity, 'value') else str(inc.severity)
                inc_lines.append(
                    f"- **{inc.incident_number}** on {m_code}: {inc.description} (Severity: {sev_str}, Status: **{status_str}**)"
                )
            sections.append("\n".join(inc_lines))

        # 3. Work Orders
        work_orders = db.query(WorkOrder).order_by(WorkOrder.created_at.desc()).limit(10).all()
        if work_orders:
            wo_lines = ["### Active & Recent Work Orders:"]
            for wo in work_orders:
                m_code = wo.machine.machine_code if wo.machine else f"Machine #{wo.machine_id}"
                tech_name = wo.assigned_technician.full_name if wo.assigned_technician else "Unassigned"
                wo_status = wo.status.value if hasattr(wo.status, 'value') else str(wo.status)
                wo_priority = wo.priority.value if hasattr(wo.priority, 'value') else str(wo.priority)
                wo_lines.append(
                    f"- **{wo.work_order_number}** on {m_code}: Assigned to {tech_name}, Priority: {wo_priority}, Status: **{wo_status}**"
                )
            sections.append("\n".join(wo_lines))

        # 4. Spare Parts & MRO Inventory
        parts = db.query(Part).order_by(Part.part_number.asc()).all()
        if parts:
            part_lines = ["### Spare Parts & MRO Inventory:"]
            for p in parts:
                low_stock = "⚠️ LOW STOCK (Reorder Required)" if p.quantity <= p.min_quantity else "Normal"
                part_lines.append(
                    f"- **{p.part_number}** - {p.name}: Quantity: {p.quantity} (Min: {p.min_quantity}), "
                    f"Location: {p.location or 'General Warehouse'}, Cost: ${p.unit_cost}, Status: {low_stock}"
                )
            sections.append("\n".join(part_lines))

        # 5. Maintenance Schedules
        schedules = db.query(MaintenanceSchedule).order_by(MaintenanceSchedule.id.asc()).all()
        if schedules:
            sched_lines = ["### Preventive Maintenance Schedules:"]
            for s in schedules:
                m_code = s.machine.machine_code if s.machine else f"Machine #{s.machine_id}"
                freq_str = s.frequency.value if hasattr(s.frequency, 'value') else str(s.frequency)
                sched_lines.append(
                    f"- **{s.task_name}** ({m_code}): Frequency: {freq_str}, Assigned Role: {s.assigned_role_or_user}, Status: {s.status}"
                )
            sections.append("\n".join(sched_lines))

        # 6. Technical SOPs & Manuals
        docs = db.query(Document).order_by(Document.id.asc()).all()
        if docs:
            doc_lines = ["### Official Plant Manuals, SOPs & Safety Standards:"]
            for d in docs:
                m_code = d.machine.machine_code if d.machine else "Facility-Wide"
                doc_lines.append(
                    f"- **{d.title}**: Document Type: {d.doc_type}, Target: {m_code}, Approval: {d.approval_status}"
                )
            sections.append("\n".join(doc_lines))

    except Exception as e:
        sections.append(f"[Note: Real-time database telemetry aggregation encountered: {str(e)}]")

    return "\n\n".join(sections)
