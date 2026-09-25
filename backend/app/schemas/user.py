from datetime import datetime
from typing import Optional, Union
from pydantic import BaseModel
from app.models.enums import UserRole


class RoleResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None

    class Config:
        from_attributes = True


class UserBase(BaseModel):
    username: str
    email: str
    full_name: str
    phone: Optional[str] = None
    avatar_url: Optional[str] = None


class UserPhoneUpdate(BaseModel):
    phone: Optional[str] = None


class UserAvatarUpdate(BaseModel):
    avatar_url: Optional[str] = None



class UserCreate(UserBase):
    password: str
    role_name: UserRole = UserRole.OPERATOR


class UserResponse(UserBase):
    id: int
    role: RoleResponse
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserLogin(BaseModel):
    username: str
    password: str
    expected_role: Optional[str] = None


class GoogleLoginRequest(BaseModel):
    credential: Optional[str] = None
    token: Optional[str] = None
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[str] = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None


class UserRoleUpdate(BaseModel):
    role_name: UserRole


class UserRegister(BaseModel):
    username: str
    email: str
    full_name: str
    password: str
    department: Optional[str] = None
    employee_id: Optional[str] = None
    role_name: Union[UserRole, str] = UserRole.OPERATOR


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class GenericAuthMessageResponse(BaseModel):
    message: str
    success: bool = True
    reset_url: Optional[str] = None
    reset_token: Optional[str] = None
