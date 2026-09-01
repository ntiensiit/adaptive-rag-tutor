from llama_index.llms.ollama import Ollama
from sqlalchemy.orm import Session

from adaptive_rag_tutor.config import settings
from adaptive_rag_tutor.db.models import PracticeAttempt, TopicMastery
from adaptive_rag_tutor.tutoring.context_builder import build_context
from adaptive_rag_tutor.tutoring.llm_json import parse_llm_json
from adaptive_rag_tutor.tutoring.retriever import retrieve
from adaptive_rag_tutor.vector_store.chroma_store import ChromaStore


def _llm() -> Ollama:
    model = Ollama(model=settings.ollama_chat_model, base_url=settings.ollama_base_url, request_timeout=120.0)
    return model


def weakest_topic(db: Session, student_id: int) -> str | None:
    rows = db.query(TopicMastery).filter(TopicMastery.student_id == student_id).order_by(TopicMastery.score).all()
    weak = [row for row in rows if row.score < 0.5]
    if not weak:
        weak = rows
    topic = weak[0].topic if weak else None
    result = topic
    return result


def generate_practice(
    db: Session, student_id: int, course_id: int, store: ChromaStore, course_meta: dict,
) -> PracticeAttempt:
    topic = weakest_topic(db, student_id) or "general"
    hits = retrieve(course_id, topic, store)
    context = build_context(db, student_id, f"practice on {topic}", hits, course_meta)
    prompt = (
        "Generate a short practice question. Return JSON only with plain text, no LaTeX backslashes. "
        '{"question": str, "rubric": str, "topic": str}. ' + context
    )
    raw = _llm().complete(prompt).text
    data = parse_llm_json(raw, ("question", "rubric", "topic"))
    question = str(data.get("question") or f"Explain {topic} in your own words.")
    rubric = str(data.get("rubric") or f"Student demonstrates understanding of {topic}.")
    practice_topic = str(data.get("topic") or topic)
    attempt = PracticeAttempt(
        student_id=student_id,
        course_id=course_id,
        topic=practice_topic,
        question=question,
        rubric=rubric,
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)
    result = attempt
    return result
