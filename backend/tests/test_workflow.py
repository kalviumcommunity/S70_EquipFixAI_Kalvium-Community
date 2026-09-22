from fastapi import status
from tests.conftest import get_auth_header
from app.models.enums import UserRole, MachineStatus, WorkOrderStatus, IncidentStatus, ApprovalStatus, AuditAction
from app.models.audit import AuditLog
from app.models.notification import Notification
from app.models.part import Part


def test_full_core_maintenance_workflow(client, seeded_users, db_session):
    """Verify the complete multi-role maintenance lifecycle from incident creation to supervisor approval."""
    machine = seeded_users["machine"]
    part = seeded_users["part"]

    op_headers = get_auth_header("op_user", UserRole.OPERATOR.value)
    super_headers = get_auth_header("super_user", UserRole.SUPERVISOR.value)
    tech_headers = get_auth_header("tech_user", UserRole.TECHNICIAN.value)

    # -------------------------------------------------------------
    # Step 1: Operator reports machine problem
    # -------------------------------------------------------------
    inc_payload = {
        "machine_id": machine.id,
        "description": "High spindle vibration and abnormal grinding sound at 10,000 RPM",
        "severity": "HIGH",
        "image_url": "https://example.com/spindle_warning.jpg"
    }
    r1 = client.post("/api/incidents", json=inc_payload, headers=op_headers)
    assert r1.status_code == status.HTTP_201_CREATED
    inc_data = r1.json()
    incident_id = inc_data["id"]
    assert inc_data["status"] == IncidentStatus.OPEN.value
    assert inc_data["machine"]["id"] == machine.id

    # Check machine status updated to WARNING
    mach_check = client.get(f"/api/machines/{machine.id}", headers=op_headers).json()
    assert mach_check["status"] == MachineStatus.WARNING.value

    # Check supervisor notification created
    notif = db_session.query(Notification).filter(
        Notification.recipient_id == seeded_users["users"][UserRole.SUPERVISOR.value].id,
        Notification.related_entity_id == incident_id
    ).first()
    assert notif is not None

    # -------------------------------------------------------------
    # Step 2: Supervisor assigns Technician
    # -------------------------------------------------------------
    assign_payload = {
        "technician_id": seeded_users["users"][UserRole.TECHNICIAN.value].id,
        "priority": "HIGH",
        "estimated_hours": 3.0,
        "supervisor_notes": "Please inspect spindle bearings and dynamic balancing."
    }
    r2 = client.put(f"/api/incidents/{incident_id}/assign", json=assign_payload, headers=super_headers)
    assert r2.status_code == status.HTTP_200_OK
    assert r2.json()["status"] == IncidentStatus.ASSIGNED.value

    # Check Work Order was created
    wo_list = client.get("/api/work-orders", headers=tech_headers).json()
    assigned_wo = next((w for w in wo_list if w["incident_id"] == incident_id), None)
    assert assigned_wo is not None
    work_order_id = assigned_wo["id"]
    assert assigned_wo["status"] == WorkOrderStatus.ASSIGNED.value

    # -------------------------------------------------------------
    # Step 3: Technician accepts and starts work
    # -------------------------------------------------------------
    r3 = client.put(
        f"/api/work-orders/{work_order_id}/status",
        json={"status": "IN_PROGRESS", "notes": "Started disassembly"},
        headers=tech_headers
    )
    assert r3.status_code == status.HTTP_200_OK
    assert r3.json()["status"] == WorkOrderStatus.IN_PROGRESS.value

    # Verify machine is now in MAINTENANCE status
    mach_check = client.get(f"/api/machines/{machine.id}", headers=tech_headers).json()
    assert mach_check["status"] == MachineStatus.MAINTENANCE.value

    # -------------------------------------------------------------
    # Step 4: Technician adds work logs
    # -------------------------------------------------------------
    log_payload = {
        "step_description": "Spindle Runout Dial Measurement",
        "action_taken": "Measured 0.05mm radial runout on spindle nose.",
        "status_snapshot": "IN_PROGRESS"
    }
    r4 = client.post(f"/api/work-orders/{work_order_id}/logs", json=log_payload, headers=tech_headers)
    assert r4.status_code == status.HTTP_201_CREATED

    # -------------------------------------------------------------
    # Step 5: Technician records spare parts used (Inventory decrement)
    # -------------------------------------------------------------
    initial_qty = part.quantity
    parts_payload = {
        "part_id": part.id,
        "quantity_used": 2
    }
    r5 = client.post(f"/api/work-orders/{work_order_id}/parts", json=parts_payload, headers=tech_headers)
    assert r5.status_code == status.HTTP_201_CREATED
    usage_data = r5.json()
    assert usage_data["quantity_used"] == 2
    assert usage_data["total_cost"] == round(part.unit_cost * 2, 2)

    # Verify part inventory was decremented in database
    db_session.refresh(part)
    assert part.quantity == initial_qty - 2

    # -------------------------------------------------------------
    # Step 6: Technician completes work order (Submits for approval)
    # -------------------------------------------------------------
    complete_payload = {
        "problem_summary": "High spindle vibration due to bearing race wear",
        "troubleshooting_steps": "Checked runout with dial indicator, disassembled bearing housing.",
        "root_cause": "Spindle bearing fatigue and lack of lubrication",
        "repair_action": "Replaced ball bearing TEST-BRG-01, torqued retaining ring to spec.",
        "downtime_minutes": 140,
        "actual_hours": 2.5
    }
    r6 = client.post(f"/api/work-orders/{work_order_id}/complete", json=complete_payload, headers=tech_headers)
    assert r6.status_code == status.HTTP_200_OK
    m_record = r6.json()
    assert m_record["approval_status"] == ApprovalStatus.PENDING.value
    maintenance_record_id = m_record["id"]

    # Work order status should be RESOLVED (awaiting supervisor review)
    wo_check = client.get(f"/api/work-orders/{work_order_id}", headers=tech_headers).json()
    assert wo_check["status"] == WorkOrderStatus.RESOLVED.value

    # -------------------------------------------------------------
    # Step 7: Supervisor reviews and approves maintenance record
    # -------------------------------------------------------------
    approve_payload = {
        "approved": True,
        "supervisor_notes": "Repair verified with vibration sensor test at full speed. Approved."
    }
    r7 = client.post(
        f"/api/maintenance/records/{maintenance_record_id}/approval",
        json=approve_payload,
        headers=super_headers
    )
    assert r7.status_code == status.HTTP_200_OK
    appr_data = r7.json()
    assert appr_data["approval_status"] == ApprovalStatus.APPROVED.value

    # Verify Machine is back to RUNNING
    mach_final = client.get(f"/api/machines/{machine.id}", headers=super_headers).json()
    assert mach_final["status"] == MachineStatus.RUNNING.value

    # Verify Incident is RESOLVED
    inc_final = client.get(f"/api/incidents/{incident_id}", headers=super_headers).json()
    assert inc_final["status"] == IncidentStatus.RESOLVED.value

    # Verify Audit Logs recorded all key transitions
    audits = db_session.query(AuditLog).filter(
        AuditLog.action.in_([
            AuditAction.INCIDENT_CREATED,
            AuditAction.TECHNICIAN_ASSIGNED,
            AuditAction.PARTS_USED,
            AuditAction.WORK_COMPLETED,
            AuditAction.MAINTENANCE_APPROVED
        ])
    ).all()
    logged_actions = {a.action for a in audits}
    assert AuditAction.INCIDENT_CREATED in logged_actions
    assert AuditAction.TECHNICIAN_ASSIGNED in logged_actions
    assert AuditAction.PARTS_USED in logged_actions
    assert AuditAction.WORK_COMPLETED in logged_actions
    assert AuditAction.MAINTENANCE_APPROVED in logged_actions
