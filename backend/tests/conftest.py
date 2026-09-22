import os
os.environ["DATABASE_URL"] = "sqlite:///./backend/test_app.db"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.config import settings
from app.database.base import Base
from app.database.session import get_db
from app.main import app
from app.models.user import Role, User
from app.models.machine import Machine
from app.models.part import Part
from app.models.enums import UserRole, MachineStatus
from app.auth.security import get_password_hash, create_access_token

# Use SQLite in-memory / temporary file for test isolation
SQLALCHEMY_DATABASE_URL = "sqlite:///./backend/test_app.db"
test_engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def db_session():
    connection = test_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def seeded_users(db_session):
    # Ensure roles exist
    roles = {}
    for role_name in [UserRole.OPERATOR, UserRole.TECHNICIAN, UserRole.SUPERVISOR, UserRole.MANAGER]:
        role = db_session.query(Role).filter(Role.name == role_name.value).first()
        if not role:
            role = Role(name=role_name.value, description=f"{role_name.value} role")
            db_session.add(role)
            db_session.flush()
        roles[role_name.value] = role

    pwd_hash = get_password_hash("password123")
    users = {}
    user_specs = [
        ("op_user", "op@test.com", "Operator Test", UserRole.OPERATOR.value),
        ("tech_user", "tech@test.com", "Technician Test", UserRole.TECHNICIAN.value),
        ("super_user", "super@test.com", "Supervisor Test", UserRole.SUPERVISOR.value),
        ("mgr_user", "mgr@test.com", "Manager Test", UserRole.MANAGER.value),
    ]

    for uname, email, fname, rname in user_specs:
        user = db_session.query(User).filter(User.username == uname).first()
        if not user:
            user = User(
                username=uname,
                email=email,
                full_name=fname,
                hashed_password=pwd_hash,
                role_id=roles[rname].id,
                is_active=True
            )
            db_session.add(user)
            db_session.flush()
        users[rname] = user

    # Ensure a sample machine exists
    machine = db_session.query(Machine).filter(Machine.machine_code == "TEST-CNC-01").first()
    if not machine:
        machine = Machine(
            machine_code="TEST-CNC-01",
            name="Test CNC Machine",
            type="Milling",
            department="Machining",
            location="Bay 1",
            status=MachineStatus.RUNNING
        )
        db_session.add(machine)
        db_session.flush()

    # Ensure a sample spare part exists
    part = db_session.query(Part).filter(Part.part_number == "TEST-BRG-01").first()
    if not part:
        part = Part(
            part_number="TEST-BRG-01",
            name="Test Ball Bearing",
            description="Test spare part for unit tests",
            quantity=10,
            min_quantity=5,
            unit_cost=50.0,
            location="Aisle 1"
        )
        db_session.add(part)
        db_session.flush()

    db_session.commit()
    return {"users": users, "machine": machine, "part": part}


def get_auth_header(username: str, role: str) -> dict:
    token = create_access_token(subject=username, role=role)
    return {"Authorization": f"Bearer {token}"}
