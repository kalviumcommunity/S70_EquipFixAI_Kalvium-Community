from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.models.enums import IncidentSeverity, IncidentPriority, IncidentStatus
from app.schemas.user import UserResponse
from app.schemas.machine import MachineResponse


class IncidentCreate(BaseModel):
    machine_id: int
    description: str
    severity: IncidentSeverity = IncidentSeverity.MEDIUM
    image_url: Optional[str] = None


class IncidentAssign(BaseModel):
    technician_id: int
    priority: Optional[IncidentPriority] = None
    estimated_hours: Optional[float] = 2.0
    supervisor_notes: Optional[str] = None


class IncidentPriorityUpdate(BaseModel):
    priority: Optional[IncidentPriority] = None
    severity: Optional[IncidentSeverity] = None
    status: Optional[IncidentStatus] = None


class IncidentResponse(BaseModel):
    id: int
    incident_number: str
    machine_id: int
    reported_by_id: int
    description: str
    severity: IncidentSeverity
    priority: IncidentPriority
    status: IncidentStatus
    assigned_technician_id: Optional[int] = None
    supervisor_id: Optional[int] = None
    image_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None

    machine: Optional[MachineResponse] = None
    reported_by: Optional[UserResponse] = None
    assigned_technician: Optional[UserResponse] = None
    supervisor: Optional[UserResponse] = None

    class Config:
        from_attributes = True
