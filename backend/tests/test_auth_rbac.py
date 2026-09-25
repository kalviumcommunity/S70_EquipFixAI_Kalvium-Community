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


def test_register_success(client):
    """Test self-registration with strong password creates user and returns 201."""
    payload = {
        "username": "new_operator_test",
        "email": "operator_test@plant.local",
        "full_name": "Test Plant Operator",
        "password": "Password123!",
        "role_name": "OPERATOR"
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["username"] == "new_operator_test"
    assert data["email"] == "operator_test@plant.local"
    assert data["role"]["name"] == "OPERATOR"


def test_register_and_login_flow(client):
    """Test full cycle: register a new user, then successfully log in with credentials."""
    payload = {
        "username": "cycle_user",
        "email": "cycle_user@plant.local",
        "full_name": "Cycle Verification User",
        "password": "CyclePass123!",
        "role_name": "TECHNICIAN"
    }
    reg_res = client.post("/api/auth/register", json=payload)
    assert reg_res.status_code == status.HTTP_201_CREATED

    login_res = client.post("/api/auth/login", json={"username": "cycle_user", "password": "CyclePass123!"})
    assert login_res.status_code == status.HTTP_200_OK
    login_data = login_res.json()
    assert "access_token" in login_data
    assert login_data["user"]["username"] == "cycle_user"
    assert login_data["user"]["role"]["name"] == "TECHNICIAN"


def test_register_labor_role_normalization(client):
    """Test registering with 'LABOR' role is gracefully mapped to 'OPERATOR'."""
    payload = {
        "username": "labor_worker",
        "email": "labor_worker@plant.local",
        "full_name": "Labor Worker",
        "password": "LaborPass123!",
        "role_name": "LABOR"
    }
    res = client.post("/api/auth/register", json=payload)
    assert res.status_code == status.HTTP_201_CREATED
    assert res.json()["role"]["name"] == "OPERATOR"


def test_register_weak_password_rejected(client):
    """Test registration rejects weak password with 400 Bad Request."""
    payload = {
        "username": "weak_pwd_user",
        "email": "weak_pwd@plant.local",
        "full_name": "Weak Pwd",
        "password": "short",
        "role_name": "OPERATOR"
    }
    res = client.post("/api/auth/register", json=payload)
    assert res.status_code == status.HTTP_400_BAD_REQUEST
    assert "at least 8 characters" in res.json()["detail"]


def test_register_duplicate_user_rejected(client):
    """Test duplicate registration returns 400 Bad Request instead of 500 error."""
    payload = {
        "username": "dup_user",
        "email": "dup@plant.local",
        "full_name": "Dup User",
        "password": "ValidPass123!",
        "role_name": "OPERATOR"
    }
    res1 = client.post("/api/auth/register", json=payload)
    assert res1.status_code == status.HTTP_201_CREATED

    res2 = client.post("/api/auth/register", json=payload)
    assert res2.status_code == status.HTTP_400_BAD_REQUEST
    assert "already exists" in res2.json()["detail"]


def test_register_manager_forbidden(client):
    """Test self-registration as MANAGER is forbidden with 403."""
    payload = {
        "username": "rogue_manager",
        "email": "rogue@plant.local",
        "full_name": "Rogue Manager",
        "password": "ManagerPass123!",
        "role_name": "MANAGER"
    }
    res = client.post("/api/auth/register", json=payload)
    assert res.status_code == status.HTTP_403_FORBIDDEN


def test_auth_directory_endpoint(client, seeded_users):
    """Test /api/auth/directory returns active users list."""
    res = client.get("/api/auth/directory")
    assert res.status_code == status.HTTP_200_OK
    users = res.json()
    assert isinstance(users, list)
    assert len(users) >= 4


def test_auth_stats_endpoint(client):
    """Test /api/auth/stats returns plant telemetry overview."""
    res = client.get("/api/auth/stats")
    assert res.status_code == status.HTTP_200_OK
    stats = res.json()
    assert "total_machines" in stats
    assert "running_machines" in stats
    assert "uptime_pct" in stats


def test_google_login_new_user_provisioning(client):
    """Test Google login provisions new user and returns JWT token."""
    payload = {
        "email": "google_newbie@plant.local",
        "full_name": "Google Newbie Operator",
        "role": "OPERATOR",
        "token": "firebase_mock_id_token"
    }
    res = client.post("/api/auth/google", json=payload)
    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    assert "access_token" in data
    assert data["user"]["email"] == "google_newbie@plant.local"
    assert data["user"]["role"]["name"] == "OPERATOR"


def test_google_login_existing_user_switch(client):
    """Test Google login for existing user updates role if requested."""
    payload = {
        "email": "google_existing@plant.local",
        "full_name": "Existing Tech",
        "role": "TECHNICIAN",
        "token": "firebase_mock_id_token"
    }
    res1 = client.post("/api/auth/google", json=payload)
    assert res1.status_code == status.HTTP_200_OK

    # Log in again with supervisor role
    payload2 = {
        "email": "google_existing@plant.local",
        "full_name": "Existing Tech",
        "role": "SUPERVISOR",
        "token": "firebase_mock_id_token"
    }
    res2 = client.post("/api/auth/google", json=payload2)
    assert res2.status_code == status.HTTP_200_OK
    assert res2.json()["user"]["role"]["name"] == "SUPERVISOR"


def test_google_login_missing_credentials(client):
    """Test Google login with no credentials returns 501 when GOOGLE_CLIENT_ID not set."""
    res = client.post("/api/auth/google", json={})
    assert res.status_code == status.HTTP_501_NOT_IMPLEMENTED
