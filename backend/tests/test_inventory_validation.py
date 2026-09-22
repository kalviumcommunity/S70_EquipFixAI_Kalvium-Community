from fastapi import status
from tests.conftest import get_auth_header
from app.models.enums import UserRole, NotificationType
from app.models.notification import Notification


def test_insufficient_inventory_rejection(client, seeded_users, db_session):
    """Test using more spare parts than currently in stock returns HTTP 400."""
    part = seeded_users["part"]
    machine = seeded_users["machine"]
    tech = seeded_users["users"][UserRole.TECHNICIAN.value]
    super_u = seeded_users["users"][UserRole.SUPERVISOR.value]
    tech_headers = get_auth_header("tech_user", UserRole.TECHNICIAN.value)

    from app.models.incident import Incident
    from app.models.work_order import WorkOrder
    from app.models.enums import IncidentSeverity, IncidentPriority, IncidentStatus, WorkOrderStatus

    inc = Incident(
        incident_number="TEST-INC-INV-01",
        machine_id=machine.id,
        reported_by_id=tech.id,
        description="Test incident for inventory rejection",
        severity=IncidentSeverity.LOW,
        priority=IncidentPriority.LOW,
        status=IncidentStatus.ASSIGNED
    )
    db_session.add(inc)
    db_session.flush()

    wo = WorkOrder(
        work_order_number="TEST-WO-INV-01",
        incident_id=inc.id,
        machine_id=machine.id,
        assigned_technician_id=tech.id,
        supervisor_id=super_u.id,
        priority=IncidentPriority.LOW,
        status=WorkOrderStatus.IN_PROGRESS
    )
    db_session.add(wo)
    db_session.commit()

    # Request more parts than available (part.quantity is 10)
    payload = {
        "part_id": part.id,
        "quantity_used": 9999
    }
    response = client.post(f"/api/work-orders/{wo.id}/parts", json=payload, headers=tech_headers)
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "Insufficient inventory" in response.json()["detail"]


def test_invalid_negative_quantity_rejection(client, seeded_users):
    """Test negative quantity in part usage is rejected by Pydantic validation."""
    part = seeded_users["part"]
    tech_headers = get_auth_header("tech_user", UserRole.TECHNICIAN.value)

    payload = {
        "part_id": part.id,
        "quantity_used": -5
    }
    response = client.post("/api/work-orders/1/parts", json=payload, headers=tech_headers)
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_part_restocking_by_supervisor(client, seeded_users, db_session):
    """Test supervisor can restock spare parts and update inventory levels."""
    part = seeded_users["part"]
    super_headers = get_auth_header("super_user", UserRole.SUPERVISOR.value)

    initial_qty = part.quantity
    restock_payload = {
        "quantity_to_add": 15,
        "reason": "Monthly supplier shipment delivery PO-9821"
    }
    response = client.post(f"/api/parts/{part.id}/restock", json=restock_payload, headers=super_headers)
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["quantity"] == initial_qty + 15
