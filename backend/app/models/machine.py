from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.database.base import Base
from app.models.enums import MachineStatus


class Machine(Base):
    __tablename__ = "machines"

    id = Column(Integer, primary_key=True, index=True)
    machine_code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    type = Column(String(50), nullable=False)
    department = Column(String(50), nullable=False, index=True)
    location = Column(String(100), nullable=False)
    status = Column(SQLEnum(MachineStatus), default=MachineStatus.RUNNING, nullable=False, index=True)
    installation_date = Column(DateTime, nullable=True)
    last_maintenance = Column(DateTime, nullable=True)
    next_scheduled_maintenance = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    incidents = relationship("Incident", back_populates="machine", cascade="all, delete-orphan")
    work_orders = relationship("WorkOrder", back_populates="machine")
    maintenance_records = relationship("MaintenanceRecord", back_populates="machine")
    schedules = relationship("MaintenanceSchedule", back_populates="machine", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="machine")
