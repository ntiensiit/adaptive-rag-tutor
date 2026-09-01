from datetime import UTC, datetime

from sqlalchemy.orm import Session

from adaptive_rag_tutor.db.models import Conversation, Course, Interaction
from adaptive_rag_tutor.tutoring.context_builder import build_context
from adaptive_rag_tutor.tutoring.integrity_guard import check_integrity
from adaptive_rag_tutor.tutoring.retriever import retrieve
from adaptive_rag_tutor.tutoring.schemas import ActionType, ChatResponse, TeachingAction
from adaptive_rag_tutor.tutoring.tutor_llm import generate_action
from adaptive_rag_tutor.vector_store.chroma_store import ChromaStore


def _refusal_action(reason: str) -> TeachingAction:
    content = f"I cannot help with graded or exam work. {reason}".strip()
    action = TeachingAction(action_type=ActionType.REFUSAL, content=content, topic="integrity")
    result = action
    return result


def _title_from_message(message: str) -> str:
    text = message.strip().replace("\n", " ")
    title = text[:80] + ("..." if len(text) > 80 else "")
    result = title
    return result


def _resolve_conversation(
    db: Session, student_id: int, course_id: int, conversation_id: int | None, message: str,
) -> Conversation:
    if conversation_id:
        row = db.get(Conversation, conversation_id)
        if not row or row.student_id != student_id:
            raise ValueError("Conversation not found")
        row.updated_at = datetime.now(UTC)
        result = row
        return result
    row = Conversation(student_id=student_id, course_id=course_id, title=_title_from_message(message))
    db.add(row)
    db.flush()
    result = row
    return result


def run_chat(
    db: Session, student_id: int, course_id: int, message: str, store: ChromaStore,
    conversation_id: int | None = None,
) -> ChatResponse:
    course = db.get(Course, course_id)
    meta = course.metadata_json if course else {}
    integrity = check_integrity(message)
    hits = retrieve(course_id, message, store) if integrity.allowed else []
    conversation = _resolve_conversation(db, student_id, course_id, conversation_id, message)
    context = build_context(db, student_id, message, hits, meta, conversation.id)
    action = generate_action(context, hits, refusal=False) if integrity.allowed else _refusal_action(integrity.reason)
    row = Interaction(
        student_id=student_id,
        course_id=course_id,
        conversation_id=conversation.id,
        query=message,
        action_type=action.action_type.value,
        response=action.content,
        citations_json=[c.model_dump() for c in action.citations],
        hint_count=1 if action.action_type == ActionType.SOCRATIC else 0,
        integrity_flag=not integrity.allowed,
        topic=action.topic,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    conversation.updated_at = datetime.now(UTC)
    db.commit()
    response = ChatResponse(
        interaction_id=row.id,
        conversation_id=conversation.id,
        action_type=action.action_type.value,
        content=action.content,
        topic=action.topic,
        citations=action.citations,
        integrity_flag=not integrity.allowed,
    )
    result = response
    return result
