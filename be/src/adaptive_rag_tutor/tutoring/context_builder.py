from sqlalchemy.orm import Session

from adaptive_rag_tutor.db.models import Interaction, Misconception, TopicMastery
from adaptive_rag_tutor.vector_store.chroma_store import SearchHit


def _mastery_summary(db: Session, student_id: int) -> str:
    rows = db.query(TopicMastery).filter(TopicMastery.student_id == student_id).all()
    parts = [f"{row.topic}:{row.score:.2f}" for row in rows]
    summary = ", ".join(parts) if parts else "no mastery data"
    result = summary
    return result


def _misconception_summary(db: Session, student_id: int) -> str:
    rows = db.query(Misconception).filter(Misconception.student_id == student_id).limit(5).all()
    parts = [f"{row.topic}:{row.pattern}" for row in rows]
    summary = "; ".join(parts) if parts else "none"
    result = summary
    return result


def _history_summary(db: Session, student_id: int, conversation_id: int | None = None) -> str:
    query = db.query(Interaction).filter(Interaction.student_id == student_id)
    if conversation_id:
        query = query.filter(Interaction.conversation_id == conversation_id)
    rows = query.order_by(Interaction.id.desc()).limit(3).all()
    parts = [f"Q:{row.query[:80]} A:{row.action_type}" for row in rows]
    summary = " | ".join(parts) if parts else "none"
    result = summary
    return result


def build_context(
    db: Session, student_id: int, query: str, hits: list[SearchHit], course_meta: dict,
    conversation_id: int | None = None,
) -> str:
    passages = "\n\n".join(f"[{hit.source_file}/{hit.topic}] {hit.text}" for hit in hits)
    objectives = course_meta.get("objectives", {})
    topics = course_meta.get("topics", [])
    mastery = _mastery_summary(db, student_id)
    misconceptions = _misconception_summary(db, student_id)
    history = _history_summary(db, student_id, conversation_id)
    context = (
        f"Student query: {query}\n"
        f"Topics: {topics}\nObjectives: {objectives}\n"
        f"Mastery: {mastery}\nMisconceptions: {misconceptions}\nHistory: {history}\n"
        f"Course passages:\n{passages}\n"
        "Policy: use Socratic method, do not solve graded work, cite course material."
    )
    result = context
    return result
