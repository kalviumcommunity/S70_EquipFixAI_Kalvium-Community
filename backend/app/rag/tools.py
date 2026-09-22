import re
from typing import Dict, Any, Optional, Union, List
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.models.machine import Machine
from app.models.incident import Incident
from app.models.work_order import WorkOrder, WorkLog
from app.models.maintenance import MaintenanceRecord
from app.models.part import Part, PartUsage
from app.models.enums import ApprovalStatus, MachineStatus, IncidentStatus, WorkOrderStatus


class StructuredTools:
    """Provides direct, authoritative access to PostgreSQL relational facts without vector similarity."""

    @staticmethod
    def get_machine_status(db: Session, identifier: Union[int, str]) -> Dict[str, Any]:
        """Fetch current operational status, location, and maintenance schedule for a machine."""
        query = db.query(Machine)
        if isinstance(identifier, int) or (isinstance(identifier, str) and identifier.isdigit()):
            machine = query.filter(Machine.id == int(identifier)).first()
        else:
            machine = query.filter(
                or_(
                    Machine.machine_code.ilike(identifier.strip()),
                    Machine.name.ilike(f"%{identifier.strip()}%")
                )
            ).first()

        if not machine:
            return {"error": f"Machine '{identifier}' not found in registry."}

        active_incidents = db.query(Incident).filter(
            Incident.machine_id == machine.id,
            Incident.status.in_([IncidentStatus.OPEN, IncidentStatus.IN_PROGRESS])
        ).count()

        active_work_orders = db.query(WorkOrder).filter(
            WorkOrder.machine_id == machine.id,
            WorkOrder.status.in_([WorkOrderStatus.ASSIGNED, WorkOrderStatus.IN_PROGRESS])
        ).count()

        return {
            "machine_id": machine.id,
            "machine_code": machine.machine_code,
            "name": machine.name,
            "type": machine.type,
            "department": machine.department,
            "location": machine.location,
            "status": machine.status.value,
            "last_maintenance": machine.last_maintenance.isoformat() if machine.last_maintenance else None,
            "next_scheduled_maintenance": machine.next_scheduled_maintenance.isoformat() if machine.next_scheduled_maintenance else None,
            "active_incidents_count": active_incidents,
            "active_work_orders_count": active_work_orders
        }

    @staticmethod
    def get_machine_history(db: Session, machine_id: int, limit: int = 5) -> Dict[str, Any]:
        """Fetch verified historical maintenance records for a machine."""
        records = db.query(MaintenanceRecord).filter(
            MaintenanceRecord.machine_id == machine_id,
            MaintenanceRecord.approval_status == ApprovalStatus.APPROVED
        ).order_by(MaintenanceRecord.completion_time.desc()).limit(limit).all()

        return {
            "machine_id": machine_id,
            "record_count": len(records),
            "records": [
                {
                    "record_id": r.id,
                    "problem_summary": r.problem_summary,
                    "root_cause": r.root_cause,
                    "repair_action": r.repair_action,
                    "troubleshooting_steps": r.troubleshooting_steps,
                    "downtime_minutes": r.downtime_minutes,
                    "completion_time": r.completion_time.isoformat() if r.completion_time else None,
                    "technician": r.technician.full_name if r.technician else "Unknown",
                    "approver": r.approver.full_name if r.approver else "Supervisor",
                    "supervisor_notes": r.supervisor_notes
                }
                for r in records
            ]
        }

    @staticmethod
    def get_open_incidents(db: Session, machine_id: Optional[int] = None) -> Dict[str, Any]:
        """List unresolved incidents across the plant or for a specific machine."""
        query = db.query(Incident).filter(
            Incident.status.in_([IncidentStatus.OPEN, IncidentStatus.ASSIGNED, IncidentStatus.IN_PROGRESS])
        )
        if machine_id:
            query = query.filter(Incident.machine_id == machine_id)

        incidents = query.order_by(Incident.reported_at.desc()).all()
        return {
            "total_open": len(incidents),
            "incidents": [
                {
                    "id": inc.id,
                    "machine_code": inc.machine.machine_code if inc.machine else "Unknown",
                    "title": inc.title,
                    "description": inc.description,
                    "priority": inc.priority.value,
                    "status": inc.status.value,
                    "reported_at": inc.reported_at.isoformat()
                }
                for inc in incidents
            ]
        }

    @staticmethod
    def get_work_order_details(db: Session, identifier: Union[int, str]) -> Dict[str, Any]:
        """Fetch full operational state and parts consumed for a work order."""
        query = db.query(WorkOrder)
        if isinstance(identifier, int) or (isinstance(identifier, str) and identifier.isdigit()):
            wo = query.filter(WorkOrder.id == int(identifier)).first()
        else:
            wo = query.filter(WorkOrder.work_order_number == identifier.strip()).first()

        if not wo:
            return {"error": f"Work order '{identifier}' not found."}

        logs = db.query(WorkLog).filter(WorkLog.work_order_id == wo.id).order_by(WorkLog.timestamp.asc()).all()
        parts = db.query(PartUsage).filter(PartUsage.work_order_id == wo.id).all()

        return {
            "work_order_id": wo.id,
            "work_order_number": wo.work_order_number,
            "machine_id": wo.machine_id,
            "machine_code": wo.machine.machine_code if wo.machine else "Unknown",
            "machine_name": wo.machine.name if wo.machine else "Unknown",
            "status": wo.status.value,
            "priority": wo.priority.value,
            "assigned_technician": wo.assigned_technician.full_name if wo.assigned_technician else "Unassigned",
            "incident_description": wo.incident.description if wo.incident else None,
            "logs": [
                {
                    "step": l.step_description,
                    "action": l.action_taken,
                    "timestamp": l.timestamp.isoformat()
                }
                for l in logs
            ],
            "parts_used": [
                {
                    "part_code": p.part.part_number if p.part else "Unknown",
                    "part_name": p.part.name if p.part else "Unknown",
                    "quantity": p.quantity_used
                }
                for p in parts
            ]
        }

    @staticmethod
    def get_parts_inventory(db: Session, search: Optional[str] = None) -> Dict[str, Any]:
        """Retrieve spare parts stock and reorder requirements."""
        query = db.query(Part)
        if search:
            query = query.filter(
                or_(
                    Part.part_number.ilike(f"%{search.strip()}%"),
                    Part.name.ilike(f"%{search.strip()}%"),
                    Part.description.ilike(f"%{search.strip()}%")
                )
            )

        parts = query.all()
        return {
            "total_parts": len(parts),
            "parts": [
                {
                    "id": p.id,
                    "part_code": p.part_number,
                    "name": p.name,
                    "current_stock": p.quantity,
                    "minimum_stock": p.min_quantity,
                    "needs_reorder": p.quantity <= p.min_quantity,
                    "location": p.location,
                    "unit_cost": p.unit_cost,
                    "description": p.description
                }
                for p in parts
            ]
        }

    @classmethod
    def classify_query(cls, query_text: str) -> Dict[str, Any]:
        """Analyze technician inquiry to determine if it is a pure relational fact, semantic troubleshooting, or hybrid."""
        q_lower = query_text.lower().strip()

        # Extract machine codes like CNC-04, TEST-CNC-01, ROBOT-01, PRESS-01, MILL-01
        machine_match = re.search(r'\b((?!wo-|err-|alm-|e-\d)[a-z0-9]+(?:-[a-z0-9]+)+)\b', q_lower, re.IGNORECASE)
        machine_code = machine_match.group(1).upper() if machine_match else None

        # Extract work order codes like WO-2001, WO-2002
        wo_match = re.search(r'\b(wo-\d+)\b', q_lower, re.IGNORECASE)
        wo_code = wo_match.group(1).upper() if wo_match else None

        # Extract error codes like E-204, ERR-102
        err_match = re.search(r'\b(e-\d+|err-\d+|alm-\d+)\b', q_lower, re.IGNORECASE)
        error_code = err_match.group(1).upper() if err_match else None

        # 1. Pure relational: machine status check
        status_triggers = ["what is the status", "machine status", "is running", "is offline", "current state", "check status of"]
        if any(trigger in q_lower for trigger in status_triggers) and machine_code:
            return {
                "type": "STRUCTURED",
                "tool": "get_machine_status",
                "params": {"identifier": machine_code},
                "machine_code": machine_code
            }

        # 2. Pure relational: work order lookup
        if ("work order" in q_lower or "wo details" in q_lower) and wo_code:
            return {
                "type": "STRUCTURED",
                "tool": "get_work_order_details",
                "params": {"identifier": wo_code},
                "work_order_code": wo_code
            }

        # 3. Pure relational: parts stock inquiry
        stock_triggers = ["in stock", "spare part stock", "parts available", "how many parts", "inventory of", "reorder parts"]
        if any(trigger in q_lower for trigger in stock_triggers):
            part_term = q_lower
            for t in stock_triggers:
                part_term = part_term.replace(t, "")
            return {
                "type": "STRUCTURED",
                "tool": "get_parts_inventory",
                "params": {"search": part_term.strip() or None}
            }

        # 4. Pure relational: open incidents
        incident_triggers = ["open incidents", "active breakdowns", "current alarms", "unresolved issues"]
        if any(trigger in q_lower for trigger in incident_triggers):
            return {
                "type": "STRUCTURED",
                "tool": "get_open_incidents",
                "params": {"machine_id": None},
                "machine_code": machine_code
            }

        # 5. Hybrid or Semantic Troubleshooting
        # (needs RAG vector retrieval, possibly augmented with machine history)
        return {
            "type": "SEMANTIC_RAG",
            "tool": None,
            "machine_code": machine_code,
            "error_code": error_code,
            "work_order_code": wo_code
        }

    @classmethod
    def execute_tool(cls, db: Session, tool_name: str, **kwargs) -> Dict[str, Any]:
        """Dynamically invoke a structured tool by name."""
        tool_func = getattr(cls, tool_name, None)
        if not tool_func or not callable(tool_func):
            return {"error": f"Tool '{tool_name}' does not exist."}
        return tool_func(db, **kwargs)
