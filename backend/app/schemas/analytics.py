from typing import List, Dict, Any, Optional
from pydantic import BaseModel


class MachineStatusCount(BaseModel):
    running: int = 0
    warning: int = 0
    down: int = 0
    maintenance: int = 0
    total: int = 0


class TechnicianWorkload(BaseModel):
    technician_id: int
    technician_name: str
    active_jobs: int
    completed_jobs: int
    avg_resolution_hours: float = 0.0


class RecurringFailure(BaseModel):
    machine_code: str
    machine_name: str
    failure_count: int
    primary_root_cause: Optional[str] = None


class DowntimeByMachine(BaseModel):
    machine_code: str
    machine_name: str
    department: str
    total_downtime_minutes: int
    incident_count: int
    mttr_minutes: float


class SubsystemFailure(BaseModel):
    subsystem: str
    failure_count: int
    common_cause: str


class MaintenanceCostMonthly(BaseModel):
    month: str
    total_cost: float
    maintenance_count: int


class AnalyticsDashboardResponse(BaseModel):
    machine_status: MachineStatusCount
    active_incidents_count: int
    pending_approvals_count: int
    total_downtime_hours: float
    total_maintenance_cost: float
    low_stock_parts_count: int
    technician_workload: List[TechnicianWorkload] = []
    recurring_failures: List[RecurringFailure] = []
    downtime_by_machine: List[DowntimeByMachine] = []
    subsystem_failures: List[SubsystemFailure] = []
    maintenance_trends: List[MaintenanceCostMonthly] = []
