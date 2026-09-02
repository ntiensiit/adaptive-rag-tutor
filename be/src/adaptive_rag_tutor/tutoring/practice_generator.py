import json
import re
import uuid

from llama_index.llms.ollama import Ollama
from sqlalchemy.orm import Session

from adaptive_rag_tutor.config import settings
from adaptive_rag_tutor.db.models import PracticeAttempt, TopicMastery
from adaptive_rag_tutor.tutoring.context_builder import build_context
from adaptive_rag_tutor.tutoring.llm_json import parse_llm_json
from adaptive_rag_tutor.tutoring.retriever import retrieve
from adaptive_rag_tutor.tutoring.schemas import QuestionType
from adaptive_rag_tutor.vector_store.chroma_store import ChromaStore

_CHUNK_SIZE = 2

_TYPE_HINTS: dict[str, str] = {
    QuestionType.SHORT_ANSWER: "open-ended short answer question requiring a brief written explanation",
    QuestionType.CONCEPTUAL: "conceptual question testing understanding of underlying ideas",
    QuestionType.APPLICATION: "application question asking the student to apply the concept to a realistic scenario",
    QuestionType.MULTIPLE_CHOICE: "multiple choice question with exactly 4 options labeled A through D",
}


def _llm() -> Ollama:
    model = Ollama(model=settings.ollama_chat_model, base_url=settings.ollama_base_url, request_timeout=300.0)
    return model


def weakest_topic(db: Session, student_id: int) -> str | None:
    rows = db.query(TopicMastery).filter(TopicMastery.student_id == student_id).order_by(TopicMastery.score).all()
    weak = [row for row in rows if row.score < 0.5]
    if not weak:
        weak = rows
    topic = weak[0].topic if weak else None
    result = topic
    return result


def _type_plan(types: list[str], count: int) -> list[str]:
    plan = [types[index % len(types)] for index in range(count)]
    return plan


def _build_prompt(question_type: str, context: str) -> str:
    hint = _TYPE_HINTS.get(question_type, _TYPE_HINTS[QuestionType.SHORT_ANSWER])
    if question_type == QuestionType.MULTIPLE_CHOICE:
        schema = '{"question": str, "rubric": str, "topic": str, "options": [str], "correct_option": str}'
    else:
        schema = '{"question": str, "rubric": str, "topic": str}'
    prompt = f"Generate a {hint}. Return JSON only. Use markdown for tables or lists; use $...$ for inline math. {schema}. " + context
    return prompt


def _build_batch_prompt(plan: list[str], context: str) -> str:
    slots = ", ".join(f"{index + 1}:{qtype}" for index, qtype in enumerate(plan))
    schema = (
        '{"questions": [{"question_type": str, "question": str, "rubric": str, "topic": str, '
        '"options": [str], "correct_option": str}]}'
    )
    prompt = (
        f"Generate exactly {len(plan)} distinct practice questions. "
        f"Use these question_type values in order: {slots}. "
        f"For multiple_choice include options (4 strings) and correct_option. "
        f"Return JSON only. Use markdown for tables or lists; use $...$ for inline math. {schema}. "
        + context
    )
    return prompt


def _parse_batch(raw: str) -> list[dict]:
    match = re.search(r"\{[\s\S]*\}", raw)
    if not match:
        return []
    try:
        data = json.loads(match.group())
    except json.JSONDecodeError:
        data = parse_llm_json(raw)
    rows = data.get("questions") if isinstance(data, dict) else None
    if not isinstance(rows, list):
        return []
    result = [row for row in rows if isinstance(row, dict)]
    return result


def _format_question(data: dict, question_type: str, topic: str) -> tuple[str, str, str]:
    question = str(data.get("question") or f"Explain {topic} in your own words.")
    rubric = str(data.get("rubric") or f"Student demonstrates understanding of {topic}.")
    practice_topic = str(data.get("topic") or topic)
    if question_type == QuestionType.MULTIPLE_CHOICE:
        options = data.get("options") or []
        labels = "ABCD"
        lines = [f"{labels[i]}. {opt}" for i, opt in enumerate(options[:4])]
        if lines:
            question = question.strip() + "\n\n" + "\n".join(lines)
        correct = str(data.get("correct_option") or "").strip()
        if correct:
            rubric = f"Correct answer: {correct}. {rubric}"
    result = (question, rubric, practice_topic)
    return result


def _attempt_from_data(
    db: Session, student_id: int, course_id: int, data: dict, question_type: str, fallback_topic: str, session_id: str,
) -> PracticeAttempt:
    question, rubric, practice_topic = _format_question(data, question_type, fallback_topic)
    attempt = PracticeAttempt(
        student_id=student_id,
        course_id=course_id,
        topic=practice_topic,
        question_type=question_type,
        question=question,
        rubric=rubric,
        session_id=session_id,
    )
    db.add(attempt)
    result = attempt
    return result


def _generate_one(
    db: Session, student_id: int, course_id: int, store: ChromaStore, course_meta: dict, question_type: str, session_id: str,
) -> PracticeAttempt:
    topic = weakest_topic(db, student_id) or "general"
    hits = retrieve(course_id, topic, store)
    context = build_context(db, student_id, f"practice on {topic}", hits, course_meta)
    prompt = _build_prompt(question_type, context)
    raw = _llm().complete(prompt).text
    keys = ("question", "rubric", "topic")
    if question_type == QuestionType.MULTIPLE_CHOICE:
        keys = ("question", "rubric", "topic", "options", "correct_option")
    data = parse_llm_json(raw, keys)
    result = _attempt_from_data(db, student_id, course_id, data, question_type, topic, session_id)
    return result


def _generate_batch(
    db: Session, student_id: int, course_id: int, store: ChromaStore, course_meta: dict, plan: list[str], session_id: str,
) -> list[PracticeAttempt]:
    topic = weakest_topic(db, student_id) or "general"
    hits = retrieve(course_id, topic, store)
    context = build_context(db, student_id, f"practice on {topic}", hits, course_meta)
    prompt = _build_batch_prompt(plan, context)
    raw = _llm().complete(prompt).text
    rows = _parse_batch(raw)
    attempts: list[PracticeAttempt] = []
    for index, item in enumerate(rows[: len(plan)]):
        qtype = str(item.get("question_type") or plan[index])
        if qtype not in _TYPE_HINTS:
            qtype = plan[index]
        attempt = _attempt_from_data(db, student_id, course_id, item, qtype, topic, session_id)
        attempts.append(attempt)
    result = attempts
    return result


def _generate_chunk(
    db: Session, student_id: int, course_id: int, store: ChromaStore, course_meta: dict, plan: list[str], session_id: str,
) -> list[PracticeAttempt]:
    chunk: list[PracticeAttempt] = []
    try:
        chunk = _generate_batch(db, student_id, course_id, store, course_meta, plan, session_id)
    except Exception:
        chunk = []
    while len(chunk) < len(plan):
        index = len(chunk)
        try:
            one = _generate_one(db, student_id, course_id, store, course_meta, plan[index], session_id)
            chunk.append(one)
        except Exception:
            break
    result = chunk
    return result


def generate_practices(
    db: Session,
    student_id: int,
    course_id: int,
    store: ChromaStore,
    course_meta: dict,
    count: int = 1,
    question_types: list[str] | None = None,
    session_id: str | None = None,
) -> list[PracticeAttempt]:
    types = question_types or [QuestionType.SHORT_ANSWER]
    total = max(1, min(10, count))
    plan = _type_plan(types, total)
    sid = session_id or str(uuid.uuid4())
    attempts: list[PracticeAttempt] = []
    for start in range(0, total, _CHUNK_SIZE):
        chunk_plan = plan[start : start + _CHUNK_SIZE]
        chunk = _generate_chunk(db, student_id, course_id, store, course_meta, chunk_plan, sid)
        attempts.extend(chunk)
        db.commit()
        for row in chunk:
            db.refresh(row)
    if not attempts:
        raise ValueError("No exercises were generated")
    result = attempts
    return result


def generate_practice(
    db: Session, student_id: int, course_id: int, store: ChromaStore, course_meta: dict,
) -> PracticeAttempt:
    attempts = generate_practices(db, student_id, course_id, store, course_meta)
    result = attempts[0]
    return result
