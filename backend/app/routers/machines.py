from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.machine import Machine
from app.models.maintenance import MaintenanceRecord, MaintenanceSchedule
from app.models.incident import Incident
from app.models.work_order import WorkOrder
from app.models.part import PartUsage, Part
from app.models.user import User
from app.models.enums import MachineStatus, UserRole, AuditAction
from app.schemas.machine import MachineCreate, MachineUpdate, MachineResponse
from app.schemas.maintenance import MaintenanceRecordResponse
from app.schemas.incident import IncidentResponse
from app.auth.deps import get_current_user, require_role
from app.services.audit_service import AuditService

router = APIRouter(prefix="/machines", tags=["Machines"])


@router.get("", response_model=List[MachineResponse])
def get_machines(
    department: Optional[str] = None,
    status_filter: Optional[MachineStatus] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List machines with optional filters for department, status, and code/name search."""
    query = db.query(Machine)
    if department:
        query = query.filter(Machine.department == department)
    if status_filter:
        query = query.filter(Machine.status == status_filter)
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (Machine.machine_code.ilike(search_pattern)) |
            (Machine.name.ilike(search_pattern)) |
            (Machine.location.ilike(search_pattern))
        )
    return query.order_by(Machine.machine_code).all()


@router.get("/{machine_id}", response_model=MachineResponse)
def get_machine(
    machine_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve details of a specific machine."""
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Machine #{machine_id} not found."
        )
    return machine


@router.get("/{machine_id}/history")
def get_machine_history(
    machine_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve maintenance history and previous incidents for a machine."""
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Machine #{machine_id} not found."
        )

    records = (
        db.query(MaintenanceRecord)
        .filter(MaintenanceRecord.machine_id == machine_id)
        .order_by(MaintenanceRecord.created_at.desc())
        .all()
    )

    incidents = (
        db.query(Incident)
        .filter(Incident.machine_id == machine_id)
        .order_by(Incident.created_at.desc())
        .all()
    )

    return {
        "machine": machine,
        "maintenance_records": [MaintenanceRecordResponse.from_orm(r) for r in records],
        "incidents": [IncidentResponse.from_orm(i) for i in incidents],
    }


@router.get("/{machine_id}/timeline")
def get_machine_timeline(
    machine_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve full unified chronological lifecycle timeline of a machine:
    incidents, work orders, maintenance records, parts replaced, downtime events, and preventive schedules.
    """
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Machine #{machine_id} not found."
        )

    timeline_events = []

    # 1. Incidents
    incidents = db.query(Incident).filter(Incident.machine_id == machine_id).all()
    for inc in incidents:
        timeline_events.append({
            "id": f"inc-{inc.id}",
            "event_type": "INCIDENT_REPORTED",
            "title": f"Incident Reported: {inc.incident_number}",
            "description": inc.description,
            "severity": inc.severity.value,
            "status": inc.status.value,
            "actor": inc.reporter.full_name if inc.reporter else "Operator",
            "timestamp": inc.created_at.isoformat() if inc.created_at else None,
            "raw_time": inc.created_at
        })
        if inc.resolved_at:
            timeline_events.append({
                "id": f"inc-res-{inc.id}",
                "event_type": "INCIDENT_RESOLVED",
                "title": f"Incident Resolved: {inc.incident_number}",
                "description": f"Problem resolved and cleared for service.",
                "severity": inc.severity.value,
                "status": "RESOLVED",
                "actor": inc.technician.full_name if inc.technician else "Technician",
                "timestamp": inc.resolved_at.isoformat(),
                "raw_time": inc.resolved_at
            })

    # 2. Work Orders
    work_orders = db.query(WorkOrder).filter(WorkOrder.machine_id == machine_id).all()
    for wo in work_orders:
        if wo.started_at:
            timeline_events.append({
                "id": f"wo-start-{wo.id}",
                "event_type": "WORK_ORDER_STARTED",
                "title": f"Repair Started: {wo.work_order_number}",
                "description": wo.notes or "Technician began maintenance operations.",
                "severity": wo.priority.value,
                "status": wo.status.value,
                "actor": wo.technician.full_name if wo.technician else "Technician",
                "timestamp": wo.started_at.isoformat(),
                "raw_time": wo.started_at
            })
        if wo.completed_at:
            timeline_events.append({
                "id": f"wo-comp-{wo.id}",
                "event_type": "WORK_ORDER_COMPLETED",
                "title": f"Repair Finished: {wo.work_order_number}",
                "description": f"Actual hours: {wo.actual_hours}h. Work order submitted for supervisor review.",
                "severity": wo.priority.value,
                "status": wo.status.value,
                "actor": wo.technician.full_name if wo.technician else "Technician",
                "timestamp": wo.completed_at.isoformat(),
                "raw_time": wo.completed_at
            })

    # 3. Parts Replaced
    wo_ids = [wo.id for wo in work_orders]
    if wo_ids:
        usages = db.query(PartUsage).filter(PartUsage.work_order_id.in_(wo_ids)).all()
        for pu in usages:
            timeline_events.append({
                "id": f"part-{pu.id}",
                "event_type": "PART_REPLACED",
                "title": f"Part Installed: {pu.part.name} ({pu.part.part_number})",
                "description": f"Quantity: {pu.quantity_used} units (Total cost: ${pu.total_cost:.2f}) installed under WO #{pu.work_order_id}.",
                "severity": "NORMAL",
                "status": "INSTALLED",
                "actor": pu.recorded_by.full_name if pu.recorded_by else "Technician",
                "timestamp": pu.used_at.isoformat() if pu.used_at else None,
                "raw_time": pu.used_at
            })

    # 4. Maintenance Records (Approvals & Downtime)
    records = db.query(MaintenanceRecord).filter(MaintenanceRecord.machine_id == machine_id).all()
    for rec in records:
        if rec.completion_time:
            timeline_events.append({
                "id": f"maint-{rec.id}",
                "event_type": "MAINTENANCE_RECORDED",
                "title": f"Maintenance Record #{rec.id}: {rec.problem_summary}",
                "description": f"Root Cause: {rec.root_cause} | Repair: {rec.repair_action} | Downtime: {rec.downtime_minutes} mins.",
                "severity": "HIGH" if rec.downtime_minutes > 120 else "NORMAL",
                "status": rec.approval_status.value,
                "actor": rec.technician.full_name if rec.technician else "Technician",
                "timestamp": rec.completion_time.isoformat(),
                "raw_time": rec.completion_time
            })
        if rec.approval_time and rec.approval_status.value == "APPROVED":
            timeline_events.append({
                "id": f"appr-{rec.id}",
                "event_type": "MAINTENANCE_APPROVED",
                "title": f"Supervisor Sign-Off: Record #{rec.id}",
                "description": f"Approved by {rec.approver.full_name if rec.approver else 'Supervisor'}. Machine verified operational and restored to RUNNING.",
                "severity": "NORMAL",
                "status": "APPROVED",
                "actor": rec.approver.full_name if rec.approver else "Supervisor",
                "timestamp": rec.approval_time.isoformat(),
                "raw_time": rec.approval_time
            })

    # 5. Preventive Maintenance Schedules
    schedules = db.query(MaintenanceSchedule).filter(MaintenanceSchedule.machine_id == machine_id).all()
    for sched in schedules:
        if sched.last_performed_date:
            timeline_events.append({
                "id": f"pm-{sched.id}",
                "event_type": "PREVENTIVE_MAINTENANCE",
                "title": f"Preventive Maintenance Performed: {sched.task_name}",
                "description": f"Routine {sched.frequency.value} service completed.",
                "severity": "NORMAL",
                "status": "COMPLETED",
                "actor": "Maintenance Team",
                "timestamp": sched.last_performed_date.isoformat(),
                "raw_time": sched.last_performed_date
            })

    # Sort descending by raw_time
    timeline_events.sort(key=lambda x: x["raw_time"] or datetime.min, reverse=True)
    for e in timeline_events:
        e.pop("raw_time", None)

    return {
        "machine": {
            "id": machine.id,
            "machine_code": machine.machine_code,
            "name": machine.name,
            "type": machine.type,
            "department": machine.department,
            "location": machine.location,
            "status": machine.status.value,
            "last_maintenance": machine.last_maintenance.isoformat() if machine.last_maintenance else None,
            "next_scheduled_maintenance": machine.next_scheduled_maintenance.isoformat() if machine.next_scheduled_maintenance else None
        },
        "total_events": len(timeline_events),
        "timeline": timeline_events
    }


@router.post("", response_model=MachineResponse, status_code=status.HTTP_201_CREATED)
def create_machine(
    machine_in: MachineCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["SUPERVISOR", "MANAGER"]))
):
    """Add a new industrial machine to the registry (Supervisor/Manager)."""
    existing = db.query(Machine).filter(Machine.machine_code == machine_in.machine_code).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Machine with code '{machine_in.machine_code}' already exists."
        )

    machine = Machine(
        machine_code=machine_in.machine_code.upper(),
        name=machine_in.name,
        type=machine_in.type,
        department=machine_in.department,
        location=machine_in.location,
        installation_date=machine_in.installation_date,
        status=MachineStatus.RUNNING
    )
    db.add(machine)
    db.flush()

    AuditService.log_action(
        db=db,
        action=AuditAction.SCHEDULE_CREATED,
        entity_type="machine",
        entity_id=machine.id,
        user_id=current_user.id,
        new_value={"code": machine.machine_code, "name": machine.name}
    )
    db.commit()
    db.refresh(machine)
    return machine


@router.put("/{machine_id}", response_model=MachineResponse)
def update_machine(
    machine_id: int,
    machine_in: MachineUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["SUPERVISOR", "MANAGER"]))
):
    """Update machine status, location, or metadata (Supervisor/Manager)."""
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Machine #{machine_id} not found."
        )

    prev_val = {"status": machine.status.value, "location": machine.location}
    update_data = machine_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(machine, field, value)

    AuditService.log_action(
        db=db,
        action=AuditAction.PRIORITY_CHANGED,
        entity_type="machine",
        entity_id=machine.id,
        user_id=current_user.id,
        previous_value=prev_val,
        new_value={"status": machine.status.value, "location": machine.location}
    )
    db.commit()
    db.refresh(machine)
    return machine
