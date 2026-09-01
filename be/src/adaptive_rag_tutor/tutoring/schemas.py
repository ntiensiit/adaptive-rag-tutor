from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, Field


class ActionType(StrEnum):
    DIAGNOSTIC = "diagnostic_question"
    SOCRATIC = "socratic_hint"
    EXPLANATION = "short_explanation"
    ANALOGOUS = "analogous_example"
    PRACTICE = "practice_question"
    REFUSAL = "refusal"


class Citation(BaseModel):
    source_file: str
    topic: str
    excerpt: str


class TeachingAction(BaseModel):
    action_type: ActionType
    content: str
    topic: str = ""
    citations: list[Citation] = Field(default_factory=list)


class IntegrityResult(BaseModel):
    allowed: bool
    assessment_context: str = "learning"
    reason: str = ""


class EvaluationResult(BaseModel):
    correct: bool
    misconception: str = ""
    feedback: str
    topic: str = ""


class ChatRequest(BaseModel):
    student_id: int
    course_id: int
    message: str
    conversation_id: int | None = None


class ChatResponse(BaseModel):
    interaction_id: int
    conversation_id: int
    action_type: str
    content: str
    topic: str
    citations: list[Citation]
    integrity_flag: bool


class ConversationOut(BaseModel):
    id: int
    course_id: int
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: int


class MessageOut(BaseModel):
    id: int
    role: str
    content: str
    action_type: str | None = None
    citations: list[Citation] = Field(default_factory=list)
    created_at: datetime | None = None


class RespondRequest(BaseModel):
    interaction_id: int
    student_response: str


class RespondResponse(BaseModel):
    correct: bool
    feedback: str
    misconception: str
    updated_mastery: dict[str, float]


class PracticeResponse(BaseModel):
    attempt_id: int
    topic: str
    question: str


class PracticeSubmitRequest(BaseModel):
    student_answer: str
    hints_used: int = 0


class PracticeSubmitResponse(BaseModel):
    correct: bool
    feedback: str
    updated_mastery: dict[str, float]


class PracticeSummaryOut(BaseModel):
    id: int
    course_id: int
    topic: str
    title: str
    created_at: datetime
    submitted: bool
    correct: bool | None = None


class PracticeDetailOut(BaseModel):
    attempt_id: int
    topic: str
    question: str
    student_answer: str | None = None
    feedback: str | None = None
    correct: bool | None = None
    submitted: bool


class DayProgressOut(BaseModel):
    date: str
    avg_mastery: float | None = None
    chats: int = 0
    exercises: int = 0
    exercises_correct: int = 0


class ProgressTimelineOut(BaseModel):
    student_id: int
    year: int
    month: int
    topic: str | None = None
    topic_mastery: float | None = None
    days: list[DayProgressOut]
