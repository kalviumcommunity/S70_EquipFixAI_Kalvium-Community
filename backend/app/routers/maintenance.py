from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.maintenance import MaintenanceRecord, MaintenanceSchedule
from app.models.work_order import WorkOrder
from app.models.machine import Machine
from app.models.user import User
from app.models.enums import (
    ApprovalStatus, WorkOrderStatus, IncidentPriority, MachineStatus, AuditAction, NotificationType, UserRole
)
from app.schemas.maintenance import (
    MaintenanceRecordResponse, MaintenanceRecordApproval,
    MaintenanceScheduleCreate, MaintenanceScheduleResponse
)
from app.schemas.work_order import WorkOrderResponse
from app.auth.deps import get_current_user, require_role
from app.services.maintenance_service import MaintenanceService
from app.services.audit_service import AuditService
from app.services.notification_service import NotificationService
from app.services.scheduler_service import SchedulerService

router = APIRouter(prefix="/maintenance", tags=["Maintenance"])


@router.get("/records", response_model=List[MaintenanceRecordResponse])
def list_maintenance_records(
    machine_id: Optional[int] = None,
    approval_status: Optional[ApprovalStatus] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List maintenance records with optional filtering by machine and approval status."""
    query = db.query(MaintenanceRecord)
    if machine_id:
        query = query.filter(MaintenanceRecord.machine_id == machine_id)
    if approval_status:
        query = query.filter(MaintenanceRecord.approval_status == approval_status)

    return query.order_by(MaintenanceRecord.created_at.desc()).all()


@router.get("/records/{record_id}", response_model=MaintenanceRecordResponse)
def get_maintenance_record(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve detailed maintenance record."""
    record = db.query(MaintenanceRecord).filter(MaintenanceRecord.id == record_id).first()
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Maintenance record #{record_id} not found."
        )
    return record


@router.post("/records/{record_id}/approval", response_model=MaintenanceRecordResponse)
def approve_or_reject_maintenance(
    record_id: int,
    approval_data: MaintenanceRecordApproval,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["SUPERVISOR", "MANAGER"]))
):
    """Supervisor reviews and approves/rejects completed maintenance."""
    record = MaintenanceService.process_approval(
        db=db,
        record_id=record_id,
        supervisor_id=current_user.id,
        approved=approval_data.approved,
        supervisor_notes=approval_data.supervisor_notes
    )
    db.commit()
    db.refresh(record)
    return record


# Preventive Maintenance Schedules
@router.get("/schedules", response_model=List[MaintenanceScheduleResponse])
def list_schedules(
    machine_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List preventive maintenance schedules."""
    query = db.query(MaintenanceSchedule)
    if machine_id:
        query = query.filter(MaintenanceSchedule.machine_id == machine_id)
    return query.order_by(MaintenanceSchedule.next_due_date.asc()).all()


@router.post("/schedules", response_model=MaintenanceScheduleResponse, status_code=status.HTTP_201_CREATED)
def create_schedule(
    schedule_in: MaintenanceScheduleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["SUPERVISOR", "MANAGER"]))
):
    """Create a new preventive maintenance schedule for a machine."""
    machine = db.query(Machine).filter(Machine.id == schedule_in.machine_id).first()
    if not machine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Machine #{schedule_in.machine_id} not found."
        )

    sched = MaintenanceSchedule(
        machine_id=schedule_in.machine_id,
        task_name=schedule_in.task_name,
        description=schedule_in.description,
        frequency=schedule_in.frequency,
        assigned_role_or_user=schedule_in.assigned_role_or_user,
        next_due_date=schedule_in.next_due_date,
        status="ACTIVE"
    )
    db.add(sched)
    db.flush()

    AuditService.log_action(
        db=db,
        action=AuditAction.SCHEDULE_CREATED,
        entity_type="maintenance_schedule",
        entity_id=sched.id,
        user_id=current_user.id,
        new_value={"task": sched.task_name, "machine": machine.machine_code, "freq": sched.frequency.value}
    )

    db.commit()
    db.refresh(sched)
    return sched


@router.post("/schedules/check-due")
def check_due_schedules(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["SUPERVISOR", "MANAGER"]))
):
    """Scan all preventive maintenance schedules, auto-generate work orders for due schedules without duplicates, and emit notifications."""
    return SchedulerService.check_and_trigger_schedules(db, user_id=current_user.id)


@router.post("/schedules/{schedule_id}/generate-wo", response_model=WorkOrderResponse)
def generate_work_order_from_schedule(
    schedule_id: int,
    technician_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["SUPERVISOR", "MANAGER"]))
):
    """Trigger a Work Order directly from a preventive maintenance schedule (enforcing duplicate prevention)."""
    sched = db.query(MaintenanceSchedule).filter(MaintenanceSchedule.id == schedule_id).first()
    if not sched:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Schedule #{schedule_id} not found."
        )

    # Duplicate prevention check
    existing_wo = SchedulerService.find_active_pm_work_order(db, sched.machine_id, sched.task_name)
    if existing_wo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Work Order {existing_wo.work_order_number} is already in progress for '{sched.task_name}'. Duplicate prevented."
        )

    tech = db.query(User).filter(User.id == technician_id).first()
    if not tech or tech.role.name != UserRole.TECHNICIAN.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Valid technician required to assign schedule work order."
        )

    count = db.query(WorkOrder).count() + 1
    wo_num = f"PM-{count:04d}"

    # Create synthetic or routine incident link if needed or standalone work order
    # To keep FK intact, let's create a routine PM incident or query an existing one
    from app.models.incident import Incident
    from app.models.enums import IncidentSeverity, IncidentStatus

    pm_incident = Incident(
        incident_number=f"PM-INC-{count:04d}",
        machine_id=sched.machine_id,
        reported_by_id=current_user.id,
        description=f"Preventive Maintenance: {sched.task_name}. {sched.description or ''}",
        severity=IncidentSeverity.LOW,
        priority=IncidentPriority.MEDIUM,
        status=IncidentStatus.ASSIGNED,
        assigned_technician_id=tech.id,
        supervisor_id=current_user.id
    )
    db.add(pm_incident)
    db.flush()

    work_order = WorkOrder(
        work_order_number=wo_num,
        incident_id=pm_incident.id,
        machine_id=sched.machine_id,
        assigned_technician_id=tech.id,
        supervisor_id=current_user.id,
        priority=IncidentPriority.MEDIUM,
        status=WorkOrderStatus.ASSIGNED,
        estimated_hours=2.0,
        notes=f"Generated from Preventive Schedule: {sched.task_name}"
    )
    db.add(work_order)

    # Advance schedule next_due_date
    sched.last_performed_date = datetime.utcnow()
    if sched.frequency.value == "DAILY":
        sched.next_due_date = datetime.utcnow() + timedelta(days=1)
    elif sched.frequency.value == "WEEKLY":
        sched.next_due_date = datetime.utcnow() + timedelta(weeks=1)
    elif sched.frequency.value == "MONTHLY":
        sched.next_due_date = datetime.utcnow() + timedelta(days=30)
    elif sched.frequency.value == "QUARTERLY":
        sched.next_due_date = datetime.utcnow() + timedelta(days=90)
    else:
        sched.next_due_date = datetime.utcnow() + timedelta(days=365)

    AuditService.log_action(
        db=db,
        action=AuditAction.SCHEDULE_TRIGGERED,
        entity_type="maintenance_schedule",
        entity_id=sched.id,
        user_id=current_user.id,
        new_value={"work_order": work_order.work_order_number, "task": sched.task_name}
    )

    NotificationService.create_notification(
        db=db,
        recipient_id=tech.id,
        title="Preventive Maintenance Assigned",
        message=f"Routine PM Task {sched.task_name} assigned under {work_order.work_order_number}.",
        notification_type=NotificationType.ASSIGNMENT,
        related_entity_type="work_order",
        related_entity_id=work_order.id
    )

    db.commit()
    db.refresh(work_order)
    return work_order
