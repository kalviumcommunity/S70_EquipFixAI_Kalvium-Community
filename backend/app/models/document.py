from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.database.base import Base
from app.models.enums import DocumentType, DocumentApprovalStatus, IndexingStatus


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(Integer, ForeignKey("machines.id"), nullable=True, index=True)
    title = Column(String(200), nullable=False)
    doc_type = Column(SQLEnum(DocumentType), default=DocumentType.MANUAL, nullable=False, index=True)
    department = Column(String(100), nullable=True)
    approval_status = Column(SQLEnum(DocumentApprovalStatus), default=DocumentApprovalStatus.APPROVED, nullable=False, index=True)
    indexing_status = Column(SQLEnum(IndexingStatus), default=IndexingStatus.PENDING, nullable=False, index=True)
    file_url = Column(String(255), nullable=False)
    effective_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    machine = relationship("Machine", back_populates="documents")
    created_by = relationship("User")
    versions = relationship("DocumentVersion", back_populates="document", cascade="all, delete-orphan", order_by="DocumentVersion.version_number.desc()")
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")

    @property
    def current_version(self):
        for v in self.versions:
            if v.is_current:
                return v
        return self.versions[0] if self.versions else None

    @property
    def file_name(self):
        return self.file_url.split("/")[-1] if self.file_url else self.title


class DocumentVersion(Base):
    __tablename__ = "document_versions"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False, index=True)
    version_number = Column(String(20), nullable=False)
    is_current = Column(Boolean, default=True, nullable=False, index=True)
    changelog = Column(Text, nullable=True)
    file_url = Column(String(255), nullable=False)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    document = relationship("Document", back_populates="versions")
    created_by = relationship("User")
    chunks = relationship("DocumentChunk", back_populates="version", cascade="all, delete-orphan")

    @property
    def file_path(self):
        return self.file_url

    @property
    def approval_status(self):
        return self.document.approval_status if self.document else DocumentApprovalStatus.APPROVED


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=True, index=True)
    version_id = Column(Integer, ForeignKey("document_versions.id", ondelete="CASCADE"), nullable=True, index=True)
    chunk_index = Column(Integer, nullable=False)
    page_number = Column(Integer, default=1, nullable=False)
    section_title = Column(String(255), nullable=True)
    content = Column(Text, nullable=False)
    embedding = Column(Text, nullable=False)  # JSON-serialized list of floats
    machine_id = Column(Integer, ForeignKey("machines.id"), nullable=True, index=True)
    doc_type = Column(SQLEnum(DocumentType), nullable=False, index=True)
    approval_status = Column(SQLEnum(DocumentApprovalStatus), default=DocumentApprovalStatus.APPROVED, nullable=False, index=True)
    is_current = Column(Boolean, default=True, nullable=False, index=True)
    metadata_json = Column(Text, nullable=True)  # Additional attributes in JSON
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    document = relationship("Document", back_populates="chunks")
    version = relationship("DocumentVersion", back_populates="chunks")
    machine = relationship("Machine")
