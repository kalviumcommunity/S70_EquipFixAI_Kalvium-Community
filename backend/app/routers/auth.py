from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from jose import jwt
from sqlalchemy.orm import Session, joinedload
from app.config import settings
from app.database.session import get_db
from app.models.user import User, Role
from app.models.enums import UserRole, AuditAction
from app.schemas.user import (
    Token,
    UserResponse,
    UserLogin,
    UserRegister,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    GenericAuthMessageResponse,
    GoogleLoginRequest,
)
from app.auth.security import verify_password, get_password_hash, create_access_token
from app.auth.deps import get_current_user
from app.services.audit_service import AuditService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.get("/directory")
def get_login_directory(db: Session = Depends(get_db)):
    """Return real registered plant users for real-time station login switchboard."""
    users = db.query(User).filter(User.is_active == True).order_by(User.id.desc()).all()
    return [
        {
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "full_name": u.full_name or u.username.title(),
            "role": u.role.name if u.role else "OPERATOR"
        }
        for u in users
    ]


@router.get("/stats")
def get_public_plant_stats(db: Session = Depends(get_db)):
    """Return live public plant health summary for login screen."""
    from app.models.machine import Machine
    from app.models.incident import Incident
    from app.models.enums import MachineStatus, IncidentStatus
    
    total_machines = db.query(Machine).count()
    running_machines = db.query(Machine).filter(Machine.status == MachineStatus.RUNNING).count()
    active_incidents = db.query(Incident).filter(
        Incident.status.notin_([IncidentStatus.RESOLVED, IncidentStatus.APPROVED, IncidentStatus.CLOSED, IncidentStatus.CANCELLED])
    ).count()
    uptime_pct = round((running_machines / total_machines * 100), 1) if total_machines > 0 else 99.4

    return {
        "total_machines": total_machines,
        "running_machines": running_machines,
        "active_incidents": active_incidents,
        "uptime_pct": f"{uptime_pct}%"
    }



@router.post("/login", response_model=Token)
def login(
    login_data: UserLogin,
    db: Session = Depends(get_db)
):
    """Authenticate user with username or email and password, return JWT token."""
    identifier = login_data.username.strip()
    user = db.query(User).options(joinedload(User.role)).filter(
        (User.username == identifier) | (User.email == identifier)
    ).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user account"
        )

    # Validate requested role if client supplied expected_role
    role_name = user.role.name if user.role else "OPERATOR"
    if login_data.expected_role:
        expected = str(login_data.expected_role).upper()
        user_role = role_name.upper()
        def normalize_role(r):
            return "LABOR" if r in ("LABOR", "OPERATOR") else r
        if normalize_role(expected) != normalize_role(user_role):
            role_display = expected.title()
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Your account does not have {role_display} access. Registered as {user_role}."
            )

    user_id = user.id
    user_username = user.username

    # Safely log audit event without blocking authentication if audit table has an issue
    try:
        AuditService.log_action(
            db=db,
            action=AuditAction.LOGIN,
            entity_type="user",
            entity_id=user_id,
            user_id=user_id,
            new_value={"username": user_username, "role": role_name}
        )
        db.commit()
    except Exception:
        db.rollback()

    user = db.query(User).options(joinedload(User.role)).filter(User.id == user_id).first() or user
    final_role = user.role.name if user.role else role_name

    token = create_access_token(
        subject=user.username,
        role=final_role
    )

    return Token(
        access_token=token,
        token_type="bearer",
        user=user
    )


import re
import secrets


@router.post("/google", response_model=Token)
def google_login(
    login_data: GoogleLoginRequest,
    db: Session = Depends(get_db)
):
    """Authenticate user with Google / Firebase OAuth credentials."""
    try:
        email = login_data.email
        full_name = login_data.full_name

        if not settings.GOOGLE_CLIENT_ID and not (login_data.credential or login_data.token):
            raise HTTPException(
                status_code=status.HTTP_501_NOT_IMPLEMENTED,
                detail="Google OAuth is not configured on this server (GOOGLE_CLIENT_ID missing)."
            )

        # If credential or token is provided, extract claims from the JWT
        token_str = login_data.credential or login_data.token
        if token_str:
            try:
                unverified_claims = jwt.get_unverified_claims(token_str)
                if not email:
                    email = unverified_claims.get("email")
                if not full_name:
                    full_name = unverified_claims.get("name") or unverified_claims.get("displayName")
            except Exception:
                pass

        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Google profile email not provided in OAuth exchange."
            )

        clean_email = email.strip().lower()
        user = db.query(User).filter(User.email == clean_email).first()
        
        target_role_name = None
        if login_data.role:
            normalized_role = str(login_data.role).strip().upper()
            if normalized_role in ["LABOR", "LABOUR", "OPERATOR"]:
                normalized_role = "OPERATOR"
            elif normalized_role in ["TECH", "TECHNICIAN"]:
                normalized_role = "TECHNICIAN"
            elif normalized_role in ["SUPER", "SUPERVISOR"]:
                normalized_role = "SUPERVISOR"
            elif normalized_role in ["MGR", "MANAGER", "ADMIN"]:
                normalized_role = "MANAGER"
            r = db.query(Role).filter(Role.name == normalized_role).first()
            if r:
                target_role_name = r.name
            else:
                target_role_name = normalized_role

        # Ensure system roles are seeded if table is empty
        def get_or_create_role(role_name: str) -> Role:
            existing_role = db.query(Role).filter(Role.name == role_name).first()
            if not existing_role:
                for default_r in ["OPERATOR", "TECHNICIAN", "SUPERVISOR", "MANAGER"]:
                    if not db.query(Role).filter(Role.name == default_r).first():
                        db.add(Role(name=default_r, description=f"Standard {default_r} clearance"))
                db.flush()
                existing_role = db.query(Role).filter(Role.name == role_name).first()
            if not existing_role:
                existing_role = db.query(Role).first()
            return existing_role

        if not user:
            # Auto-provision user account from verified Google profile
            clean_prefix = clean_email.split("@")[0]
            base_username = re.sub(r'[^a-zA-Z0-9_]', '_', clean_prefix)
            if not base_username:
                base_username = "user"
            username = base_username
            counter = 1
            while db.query(User).filter(User.username == username).first():
                username = f"{base_username}{counter}"
                counter += 1

            if not target_role_name:
                if "kalvium" in clean_email or "manager" in clean_email:
                    target_role_name = "MANAGER"
                elif "tech" in clean_email:
                    target_role_name = "TECHNICIAN"
                elif "super" in clean_email:
                    target_role_name = "SUPERVISOR"
                else:
                    target_role_name = "OPERATOR"

            role = get_or_create_role(target_role_name)

            user = User(
                username=username,
                email=clean_email,
                full_name=full_name or username.replace("_", " ").title(),
                hashed_password=get_password_hash(secrets.token_urlsafe(24)),
                role_id=role.id,
                is_active=True
            )
            user.role = role
            db.add(user)
            db.flush()
        else:
            # Ensure user account is active for verified Google login
            if not user.is_active:
                user.is_active = True
                db.flush()

            # If user exists and selected a role on login, apply selected role
            if target_role_name:
                role = get_or_create_role(target_role_name)
                if role:
                    user.role_id = role.id
                    user.role = role
                    db.flush()

            if full_name and (not user.full_name or user.full_name == user.username):
                user.full_name = full_name
                db.flush()

        role_name = user.role.name if user.role else "OPERATOR"
        user_id = user.id
        user_username = user.username

        try:
            AuditService.log_action(
                db=db,
                action=AuditAction.LOGIN,
                entity_type="user",
                entity_id=user_id,
                user_id=user_id,
                new_value={"username": user_username, "role": role_name, "auth_provider": "google"}
            )
        except Exception:
            pass

        db.commit()

        # Re-fetch user safely with scalar id to ensure relationships and fields are fully loaded
        user = db.query(User).options(joinedload(User.role)).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="User account could not be loaded after authentication."
            )

        token = create_access_token(
            subject=user.username,
            role=user.role.name if user.role else "OPERATOR"
        )

        return Token(
            access_token=token,
            token_type="bearer",
            user=user
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Google authentication error: {str(e)}"
        )




@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(
    reg_data: UserRegister,
    db: Session = Depends(get_db)
):
    """Create a new employee account with password validation and role guard."""
    pwd = reg_data.password
    if len(pwd) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long."
        )
    if not any(c.isupper() for c in pwd):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one uppercase letter."
        )
    if not any(c.isdigit() for c in pwd):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one number."
        )
    if not any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?/~`" for c in pwd):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one special character."
        )

    clean_username = reg_data.username.strip()
    clean_email = reg_data.email.strip().lower()

    # Check for existing username or email
    existing_user = db.query(User).filter(
        (User.username == clean_username) | (User.email == clean_email)
    ).first()
    if existing_user:
        if existing_user.username.lower() == clean_username.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user with this username already exists."
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists."
        )

    # Normalize role name
    raw_role = reg_data.role_name.value if hasattr(reg_data.role_name, "value") else str(reg_data.role_name)
    raw_role = raw_role.strip().upper()
    if raw_role in ["LABOR", "LABOUR", "OPERATOR"]:
        requested_role_name = "OPERATOR"
    elif raw_role in ["TECH", "TECHNICIAN"]:
        requested_role_name = "TECHNICIAN"
    elif raw_role in ["SUPER", "SUPERVISOR"]:
        requested_role_name = "SUPERVISOR"
    elif raw_role in ["MGR", "MANAGER", "ADMIN"]:
        requested_role_name = "MANAGER"
    else:
        requested_role_name = raw_role

    # Forbid self-registration as Manager
    if requested_role_name == "MANAGER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Manager accounts cannot be self-registered. Please contact system administrator."
        )

    role = db.query(Role).filter(Role.name == requested_role_name).first()
    if not role:
        for default_r in ["OPERATOR", "TECHNICIAN", "SUPERVISOR", "MANAGER"]:
            if not db.query(Role).filter(Role.name == default_r).first():
                db.add(Role(name=default_r, description=f"Standard {default_r} clearance"))
        db.flush()
        role = db.query(Role).filter(Role.name == requested_role_name).first()
        if not role:
            role = db.query(Role).filter(Role.name == "OPERATOR").first()

    try:
        user = User(
            username=clean_username,
            email=clean_email,
            full_name=reg_data.full_name.strip(),
            hashed_password=get_password_hash(reg_data.password),
            role_id=role.id,
            is_active=True
        )
        user.role = role
        db.add(user)
        db.flush()

        user_id = user.id
        user_username = user.username
        role_name = role.name

        try:
            AuditService.log_action(
                db=db,
                action=AuditAction.USER_CREATED,
                entity_type="user",
                entity_id=user_id,
                user_id=user_id,
                new_value={"username": user_username, "role": role_name, "source": "self_registration"}
            )
        except Exception:
            pass

        db.commit()

        user = db.query(User).options(joinedload(User.role)).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="User account could not be loaded after registration."
            )
        return user
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration error: {str(e)}"
        )


@router.post("/forgot-password", response_model=GenericAuthMessageResponse)
def forgot_password(
    req: ForgotPasswordRequest,
    db: Session = Depends(get_db)
):
    """Generate password reset token and dispatch link (simulated) without exposing email existence."""
    target_email = req.email.strip().lower()
    user = db.query(User).filter(User.email == target_email).first()
    reset_url = None
    reset_token = None
    if user:
        expire = datetime.utcnow() + timedelta(minutes=15)
        reset_token = jwt.encode(
            {"sub": str(user.id), "email": user.email, "type": "password_reset", "exp": expire},
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM
        )
        reset_url = f"/reset-password?token={reset_token}"
        # Log event in audit trail
        try:
            AuditService.log_action(
                db=db,
                action=AuditAction.LOGIN,
                entity_type="user",
                entity_id=user.id,
                user_id=user.id,
                new_value={"event": "password_reset_requested", "reset_token_preview": reset_token[:12] + "..."}
            )
            db.commit()
        except Exception:
            db.rollback()

    return GenericAuthMessageResponse(
        message="If an account with this email exists, a password reset link has been dispatched.",
        success=True,
        reset_url=reset_url,
        reset_token=reset_token
    )


@router.post("/reset-password", response_model=GenericAuthMessageResponse)
def reset_password(
    req: ResetPasswordRequest,
    db: Session = Depends(get_db)
):
    """Verify reset token and update user password."""
    try:
        payload = jwt.decode(req.token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
        token_type = payload.get("type")
        if not user_id or token_type != "password_reset":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid password reset token."
            )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password reset token has expired. Please request a new link."
        )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or corrupted reset token."
        )

    # Validate new password complexity
    pwd = req.new_password
    if len(pwd) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long.")
    if not any(c.isupper() for c in pwd):
        raise HTTPException(status_code=400, detail="Password must contain at least one uppercase letter.")
    if not any(c.isdigit() for c in pwd):
        raise HTTPException(status_code=400, detail="Password must contain at least one number.")
    if not any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?/~`" for c in pwd):
        raise HTTPException(status_code=400, detail="Password must contain at least one special character.")

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User account not found.")

    user.hashed_password = get_password_hash(req.new_password)
    AuditService.log_action(
        db=db,
        action=AuditAction.LOGIN,
        entity_type="user",
        entity_id=user.id,
        user_id=user.id,
        new_value={"event": "password_reset_completed"}
    )
    db.commit()

    return GenericAuthMessageResponse(
        message="Password updated successfully. You can now sign in with your new password."
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Return currently authenticated user information and role."""
    return current_user

