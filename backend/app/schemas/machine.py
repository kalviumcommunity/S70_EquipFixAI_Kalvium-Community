from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
from app.models.enums import MachineStatus


class MachineBase(BaseModel):
    machine_code: str
    name: str
    type: str
    department: str
    location: str


class MachineCreate(MachineBase):
    installation_date: Optional[datetime] = None


class MachineUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    department: Optional[str] = None
    location: Optional[str] = None
    status: Optional[MachineStatus] = None
    next_scheduled_maintenance: Optional[datetime] = None


class MachineResponse(MachineBase):
    id: int
    status: MachineStatus
    installation_date: Optional[datetime] = None
    last_maintenance: Optional[datetime] = None
    next_scheduled_maintenance: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
