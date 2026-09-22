from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.part import Part, PartUsage
from app.models.work_order import WorkOrder
from app.models.enums import AuditAction, NotificationType, UserRole
from app.services.audit_service import AuditService
from app.services.notification_service import NotificationService
from app.websocket.events import RealTimeEvents


class PartService:
    @staticmethod
    def record_usage(
        db: Session,
        work_order_id: int,
        part_id: int,
        quantity_used: int,
        user_id: int
    ) -> PartUsage:
        """Atomically record spare part usage, deduct inventory, and trigger low-stock alerts."""
        if quantity_used <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Quantity used must be greater than zero."
            )

        work_order = db.query(WorkOrder).filter(WorkOrder.id == work_order_id).first()
        if not work_order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Work Order #{work_order_id} not found."
            )

        # Query part with lock if supported or regular select
        part = db.query(Part).filter(Part.id == part_id).with_for_update().first()
        if not part:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Spare part #{part_id} not found."
            )

        if part.quantity < quantity_used:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient inventory for {part.name} ({part.part_number}). Available: {part.quantity}, requested: {quantity_used}."
            )

        prev_qty = part.quantity
        new_qty = part.quantity - quantity_used
        part.quantity = new_qty

        total_cost = round(part.unit_cost * quantity_used, 2)

        usage = PartUsage(
            work_order_id=work_order_id,
            part_id=part_id,
            quantity_used=quantity_used,
            unit_cost=part.unit_cost,
            total_cost=total_cost,
            recorded_by_id=user_id
        )
        db.add(usage)
        db.flush()

        # Audit log for inventory change
        AuditService.log_action(
            db=db,
            action=AuditAction.PARTS_USED,
            entity_type="part",
            entity_id=part.id,
            user_id=user_id,
            previous_value={"quantity": prev_qty},
            new_value={"quantity": new_qty, "quantity_used": quantity_used, "work_order_id": work_order_id}
        )

        # Check for Low-Stock condition
        if new_qty <= part.min_quantity:
            alert_msg = f"Low stock alert: {part.name} ({part.part_number}) is down to {new_qty} units (minimum threshold: {part.min_quantity}). Please reorder."
            NotificationService.notify_role(
                db=db,
                role_name=UserRole.SUPERVISOR,
                title="Low Stock Alert",
                message=alert_msg,
                notification_type=NotificationType.LOW_STOCK,
                related_entity_type="part",
                related_entity_id=part.id
            )
            NotificationService.notify_role(
                db=db,
                role_name=UserRole.MANAGER,
                title="Low Stock Alert",
                message=alert_msg,
                notification_type=NotificationType.LOW_STOCK,
                related_entity_type="part",
                related_entity_id=part.id
            )
            RealTimeEvents.inventory_low_stock({
                "part_id": part.id,
                "part_number": part.part_number,
                "name": part.name,
                "remaining_quantity": new_qty,
                "min_quantity": part.min_quantity
            })

        return usage

    @staticmethod
    def restock(
        db: Session,
        part_id: int,
        quantity_to_add: int,
        user_id: int,
        reason: Optional[str] = None
    ) -> Part:
        """Restock spare parts inventory."""
        if quantity_to_add <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Restock quantity must be positive."
            )

        part = db.query(Part).filter(Part.id == part_id).first()
        if not part:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Part #{part_id} not found."
            )

        prev_qty = part.quantity
        part.quantity += quantity_to_add
        db.flush()

        AuditService.log_action(
            db=db,
            action=AuditAction.PART_RESTOCKED,
            entity_type="part",
            entity_id=part.id,
            user_id=user_id,
            previous_value={"quantity": prev_qty},
            new_value={"quantity": part.quantity, "added": quantity_to_add, "reason": reason}
        )

        return part
