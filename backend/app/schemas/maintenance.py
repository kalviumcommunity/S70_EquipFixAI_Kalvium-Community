from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from app.models.enums import ApprovalStatus, MaintenanceFrequency
from app.schemas.user import UserResponse
from app.schemas.machine import MachineResponse


class MaintenanceRecordApproval(BaseModel):
    approved: bool
    supervisor_notes: Optional[str] = None


class MaintenanceRecordResponse(BaseModel):
    id: int
    machine_id: int
    incident_id: Optional[int] = None
    work_order_id: Optional[int] = None
    technician_id: int
    supervisor_id: Optional[int] = None
    problem_summary: str
    troubleshooting_steps: str
    root_cause: str
    repair_action: str
    downtime_minutes: int
    completion_time: datetime
    approval_status: ApprovalStatus
    approver_id: Optional[int] = None
    approval_time: Optional[datetime] = None
    supervisor_notes: Optional[str] = None
    created_at: datetime

    machine: Optional[MachineResponse] = None
    technician: Optional[UserResponse] = None
    supervisor: Optional[UserResponse] = None
    approver: Optional[UserResponse] = None

    class Config:
        from_attributes = True


class MaintenanceScheduleCreate(BaseModel):
    machine_id: int
    task_name: str
    description: Optional[str] = None
    frequency: MaintenanceFrequency = MaintenanceFrequency.MONTHLY
    assigned_role_or_user: str = "TECHNICIAN"
    next_due_date: datetime


class MaintenanceScheduleResponse(BaseModel):
    id: int
    machine_id: int
    task_name: str
    description: Optional[str] = None
    frequency: MaintenanceFrequency
    assigned_role_or_user: str
    next_due_date: datetime
    last_performed_date: Optional[datetime] = None
    status: str
    created_at: datetime

    machine: Optional[MachineResponse] = None

    class Config:
        from_attributes = True
