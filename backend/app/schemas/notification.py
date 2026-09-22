from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.models.enums import NotificationType


class NotificationResponse(BaseModel):
    id: int
    recipient_id: int
    title: str
    message: str
    notification_type: NotificationType
    is_read: bool
    related_entity_type: Optional[str] = None
    related_entity_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True
