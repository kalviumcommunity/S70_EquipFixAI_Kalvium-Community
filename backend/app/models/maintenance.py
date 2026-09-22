from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.database.base import Base
from app.models.enums import ApprovalStatus, MaintenanceFrequency


class MaintenanceRecord(Base):
    __tablename__ = "maintenance_records"

    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(Integer, ForeignKey("machines.id"), nullable=False, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=True, index=True)
    work_order_id = Column(Integer, ForeignKey("work_orders.id"), nullable=True, index=True)
    technician_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    supervisor_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    problem_summary = Column(Text, nullable=False)
    troubleshooting_steps = Column(Text, nullable=False)
    root_cause = Column(Text, nullable=False)
    repair_action = Column(Text, nullable=False)
    downtime_minutes = Column(Integer, default=0, nullable=False)
    completion_time = Column(DateTime, default=datetime.utcnow, nullable=False)
    approval_status = Column(SQLEnum(ApprovalStatus), default=ApprovalStatus.PENDING, nullable=False, index=True)
    approver_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    approval_time = Column(DateTime, nullable=True)
    supervisor_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    machine = relationship("Machine", back_populates="maintenance_records")
    incident = relationship("Incident", back_populates="maintenance_records")
    work_order = relationship("WorkOrder", back_populates="maintenance_records")
    technician = relationship("User", foreign_keys=[technician_id])
    supervisor = relationship("User", foreign_keys=[supervisor_id])
    approver = relationship("User", foreign_keys=[approver_id])


class MaintenanceSchedule(Base):
    __tablename__ = "maintenance_schedules"

    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(Integer, ForeignKey("machines.id"), nullable=False, index=True)
    task_name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    frequency = Column(SQLEnum(MaintenanceFrequency), default=MaintenanceFrequency.MONTHLY, nullable=False)
    assigned_role_or_user = Column(String(100), default="TECHNICIAN", nullable=False)
    next_due_date = Column(DateTime, nullable=False, index=True)
    last_performed_date = Column(DateTime, nullable=True)
    status = Column(String(20), default="ACTIVE", nullable=False)  # ACTIVE, PAUSED
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    machine = relationship("Machine", back_populates="schedules")
