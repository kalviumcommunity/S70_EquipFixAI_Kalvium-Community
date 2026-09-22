from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database.session import get_db
from app.models.user import User, Role
from app.models.work_order import WorkOrder
from app.models.maintenance import MaintenanceRecord
from app.models.part import PartUsage
from app.models.enums import UserRole, AuditAction, WorkOrderStatus, ApprovalStatus
from app.schemas.user import UserCreate, UserResponse, UserRoleUpdate, RoleResponse, UserPhoneUpdate, UserAvatarUpdate
from app.auth.security import get_password_hash
from app.auth.deps import get_current_user, require_role
from app.services.audit_service import AuditService

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
    current_user: User = Depends(require_role(["SUPERVISOR", "MANAGER"]))
):
    """List employees. Supervisors can view technicians for assignment; Managers can view all users."""
    query = db.query(User).join(Role)
    if role_name:
        query = query.filter(Role.name == role_name.upper())

    # Supervisors can only query technicians or operators
    if current_user.role.name == UserRole.SUPERVISOR.value and not role_name:
        query = query.filter(Role.name.in_([UserRole.TECHNICIAN.value, UserRole.OPERATOR.value]))

    return query.order_by(User.full_name).all()


@router.get("/{user_id}/work-history")
def get_user_work_history(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve technician or employee detailed work history, tasks completed, parts consumed, and MTTR."""
    # Authorization: User can view their own history, or Supervisor/Manager can view any user
    if current_user.id != user_id and current_user.role.name not in [UserRole.SUPERVISOR.value, UserRole.MANAGER.value]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own work history unless you are a supervisor or manager."
        )

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

    # Parts used by this user
    usages = db.query(PartUsage).filter(PartUsage.recorded_by_id == user_id).order_by(PartUsage.used_at.desc()).all()
    total_parts_cost = sum(float(pu.total_cost) for pu in usages)
    total_parts_quantity = sum(pu.quantity_used for pu in usages)

    # Maintenance records authored by this technician
    records = db.query(MaintenanceRecord).filter(MaintenanceRecord.technician_id == user_id).all()
    approved_records_count = sum(1 for r in records if r.approval_status == ApprovalStatus.APPROVED)

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
            "approved_records_count": approved_records_count
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
    return user


@router.put("/{user_id}/role", response_model=UserResponse)
def update_user_role(
    user_id: int,
    role_update: UserRoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["MANAGER"]))
):
    """Change an employee's system role (Manager only)."""
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
    return user
