from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.database.base import Base
from app.models.enums import WorkOrderStatus, IncidentPriority


class WorkOrder(Base):
    __tablename__ = "work_orders"

    id = Column(Integer, primary_key=True, index=True)
    work_order_number = Column(String(50), unique=True, nullable=False, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=False, index=True)
    machine_id = Column(Integer, ForeignKey("machines.id"), nullable=False, index=True)
    assigned_technician_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    supervisor_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    priority = Column(SQLEnum(IncidentPriority), default=IncidentPriority.MEDIUM, nullable=False)
    status = Column(SQLEnum(WorkOrderStatus), default=WorkOrderStatus.ASSIGNED, nullable=False, index=True)
    estimated_hours = Column(Float, default=2.0, nullable=False)
    actual_hours = Column(Float, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    approved_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    incident = relationship("Incident", back_populates="work_orders")
    machine = relationship("Machine", back_populates="work_orders")
    assigned_technician = relationship("User", foreign_keys=[assigned_technician_id], back_populates="assigned_work_orders")
    supervisor = relationship("User", foreign_keys=[supervisor_id])
    logs = relationship("WorkLog", back_populates="work_order", cascade="all, delete-orphan", order_by="WorkLog.timestamp.desc()")
    parts_used = relationship("PartUsage", back_populates="work_order", cascade="all, delete-orphan")
    maintenance_records = relationship("MaintenanceRecord", back_populates="work_order")


class WorkLog(Base):
    __tablename__ = "work_logs"

    id = Column(Integer, primary_key=True, index=True)
    work_order_id = Column(Integer, ForeignKey("work_orders.id"), nullable=False, index=True)
    technician_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    step_description = Column(String(255), nullable=False)
    action_taken = Column(Text, nullable=False)
    status_snapshot = Column(String(50), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)

    work_order = relationship("WorkOrder", back_populates="logs")
    technician = relationship("User")
