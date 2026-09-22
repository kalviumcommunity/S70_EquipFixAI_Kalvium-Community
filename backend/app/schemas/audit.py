from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.models.enums import AuditAction
from app.schemas.user import UserResponse


class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    action: AuditAction
    entity_type: str
    entity_id: Optional[int] = None
    previous_value: Optional[str] = None
    new_value: Optional[str] = None
    ip_address: Optional[str] = None
    timestamp: datetime

    user: Optional[UserResponse] = None

    class Config:
        from_attributes = True
