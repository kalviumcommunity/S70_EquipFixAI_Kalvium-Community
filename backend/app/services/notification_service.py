import logging
from typing import Optional, List
from sqlalchemy.orm import Session
from app.models.notification import Notification
from app.models.user import User, Role
from app.models.enums import NotificationType, UserRole
from app.websocket.events import RealTimeEvents, dispatch_async
from app.websocket.manager import ws_manager

logger = logging.getLogger(__name__)


class NotificationService:
    @staticmethod
    def create_notification(
        db: Session,
        recipient_id: int,
        title: str,
        message: str,
        notification_type: NotificationType,
        related_entity_type: Optional[str] = None,
        related_entity_id: Optional[int] = None
    ) -> Notification:
        """Create a notification in the database and send directly to recipient via WebSocket."""
        notif = Notification(
            recipient_id=recipient_id,
            title=title,
            message=message,
            notification_type=notification_type,
            related_entity_type=related_entity_type,
            related_entity_id=related_entity_id
        )
        db.add(notif)
        db.flush()

        notif_payload = {
            "id": notif.id,
            "recipient_id": recipient_id,
            "title": title,
            "message": message,
            "type": str(notification_type.value if hasattr(notification_type, "value") else notification_type),
            "related_entity_type": related_entity_type,
            "related_entity_id": related_entity_id,
            "created_at": notif.created_at.isoformat() if notif.created_at else None
        }

        # Targeted real-time delivery to the recipient only
        RealTimeEvents.notification_created(recipient_id, notif_payload)
        # Also dispatch legacy NOTIFICATION_CREATED to the user for backward compatibility
        dispatch_async(ws_manager.send_to_user(recipient_id, "NOTIFICATION_CREATED", notif_payload))

        return notif

    @staticmethod
    def notify_role(
        db: Session,
        role_name: UserRole,
        title: str,
        message: str,
        notification_type: NotificationType,
        related_entity_type: Optional[str] = None,
        related_entity_id: Optional[int] = None
    ) -> List[Notification]:
        """Send notification to all active users with a specified role."""
        users = (
            db.query(User)
            .join(Role)
            .filter(Role.name == role_name.value, User.is_active == True)
            .all()
        )
        notifications = []
        for u in users:
            notif = NotificationService.create_notification(
                db=db,
                recipient_id=u.id,
                title=title,
                message=message,
                notification_type=notification_type,
                related_entity_type=related_entity_type,
                related_entity_id=related_entity_id
            )
            notifications.append(notif)
        return notifications
