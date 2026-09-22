import asyncio
import logging
from typing import Dict, Any, List, Optional
from app.websocket.manager import ws_manager

logger = logging.getLogger(__name__)


def dispatch_async(coroutine):
    """Run an async coroutine from synchronous FastAPI context safely."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.create_task(coroutine)
        else:
            loop.run_until_complete(coroutine)
    except RuntimeError:
        # If no event loop in current thread, create a new one
        new_loop = asyncio.new_event_loop()
        asyncio.set_event_loop(new_loop)
        new_loop.run_until_complete(coroutine)
        new_loop.close()
    except Exception as e:
        logger.warning(f"Failed to dispatch async event: {e}")


class RealTimeEvents:
    """Standardized industrial maintenance event dispatcher."""

    @staticmethod
    def incident_created(incident_data: Dict[str, Any]):
        """Emit incident.created to Supervisors and Managers."""
        dispatch_async(
            ws_manager.send_to_roles(["SUPERVISOR", "MANAGER"], "incident.created", incident_data)
        )

    @staticmethod
    def incident_assigned(technician_id: int, assignment_data: Dict[str, Any]):
        """Emit incident.assigned to the targeted technician."""
        dispatch_async(
            ws_manager.send_to_user(technician_id, "incident.assigned", assignment_data)
        )

    @staticmethod
    def work_order_updated(technician_id: Optional[int], wo_data: Dict[str, Any]):
        """Emit work_order.updated to assigned technician and supervisors."""
        if technician_id:
            dispatch_async(
                ws_manager.send_to_user(technician_id, "work_order.updated", wo_data)
            )
        dispatch_async(
            ws_manager.send_to_roles(["SUPERVISOR", "MANAGER"], "work_order.updated", wo_data)
        )

    @staticmethod
    def work_order_completed(wo_data: Dict[str, Any]):
        """Emit work_order.completed to Supervisors and Managers."""
        dispatch_async(
            ws_manager.send_to_roles(["SUPERVISOR", "MANAGER"], "work_order.completed", wo_data)
        )

    @staticmethod
    def maintenance_pending_approval(record_data: Dict[str, Any]):
        """Emit maintenance.pending_approval to Supervisors."""
        dispatch_async(
            ws_manager.send_to_roles(["SUPERVISOR"], "maintenance.pending_approval", record_data)
        )

    @staticmethod
    def maintenance_approved(technician_id: Optional[int], operator_id: Optional[int], record_data: Dict[str, Any]):
        """Emit maintenance.approved to Technician, Operator, and Managers."""
        if technician_id:
            dispatch_async(ws_manager.send_to_user(technician_id, "maintenance.approved", record_data))
        if operator_id:
            dispatch_async(ws_manager.send_to_user(operator_id, "maintenance.approved", record_data))
        dispatch_async(ws_manager.send_to_roles(["MANAGER"], "maintenance.approved", record_data))

    @staticmethod
    def machine_status_changed(machine_data: Dict[str, Any]):
        """Emit machine.status_changed to everyone across the plant."""
        dispatch_async(
            ws_manager.broadcast("machine.status_changed", machine_data)
        )

    @staticmethod
    def inventory_low_stock(part_data: Dict[str, Any]):
        """Emit inventory.low_stock to Supervisors and Managers."""
        dispatch_async(
            ws_manager.send_to_roles(["SUPERVISOR", "MANAGER"], "inventory.low_stock", part_data)
        )

    @staticmethod
    def notification_created(recipient_id: int, notif_data: Dict[str, Any]):
        """Emit notification.created directly to the recipient."""
        dispatch_async(
            ws_manager.send_to_user(recipient_id, "notification.created", notif_data)
        )
