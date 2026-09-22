from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
from app.models.enums import DocumentType
from app.schemas.user import UserResponse
from app.schemas.machine import MachineResponse


class DocumentVersionResponse(BaseModel):
    id: int
    document_id: int
    version_number: str
    changelog: Optional[str] = None
    file_url: str
    created_at: datetime
    created_by: Optional[UserResponse] = None

    class Config:
        from_attributes = True


class DocumentCreate(BaseModel):
    machine_id: Optional[int] = None
    title: str
    doc_type: DocumentType = DocumentType.MANUAL
    file_url: str
    version_number: str = "1.0"
    changelog: Optional[str] = "Initial upload"


class DocumentVersionCreate(BaseModel):
    version_number: str
    changelog: Optional[str] = None
    file_url: str


class DocumentResponse(BaseModel):
    id: int
    machine_id: Optional[int] = None
    title: str
    doc_type: DocumentType
    file_url: str
    created_at: datetime
    updated_at: datetime

    machine: Optional[MachineResponse] = None
    created_by: Optional[UserResponse] = None
    versions: List[DocumentVersionResponse] = []

    class Config:
        from_attributes = True
