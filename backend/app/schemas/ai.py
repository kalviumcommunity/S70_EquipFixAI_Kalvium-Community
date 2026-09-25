from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
from app.models.enums import GroundingStatus, FeedbackType


class AICitation(BaseModel):
    document_id: Optional[int] = None
    document_title: str
    version_number: Optional[str] = None
    page_number: int = 1
    section_title: Optional[str] = None
    source_type: str = "DOCUMENT"  # DOCUMENT or MAINTENANCE_RECORD
    relevance_score: float = 0.0
    snippet: str

    class Config:
        from_attributes = True


class AIPreviousRepair(BaseModel):
    record_id: int
    machine_code: str
    problem_summary: str
    root_cause: str
    repair_action: str
    downtime_minutes: int
    completion_date: Optional[str] = None


class AIQueryRequest(BaseModel):
    question: Optional[str] = None
    query: Optional[str] = None
    machine_id: Optional[int] = None
    work_order_id: Optional[int] = None
    include_sources: Optional[bool] = True

    def __init__(self, **data):
        if not data.get("question") and data.get("query"):
            data["question"] = data["query"]
        super().__init__(**data)


class AIQueryResponse(BaseModel):
    query_id: int
    question: str
    machine_code: Optional[str] = None
    possible_cause: str
    recommended_checks: List[str] = []
    safety_warnings: List[str] = []
    relevant_previous_repairs: List[AIPreviousRepair] = []
    sources: List[AICitation] = []
    grounding_status: GroundingStatus
    is_structured_fact: bool = False
    created_at: datetime


class AIFeedbackRequest(BaseModel):
    feedback: FeedbackType
    notes: Optional[str] = None


class AIQueryHistoryItem(BaseModel):
    id: int
    query_text: str
    machine_id: Optional[int] = None
    work_order_id: Optional[int] = None
    grounding_status: GroundingStatus
    feedback: Optional[FeedbackType] = None
    created_at: datetime
    sources_count: int = 0

    class Config:
        from_attributes = True


class AIChatMessage(BaseModel):
    role: str
    content: str


class AIChatRequest(BaseModel):
    message: Optional[str] = None
    prompt: Optional[str] = None
    question: Optional[str] = None
    api_key: Optional[str] = None
    provider: Optional[str] = "gemini"
    model: Optional[str] = None
    machine_id: Optional[int] = None
    work_order_id: Optional[int] = None
    history: Optional[List[AIChatMessage]] = []
    image_base64: Optional[str] = None
    image_mime: Optional[str] = "image/jpeg"

    def get_message(self) -> str:
        return (self.message or self.prompt or self.question or "").strip()


class AIChatResponse(BaseModel):
    text: str
    provider: str
    model: str
    realtime: bool = True
    grounded_source: Optional[str] = None
    query_id: Optional[int] = None


class AIVerifyKeyRequest(BaseModel):
    api_key: str
    provider: Optional[str] = "gemini"
    model: Optional[str] = "gemini-2.0-flash"


class AIVerifyKeyResponse(BaseModel):
    success: bool
    message: str
    provider: str
    model: Optional[str] = None
