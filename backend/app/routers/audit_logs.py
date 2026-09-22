from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.audit import AuditLog
from app.models.user import User
from app.models.enums import AuditAction
from app.schemas.audit import AuditLogResponse
from app.auth.deps import require_role

router = APIRouter(prefix="/audit-logs", tags=["Audit Trail"])


@router.get("", response_model=List[AuditLogResponse])
def list_audit_logs(
    action: Optional[AuditAction] = None,
    entity_type: Optional[str] = None,
    user_id: Optional[int] = None,
    limit: int = Query(50, le=200),
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["MANAGER", "SUPERVISOR"]))
):
    """Query system audit trail with filtering (Supervisor/Manager)."""
    query = db.query(AuditLog)
    if action:
        query = query.filter(AuditLog.action == action)
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)

    return query.order_by(AuditLog.timestamp.desc()).offset(offset).limit(limit).all()
