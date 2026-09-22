import csv
import io
from datetime import datetime
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database.session import get_db
from app.models.maintenance import MaintenanceRecord
from app.models.incident import Incident
from app.models.work_order import WorkOrder
from app.models.machine import Machine
from app.models.user import User, Role
from app.models.enums import UserRole, WorkOrderStatus
from app.auth.deps import require_role

router = APIRouter(prefix="/reports", tags=["Reports & Analytics Export"])


@router.get("/maintenance.csv")
def export_maintenance_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["SUPERVISOR", "MANAGER"]))
):
    """Export maintenance records as downloadable CSV."""
    records = db.query(MaintenanceRecord).order_by(MaintenanceRecord.created_at.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Record ID", "Machine Code", "Machine Name", "Technician",
        "Problem Summary", "Root Cause", "Repair Action",
        "Downtime (Minutes)", "Approval Status", "Completed Date"
    ])

    for r in records:
        writer.writerow([
            r.id,
            r.machine.machine_code if r.machine else "N/A",
            r.machine.name if r.machine else "N/A",
            r.technician.full_name if r.technician else "N/A",
            r.problem_summary,
            r.root_cause,
            r.repair_action,
            r.downtime_minutes,
            r.approval_status.value if hasattr(r.approval_status, "value") else str(r.approval_status),
            r.completion_time.strftime("%Y-%m-%d %H:%M:%S") if r.completion_time else ""
        ])

    filename = f"maintenance_records_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/maintenance.json")
def export_maintenance_json(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["SUPERVISOR", "MANAGER"]))
):
    """Export maintenance records as JSON."""
    records = db.query(MaintenanceRecord).order_by(MaintenanceRecord.created_at.desc()).all()
    return [
        {
            "id": r.id,
            "machine_code": r.machine.machine_code if r.machine else None,
            "machine_name": r.machine.name if r.machine else None,
            "technician": r.technician.full_name if r.technician else None,
            "problem_summary": r.problem_summary,
            "root_cause": r.root_cause,
            "repair_action": r.repair_action,
            "downtime_minutes": r.downtime_minutes,
            "approval_status": r.approval_status.value if hasattr(r.approval_status, "value") else str(r.approval_status),
            "completion_time": r.completion_time.isoformat() if r.completion_time else None,
        }
        for r in records
    ]


@router.get("/incidents.csv")
def export_incidents_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["SUPERVISOR", "MANAGER"]))
):
    """Export incident logs as downloadable CSV."""
    incidents = db.query(Incident).order_by(Incident.created_at.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Incident Number", "Machine Code", "Reporter", "Technician Assigned",
        "Severity", "Priority", "Status", "Description", "Created At", "Resolved At"
    ])

    for inc in incidents:
        writer.writerow([
            inc.incident_number,
            inc.machine.machine_code if inc.machine else "N/A",
            inc.reporter.full_name if inc.reporter else "N/A",
            inc.technician.full_name if inc.technician else "Unassigned",
            inc.severity.value if hasattr(inc.severity, "value") else str(inc.severity),
            inc.priority.value if hasattr(inc.priority, "value") else str(inc.priority),
            inc.status.value if hasattr(inc.status, "value") else str(inc.status),
            inc.description,
            inc.created_at.strftime("%Y-%m-%d %H:%M:%S") if inc.created_at else "",
            inc.resolved_at.strftime("%Y-%m-%d %H:%M:%S") if inc.resolved_at else ""
        ])

    filename = f"incidents_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/incidents.json")
def export_incidents_json(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["SUPERVISOR", "MANAGER"]))
):
    """Export incident logs as JSON."""
    incidents = db.query(Incident).order_by(Incident.created_at.desc()).all()
    return [
        {
            "id": inc.id,
            "incident_number": inc.incident_number,
            "machine_code": inc.machine.machine_code if inc.machine else None,
            "reported_by": inc.reporter.full_name if inc.reporter else None,
            "assigned_technician": inc.technician.full_name if inc.technician else None,
            "severity": inc.severity.value if hasattr(inc.severity, "value") else str(inc.severity),
            "priority": inc.priority.value if hasattr(inc.priority, "value") else str(inc.priority),
            "status": inc.status.value if hasattr(inc.status, "value") else str(inc.status),
            "description": inc.description,
            "created_at": inc.created_at.isoformat() if inc.created_at else None,
            "resolved_at": inc.resolved_at.isoformat() if inc.resolved_at else None,
        }
        for inc in incidents
    ]


@router.get("/downtime.csv")
def export_downtime_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["SUPERVISOR", "MANAGER"]))
):
    """Export machine downtime metrics as downloadable CSV."""
    machines = db.query(Machine).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Machine Code", "Machine Name", "Department", "Location",
        "Current Status", "Total Downtime (Minutes)", "Total Incidents",
        "Maintenance Records Count", "MTTR (Minutes)"
    ])

    for m in machines:
        total_dt = db.query(func.coalesce(func.sum(MaintenanceRecord.downtime_minutes), 0)).filter(
            MaintenanceRecord.machine_id == m.id
        ).scalar()
        inc_count = db.query(Incident).filter(Incident.machine_id == m.id).count()
        rec_count = db.query(MaintenanceRecord).filter(MaintenanceRecord.machine_id == m.id).count()
        mttr = round(float(total_dt) / rec_count, 1) if rec_count > 0 else 0.0

        writer.writerow([
            m.machine_code,
            m.name,
            m.department,
            m.location,
            m.status.value if hasattr(m.status, "value") else str(m.status),
            int(total_dt),
            inc_count,
            rec_count,
            mttr
        ])

    filename = f"downtime_analysis_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/technicians.csv")
def export_technicians_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["SUPERVISOR", "MANAGER"]))
):
    """Export technician performance and workload as downloadable CSV."""
    tech_role = db.query(Role).filter(Role.name == UserRole.TECHNICIAN.value).first()
    technicians = db.query(User).filter(User.role_id == tech_role.id).all() if tech_role else []

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Technician ID", "Name", "Email", "Active Work Orders",
        "Completed Work Orders", "Total Hours Logged", "Average Resolution Hours"
    ])

    for tech in technicians:
        active = db.query(WorkOrder).filter(
            WorkOrder.assigned_technician_id == tech.id,
            WorkOrder.status.in_([WorkOrderStatus.ASSIGNED, WorkOrderStatus.IN_PROGRESS, WorkOrderStatus.WAITING])
        ).count()

        completed = db.query(WorkOrder).filter(
            WorkOrder.assigned_technician_id == tech.id,
            WorkOrder.status.in_([WorkOrderStatus.RESOLVED, WorkOrderStatus.APPROVED, WorkOrderStatus.CLOSED])
        ).count()

        total_hours = db.query(func.coalesce(func.sum(WorkOrder.actual_hours), 0.0)).filter(
            WorkOrder.assigned_technician_id == tech.id
        ).scalar()

        avg_hours = db.query(func.avg(WorkOrder.actual_hours)).filter(
            WorkOrder.assigned_technician_id == tech.id,
            WorkOrder.status.in_([WorkOrderStatus.RESOLVED, WorkOrderStatus.APPROVED, WorkOrderStatus.CLOSED]),
            WorkOrder.actual_hours > 0
        ).scalar()

        writer.writerow([
            tech.id,
            tech.full_name,
            tech.email,
            active,
            completed,
            round(float(total_hours), 1),
            round(float(avg_hours), 1) if avg_hours else 0.0
        ])

    filename = f"technician_performance_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
