from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.work_order import WorkOrder, WorkLog
from app.models.incident import Incident
from app.models.machine import Machine
from app.models.user import User
from app.models.enums import (
    WorkOrderStatus, IncidentStatus, MachineStatus, UserRole, AuditAction
)
from app.schemas.work_order import (
    WorkOrderResponse, WorkOrderDetailResponse, WorkOrderStatusUpdate,
    WorkLogCreate, WorkLogResponse, PartUsageCreate, PartUsageResponse,
    WorkOrderComplete
)
from app.schemas.maintenance import MaintenanceRecordResponse
from app.auth.deps import get_current_user, require_role
from app.services.audit_service import AuditService
from app.services.part_service import PartService
from app.services.maintenance_service import MaintenanceService
from app.websocket.events import RealTimeEvents

router = APIRouter(prefix="/work-orders", tags=["Work Orders"])


@router.get("", response_model=List[WorkOrderResponse])
def list_work_orders(
    status_filter: Optional[WorkOrderStatus] = None,
    machine_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List work orders. Technicians see their assigned jobs; Supervisors/Managers see all."""
    query = db.query(WorkOrder)

    if current_user.role.name == UserRole.TECHNICIAN.value:
        query = query.filter(WorkOrder.assigned_technician_id == current_user.id)
    elif current_user.role.name == UserRole.OPERATOR.value:
        # Operators don't directly manage work orders
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operators cannot access work order management directly."
        )

    if status_filter:
        query = query.filter(WorkOrder.status == status_filter)
    if machine_id:
        query = query.filter(WorkOrder.machine_id == machine_id)

    return query.order_by(WorkOrder.created_at.desc()).all()


@router.get("/{work_order_id}", response_model=WorkOrderDetailResponse)
def get_work_order(
    work_order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get work order details including work logs and parts used."""
    work_order = db.query(WorkOrder).filter(WorkOrder.id == work_order_id).first()
    if not work_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Work Order #{work_order_id} not found."
        )

    # Check technician access
    if (
        current_user.role.name == UserRole.TECHNICIAN.value
        and work_order.assigned_technician_id != current_user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own assigned work orders."
        )

    return work_order


@router.put("/{work_order_id}/status", response_model=WorkOrderResponse)
def update_work_order_status(
    work_order_id: int,
    status_data: WorkOrderStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update work order status (e.g. Technician accepts and starts work)."""
    work_order = db.query(WorkOrder).filter(WorkOrder.id == work_order_id).first()
    if not work_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Work Order #{work_order_id} not found."
        )

    # Authorization: assigned technician or supervisor/manager
    is_assigned_tech = (
        current_user.role.name == UserRole.TECHNICIAN.value
        and work_order.assigned_technician_id == current_user.id
    )
    is_supervisor = current_user.role.name in [UserRole.SUPERVISOR.value, UserRole.MANAGER.value]

    if not (is_assigned_tech or is_supervisor):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized to update this work order status."
        )

    prev_status = work_order.status.value
    work_order.status = status_data.status
    if status_data.notes:
        work_order.notes = status_data.notes

    # If starting work: record started_at and set machine to MAINTENANCE
    if status_data.status == WorkOrderStatus.IN_PROGRESS and not work_order.started_at:
        work_order.started_at = datetime.utcnow()
        machine = db.query(Machine).filter(Machine.id == work_order.machine_id).first()
        if machine:
            machine.status = MachineStatus.MAINTENANCE

        incident = db.query(Incident).filter(Incident.id == work_order.incident_id).first()
        if incident:
            incident.status = IncidentStatus.IN_PROGRESS

    AuditService.log_action(
        db=db,
        action=AuditAction.WORK_STARTED if status_data.status == WorkOrderStatus.IN_PROGRESS else AuditAction.PRIORITY_CHANGED,
        entity_type="work_order",
        entity_id=work_order.id,
        user_id=current_user.id,
        previous_value={"status": prev_status},
        new_value={"status": work_order.status.value, "notes": status_data.notes}
    )

    RealTimeEvents.work_order_updated(work_order.assigned_technician_id, {
        "id": work_order.id,
        "work_order_number": work_order.work_order_number,
        "status": work_order.status.value,
        "machine_id": work_order.machine_id,
        "notes": status_data.notes
    })
    if status_data.status == WorkOrderStatus.IN_PROGRESS and machine:
        RealTimeEvents.machine_status_changed({
            "machine_id": machine.id,
            "machine_code": machine.machine_code,
            "status": machine.status.value
        })

    db.commit()
    db.refresh(work_order)
    return work_order


@router.post("/{work_order_id}/logs", response_model=WorkLogResponse, status_code=status.HTTP_201_CREATED)
def add_work_log(
    work_order_id: int,
    log_in: WorkLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["TECHNICIAN", "SUPERVISOR", "MANAGER"]))
):
    """Add a troubleshooting step or progress update to a work order."""
    work_order = db.query(WorkOrder).filter(WorkOrder.id == work_order_id).first()
    if not work_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Work Order #{work_order_id} not found."
        )

    if (
        current_user.role.name == UserRole.TECHNICIAN.value
        and work_order.assigned_technician_id != current_user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only add logs to your assigned work orders."
        )

    log_entry = WorkLog(
        work_order_id=work_order.id,
        technician_id=current_user.id,
        step_description=log_in.step_description,
        action_taken=log_in.action_taken,
        status_snapshot=log_in.status_snapshot or work_order.status.value
    )
    db.add(log_entry)
    db.flush()

    AuditService.log_action(
        db=db,
        action=AuditAction.WORK_LOG_ADDED,
        entity_type="work_order",
        entity_id=work_order.id,
        user_id=current_user.id,
        new_value={"step": log_in.step_description, "action": log_in.action_taken}
    )

    db.commit()
    db.refresh(log_entry)
    return log_entry


@router.post("/{work_order_id}/parts", response_model=PartUsageResponse, status_code=status.HTTP_201_CREATED)
def use_spare_part(
    work_order_id: int,
    part_usage_in: PartUsageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["TECHNICIAN", "SUPERVISOR", "MANAGER"]))
):
    """Record spare part used in a repair, decrementing inventory atomically."""
    work_order = db.query(WorkOrder).filter(WorkOrder.id == work_order_id).first()
    if not work_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Work Order #{work_order_id} not found."
        )

    if (
        current_user.role.name == UserRole.TECHNICIAN.value
        and work_order.assigned_technician_id != current_user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only record parts on your assigned work orders."
        )

    usage = PartService.record_usage(
        db=db,
        work_order_id=work_order.id,
        part_id=part_usage_in.part_id,
        quantity_used=part_usage_in.quantity_used,
        user_id=current_user.id
    )

    db.commit()
    db.refresh(usage)
    return usage


@router.post("/{work_order_id}/complete", response_model=MaintenanceRecordResponse)
def complete_work_order(
    work_order_id: int,
    completion_data: WorkOrderComplete,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["TECHNICIAN", "SUPERVISOR", "MANAGER"]))
):
    """Technician marks work order complete and submits maintenance record for supervisor approval."""
    m_record = MaintenanceService.complete_work_order(
        db=db,
        work_order_id=work_order_id,
        technician_id=current_user.id,
        data=completion_data
    )
    db.commit()
    db.refresh(m_record)
    return m_record
