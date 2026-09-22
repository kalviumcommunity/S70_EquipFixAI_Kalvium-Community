from datetime import datetime, timedelta
from typing import List, Dict
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.machine import Machine
from app.models.incident import Incident
from app.models.work_order import WorkOrder
from app.models.maintenance import MaintenanceRecord
from app.models.part import Part, PartUsage
from app.models.user import User, Role
from app.models.enums import MachineStatus, IncidentStatus, WorkOrderStatus, ApprovalStatus, UserRole
from app.schemas.analytics import (
    AnalyticsDashboardResponse, MachineStatusCount,
    TechnicianWorkload, RecurringFailure, DowntimeByMachine,
    SubsystemFailure, MaintenanceCostMonthly
)
from app.auth.deps import require_role

router = APIRouter(prefix="/analytics", tags=["Manager Analytics"])


@router.get("/dashboard", response_model=AnalyticsDashboardResponse)
def get_manager_dashboard_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["MANAGER", "SUPERVISOR"]))
):
    """Compute live plant-wide maintenance metrics from database."""
    # Machine Status Breakdown
    machines = db.query(Machine).all()
    total_m = len(machines)
    running_m = sum(1 for m in machines if m.status == MachineStatus.RUNNING)
    warning_m = sum(1 for m in machines if m.status == MachineStatus.WARNING)
    down_m = sum(1 for m in machines if m.status == MachineStatus.DOWN)
    maint_m = sum(1 for m in machines if m.status == MachineStatus.MAINTENANCE)

    status_counts = MachineStatusCount(
        running=running_m,
        warning=warning_m,
        down=down_m,
        maintenance=maint_m,
        total=total_m
    )

    # Active Incidents (not resolved or closed)
    active_incidents = db.query(Incident).filter(
        Incident.status.notin_([IncidentStatus.RESOLVED, IncidentStatus.APPROVED, IncidentStatus.CLOSED, IncidentStatus.CANCELLED])
    ).count()

    # Pending Supervisor Approvals
    pending_approvals = db.query(MaintenanceRecord).filter(
        MaintenanceRecord.approval_status == ApprovalStatus.PENDING
    ).count()

    # Total Downtime in Hours
    downtime_minutes = db.query(func.coalesce(func.sum(MaintenanceRecord.downtime_minutes), 0)).scalar()
    total_downtime_hours = round(float(downtime_minutes) / 60.0, 1)

    # Total Maintenance Cost (Spare parts used)
    total_parts_cost = db.query(func.coalesce(func.sum(PartUsage.total_cost), 0.0)).scalar()
    total_cost = round(float(total_parts_cost), 2)

    # Low Stock Parts Count
    low_stock_count = db.query(Part).filter(Part.quantity <= Part.min_quantity).count()

    # Technician Workload & MTTR
    tech_role = db.query(Role).filter(Role.name == UserRole.TECHNICIAN.value).first()
    technicians = db.query(User).filter(User.role_id == tech_role.id).all() if tech_role else []

    workload_list = []
    for tech in technicians:
        active_jobs = db.query(WorkOrder).filter(
            WorkOrder.assigned_technician_id == tech.id,
            WorkOrder.status.in_([WorkOrderStatus.ASSIGNED, WorkOrderStatus.IN_PROGRESS, WorkOrderStatus.WAITING])
        ).count()

        completed_jobs = db.query(WorkOrder).filter(
            WorkOrder.assigned_technician_id == tech.id,
            WorkOrder.status.in_([WorkOrderStatus.RESOLVED, WorkOrderStatus.APPROVED, WorkOrderStatus.CLOSED])
        ).count()

        avg_hours = db.query(func.avg(WorkOrder.actual_hours)).filter(
            WorkOrder.assigned_technician_id == tech.id,
            WorkOrder.status.in_([WorkOrderStatus.RESOLVED, WorkOrderStatus.APPROVED, WorkOrderStatus.CLOSED]),
            WorkOrder.actual_hours > 0
        ).scalar()

        workload_list.append(TechnicianWorkload(
            technician_id=tech.id,
            technician_name=tech.full_name,
            active_jobs=active_jobs,
            completed_jobs=completed_jobs,
            avg_resolution_hours=round(float(avg_hours), 1) if avg_hours else 0.0
        ))

    # Recurring Failures & Downtime: aggregate using all_records and all_incidents in-memory
    all_records = db.query(MaintenanceRecord).all()
    all_incidents = db.query(Incident).all()

    # Pre-index records and incidents by machine_id
    records_by_machine = {}
    incidents_by_machine = {}
    for r in all_records:
        records_by_machine.setdefault(r.machine_id, []).append(r)
    for inc in all_incidents:
        incidents_by_machine.setdefault(inc.machine_id, []).append(inc)

    machine_issue_counts = {}
    downtime_by_machine: List[DowntimeByMachine] = []

    for m in machines:
        m_recs = records_by_machine.get(m.id, [])
        m_incs = incidents_by_machine.get(m.id, [])
        rec_count = len(m_recs)
        inc_count = len(m_incs)
        total_issues = rec_count + inc_count

        dt_mins = sum(r.downtime_minutes or 0 for r in m_recs)
        mttr = round(float(dt_mins) / rec_count, 1) if rec_count > 0 else 0.0

        downtime_by_machine.append(DowntimeByMachine(
            machine_code=m.machine_code,
            machine_name=m.name,
            department=m.department,
            total_downtime_minutes=int(dt_mins),
            incident_count=inc_count,
            mttr_minutes=mttr
        ))

        if total_issues > 0:
            latest_rec = sorted(m_recs, key=lambda r: r.created_at, reverse=True)[0] if m_recs else None
            latest_inc = sorted(m_incs, key=lambda i: i.created_at, reverse=True)[0] if m_incs else None
            primary_cause = (
                latest_rec.root_cause
                if latest_rec and latest_rec.root_cause
                else (latest_inc.description[:60] + "..." if latest_inc else "Operational wear")
            )
            machine_issue_counts[m.machine_code] = {
                "name": m.name,
                "count": total_issues,
                "primary_cause": primary_cause
            }

    recurring_failures = [
        RecurringFailure(
            machine_code=code,
            machine_name=info["name"],
            failure_count=info["count"],
            primary_root_cause=info["primary_cause"]
        )
        for code, info in sorted(machine_issue_counts.items(), key=lambda x: x[1]["count"], reverse=True)[:5]
    ]

    downtime_by_machine.sort(key=lambda x: (x.total_downtime_minutes, x.incident_count), reverse=True)

    # Subsystem Failure Analysis
    # Categorize recorded failures and incidents into plant subsystems
    all_records = db.query(MaintenanceRecord).all()
    all_incidents = db.query(Incident).all()
    subsystem_map = {
        "Spindle & Drive Motor": {"count": 0, "causes": []},
        "Hydraulic & Fluid Power": {"count": 0, "causes": []},
        "Bearings & Motion Guides": {"count": 0, "causes": []},
        "Cooling & Thermal Unit": {"count": 0, "causes": []},
        "Electrical & Sensors": {"count": 0, "causes": []},
    }

    def categorize_text(text_to_check, cause_text):
        t = text_to_check.lower()
        if any(w in t for w in ["spindle", "motor", "drive", "rpm", "belt"]):
            subsystem_map["Spindle & Drive Motor"]["count"] += 1
            if cause_text:
                subsystem_map["Spindle & Drive Motor"]["causes"].append(cause_text)
        elif any(w in t for w in ["hydraulic", "pressure", "leak", "hose", "fluid", "pump", "ram", "cylinder"]):
            subsystem_map["Hydraulic & Fluid Power"]["count"] += 1
            if cause_text:
                subsystem_map["Hydraulic & Fluid Power"]["causes"].append(cause_text)
        elif any(w in t for w in ["bearing", "vibration", "runout", "alignment", "guide", "play"]):
            subsystem_map["Bearings & Motion Guides"]["count"] += 1
            if cause_text:
                subsystem_map["Bearings & Motion Guides"]["causes"].append(cause_text)
        elif any(w in t for w in ["overheat", "cooling", "coolant", "thermal", "temperature", "lpm"]):
            subsystem_map["Cooling & Thermal Unit"]["count"] += 1
            if cause_text:
                subsystem_map["Cooling & Thermal Unit"]["causes"].append(cause_text)
        else:
            subsystem_map["Electrical & Sensors"]["count"] += 1
            if cause_text:
                subsystem_map["Electrical & Sensors"]["causes"].append(cause_text)

    for rec in all_records:
        categorize_text(f"{rec.problem_summary} {rec.root_cause}", rec.root_cause)

    for inc in all_incidents:
        categorize_text(inc.description, inc.description)

    subsystem_failures = []
    for subsys_name, data in subsystem_map.items():
        if data["count"] > 0:
            common_cause = data["causes"][0] if data["causes"] else "Operational stress"
            subsystem_failures.append(SubsystemFailure(
                subsystem=subsys_name,
                failure_count=data["count"],
                common_cause=common_cause
            ))
        else:
            subsystem_failures.append(SubsystemFailure(
                subsystem=subsys_name,
                failure_count=0,
                common_cause="Operating within normal nominal limits"
            ))
    subsystem_failures.sort(key=lambda x: x.failure_count, reverse=True)

    # Real Live Monthly Maintenance Trends
    # Aggregate actual maintenance records & parts cost by month
    monthly_data: Dict[str, Dict[str, Any]] = {}
    now = datetime.utcnow()
    # Ensure past 4 months are represented in order
    for i in range(3, -1, -1):
        month_date = now - timedelta(days=i * 30)
        month_key = month_date.strftime("%Y-%m")
        monthly_data[month_key] = {"cost": 0.0, "count": 0}

    # Populate with actual maintenance records
    for r in all_records:
        rec_date = r.completion_time or r.created_at
        if rec_date:
            m_key = rec_date.strftime("%Y-%m")
            if m_key not in monthly_data:
                monthly_data[m_key] = {"cost": 0.0, "count": 0}
            monthly_data[m_key]["count"] += 1

    # Populate with actual part usages cost
    all_usages = db.query(PartUsage).all()
    for pu in all_usages:
        used_date = pu.used_at
        if used_date:
            m_key = used_date.strftime("%Y-%m")
            if m_key in monthly_data:
                monthly_data[m_key]["cost"] += float(pu.total_cost)
            else:
                monthly_data[m_key] = {"cost": float(pu.total_cost), "count": 0}

    trends = [
        MaintenanceCostMonthly(
            month=k,
            total_cost=round(v["cost"], 2),
            maintenance_count=v["count"]
        )
        for k, v in sorted(monthly_data.items())[-6:]
    ]

    return AnalyticsDashboardResponse(
        machine_status=status_counts,
        active_incidents_count=active_incidents,
        pending_approvals_count=pending_approvals,
        total_downtime_hours=total_downtime_hours,
        total_maintenance_cost=total_cost,
        low_stock_parts_count=low_stock_count,
        technician_workload=workload_list,
        recurring_failures=recurring_failures,
        downtime_by_machine=downtime_by_machine,
        subsystem_failures=subsystem_failures,
        maintenance_trends=trends
    )
