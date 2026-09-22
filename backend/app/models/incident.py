from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.database.base import Base
from app.models.enums import IncidentSeverity, IncidentPriority, IncidentStatus


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    incident_number = Column(String(50), unique=True, nullable=False, index=True)
    machine_id = Column(Integer, ForeignKey("machines.id"), nullable=False, index=True)
    reported_by_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    description = Column(Text, nullable=False)
    severity = Column(SQLEnum(IncidentSeverity), default=IncidentSeverity.MEDIUM, nullable=False)
    priority = Column(SQLEnum(IncidentPriority), default=IncidentPriority.MEDIUM, nullable=False)
    status = Column(SQLEnum(IncidentStatus), default=IncidentStatus.OPEN, nullable=False, index=True)
    assigned_technician_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    supervisor_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    image_url = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    resolved_at = Column(DateTime, nullable=True)

    machine = relationship("Machine", back_populates="incidents")
    reported_by = relationship("User", foreign_keys=[reported_by_id], back_populates="reported_incidents")
    assigned_technician = relationship("User", foreign_keys=[assigned_technician_id])
    supervisor = relationship("User", foreign_keys=[supervisor_id])
    work_orders = relationship("WorkOrder", back_populates="incident", cascade="all, delete-orphan")
    maintenance_records = relationship("MaintenanceRecord", back_populates="incident")
