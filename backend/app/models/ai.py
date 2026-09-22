from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.database.base import Base
from app.models.enums import GroundingStatus, FeedbackType


class AIQuery(Base):
    __tablename__ = "ai_queries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    machine_id = Column(Integer, ForeignKey("machines.id"), nullable=True, index=True)
    work_order_id = Column(Integer, ForeignKey("work_orders.id"), nullable=True, index=True)
    query_text = Column(Text, nullable=False)
    response_text = Column(Text, nullable=True)
    response_json = Column(Text, nullable=True)
    grounding_status = Column(SQLEnum(GroundingStatus), default=GroundingStatus.GROUNDED, nullable=False)
    feedback = Column(SQLEnum(FeedbackType), nullable=True)
    feedback_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User")
    machine = relationship("Machine")
    work_order = relationship("WorkOrder")
    sources = relationship("AISource", back_populates="query", cascade="all, delete-orphan")


class AISource(Base):
    __tablename__ = "ai_sources"

    id = Column(Integer, primary_key=True, index=True)
    ai_query_id = Column(Integer, ForeignKey("ai_queries.id"), nullable=False, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=True, index=True)
    chunk_id = Column(Integer, ForeignKey("document_chunks.id"), nullable=True, index=True)
    page_number = Column(Integer, default=1, nullable=False)
    section_title = Column(String(255), nullable=True)
    source_type = Column(String(50), default="DOCUMENT", nullable=False)
    relevance_score = Column(Float, nullable=False, default=0.0)
    snippet = Column(Text, nullable=True)

    query = relationship("AIQuery", back_populates="sources")
    document = relationship("Document")
    chunk = relationship("DocumentChunk")
