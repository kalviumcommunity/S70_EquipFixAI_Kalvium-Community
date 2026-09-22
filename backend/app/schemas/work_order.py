from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from app.models.enums import WorkOrderStatus, IncidentPriority
from app.schemas.user import UserResponse
from app.schemas.machine import MachineResponse
from app.schemas.incident import IncidentResponse
from app.schemas.part import PartResponse


class WorkLogCreate(BaseModel):
    step_description: str
    action_taken: str
    status_snapshot: Optional[str] = None


class WorkLogResponse(BaseModel):
    id: int
    work_order_id: int
    technician_id: int
    step_description: str
    action_taken: str
    status_snapshot: Optional[str] = None
    timestamp: datetime
    technician: Optional[UserResponse] = None

    class Config:
        from_attributes = True


class PartUsageCreate(BaseModel):
    part_id: int
    quantity_used: int = Field(gt=0, description="Quantity used must be > 0")


class PartUsageResponse(BaseModel):
    id: int
    work_order_id: int
    part_id: int
    quantity_used: int
    unit_cost: float
    total_cost: float
    recorded_by_id: int
    used_at: datetime
    part: Optional[PartResponse] = None

    class Config:
        from_attributes = True


class WorkOrderStatusUpdate(BaseModel):
    status: WorkOrderStatus
    notes: Optional[str] = None


class WorkOrderComplete(BaseModel):
    problem_summary: str
    troubleshooting_steps: str
    root_cause: str
    repair_action: str
    downtime_minutes: int = Field(ge=0, description="Downtime must be >= 0")
    actual_hours: Optional[float] = Field(default=None, ge=0.0)
    notes: Optional[str] = None


class WorkOrderResponse(BaseModel):
    id: int
    work_order_number: str
    incident_id: int
    machine_id: int
    assigned_technician_id: int
    supervisor_id: int
    priority: IncidentPriority
    status: WorkOrderStatus
    estimated_hours: float
    actual_hours: Optional[float] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    machine: Optional[MachineResponse] = None
    assigned_technician: Optional[UserResponse] = None
    supervisor: Optional[UserResponse] = None

    class Config:
        from_attributes = True


class WorkOrderDetailResponse(WorkOrderResponse):
    incident: Optional[IncidentResponse] = None
    logs: List[WorkLogResponse] = []
    parts_used: List[PartUsageResponse] = []

    class Config:
        from_attributes = True
