import logging
from typing import Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends, status
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from app.config import settings
from app.database.session import get_db
from app.models.user import User
from app.websocket.manager import ws_manager

logger = logging.getLogger(__name__)

router = APIRouter(tags=["WebSockets"])


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Authenticated WebSocket endpoint for real-time plant events and notifications.
    Clients supply JWT access token in query parameter (?token=...) to authenticate and register role.
    """
    authenticated_user = None

    if token:
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            username: str = payload.get("sub")
            if username:
                user = db.query(User).filter(User.username == username, User.is_active == True).first()
                if user:
                    authenticated_user = user
        except JWTError as e:
            logger.warning(f"WebSocket auth failed - invalid JWT: {e}")
        except Exception as e:
            logger.error(f"WebSocket auth exception: {e}")

    if not authenticated_user:
        logger.warning("Unauthenticated WebSocket connection attempt. Closing with policy violation.")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    user_id = authenticated_user.id
    role_name = authenticated_user.role.name if authenticated_user.role else "OPERATOR"

    await ws_manager.connect(websocket, user_id=user_id, role=role_name)
    try:
        # Send initial connection confirmation
        await websocket.send_json({
            "event": "connected",
            "data": {
                "user_id": user_id,
                "role": role_name,
                "username": authenticated_user.username
            }
        })

        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text('{"event": "pong"}')
            elif data.startswith("{"):
                # Handle client command message
                pass
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error for user #{user_id}: {e}")
        ws_manager.disconnect(websocket)
