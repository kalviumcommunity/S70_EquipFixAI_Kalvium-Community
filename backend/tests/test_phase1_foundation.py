import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timedelta
from jose import jwt
from app.main import app
from app.config import settings
from app.database.session import get_db
from app.models.user import User


@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_user_registration_success(client, seeded_users):
    res = client.post("/api/auth/register", json={
        "username": "newtech_tester",
        "email": "newtech@equipfix.ai",
        "full_name": "New Technician Tester",
        "password": "SecurePassword123!",
        "role_name": "TECHNICIAN"
    })
    assert res.status_code == 201
    data = res.json()
    assert data["username"] == "newtech_tester"
    assert data["role"]["name"] == "TECHNICIAN"


def test_user_registration_weak_password_rejected(client, seeded_users):
    # Too short
    res = client.post("/api/auth/register", json={
        "username": "weakuser1",
        "email": "weak1@equipfix.ai",
        "full_name": "Weak User",
        "password": "sh1!",
        "role_name": "OPERATOR"
    })
    assert res.status_code == 400
    assert "at least 8 characters" in res.json()["detail"]

    # No uppercase
    res = client.post("/api/auth/register", json={
        "username": "weakuser2",
        "email": "weak2@equipfix.ai",
        "full_name": "Weak User",
        "password": "password123!",
        "role_name": "OPERATOR"
    })
    assert res.status_code == 400
    assert "uppercase" in res.json()["detail"]

    # No number
    res = client.post("/api/auth/register", json={
        "username": "weakuser3",
        "email": "weak3@equipfix.ai",
        "full_name": "Weak User",
        "password": "Password!",
        "role_name": "OPERATOR"
    })
    assert res.status_code == 400
    assert "number" in res.json()["detail"]

    # No special character
    res = client.post("/api/auth/register", json={
        "username": "weakuser4",
        "email": "weak4@equipfix.ai",
        "full_name": "Weak User",
        "password": "Password123",
        "role_name": "OPERATOR"
    })
    assert res.status_code == 400
    assert "special character" in res.json()["detail"]


def test_user_cannot_self_register_as_manager(client, seeded_users):
    res = client.post("/api/auth/register", json={
        "username": "rogue_manager",
        "email": "rogue@equipfix.ai",
        "full_name": "Rogue Manager",
        "password": "SecurePassword123!",
        "role_name": "MANAGER"
    })
    assert res.status_code == 403
    assert "Manager accounts cannot be self-registered" in res.json()["detail"]


def test_login_with_email_and_username(client, seeded_users):
    # Login with username
    res_user = client.post("/api/auth/login", json={
        "username": "op_user",
        "password": "password123"
    })
    assert res_user.status_code == 200
    assert "access_token" in res_user.json()

    # Login with email
    res_email = client.post("/api/auth/login", json={
        "username": "op@test.com",
        "password": "password123"
    })
    assert res_email.status_code == 200
    assert "access_token" in res_email.json()


def test_forgot_and_reset_password_flow(client, seeded_users, db_session):
    # Request reset for op_user
    res_forgot = client.post("/api/auth/forgot-password", json={
        "email": "op@test.com"
    })
    assert res_forgot.status_code == 200
    assert "password reset link has been dispatched" in res_forgot.json()["message"]

    # Request reset for non-existent email (should return same generic reassuring message)
    res_ghost = client.post("/api/auth/forgot-password", json={
        "email": "ghostuser@equipfix.ai"
    })
    assert res_ghost.status_code == 200
    assert "password reset link has been dispatched" in res_ghost.json()["message"]

    # Create a valid reset token for op_user
    user = db_session.query(User).filter(User.username == "op_user").first()
    expire = datetime.utcnow() + timedelta(minutes=15)
    token = jwt.encode(
        {"sub": str(user.id), "email": user.email, "type": "password_reset", "exp": expire},
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )

    # Perform reset
    res_reset = client.post("/api/auth/reset-password", json={
        "token": token,
        "new_password": "NewSecretPassword999!"
    })
    assert res_reset.status_code == 200
    assert "Password updated successfully" in res_reset.json()["message"]

    # Verify login succeeds with new password
    res_new_login = client.post("/api/auth/login", json={
        "username": "op_user",
        "password": "NewSecretPassword999!"
    })
    assert res_new_login.status_code == 200


def test_login_role_matching_and_forbidden_rejection(client, seeded_users):
    # Valid matching role: Labor logging in as Labor/Operator
    res_valid = client.post("/api/auth/login", json={
        "username": "op_user",
        "password": "password123",
        "expected_role": "LABOR"
    })
    assert res_valid.status_code == 200

    # Invalid mismatched role: Labor user attempting to login as Technician
    res_mismatch = client.post("/api/auth/login", json={
        "username": "op_user",
        "password": "password123",
        "expected_role": "TECHNICIAN"
    })
    assert res_mismatch.status_code == 403
    assert "Your account does not have Technician access." in res_mismatch.json()["detail"]

    # Invalid mismatched role: Technician user attempting to login as Manager
    res_tech_mgr = client.post("/api/auth/login", json={
        "username": "tech_user",
        "password": "password123",
        "expected_role": "MANAGER"
    })
    assert res_tech_mgr.status_code == 403
    assert "Your account does not have Manager access." in res_tech_mgr.json()["detail"]


def test_google_login_unconfigured_error(client):
    # When GOOGLE_CLIENT_ID is not set in env, it returns 501 with helpful instructions
    res = client.post("/api/auth/google", json={
        "email": "test@gmail.com"
    })
    assert res.status_code == 501
    assert "Google OAuth is not configured on this server" in res.json()["detail"]


