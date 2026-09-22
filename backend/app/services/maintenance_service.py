from datetime import datetime
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.work_order import WorkOrder
from app.models.maintenance import MaintenanceRecord
from app.models.incident import Incident
from app.models.machine import Machine
from app.models.enums import (
    WorkOrderStatus, IncidentStatus, MachineStatus, ApprovalStatus,
    AuditAction, NotificationType
)
from app.schemas.work_order import WorkOrderComplete
from app.services.audit_service import AuditService
from app.services.notification_service import NotificationService
from app.websocket.events import RealTimeEvents


class MaintenanceService:
    @staticmethod
    def complete_work_order(
        db: Session,
        work_order_id: int,
        technician_id: int,
        data: WorkOrderComplete
    ) -> MaintenanceRecord:
        """Technician completes work order and submits maintenance record for supervisor approval."""
        work_order = db.query(WorkOrder).filter(WorkOrder.id == work_order_id).first()
        if not work_order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Work Order #{work_order_id} not found."
            )

        if work_order.assigned_technician_id != technician_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not assigned to this work order."
            )

        if work_order.status in [WorkOrderStatus.RESOLVED, WorkOrderStatus.APPROVED, WorkOrderStatus.CLOSED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Work Order is already in {work_order.status.value} status."
            )

        # Update work order
        prev_status = work_order.status.value
        work_order.status = WorkOrderStatus.RESOLVED
        work_order.completed_at = datetime.utcnow()
        if data.actual_hours is not None:
            work_order.actual_hours = data.actual_hours
        if data.notes:
            work_order.notes = data.notes

        # Create draft maintenance record awaiting supervisor approval
        m_record = MaintenanceRecord(
            machine_id=work_order.machine_id,
            incident_id=work_order.incident_id,
            work_order_id=work_order.id,
            technician_id=technician_id,
            supervisor_id=work_order.supervisor_id,
            problem_summary=data.problem_summary,
            troubleshooting_steps=data.troubleshooting_steps,
            root_cause=data.root_cause,
            repair_action=data.repair_action,
            downtime_minutes=data.downtime_minutes,
            completion_time=datetime.utcnow(),
            approval_status=ApprovalStatus.PENDING
        )
        db.add(m_record)
        db.flush()

        # Audit log
        AuditService.log_action(
            db=db,
            action=AuditAction.WORK_COMPLETED,
            entity_type="work_order",
            entity_id=work_order.id,
            user_id=technician_id,
            previous_value={"status": prev_status},
            new_value={"status": WorkOrderStatus.RESOLVED.value, "maintenance_record_id": m_record.id}
        )

        # Notify Supervisor
        if work_order.supervisor_id:
            NotificationService.create_notification(
                db=db,
                recipient_id=work_order.supervisor_id,
                title="Maintenance Ready for Approval",
                message=f"Work Order {work_order.work_order_number} has been completed by technician and is pending your review.",
                notification_type=NotificationType.APPROVAL,
                related_entity_type="maintenance_record",
                related_entity_id=m_record.id
            )

        # Real-Time Event Dispatch
        RealTimeEvents.work_order_completed({
            "work_order_id": work_order.id,
            "work_order_number": work_order.work_order_number,
            "technician_id": technician_id,
            "maintenance_record_id": m_record.id,
            "machine_id": work_order.machine_id,
            "problem_summary": data.problem_summary
        })
        RealTimeEvents.maintenance_pending_approval({
            "maintenance_record_id": m_record.id,
            "work_order_id": work_order.id,
            "technician_id": technician_id,
            "machine_id": work_order.machine_id,
            "problem_summary": data.problem_summary
        })

        return m_record

    @staticmethod
    def process_approval(
        db: Session,
        record_id: int,
        supervisor_id: int,
        approved: bool,
        supervisor_notes: Optional[str] = None
    ) -> MaintenanceRecord:
        """Supervisor reviews and approves or rejects a completed maintenance record."""
        record = db.query(MaintenanceRecord).filter(MaintenanceRecord.id == record_id).first()
        if not record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Maintenance record #{record_id} not found."
            )

        if record.approval_status != ApprovalStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Maintenance record is already {record.approval_status.value}."
            )

        work_order = db.query(WorkOrder).filter(WorkOrder.id == record.work_order_id).first()
        machine = db.query(Machine).filter(Machine.id == record.machine_id).first()
        incident = db.query(Incident).filter(Incident.id == record.incident_id).first() if record.incident_id else None

        if approved:
            record.approval_status = ApprovalStatus.APPROVED
            record.approver_id = supervisor_id
            record.approval_time = datetime.utcnow()
            record.supervisor_notes = supervisor_notes

            if work_order:
                work_order.status = WorkOrderStatus.APPROVED
                work_order.approved_at = datetime.utcnow()

            if incident:
                incident.status = IncidentStatus.RESOLVED
                incident.resolved_at = datetime.utcnow()

            if machine:
                machine.status = MachineStatus.RUNNING
                machine.last_maintenance = datetime.utcnow()

            # Audit log
            AuditService.log_action(
                db=db,
                action=AuditAction.MAINTENANCE_APPROVED,
                entity_type="maintenance_record",
                entity_id=record.id,
                user_id=supervisor_id,
                previous_value={"approval_status": "PENDING"},
                new_value={"approval_status": "APPROVED", "machine_status": "RUNNING"}
            )

            # Ingest approved record into searchable RAG knowledge base
            try:
                from app.rag.ingestion import IngestionService
                IngestionService().ingest_approved_maintenance_record(db, record, approver_id=supervisor_id)
            except Exception as e:
                import logging
                logging.getLogger("equipfixai").warning(f"Failed to auto-index approved maintenance record #{record.id}: {e}")

            # Notify Technician
            NotificationService.create_notification(
                db=db,
                recipient_id=record.technician_id,
                title="Work Order Approved",
                message=f"Maintenance record for {machine.name if machine else 'machine'} has been approved.",
                notification_type=NotificationType.STATUS_CHANGE,
                related_entity_type="work_order",
                related_entity_id=work_order.id if work_order else None
            )

            # Notify Operator who reported incident
            if incident and incident.reported_by_id:
                NotificationService.create_notification(
                    db=db,
                    recipient_id=incident.reported_by_id,
                    title="Incident Resolved & Approved",
                    message=f"Incident {incident.incident_number} for machine {machine.name if machine else ''} is resolved and machine is back in service.",
                    notification_type=NotificationType.STATUS_CHANGE,
                    related_entity_type="incident",
                    related_entity_id=incident.id
                )

            # Real-time event dispatch
            RealTimeEvents.maintenance_approved(
                technician_id=record.technician_id,
                operator_id=incident.reported_by_id if incident else None,
                record_data={
                    "record_id": record.id,
                    "machine_id": machine.id if machine else None,
                    "machine_code": machine.machine_code if machine else "",
                    "work_order_id": work_order.id if work_order else None,
                    "approval_status": "APPROVED",
                    "approver_id": supervisor_id
                }
            )
            if machine:
                RealTimeEvents.machine_status_changed({
                    "machine_id": machine.id,
                    "machine_code": machine.machine_code,
                    "status": machine.status.value
                })

        else:
            # Rejected: return work order to in progress
            record.approval_status = ApprovalStatus.REJECTED
            record.approver_id = supervisor_id
            record.approval_time = datetime.utcnow()
            record.supervisor_notes = supervisor_notes

            if work_order:
                work_order.status = WorkOrderStatus.IN_PROGRESS

            AuditService.log_action(
                db=db,
                action=AuditAction.MAINTENANCE_REJECTED,
                entity_type="maintenance_record",
                entity_id=record.id,
                user_id=supervisor_id,
                previous_value={"approval_status": "PENDING"},
                new_value={"approval_status": "REJECTED", "notes": supervisor_notes}
            )

            # Notify Technician
            NotificationService.create_notification(
                db=db,
                recipient_id=record.technician_id,
                title="Maintenance Work Returned",
                message=f"Maintenance record for {machine.name if machine else 'machine'} was returned by supervisor: {supervisor_notes or 'Requires review'}",
                notification_type=NotificationType.ALERT,
                related_entity_type="work_order",
                related_entity_id=work_order.id if work_order else None
            )

        db.flush()
        return record
