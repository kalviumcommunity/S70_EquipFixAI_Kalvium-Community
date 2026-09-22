import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.models.maintenance import MaintenanceSchedule
from app.models.work_order import WorkOrder
from app.models.incident import Incident
from app.models.machine import Machine
from app.models.user import User, Role
from app.models.enums import (
    WorkOrderStatus, IncidentStatus, IncidentSeverity,
    IncidentPriority, MaintenanceFrequency, NotificationType, UserRole, AuditAction
)
from app.services.audit_service import AuditService
from app.services.notification_service import NotificationService
from app.websocket.events import RealTimeEvents

logger = logging.getLogger(__name__)


class SchedulerService:
    """Automated preventive maintenance scheduler and routine maintenance dispatcher."""

    @staticmethod
    def calculate_next_date(frequency: MaintenanceFrequency, from_date: datetime) -> datetime:
        if frequency == MaintenanceFrequency.DAILY:
            return from_date + timedelta(days=1)
        elif frequency == MaintenanceFrequency.WEEKLY:
            return from_date + timedelta(weeks=1)
        elif frequency == MaintenanceFrequency.MONTHLY:
            return from_date + timedelta(days=30)
        elif frequency == MaintenanceFrequency.QUARTERLY:
            return from_date + timedelta(days=90)
        elif frequency == MaintenanceFrequency.ANNUAL:
            return from_date + timedelta(days=365)
        return from_date + timedelta(days=30)

    @staticmethod
    def find_active_pm_work_order(db: Session, machine_id: int, task_name: str) -> Optional[WorkOrder]:
        """Check if an unresolved / unclosed work order already exists for this machine and PM task (DUPLICATE PREVENTION)."""
        active_statuses = [
            WorkOrderStatus.OPEN,
            WorkOrderStatus.ASSIGNED,
            WorkOrderStatus.IN_PROGRESS,
            WorkOrderStatus.WAITING,
            WorkOrderStatus.ESCALATED
        ]
        orders = (
            db.query(WorkOrder)
            .filter(
                WorkOrder.machine_id == machine_id,
                WorkOrder.status.in_(active_statuses)
            )
            .all()
        )
        for wo in orders:
            if task_name.lower() in (wo.notes or "").lower():
                return wo
        return None

    @classmethod
    def check_and_trigger_schedules(cls, db: Session, user_id: Optional[int] = None) -> Dict[str, Any]:
        """Scan active maintenance schedules, generate work orders without duplicates, and emit notifications."""
        now = datetime.utcnow()
        three_days_from_now = now + timedelta(days=3)

        schedules = db.query(MaintenanceSchedule).filter(MaintenanceSchedule.status == "ACTIVE").all()

        created_wos = []
        duplicates_skipped = []
        upcoming_notified = []
        overdue_notified = []

        # Find default technician and supervisor for system automated actions
        tech_role = db.query(Role).filter(Role.name == UserRole.TECHNICIAN.value).first()
        technicians = db.query(User).filter(User.role_id == tech_role.id, User.is_active == True).all() if tech_role else []
        super_role = db.query(Role).filter(Role.name == UserRole.SUPERVISOR.value).first()
        supervisors = db.query(User).filter(User.role_id == super_role.id, User.is_active == True).all() if super_role else []

        fallback_tech_id = technicians[0].id if technicians else 1
        fallback_super_id = supervisors[0].id if supervisors else 1
        actor_id = user_id or fallback_super_id

        for sched in schedules:
            machine = sched.machine
            if not machine:
                continue

            # 1. Check if Due (next_due_date <= now)
            if sched.next_due_date <= now:
                # Duplicate check: check if work order already exists
                existing_wo = cls.find_active_pm_work_order(db, sched.machine_id, sched.task_name)
                if existing_wo:
                    # Prevent duplicate: Do not create duplicate work order!
                    logger.info(
                        f"Preventive maintenance '{sched.task_name}' on machine {machine.machine_code} "
                        f"is due, but Work Order {existing_wo.work_order_number} is already in progress. Skipping duplicate creation."
                    )
                    NotificationService.notify_role(
                        db=db,
                        role_name=UserRole.SUPERVISOR,
                        title="Preventive Maintenance Overdue / Pending Active Work Order",
                        message=(
                            f"PM task '{sched.task_name}' for machine {machine.machine_code} is due, "
                            f"but Work Order {existing_wo.work_order_number} is currently active ({existing_wo.status.value})."
                        ),
                        notification_type=NotificationType.ALERT,
                        related_entity_type="work_order",
                        related_entity_id=existing_wo.id
                    )
                    duplicates_skipped.append({
                        "schedule_id": sched.id,
                        "task_name": sched.task_name,
                        "machine_code": machine.machine_code,
                        "existing_work_order": existing_wo.work_order_number,
                        "reason": f"Active work order {existing_wo.work_order_number} already in progress"
                    })
                    continue

                # No duplicate -> generate new PM work order
                assigned_tech_id = fallback_tech_id
                # If specific technician ID was saved in schedule
                if str(sched.assigned_role_or_user).isdigit():
                    t_cand = db.query(User).filter(User.id == int(sched.assigned_role_or_user)).first()
                    if t_cand:
                        assigned_tech_id = t_cand.id

                count = db.query(WorkOrder).count() + 1
                wo_num = f"PM-{count:04d}"

                # Create synthetic routine incident
                pm_incident = Incident(
                    incident_number=f"PM-INC-{count:04d}",
                    machine_id=sched.machine_id,
                    reported_by_id=actor_id,
                    description=f"Preventive Maintenance Schedule: {sched.task_name}. {sched.description or ''}",
                    severity=IncidentSeverity.LOW,
                    priority=IncidentPriority.MEDIUM,
                    status=IncidentStatus.ASSIGNED,
                    assigned_technician_id=assigned_tech_id,
                    supervisor_id=actor_id
                )
                db.add(pm_incident)
                db.flush()

                work_order = WorkOrder(
                    work_order_number=wo_num,
                    incident_id=pm_incident.id,
                    machine_id=sched.machine_id,
                    assigned_technician_id=assigned_tech_id,
                    supervisor_id=actor_id,
                    priority=IncidentPriority.MEDIUM,
                    status=WorkOrderStatus.ASSIGNED,
                    estimated_hours=2.0,
                    notes=f"Preventive Maintenance Task: {sched.task_name}"
                )
                db.add(work_order)
                db.flush()

                # Advance schedule
                sched.last_performed_date = now
                sched.next_due_date = cls.calculate_next_date(sched.frequency, now)

                # Log audit
                AuditService.log_action(
                    db=db,
                    action=AuditAction.SCHEDULE_TRIGGERED,
                    entity_type="maintenance_schedule",
                    entity_id=sched.id,
                    user_id=actor_id,
                    new_value={
                        "work_order": work_order.work_order_number,
                        "task": sched.task_name,
                        "machine": machine.machine_code
                    }
                )

                # Send notifications
                NotificationService.create_notification(
                    db=db,
                    recipient_id=assigned_tech_id,
                    title="Preventive Maintenance Assigned",
                    message=f"Routine PM Task '{sched.task_name}' for machine {machine.machine_code} assigned under {work_order.work_order_number}.",
                    notification_type=NotificationType.ASSIGNMENT,
                    related_entity_type="work_order",
                    related_entity_id=work_order.id
                )

                # Dispatch real-time events
                RealTimeEvents.work_order_updated(assigned_tech_id, {
                    "id": work_order.id,
                    "work_order_number": work_order.work_order_number,
                    "status": work_order.status.value,
                    "priority": work_order.priority.value,
                    "machine_code": machine.machine_code
                })

                created_wos.append({
                    "schedule_id": sched.id,
                    "task_name": sched.task_name,
                    "machine_code": machine.machine_code,
                    "work_order_number": work_order.work_order_number,
                    "assigned_technician_id": assigned_tech_id,
                    "next_due_date": sched.next_due_date.isoformat()
                })

            # 2. Check Upcoming (due within 3 days)
            elif now < sched.next_due_date <= three_days_from_now:
                days_left = (sched.next_due_date - now).days
                upcoming_notified.append({
                    "schedule_id": sched.id,
                    "task_name": sched.task_name,
                    "machine_code": machine.machine_code,
                    "due_in_days": days_left
                })

            # 3. Check Overdue (due date passed without performance)
            elif sched.next_due_date < now - timedelta(days=1):
                overdue_notified.append({
                    "schedule_id": sched.id,
                    "task_name": sched.task_name,
                    "machine_code": machine.machine_code,
                    "overdue_since": sched.next_due_date.isoformat()
                })

        db.commit()

        return {
            "timestamp": now.isoformat(),
            "total_schedules_checked": len(schedules),
            "work_orders_created": created_wos,
            "duplicates_prevented": duplicates_skipped,
            "upcoming_schedules": upcoming_notified,
            "overdue_schedules": overdue_notified
        }
