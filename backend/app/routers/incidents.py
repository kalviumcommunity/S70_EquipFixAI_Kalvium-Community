import random
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.incident import Incident
from app.models.machine import Machine
from app.models.work_order import WorkOrder
from app.models.user import User
from app.models.enums import (
    IncidentSeverity, IncidentPriority, IncidentStatus,
    MachineStatus, WorkOrderStatus, AuditAction, NotificationType, UserRole
)
from app.schemas.incident import (
    IncidentCreate, IncidentAssign, IncidentPriorityUpdate, IncidentResponse
)
from app.auth.deps import get_current_user, require_role
from app.services.audit_service import AuditService
from app.services.notification_service import NotificationService
from app.websocket.events import RealTimeEvents

router = APIRouter(prefix="/incidents", tags=["Incidents"])


def generate_incident_number(db: Session) -> str:
    """Generate sequential or unique human-readable incident number like INC-1042."""
    count = db.query(Incident).count() + 1
    return f"INC-{count:04d}"


def generate_work_order_number(db: Session) -> str:
    """Generate sequential or unique work order number like WO-2001."""
    count = db.query(WorkOrder).count() + 1
    return f"WO-{count:04d}"


@router.post("", response_model=IncidentResponse, status_code=status.HTTP_201_CREATED)
def report_incident(
    incident_in: IncidentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Report an equipment problem / create an incident (Labor/Operator, Supervisor, Manager)."""
    # Verify machine exists
    machine = db.query(Machine).filter(Machine.id == incident_in.machine_id).first()
    if not machine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Machine #{incident_in.machine_id} not found."
        )

    incident_num = generate_incident_number(db)
    
    # Set default priority matching severity
    priority_map = {
        IncidentSeverity.LOW: IncidentPriority.LOW,
        IncidentSeverity.MEDIUM: IncidentPriority.MEDIUM,
        IncidentSeverity.HIGH: IncidentPriority.HIGH,
        IncidentSeverity.CRITICAL: IncidentPriority.CRITICAL,
    }
    priority = priority_map.get(incident_in.severity, IncidentPriority.MEDIUM)

    incident = Incident(
        incident_number=incident_num,
        machine_id=incident_in.machine_id,
        reported_by_id=current_user.id,
        description=incident_in.description,
        severity=incident_in.severity,
        priority=priority,
        status=IncidentStatus.OPEN,
        image_url=incident_in.image_url
    )
    db.add(incident)

    # Update machine status if high or critical
    if incident_in.severity == IncidentSeverity.CRITICAL:
        machine.status = MachineStatus.DOWN
    elif incident_in.severity == IncidentSeverity.HIGH and machine.status == MachineStatus.RUNNING:
        machine.status = MachineStatus.WARNING

    db.flush()

    # Log audit
    AuditService.log_action(
        db=db,
        action=AuditAction.INCIDENT_CREATED,
        entity_type="incident",
        entity_id=incident.id,
        user_id=current_user.id,
        new_value={"incident_number": incident.incident_number, "machine": machine.machine_code, "severity": incident.severity.value}
    )

    # Notify Supervisors
    NotificationService.notify_role(
        db=db,
        role_name=UserRole.SUPERVISOR,
        title=f"New Incident: {incident.incident_number}",
        message=f"Machine {machine.machine_code} reported problem: {incident.description[:100]} ({incident.severity.value})",
        notification_type=NotificationType.ALERT,
        related_entity_type="incident",
        related_entity_id=incident.id
    )

    # Real-Time Event Dispatch
    RealTimeEvents.incident_created({
        "id": incident.id,
        "incident_number": incident.incident_number,
        "machine_id": machine.id,
        "machine_code": machine.machine_code,
        "severity": incident.severity.value,
        "priority": incident.priority.value,
        "description": incident.description,
        "status": incident.status.value,
        "reported_by_id": current_user.id
    })
    if incident_in.severity in [IncidentSeverity.CRITICAL, IncidentSeverity.HIGH]:
        RealTimeEvents.machine_status_changed({
            "machine_id": machine.id,
            "machine_code": machine.machine_code,
            "status": machine.status.value
        })

    db.commit()
    db.refresh(incident)
    return incident


@router.get("", response_model=List[IncidentResponse])
def list_incidents(
    status_filter: Optional[IncidentStatus] = None,
    machine_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List incidents. Operators see their own reports. Supervisors/Managers see all."""
    query = db.query(Incident)

    # RBAC filtering: Operators only see incidents they reported
    if current_user.role.name == UserRole.OPERATOR.value:
        query = query.filter(Incident.reported_by_id == current_user.id)

    if status_filter:
        query = query.filter(Incident.status == status_filter)
    if machine_id:
        query = query.filter(Incident.machine_id == machine_id)

    return query.order_by(Incident.created_at.desc()).all()


@router.get("/{incident_id}", response_model=IncidentResponse)
def get_incident(
    incident_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get incident details by ID."""
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident #{incident_id} not found."
        )

    # RBAC check: Operators cannot view others' incidents
    if current_user.role.name == UserRole.OPERATOR.value and incident.reported_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: you can only view incidents reported by you."
        )

    return incident


@router.put("/{incident_id}/assign", response_model=IncidentResponse)
def assign_technician(
    incident_id: int,
    assignment: IncidentAssign,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["SUPERVISOR", "MANAGER"]))
):
    """Supervisor assigns a technician to an incident, automatically creating a Work Order."""
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident #{incident_id} not found."
        )

    tech = db.query(User).filter(User.id == assignment.technician_id).first()
    if not tech or tech.role.name != UserRole.TECHNICIAN.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Assigned user must exist and have the TECHNICIAN role."
        )

    prev_tech = incident.assigned_technician_id
    incident.assigned_technician_id = tech.id
    incident.supervisor_id = current_user.id
    incident.status = IncidentStatus.ASSIGNED
    if assignment.priority:
        incident.priority = assignment.priority

    # Find existing work order or create new one
    work_order = db.query(WorkOrder).filter(WorkOrder.incident_id == incident.id).first()
    if not work_order:
        wo_num = generate_work_order_number(db)
        work_order = WorkOrder(
            work_order_number=wo_num,
            incident_id=incident.id,
            machine_id=incident.machine_id,
            assigned_technician_id=tech.id,
            supervisor_id=current_user.id,
            priority=incident.priority,
            status=WorkOrderStatus.ASSIGNED,
            estimated_hours=assignment.estimated_hours or 2.0,
            notes=assignment.supervisor_notes
        )
        db.add(work_order)
    else:
        work_order.assigned_technician_id = tech.id
        work_order.supervisor_id = current_user.id
        work_order.status = WorkOrderStatus.ASSIGNED
        if assignment.priority:
            work_order.priority = assignment.priority

    db.flush()

    # Log audit
    AuditService.log_action(
        db=db,
        action=AuditAction.TECHNICIAN_ASSIGNED,
        entity_type="incident",
        entity_id=incident.id,
        user_id=current_user.id,
        previous_value={"assigned_technician_id": prev_tech},
        new_value={"assigned_technician_id": tech.id, "technician_name": tech.full_name, "work_order_id": work_order.id}
    )

    # Notify Technician
    NotificationService.create_notification(
        db=db,
        recipient_id=tech.id,
        title=f"New Work Order Assigned: {work_order.work_order_number}",
        message=f"You have been assigned to {incident.incident_number} for machine {incident.machine.machine_code} with priority {incident.priority.value}.",
        notification_type=NotificationType.ASSIGNMENT,
        related_entity_type="work_order",
        related_entity_id=work_order.id
    )

    # Notify Operator
    if incident.reported_by_id:
        NotificationService.create_notification(
            db=db,
            recipient_id=incident.reported_by_id,
            title="Technician Assigned",
            message=f"Your incident {incident.incident_number} has been assigned to {tech.full_name}.",
            notification_type=NotificationType.STATUS_CHANGE,
            related_entity_type="incident",
            related_entity_id=incident.id
        )

    # Real-time event dispatch
    RealTimeEvents.incident_assigned(tech.id, {
        "incident_id": incident.id,
        "incident_number": incident.incident_number,
        "work_order_id": work_order.id,
        "work_order_number": work_order.work_order_number,
        "technician_id": tech.id,
        "technician_name": tech.full_name,
        "priority": incident.priority.value,
        "machine_code": incident.machine.machine_code if incident.machine else ""
    })
    RealTimeEvents.work_order_updated(tech.id, {
        "id": work_order.id,
        "work_order_number": work_order.work_order_number,
        "incident_id": incident.id,
        "status": work_order.status.value,
        "assigned_technician_id": tech.id,
        "priority": work_order.priority.value
    })

    db.commit()
    db.refresh(incident)
    return incident


@router.put("/{incident_id}/priority", response_model=IncidentResponse)
def update_priority(
    incident_id: int,
    data: IncidentPriorityUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["SUPERVISOR", "MANAGER"]))
):
    """Supervisor/Manager changes incident priority, severity, or escalates incident."""
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident #{incident_id} not found."
        )

    prev_vals = {
        "priority": incident.priority.value,
        "severity": incident.severity.value,
        "status": incident.status.value,
    }

    if data.priority:
        incident.priority = data.priority
    if data.severity:
        incident.severity = data.severity
    if data.status:
        incident.status = data.status

    AuditService.log_action(
        db=db,
        action=AuditAction.PRIORITY_CHANGED,
        entity_type="incident",
        entity_id=incident.id,
        user_id=current_user.id,
        previous_value=prev_vals,
        new_value={
            "priority": incident.priority.value,
            "severity": incident.severity.value,
            "status": incident.status.value,
        }
    )

    db.commit()
    db.refresh(incident)
    return incident
