import json
import logging
from typing import List, Dict, Any, Optional, Set
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages authenticated WebSocket connections, role-based targeting, and real-time event dispatching."""

    def __init__(self):
        # Maps websocket instance to connection metadata: {"user_id": int, "role": str}
        self.active_connections: Dict[WebSocket, Dict[str, Any]] = {}
        # Maps user_id -> set of active WebSockets
        self.user_connections: Dict[int, Set[WebSocket]] = {}
        # Maps role string -> set of active WebSockets
        self.role_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: int, role: str):
        await websocket.accept()
        normalized_role = role.upper()
        self.active_connections[websocket] = {"user_id": user_id, "role": normalized_role}

        if user_id not in self.user_connections:
            self.user_connections[user_id] = set()
        self.user_connections[user_id].add(websocket)

        if normalized_role not in self.role_connections:
            self.role_connections[normalized_role] = set()
        self.role_connections[normalized_role].add(websocket)

        logger.info(
            f"WebSocket connected: User #{user_id} ({normalized_role}). "
            f"Total active connections: {len(self.active_connections)}"
        )

    def disconnect(self, websocket: WebSocket):
        meta = self.active_connections.pop(websocket, None)
        if meta:
            user_id = meta.get("user_id")
            role = meta.get("role")
            if user_id and user_id in self.user_connections:
                self.user_connections[user_id].discard(websocket)
                if not self.user_connections[user_id]:
                    del self.user_connections[user_id]
            if role and role in self.role_connections:
                self.role_connections[role].discard(websocket)
                if not self.role_connections[role]:
                    del self.role_connections[role]
            logger.info(
                f"WebSocket disconnected: User #{user_id} ({role}). "
                f"Remaining connections: {len(self.active_connections)}"
            )

    async def _safe_send(self, websocket: WebSocket, payload_str: str) -> bool:
        """Send message safely, catching and returning False if client disconnected."""
        try:
            await websocket.send_text(payload_str)
            return True
        except Exception as e:
            logger.warning(f"Failed to send text to WebSocket: {e}")
            return False

    async def send_to_user(self, user_id: int, event: str, data: Dict[str, Any]):
        """Send targeted real-time event to all connections of a specific user."""
        connections = list(self.user_connections.get(user_id, set()))
        if not connections:
            return

        payload = json.dumps({"event": event, "data": data})
        stale = []
        for ws in connections:
            ok = await self._safe_send(ws, payload)
            if not ok:
                stale.append(ws)

        for ws in stale:
            self.disconnect(ws)

    async def send_to_roles(self, roles: List[str], event: str, data: Dict[str, Any]):
        """Send targeted event to all users holding any of the specified roles."""
        target_connections: Set[WebSocket] = set()
        for role in roles:
            norm = role.upper()
            target_connections.update(self.role_connections.get(norm, set()))

        if not target_connections:
            return

        payload = json.dumps({"event": event, "data": data})
        stale = []
        for ws in target_connections:
            ok = await self._safe_send(ws, payload)
            if not ok:
                stale.append(ws)

        for ws in stale:
            self.disconnect(ws)

    async def broadcast(self, event: str, data: Dict[str, Any]):
        """Broadcast event to every active connection across the plant."""
        payload = json.dumps({"event": event, "data": data})
        stale = []
        for ws in list(self.active_connections.keys()):
            ok = await self._safe_send(ws, payload)
            if not ok:
                stale.append(ws)

        for ws in stale:
            self.disconnect(ws)


ws_manager = ConnectionManager()
