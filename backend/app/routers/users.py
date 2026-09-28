from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database.session import get_db
from app.models.user import User, Role
from app.models.work_order import WorkOrder, WorkLog
from app.models.incident import Incident
from app.models.maintenance import MaintenanceRecord
from app.models.part import PartUsage
from app.models.enums import UserRole, AuditAction, WorkOrderStatus, ApprovalStatus, IncidentStatus
from app.schemas.user import UserCreate, UserResponse, UserRoleUpdate, RoleResponse, UserPhoneUpdate, UserAvatarUpdate, UserWorkSummary
from app.auth.security import get_password_hash
from app.auth.deps import get_current_user, require_role
from app.services.audit_service import AuditService
from app.websocket.events import RealTimeEvents

router = APIRouter(prefix="/users", tags=["User Management"])


@router.get("/me", response_model=UserResponse)
def get_my_profile(
    current_user: User = Depends(get_current_user)
):
    """Get current authenticated user profile."""
    return current_user


@router.put("/me/phone", response_model=UserResponse)
def update_my_phone(
    phone_data: UserPhoneUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update current user's phone number."""
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.phone = phone_data.phone.strip() if phone_data.phone else None
    db.commit()
    db.refresh(user)
    return user


@router.delete("/me/phone", response_model=UserResponse)
def remove_my_phone(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove current user's phone number."""
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.phone = None
    db.commit()
    db.refresh(user)
    return user


@router.put("/me/avatar", response_model=UserResponse)
def update_my_avatar(
    avatar_data: UserAvatarUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update current user's profile avatar photo."""
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.avatar_url = avatar_data.avatar_url
    db.commit()
    db.refresh(user)
    return user


@router.delete("/me/avatar", response_model=UserResponse)
def remove_my_avatar(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove current user's profile avatar photo."""
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.avatar_url = None
    db.commit()
    db.refresh(user)
    return user



@router.get("/roles", response_model=List[RoleResponse])
def get_roles(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List available system roles."""
    return db.query(Role).all()


@router.get("", response_model=List[UserResponse])
def list_users(
    role_name: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List employees with live real-time work history summary telemetry."""
    query = db.query(User).join(Role)
    if role_name:
        query = query.filter(Role.name == role_name.upper())

    users = query.order_by(User.full_name).all()
    results = []

    for u in users:
        # Assigned work orders
        user_wos = db.query(WorkOrder).filter(WorkOrder.assigned_technician_id == u.id).all()
        active_wos = [w for w in user_wos if w.status in [WorkOrderStatus.ASSIGNED, WorkOrderStatus.IN_PROGRESS, WorkOrderStatus.WAITING]]
        completed_wos = [w for w in user_wos if w.status in [WorkOrderStatus.RESOLVED, WorkOrderStatus.APPROVED, WorkOrderStatus.CLOSED]]
        total_hours = sum(w.actual_hours or 0.0 for w in user_wos)
        resolved_with_hours = [w for w in completed_wos if (w.actual_hours or 0) > 0]
        avg_hours = (sum(w.actual_hours for w in resolved_with_hours) / len(resolved_with_hours)) if resolved_with_hours else 0.0

        # Incidents reported (for operators and plant floor workers)
        reported = db.query(Incident).filter(Incident.reported_by_id == u.id).all()
        open_incs = [i for i in reported if i.status in [IncidentStatus.OPEN, IncidentStatus.IN_PROGRESS]]

        # Current live task determination
        current_task = None
        in_prog = [w for w in user_wos if w.status == WorkOrderStatus.IN_PROGRESS]
        if in_prog:
            m_code = in_prog[0].machine.machine_code if in_prog[0].machine else "Machinery"
            current_task = f"{in_prog[0].work_order_number} ({m_code} - In Progress)"
        elif active_wos:
            m_code = active_wos[0].machine.machine_code if active_wos[0].machine else "Machinery"
            current_task = f"{active_wos[0].work_order_number} ({m_code} - Assigned)"
        elif open_incs:
            m_code = open_incs[0].machine.machine_code if open_incs[0].machine else "Machinery"
            current_task = f"{open_incs[0].incident_number} ({m_code} - Open)"

        # Parts usage
        usages = db.query(PartUsage).filter(PartUsage.recorded_by_id == u.id).all()
        parts_count = sum(pu.quantity_used for pu in usages)
        parts_cost = sum(float(pu.total_cost) for pu in usages)

        # Recent work log
        recent_log = db.query(WorkLog).filter(WorkLog.technician_id == u.id).order_by(WorkLog.timestamp.desc()).first()

        # Last active timestamp
        timestamps = []
        if recent_log:
            timestamps.append(recent_log.timestamp)
        if user_wos:
            timestamps.append(user_wos[0].updated_at or user_wos[0].created_at)
        if reported:
            timestamps.append(reported[0].updated_at or reported[0].created_at)
        if usages:
            timestamps.append(usages[0].used_at)
        last_active_iso = max(timestamps).isoformat() if timestamps else None

        summary = UserWorkSummary(
            total_jobs=len(user_wos) if (u.role and u.role.name == "TECHNICIAN") else (len(user_wos) or len(reported)),
            active_jobs=len(active_wos) if (u.role and u.role.name == "TECHNICIAN") else (len(active_wos) or len(open_incs)),
            completed_jobs=len(completed_wos),
            hours_logged=round(total_hours, 1),
            mttr_hours=round(avg_hours, 1),
            parts_installed=parts_count,
            total_parts_cost=round(parts_cost, 2),
            reported_incidents=len(reported),
            open_incidents=len(open_incs),
            current_task=current_task,
            last_active=last_active_iso
        )

        u_resp = UserResponse(
            id=u.id,
            username=u.username,
            email=u.email,
            full_name=u.full_name,
            phone=u.phone,
            avatar_url=u.avatar_url,
            role=RoleResponse(id=u.role.id, name=u.role.name, description=u.role.description) if u.role else None,
            is_active=u.is_active,
            created_at=u.created_at,
            work_summary=summary
        )
        results.append(u_resp)

    return results


@router.get("/{user_id}/work-history")
def get_user_work_history(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve technician or employee detailed work history, tasks completed, parts consumed, and MTTR."""
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User #{user_id} not found."
        )

    # Work orders assigned to this user
    assigned_orders = db.query(WorkOrder).filter(WorkOrder.assigned_technician_id == user_id).order_by(WorkOrder.created_at.desc()).all()
    active_count = sum(1 for w in assigned_orders if w.status in [WorkOrderStatus.ASSIGNED, WorkOrderStatus.IN_PROGRESS, WorkOrderStatus.WAITING])
    completed_count = sum(1 for w in assigned_orders if w.status in [WorkOrderStatus.RESOLVED, WorkOrderStatus.APPROVED, WorkOrderStatus.CLOSED])

    total_hours = sum(w.actual_hours or 0.0 for w in assigned_orders)
    completed_orders = [w for w in assigned_orders if w.status in [WorkOrderStatus.RESOLVED, WorkOrderStatus.APPROVED, WorkOrderStatus.CLOSED] and (w.actual_hours or 0) > 0]
    avg_hours = (sum(w.actual_hours for w in completed_orders) / len(completed_orders)) if completed_orders else 0.0

    # Work logs recorded by this technician
    work_logs = db.query(WorkLog).filter(WorkLog.technician_id == user_id).order_by(WorkLog.timestamp.desc()).limit(25).all()

    # Incidents reported by this user (crucial for operators / laborers)
    reported_incidents = db.query(Incident).filter(Incident.reported_by_id == user_id).order_by(Incident.created_at.desc()).limit(20).all()
    total_reported = len(reported_incidents)
    open_reported = sum(1 for inc in reported_incidents if inc.status in [IncidentStatus.OPEN, IncidentStatus.IN_PROGRESS])

    # Work orders supervised by this user (for supervisors)
    supervised_orders = db.query(WorkOrder).filter(WorkOrder.supervisor_id == user_id).order_by(WorkOrder.created_at.desc()).limit(15).all()

    # Parts used by this user
    usages = db.query(PartUsage).filter(PartUsage.recorded_by_id == user_id).order_by(PartUsage.used_at.desc()).all()
    total_parts_cost = sum(float(pu.total_cost) for pu in usages)
    total_parts_quantity = sum(pu.quantity_used for pu in usages)

    # Maintenance records authored by this technician
    records = db.query(MaintenanceRecord).filter(MaintenanceRecord.technician_id == user_id).all()
    approved_records_count = sum(1 for r in records if r.approval_status == ApprovalStatus.APPROVED)

    # Determine real-time last active timestamp
    activity_timestamps = []
    if work_logs:
        activity_timestamps.append(work_logs[0].timestamp)
    if assigned_orders:
        activity_timestamps.append(assigned_orders[0].updated_at or assigned_orders[0].created_at)
    if reported_incidents:
        activity_timestamps.append(reported_incidents[0].updated_at or reported_incidents[0].created_at)
    if usages:
        activity_timestamps.append(usages[0].used_at)

    last_active_iso = max(activity_timestamps).isoformat() if activity_timestamps else None

    # Current active job if any
    current_active_job = None
    in_progress_wos = [w for w in assigned_orders if w.status == WorkOrderStatus.IN_PROGRESS]
    if in_progress_wos:
        current_active_job = {
            "type": "WORK_ORDER",
            "number": in_progress_wos[0].work_order_number,
            "machine_code": in_progress_wos[0].machine.machine_code if in_progress_wos[0].machine else "N/A",
            "status": in_progress_wos[0].status.value
        }

    return {
        "user": {
            "id": target_user.id,
            "username": target_user.username,
            "full_name": target_user.full_name,
            "email": target_user.email,
            "role": target_user.role.name if target_user.role else "UNKNOWN",
            "is_active": target_user.is_active
        },
        "stats": {
            "total_assigned_jobs": len(assigned_orders),
            "active_jobs": active_count,
            "completed_jobs": completed_count,
            "completion_rate_percent": round((completed_count / len(assigned_orders) * 100), 1) if assigned_orders else 0.0,
            "total_hours_logged": round(total_hours, 1),
            "average_resolution_hours": round(avg_hours, 1),
            "total_parts_installed": total_parts_quantity,
            "total_parts_cost": round(total_parts_cost, 2),
            "approved_records_count": approved_records_count,
            "total_reported_incidents": total_reported,
            "open_reported_incidents": open_reported,
            "total_supervised_jobs": len(supervised_orders),
            "last_active": last_active_iso
        },
        "realtime": {
            "is_online": True,
            "current_active_job": current_active_job,
            "last_active_at": last_active_iso
        },
        "recent_work_orders": [
            {
                "id": w.id,
                "work_order_number": w.work_order_number,
                "machine_code": w.machine.machine_code if w.machine else None,
                "machine_name": w.machine.name if w.machine else None,
                "status": w.status.value,
                "priority": w.priority.value,
                "actual_hours": w.actual_hours,
                "started_at": w.started_at.isoformat() if w.started_at else None,
                "completed_at": w.completed_at.isoformat() if w.completed_at else None,
                "notes": w.notes
            }
            for w in assigned_orders[:15]
        ],
        "work_logs": [
            {
                "id": wl.id,
                "work_order_id": wl.work_order_id,
                "work_order_number": wl.work_order.work_order_number if wl.work_order else "N/A",
                "machine_code": wl.work_order.machine.machine_code if (wl.work_order and wl.work_order.machine) else None,
                "step_description": wl.step_description,
                "action_taken": wl.action_taken,
                "status_snapshot": wl.status_snapshot,
                "timestamp": wl.timestamp.isoformat() if wl.timestamp else None
            }
            for wl in work_logs
        ],
        "reported_incidents": [
            {
                "id": inc.id,
                "incident_number": inc.incident_number,
                "machine_code": inc.machine.machine_code if inc.machine else None,
                "machine_name": inc.machine.name if inc.machine else None,
                "description": inc.description,
                "severity": inc.severity.value,
                "priority": inc.priority.value,
                "status": inc.status.value,
                "created_at": inc.created_at.isoformat() if inc.created_at else None,
                "resolved_at": inc.resolved_at.isoformat() if inc.resolved_at else None
            }
            for inc in reported_incidents
        ],
        "supervised_work_orders": [
            {
                "id": sw.id,
                "work_order_number": sw.work_order_number,
                "machine_code": sw.machine.machine_code if sw.machine else None,
                "status": sw.status.value,
                "assigned_technician": sw.assigned_technician.full_name if sw.assigned_technician else "Unassigned",
                "created_at": sw.created_at.isoformat() if sw.created_at else None
            }
            for sw in supervised_orders
        ],
        "parts_installed": [
            {
                "id": pu.id,
                "part_number": pu.part.part_number if pu.part else None,
                "part_name": pu.part.name if pu.part else None,
                "quantity": pu.quantity_used,
                "total_cost": float(pu.total_cost),
                "work_order_id": pu.work_order_id,
                "used_at": pu.used_at.isoformat() if pu.used_at else None
            }
            for pu in usages[:15]
        ]
    }


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["MANAGER"]))
):
    """Create a new employee account with assigned role (Manager only)."""
    existing_user = db.query(User).filter(
        (User.username == user_in.username) | (User.email == user_in.email)
    ).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this username or email already exists."
        )

    role = db.query(Role).filter(Role.name == user_in.role_name.value).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Role '{user_in.role_name.value}' not found."
        )

    user = User(
        username=user_in.username,
        email=user_in.email,
        full_name=user_in.full_name,
        hashed_password=get_password_hash(user_in.password),
        role_id=role.id,
        is_active=True
    )
    db.add(user)
    db.flush()

    AuditService.log_action(
        db=db,
        action=AuditAction.USER_CREATED,
        entity_type="user",
        entity_id=user.id,
        user_id=current_user.id,
        new_value={"username": user.username, "role": role.name}
    )

    db.commit()
    db.refresh(user)

    RealTimeEvents.user_role_updated({
        "user_id": user.id,
        "username": user.username,
        "new_role": role.name,
        "action": "CREATED",
        "created_by": current_user.username
    })

    return user


@router.put("/{user_id}/role", response_model=UserResponse)
def update_user_role(
    user_id: int,
    role_update: UserRoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["MANAGER"]))
):
    """Change an employee's system role (Manager only). Strictly protected against unauthorized modification and manager self-demotion."""
    # Strict Access Control: Prevent plant manager from demoting themselves and causing admin lockout
    if user_id == current_user.id and role_update.role_name.value != UserRole.MANAGER.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Strict Access Control: Plant Managers cannot demote their own account to prevent administrative lockout."
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User #{user_id} not found."
        )

    role = db.query(Role).filter(Role.name == role_update.role_name.value).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Role '{role_update.role_name.value}' not found."
        )

    prev_role = user.role.name
    user.role_id = role.id

    AuditService.log_action(
        db=db,
        action=AuditAction.USER_ROLE_CHANGED,
        entity_type="user",
        entity_id=user.id,
        user_id=current_user.id,
        previous_value={"role": prev_role},
        new_value={"role": role.name}
    )

    db.commit()
    db.refresh(user)

    # Broadcast real-time role change event across plant WebSocket clients
    RealTimeEvents.user_role_updated({
        "user_id": user.id,
        "username": user.username,
        "previous_role": prev_role,
        "new_role": role.name,
        "action": "ROLE_CHANGED",
        "updated_by": current_user.username
    })

    return user
