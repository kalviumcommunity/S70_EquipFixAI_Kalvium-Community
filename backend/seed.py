"""Database seeding script for EquipFixAI.
Populates realistic production-style data:
- 4 Roles (OPERATOR, TECHNICIAN, SUPERVISOR, MANAGER)
- 5 Users with hashed passwords
- 8 Industrial Machines (CNC, Press, Lathe, Mill, Robot)
- 7 Spare Parts with stock levels & unit costs
- Incidents across machines
- Active and completed Work Orders with Work Logs
- Maintenance Records (Approved & Pending Approval)
- Preventive Maintenance Schedules
- Equipment Manuals & Safety SOP Documents
- Notifications & Audit Logs
"""
import os
import sys
from datetime import datetime, timedelta
from app.database.session import SessionLocal, engine
from app.database.base import Base
from app.rag.ingestion import IngestionService
import app.models
from app.models.user import Role, User
from app.models.machine import Machine
from app.models.incident import Incident
from app.models.work_order import WorkOrder, WorkLog
from app.models.maintenance import MaintenanceRecord, MaintenanceSchedule
from app.models.part import Part, PartUsage
from app.models.document import Document, DocumentVersion
from app.models.notification import Notification
from app.models.audit import AuditLog
from app.models.enums import (
    UserRole, MachineStatus, IncidentSeverity, IncidentPriority,
    IncidentStatus, WorkOrderStatus, ApprovalStatus, MaintenanceFrequency,
    DocumentType, NotificationType, AuditAction
)
from app.auth.security import get_password_hash


def seed_database():
    print("🚀 Initializing database schema...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if already seeded
        if db.query(User).count() > 0:
            print("Database already contains records. Skipping seed.")
            return

        print("🌱 Seeding Roles...")
        roles = {
            UserRole.OPERATOR.value: Role(name=UserRole.OPERATOR.value, description="Floor Operator / Laborer: reports machine incidents"),
            UserRole.TECHNICIAN.value: Role(name=UserRole.TECHNICIAN.value, description="Maintenance Technician: diagnoses and executes repairs"),
            UserRole.SUPERVISOR.value: Role(name=UserRole.SUPERVISOR.value, description="Shop Floor Supervisor: assigns jobs and approves maintenance"),
            UserRole.MANAGER.value: Role(name=UserRole.MANAGER.value, description="Plant Operations Manager: full plant visibility, audits & admin"),
        }
        for r in roles.values():
            db.add(r)
        db.flush()

        print("🌱 Seeding Users...")
        default_pwd = get_password_hash("password123")
        users = {
            "operator1": User(
                username="operator1",
                email="operator1@equipfix.internal",
                hashed_password=default_pwd,
                full_name="John Miller (Operator)",
                role_id=roles[UserRole.OPERATOR.value].id,
                is_active=True
            ),
            "tech1": User(
                username="tech1",
                email="tech1@equipfix.internal",
                hashed_password=default_pwd,
                full_name="Ravi Sharma (Senior Tech)",
                role_id=roles[UserRole.TECHNICIAN.value].id,
                is_active=True
            ),
            "tech2": User(
                username="tech2",
                email="tech2@equipfix.internal",
                hashed_password=default_pwd,
                full_name="Carlos Mendez (Field Tech)",
                role_id=roles[UserRole.TECHNICIAN.value].id,
                is_active=True
            ),
            "super1": User(
                username="super1",
                email="super1@equipfix.internal",
                hashed_password=default_pwd,
                full_name="Sarah Connor (Maintenance Supervisor)",
                role_id=roles[UserRole.SUPERVISOR.value].id,
                is_active=True
            ),
            "manager1": User(
                username="manager1",
                email="manager1@equipfix.internal",
                hashed_password=default_pwd,
                full_name="David Vance (Plant Manager)",
                role_id=roles[UserRole.MANAGER.value].id,
                is_active=True
            ),
        }
        for u in users.values():
            db.add(u)
        db.flush()

        print("🌱 Seeding Industrial Machines...")
        machines = [
            Machine(
                machine_code="CNC-01",
                name="5-Axis High Precision CNC Milling",
                type="Milling Center",
                department="Machining Dept",
                location="Bay 1 - Station A",
                status=MachineStatus.RUNNING,
                installation_date=datetime(2021, 3, 15),
                last_maintenance=datetime.utcnow() - timedelta(days=12),
                next_scheduled_maintenance=datetime.utcnow() + timedelta(days=18),
            ),
            Machine(
                machine_code="CNC-02",
                name="CNC Turning Lathe Center",
                type="Lathe Center",
                department="Machining Dept",
                location="Bay 1 - Station B",
                status=MachineStatus.RUNNING,
                installation_date=datetime(2021, 6, 20),
                last_maintenance=datetime.utcnow() - timedelta(days=25),
                next_scheduled_maintenance=datetime.utcnow() + timedelta(days=5),
            ),
            Machine(
                machine_code="CNC-03",
                name="Horizontal CNC Boring Mill",
                type="Boring Mill",
                department="Machining Dept",
                location="Bay 1 - Station C",
                status=MachineStatus.WARNING,
                installation_date=datetime(2022, 1, 10),
                last_maintenance=datetime.utcnow() - timedelta(days=45),
                next_scheduled_maintenance=datetime.utcnow() + timedelta(days=2),
            ),
            Machine(
                machine_code="CNC-04",
                name="High-Speed Precision Spindle CNC 04",
                type="CNC Router",
                department="Machining Dept",
                location="Bay 2 - Station A",
                status=MachineStatus.DOWN,
                installation_date=datetime(2020, 11, 5),
                last_maintenance=datetime.utcnow() - timedelta(days=2),
                next_scheduled_maintenance=datetime.utcnow() + timedelta(days=10),
            ),
            Machine(
                machine_code="PRESS-01",
                name="200-Ton Hydraulic Stamping Press",
                type="Hydraulic Press",
                department="Stamping Dept",
                location="Bay 3 - Station A",
                status=MachineStatus.RUNNING,
                installation_date=datetime(2019, 8, 14),
                last_maintenance=datetime.utcnow() - timedelta(days=8),
                next_scheduled_maintenance=datetime.utcnow() + timedelta(days=22),
            ),
            Machine(
                machine_code="LATHE-01",
                name="Heavy Duty Manual Engine Lathe",
                type="Manual Lathe",
                department="Fabrication Dept",
                location="Bay 4 - Station A",
                status=MachineStatus.RUNNING,
                installation_date=datetime(2018, 5, 22),
                last_maintenance=datetime.utcnow() - timedelta(days=60),
                next_scheduled_maintenance=datetime.utcnow() + timedelta(days=30),
            ),
            Machine(
                machine_code="MILL-01",
                name="Vertical Knee Milling Machine",
                type="Knee Mill",
                department="Fabrication Dept",
                location="Bay 4 - Station B",
                status=MachineStatus.MAINTENANCE,
                installation_date=datetime(2019, 10, 18),
                last_maintenance=datetime.utcnow() - timedelta(days=1),
                next_scheduled_maintenance=datetime.utcnow() + timedelta(days=14),
            ),
            Machine(
                machine_code="ROBOT-01",
                name="6-Axis Articulated Robotic Welder",
                type="Robotic Arm",
                department="Assembly Dept",
                location="Cell 1 - Station A",
                status=MachineStatus.RUNNING,
                installation_date=datetime(2023, 2, 1),
                last_maintenance=datetime.utcnow() - timedelta(days=15),
                next_scheduled_maintenance=datetime.utcnow() + timedelta(days=15),
            ),
        ]
        for m in machines:
            db.add(m)
        db.flush()
        mach_dict = {m.machine_code: m for m in machines}

        print("🌱 Seeding Spare Parts...")
        parts = [
            Part(
                part_number="BRG-204",
                name="Deep Groove Ball Bearing 204",
                description="High precision radial ball bearing for CNC spindle shafts",
                quantity=24,
                min_quantity=10,
                unit_cost=45.00,
                location="Aisle 2, Bin 14"
            ),
            Part(
                part_number="HYD-SEAL-08",
                name="Hydraulic Cylinder High-Pressure Seal Kit",
                description="Polyurethane high-temp hydraulic cylinder rod and piston seals",
                quantity=8,
                min_quantity=5,
                unit_cost=120.00,
                location="Aisle 4, Shelf C"
            ),
            Part(
                part_number="BLT-V-50",
                name="Heavy Duty Reinforced V-Belt 50mm",
                description="Cogged industrial raw edge V-belt for drive motors",
                quantity=15,
                min_quantity=6,
                unit_cost=35.00,
                location="Aisle 1, Rack 03"
            ),
            Part(
                part_number="SPN-OIL-ISO68",
                name="Spindle Lubrication Oil ISO VG 68 (5L)",
                description="Premium anti-wear mineral oil with anti-oxidation inhibitors",
                quantity=4,  # Below min_quantity 5 -> triggers low stock!
                min_quantity=5,
                unit_cost=85.00,
                location="Lube Storage Unit 1"
            ),
            Part(
                part_number="SRV-DRV-400",
                name="AC Servo Motor Digital Driver 400W",
                description="Digital feedback AC servo controller for robotic joints",
                quantity=3,
                min_quantity=2,
                unit_cost=450.00,
                location="Electronics Room, Cabinet A"
            ),
            Part(
                part_number="FLT-AIR-02",
                name="Industrial Pneumatic Air Filter Element",
                description="0.01 micron coalescing filter cartridge for dry pneumatic air",
                quantity=14,
                min_quantity=6,
                unit_cost=28.00,
                location="Pneumatics Bin 9"
            ),
            Part(
                part_number="PROX-SN-12",
                name="Inductive Proximity Sensor M12",
                description="PNP Normally Open 4mm sensing distance position sensor",
                quantity=2,  # Low stock!
                min_quantity=4,
                unit_cost=55.00,
                location="Sensor Cabinet 2"
            ),
        ]
        for p in parts:
            db.add(p)
        db.flush()
        part_dict = {p.part_number: p for p in parts}

        print("🌱 Seeding Incidents & Work Orders...")
        # Active critical incident on CNC-04
        inc_1042 = Incident(
            incident_number="INC-1042",
            machine_id=mach_dict["CNC-04"].id,
            reported_by_id=users["operator1"].id,
            description="Spindle abnormal noise and excessive vibration exceeding 7mm/s during high-speed finishing cycle.",
            severity=IncidentSeverity.HIGH,
            priority=IncidentPriority.HIGH,
            status=IncidentStatus.IN_PROGRESS,
            assigned_technician_id=users["tech1"].id,
            supervisor_id=users["super1"].id,
            created_at=datetime.utcnow() - timedelta(hours=4)
        )
        db.add(inc_1042)

        # Warning incident on CNC-03
        inc_1043 = Incident(
            incident_number="INC-1043",
            machine_id=mach_dict["CNC-03"].id,
            reported_by_id=users["operator1"].id,
            description="Coolant flow pressure sensor showing erratic spikes. Flow drops below 15 LPM periodically.",
            severity=IncidentSeverity.MEDIUM,
            priority=IncidentPriority.MEDIUM,
            status=IncidentStatus.OPEN,
            created_at=datetime.utcnow() - timedelta(hours=2)
        )
        db.add(inc_1043)

        # Pending approval incident on MILL-01
        inc_1040 = Incident(
            incident_number="INC-1040",
            machine_id=mach_dict["MILL-01"].id,
            reported_by_id=users["operator1"].id,
            description="Drive belt slipping on quill feed mechanism under heavy load.",
            severity=IncidentSeverity.MEDIUM,
            priority=IncidentPriority.MEDIUM,
            status=IncidentStatus.WAITING,
            assigned_technician_id=users["tech2"].id,
            supervisor_id=users["super1"].id,
            created_at=datetime.utcnow() - timedelta(days=1)
        )
        db.add(inc_1040)
        db.flush()

        # Work order for INC-1042 (In progress)
        wo_2001 = WorkOrder(
            work_order_number="WO-2001",
            incident_id=inc_1042.id,
            machine_id=mach_dict["CNC-04"].id,
            assigned_technician_id=users["tech1"].id,
            supervisor_id=users["super1"].id,
            priority=IncidentPriority.HIGH,
            status=WorkOrderStatus.IN_PROGRESS,
            estimated_hours=3.5,
            started_at=datetime.utcnow() - timedelta(hours=3),
            notes="Technician investigating spindle motor coupling and bearing play."
        )
        db.add(wo_2001)

        # Work order for INC-1040 (Completed, pending approval!)
        wo_2000 = WorkOrder(
            work_order_number="WO-2000",
            incident_id=inc_1040.id,
            machine_id=mach_dict["MILL-01"].id,
            assigned_technician_id=users["tech2"].id,
            supervisor_id=users["super1"].id,
            priority=IncidentPriority.MEDIUM,
            status=WorkOrderStatus.RESOLVED,
            estimated_hours=2.0,
            actual_hours=1.75,
            started_at=datetime.utcnow() - timedelta(hours=10),
            completed_at=datetime.utcnow() - timedelta(hours=8),
            notes="Drive belt replaced, tension checked with sonic tension meter."
        )
        db.add(wo_2000)
        db.flush()

        # Work logs for WO-2001
        wl1 = WorkLog(
            work_order_id=wo_2001.id,
            technician_id=users["tech1"].id,
            step_description="Disassembled spindle outer housing and inspected belt alignment",
            action_taken="Used dial indicator to measure spindle runout. Radial runout measured at 0.045mm (tolerance is 0.008mm).",
            status_snapshot="IN_PROGRESS",
            timestamp=datetime.utcnow() - timedelta(hours=2, minutes=30)
        )
        wl2 = WorkLog(
            work_order_id=wo_2001.id,
            technician_id=users["tech1"].id,
            step_description="Extracted front bearing set",
            action_taken="Front bearing race shows pitting and overheating discoloration. Preparing replacement bearing BRG-204.",
            status_snapshot="IN_PROGRESS",
            timestamp=datetime.utcnow() - timedelta(hours=1, minutes=15)
        )
        db.add(wl1)
        db.add(wl2)

        # Part usage on WO-2000 (Belt used)
        pu_belt = PartUsage(
            work_order_id=wo_2000.id,
            part_id=part_dict["BLT-V-50"].id,
            quantity_used=1,
            unit_cost=part_dict["BLT-V-50"].unit_cost,
            total_cost=part_dict["BLT-V-50"].unit_cost,
            recorded_by_id=users["tech2"].id,
            used_at=datetime.utcnow() - timedelta(hours=8, minutes=30)
        )
        db.add(pu_belt)

        # Maintenance Record for WO-2000 (Pending supervisor approval)
        mr_pending = MaintenanceRecord(
            machine_id=mach_dict["MILL-01"].id,
            incident_id=inc_1040.id,
            work_order_id=wo_2000.id,
            technician_id=users["tech2"].id,
            supervisor_id=users["super1"].id,
            problem_summary="Drive belt slipping on quill feed mechanism under heavy load",
            troubleshooting_steps="Inspected belt tension; noticed severe glazing on belt ribs and loss of elasticity.",
            root_cause="Normal operational fatigue and oil mist accumulation causing belt slippage.",
            repair_action="Cleaned pulleys with degreaser, installed new reinforced V-Belt BLT-V-50, tensioned to 450N.",
            downtime_minutes=105,
            completion_time=datetime.utcnow() - timedelta(hours=8),
            approval_status=ApprovalStatus.PENDING
        )
        db.add(mr_pending)

        # Historical approved maintenance record for PRESS-01
        mr_approved = MaintenanceRecord(
            machine_id=mach_dict["PRESS-01"].id,
            technician_id=users["tech1"].id,
            problem_summary="Hydraulic pressure dropping from 210 bar to 160 bar during ram hold",
            troubleshooting_steps="Connected test gauge to main manifold. Cylinder bypass detected on rod down-stroke.",
            root_cause="Damaged cylinder rod wiper seal caused by contamination particles.",
            repair_action="Disassembled main cylinder, flushed hydraulic reservoir, replaced seal kit HYD-SEAL-08.",
            downtime_minutes=180,
            completion_time=datetime.utcnow() - timedelta(days=8),
            approval_status=ApprovalStatus.APPROVED,
            approver_id=users["super1"].id,
            approval_time=datetime.utcnow() - timedelta(days=8, hours=-2),
            supervisor_notes="Excellent diagnosis and pressure test verified at 210 bar holding for 15 mins."
        )
        db.add(mr_approved)

        # Historical part usage for PRESS-01
        pu_seal = PartUsage(
            work_order_id=wo_2000.id,
            part_id=part_dict["HYD-SEAL-08"].id,
            quantity_used=1,
            unit_cost=120.00,
            total_cost=120.00,
            recorded_by_id=users["tech1"].id,
            used_at=datetime.utcnow() - timedelta(days=8)
        )
        db.add(pu_seal)

        print("🌱 Seeding Preventive Maintenance Schedules...")
        schedules = [
            MaintenanceSchedule(
                machine_id=mach_dict["CNC-01"].id,
                task_name="Weekly Spindle Oil & Chiller Inspection",
                description="Check chiller temperature (target: 20°C ±1°C), check spindle oil level and pressure filter indicator.",
                frequency=MaintenanceFrequency.WEEKLY,
                assigned_role_or_user="TECHNICIAN",
                next_due_date=datetime.utcnow() + timedelta(days=3),
                status="ACTIVE"
            ),
            MaintenanceSchedule(
                machine_id=mach_dict["PRESS-01"].id,
                task_name="Monthly Hydraulic Filter & Oil Analysis",
                description="Take fluid sample for ISO 4406 particle count, inspect high pressure hoses for abrasion.",
                frequency=MaintenanceFrequency.MONTHLY,
                assigned_role_or_user="TECHNICIAN",
                next_due_date=datetime.utcnow() + timedelta(days=14),
                status="ACTIVE"
            ),
            MaintenanceSchedule(
                machine_id=mach_dict["ROBOT-01"].id,
                task_name="Quarterly Axis Backlash & Harmonic Drive Grease",
                description="Inspect wrist axis repeatability, replenish harmonic drive synthetic grease.",
                frequency=MaintenanceFrequency.QUARTERLY,
                assigned_role_or_user="TECHNICIAN",
                next_due_date=datetime.utcnow() + timedelta(days=40),
                status="ACTIVE"
            ),
            MaintenanceSchedule(
                machine_id=mach_dict["CNC-04"].id,
                task_name="Daily Optical Light Curtain Safety Test",
                description="Verify emergency stop response when interrupting light curtains at 100mm intervals.",
                frequency=MaintenanceFrequency.DAILY,
                assigned_role_or_user="OPERATOR",
                next_due_date=datetime.utcnow() + timedelta(days=1),
                status="ACTIVE"
            ),
        ]
        for s in schedules:
            db.add(s)

        print("🌱 Seeding Operational Documents & SOPs...")
        base_dir = os.path.dirname(os.path.abspath(__file__))
        doc_dir = os.path.join(base_dir, "data", "documents")

        docs = [
            Document(
                machine_id=mach_dict["CNC-04"].id,
                title="CNC-04 Spindle Maintenance & Replacement Manual",
                doc_type=DocumentType.MANUAL,
                file_url=os.path.join(doc_dir, "CNC-04_Spindle_Manual_v1.2.txt"),
                created_by_id=users["super1"].id
            ),
            Document(
                machine_id=mach_dict["CNC-04"].id,
                title="Plant Safety SOP: High-Speed Spindle Lockout/Tagout (LOTO)",
                doc_type=DocumentType.SAFETY,
                file_url=os.path.join(doc_dir, "Safety_SOP_LOTO_Spindle.txt"),
                created_by_id=users["super1"].id
            ),
            Document(
                machine_id=mach_dict["ROBOT-01"].id,
                title="Robotic Welder Cell Daily Inspection & Calibration SOP",
                doc_type=DocumentType.SOP,
                file_url=os.path.join(doc_dir, "Robotic_Welder_SOP.txt"),
                created_by_id=users["super1"].id
            ),
            Document(
                machine_id=mach_dict["PRESS-01"].id,
                title="Hydraulic Stamping Press Troubleshooting Guide",
                doc_type=DocumentType.TROUBLESHOOTING,
                file_url=os.path.join(doc_dir, "Hydraulic_Press_Troubleshooting.txt"),
                created_by_id=users["super1"].id
            ),
        ]
        for d in docs:
            db.add(d)
        db.flush()

        ingestion_service = IngestionService()
        for d in docs:
            ver = DocumentVersion(
                document_id=d.id,
                version_number="1.0",
                changelog="Initial approved version for plant operations",
                file_url=d.file_url,
                created_by_id=users["super1"].id
            )
            db.add(ver)
            db.flush()
            try:
                chunks_count = ingestion_service.ingest_document_version(db, ver, user_id=users["super1"].id)
                print(f"  Indexed '{d.title}' -> {chunks_count} chunks")
            except Exception as ex:
                print(f"  Warning: failed to index '{d.title}': {ex}")

        # Ingest historical approved maintenance record into RAG vector knowledge
        try:
            ingestion_service.ingest_approved_maintenance_record(db, mr_approved, approver_id=users["super1"].id)
            print(f"  Indexed historical approved maintenance record #{mr_approved.id} into RAG")
        except Exception as ex:
            print(f"  Warning: failed to index maintenance record: {ex}")

        print("🌱 Seeding Notifications...")
        notifs = [
            Notification(
                recipient_id=users["super1"].id,
                title="Maintenance Ready for Approval",
                message="Work Order WO-2000 on machine MILL-01 has been completed by Carlos Mendez and is awaiting your review.",
                notification_type=NotificationType.APPROVAL,
                is_read=False,
                related_entity_type="maintenance_record",
                related_entity_id=mr_pending.id
            ),
            Notification(
                recipient_id=users["tech1"].id,
                title="High-Priority Work Order Assigned",
                message="You have been assigned to INC-1042 on CNC-04 (Spindle abnormal noise).",
                notification_type=NotificationType.ASSIGNMENT,
                is_read=False,
                related_entity_type="work_order",
                related_entity_id=wo_2001.id
            ),
            Notification(
                recipient_id=users["manager1"].id,
                title="Low Stock Alert",
                message="Spare part Spindle Lubrication Oil ISO VG 68 (SPN-OIL-ISO68) is down to 4 units (minimum threshold: 5).",
                notification_type=NotificationType.LOW_STOCK,
                is_read=False,
                related_entity_type="part",
                related_entity_id=part_dict["SPN-OIL-ISO68"].id
            ),
            Notification(
                recipient_id=users["operator1"].id,
                title="Incident Assigned",
                message="Your reported incident INC-1042 has been assigned to Ravi Sharma.",
                notification_type=NotificationType.STATUS_CHANGE,
                is_read=True,
                related_entity_type="incident",
                related_entity_id=inc_1042.id
            ),
        ]
        for n in notifs:
            db.add(n)

        print("🌱 Seeding Audit Logs...")
        audits = [
            AuditLog(
                user_id=users["operator1"].id,
                action=AuditAction.INCIDENT_CREATED,
                entity_type="incident",
                entity_id=inc_1042.id,
                new_value='{"incident_number": "INC-1042", "machine": "CNC-04", "severity": "HIGH"}',
                timestamp=datetime.utcnow() - timedelta(hours=4)
            ),
            AuditLog(
                user_id=users["super1"].id,
                action=AuditAction.TECHNICIAN_ASSIGNED,
                entity_type="incident",
                entity_id=inc_1042.id,
                previous_value='{"assigned_technician": null}',
                new_value='{"assigned_technician": "Ravi Sharma", "work_order": "WO-2001"}',
                timestamp=datetime.utcnow() - timedelta(hours=3, minutes=30)
            ),
            AuditLog(
                user_id=users["tech1"].id,
                action=AuditAction.WORK_STARTED,
                entity_type="work_order",
                entity_id=wo_2001.id,
                previous_value='{"status": "ASSIGNED"}',
                new_value='{"status": "IN_PROGRESS", "machine_status": "MAINTENANCE"}',
                timestamp=datetime.utcnow() - timedelta(hours=3)
            ),
            AuditLog(
                user_id=users["tech2"].id,
                action=AuditAction.WORK_COMPLETED,
                entity_type="work_order",
                entity_id=wo_2000.id,
                previous_value='{"status": "IN_PROGRESS"}',
                new_value='{"status": "RESOLVED", "downtime_minutes": 105}',
                timestamp=datetime.utcnow() - timedelta(hours=8)
            ),
        ]
        for a in audits:
            db.add(a)

        db.commit()
        print("✅ Database successfully seeded with production-grade test data!")
    except Exception as e:
        db.rollback()
        print(f"❌ Error seeding database: {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
