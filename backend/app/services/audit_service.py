import json
from typing import Optional, Any
from sqlalchemy.orm import Session
from app.models.audit import AuditLog
from app.models.enums import AuditAction


class AuditService:
    @staticmethod
    def log_action(
        db: Session,
        action: AuditAction,
        entity_type: str,
        entity_id: Optional[int] = None,
        user_id: Optional[int] = None,
        previous_value: Optional[Any] = None,
        new_value: Optional[Any] = None,
        ip_address: Optional[str] = None
    ) -> AuditLog:
        """Create an immutable audit log record in database."""
        prev_str = json.dumps(previous_value, default=str) if previous_value is not None else None
        new_str = json.dumps(new_value, default=str) if new_value is not None else None

        audit_entry = AuditLog(
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            previous_value=prev_str,
            new_value=new_str,
            ip_address=ip_address
        )
        db.add(audit_entry)
        db.flush()
        return audit_entry
