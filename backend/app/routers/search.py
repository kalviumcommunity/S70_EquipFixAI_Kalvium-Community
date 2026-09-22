from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database.session import get_db
from app.models.machine import Machine
from app.models.incident import Incident
from app.models.work_order import WorkOrder
from app.models.maintenance import MaintenanceRecord
from app.models.user import User, Role
from app.models.part import Part
from app.models.document import Document
from app.models.enums import UserRole
from app.auth.deps import get_current_user

router = APIRouter(prefix="/search", tags=["Global Search"])


@router.get("")
def global_search(
    q: str = Query(..., min_length=1, description="Search query string"),
    limit_per_category: int = Query(5, ge=1, le=20),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Search across machines, incidents, work orders, maintenance records, spare parts, technicians, and documents."""
    pattern = f"%{q.strip()}%"

    # 1. Machines
    machines = db.query(Machine).filter(
        or_(
            Machine.machine_code.ilike(pattern),
            Machine.name.ilike(pattern),
            Machine.type.ilike(pattern),
            Machine.department.ilike(pattern),
            Machine.location.ilike(pattern)
        )
    ).limit(limit_per_category).all()

    # 2. Incidents
    # Operators only search their own incidents
    inc_q = db.query(Incident)
    if current_user.role.name == UserRole.OPERATOR.value:
        inc_q = inc_q.filter(Incident.reported_by_id == current_user.id)
    incidents = inc_q.filter(
        or_(
            Incident.incident_number.ilike(pattern),
            Incident.description.ilike(pattern)
        )
    ).order_by(Incident.created_at.desc()).limit(limit_per_category).all()

    # 3. Work Orders
    # Operators do not search work orders directly
    work_orders = []
    if current_user.role.name != UserRole.OPERATOR.value:
        wo_q = db.query(WorkOrder)
        if current_user.role.name == UserRole.TECHNICIAN.value:
            wo_q = wo_q.filter(WorkOrder.assigned_technician_id == current_user.id)
        work_orders = wo_q.filter(
            or_(
                WorkOrder.work_order_number.ilike(pattern),
                WorkOrder.notes.ilike(pattern)
            )
        ).order_by(WorkOrder.created_at.desc()).limit(limit_per_category).all()

    # 4. Maintenance Records
    records = db.query(MaintenanceRecord).filter(
        or_(
            MaintenanceRecord.problem_summary.ilike(pattern),
            MaintenanceRecord.root_cause.ilike(pattern),
            MaintenanceRecord.repair_action.ilike(pattern)
        )
    ).order_by(MaintenanceRecord.created_at.desc()).limit(limit_per_category).all()

    # 5. Spare Parts
    parts = db.query(Part).filter(
        or_(
            Part.part_number.ilike(pattern),
            Part.name.ilike(pattern),
            Part.description.ilike(pattern),
            Part.location.ilike(pattern)
        )
    ).limit(limit_per_category).all()

    # 6. Technicians & Users (Supervisors and Managers only)
    users_matched = []
    if current_user.role.name in [UserRole.SUPERVISOR.value, UserRole.MANAGER.value]:
        users_matched = db.query(User).filter(
            or_(
                User.full_name.ilike(pattern),
                User.username.ilike(pattern),
                User.email.ilike(pattern)
            )
        ).limit(limit_per_category).all()

    # 7. Documents & SOPs
    documents = db.query(Document).filter(
        Document.title.ilike(pattern)
    ).limit(limit_per_category).all()

    # Format Results
    m_list = [
        {
            "id": m.id,
            "title": f"{m.machine_code} — {m.name}",
            "subtitle": f"{m.department} • {m.location}",
            "status": m.status.value,
            "type": "machine",
            "url": f"/machines"
        }
        for m in machines
    ]

    inc_list = [
        {
            "id": inc.id,
            "title": f"{inc.incident_number}: {inc.description[:60]}...",
            "subtitle": f"Machine: {inc.machine.machine_code if inc.machine else 'N/A'} • Severity: {inc.severity.value}",
            "status": inc.status.value,
            "type": "incident",
            "url": f"/incidents"
        }
        for inc in incidents
    ]

    wo_list = [
        {
            "id": wo.id,
            "title": f"{wo.work_order_number}",
            "subtitle": f"Machine: {wo.machine.machine_code if wo.machine else 'N/A'} • Priority: {wo.priority.value}",
            "status": wo.status.value,
            "type": "work_order",
            "url": f"/work-orders"
        }
        for wo in work_orders
    ]

    rec_list = [
        {
            "id": r.id,
            "title": f"Record #{r.id}: {r.problem_summary[:60]}",
            "subtitle": f"Root cause: {r.root_cause[:50]}...",
            "status": r.approval_status.value,
            "type": "maintenance_record",
            "url": f"/maintenance"
        }
        for r in records
    ]

    parts_list = [
        {
            "id": p.id,
            "title": f"{p.part_number} — {p.name}",
            "subtitle": f"Qty: {p.quantity} (Min: {p.min_quantity}) • Loc: {p.location}",
            "status": "LOW STOCK" if p.quantity <= p.min_quantity else "IN STOCK",
            "type": "part",
            "url": f"/parts"
        }
        for p in parts
    ]

    users_list = [
        {
            "id": u.id,
            "title": u.full_name,
            "subtitle": f"{u.email} • Role: {u.role.name}",
            "status": "ACTIVE" if u.is_active else "INACTIVE",
            "type": "user",
            "url": f"/users"
        }
        for u in users_matched
    ]

    docs_list = [
        {
            "id": d.id,
            "title": d.title,
            "subtitle": f"Type: {d.doc_type.value} • Machine: {d.machine.machine_code if d.machine else 'General'}",
            "status": "INDEXED",
            "type": "document",
            "url": f"/documents"
        }
        for d in documents
    ]

    total_matches = len(m_list) + len(inc_list) + len(wo_list) + len(rec_list) + len(parts_list) + len(users_list) + len(docs_list)

    return {
        "query": q,
        "total_matches": total_matches,
        "results": {
            "machines": m_list,
            "incidents": inc_list,
            "work_orders": wo_list,
            "maintenance_records": rec_list,
            "parts": parts_list,
            "users": users_list,
            "documents": docs_list
        }
    }
