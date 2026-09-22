from fastapi import status
from tests.conftest import get_auth_header
from app.models.enums import UserRole


def test_login_success(client, seeded_users):
    """Test successful user login returning valid JWT access token."""
    response = client.post(
        "/api/auth/login",
        json={"username": "op_user", "password": "password123"}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["username"] == "op_user"
    assert data["user"]["role"]["name"] == UserRole.OPERATOR.value


def test_login_invalid_password(client, seeded_users):
    """Test login failure with invalid password returns 401 Unauthorized."""
    response = client.post(
        "/api/auth/login",
        json={"username": "op_user", "password": "wrongpassword"}
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert "detail" in response.json()


def test_unauthenticated_request_rejected(client):
    """Test protected endpoints reject requests without Bearer token."""
    response = client.get("/api/machines")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_operator_rbac_forbidden_on_machine_creation(client, seeded_users):
    """Test Operator role is forbidden from creating new machines (returns 403)."""
    headers = get_auth_header("op_user", UserRole.OPERATOR.value)
    payload = {
        "machine_code": "FORBIDDEN-01",
        "name": "Unauthorized Machine",
        "type": "CNC",
        "department": "Machining",
        "location": "Bay 1"
    }
    response = client.post("/api/machines", json=payload, headers=headers)
    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_technician_rbac_forbidden_on_maintenance_approval(client, seeded_users):
    """Test Technician role cannot approve maintenance records (returns 403)."""
    headers = get_auth_header("tech_user", UserRole.TECHNICIAN.value)
    payload = {"approved": True, "supervisor_notes": "Attempt by tech"}
    response = client.post("/api/maintenance/records/1/approval", json=payload, headers=headers)
    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_manager_access_to_user_management(client, seeded_users):
    """Test Manager has permission to create users."""
    headers = get_auth_header("mgr_user", UserRole.MANAGER.value)
    payload = {
        "username": "new_worker",
        "email": "worker@test.com",
        "full_name": "New Factory Worker",
        "password": "securepass123",
        "role_name": "OPERATOR"
    }
    response = client.post("/api/users", json=payload, headers=headers)
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["username"] == "new_worker"
    assert data["role"]["name"] == "OPERATOR"
