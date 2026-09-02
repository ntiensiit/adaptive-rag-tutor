import json
import re
import uuid
from typing import NamedTuple

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


class _GenCtx(NamedTuple):
    db: Session
    student_id: int
    course_id: int
    store: ChromaStore
    meta: dict
    session_id: str


def _llm() -> Ollama:
    model = Ollama(model=settings.ollama_chat_model, base_url=settings.ollama_base_url, request_timeout=300.0)
    return model


def weakest_topic(db: Session, student_id: int) -> str | None:
    rows = db.query(TopicMastery).filter(TopicMastery.student_id == student_id).order_by(TopicMastery.score).all()
    weak = [row for row in rows if row.score < 0.5] or rows
    topic = weak[0].topic if weak else None
    result = topic
    return result


def _type_plan(types: list[str], count: int) -> list[str]:
    plan = [types[index % len(types)] for index in range(count)]
    result = plan
    return result


def _build_prompt(question_type: str, context: str) -> str:
    hint = _TYPE_HINTS.get(question_type, _TYPE_HINTS[QuestionType.SHORT_ANSWER])
    if question_type == QuestionType.MULTIPLE_CHOICE:
        schema = '{"question": str, "rubric": str, "topic": str, "options": [str], "correct_option": str}'
    else:
        schema = '{"question": str, "rubric": str, "topic": str}'
    prompt = f"Generate a {hint}. Return JSON only. Use markdown for tables or lists; use $...$ for inline math. {schema}. " + context
    result = prompt
    return result


def _build_batch_prompt(plan: list[str], context: str) -> str:
    slots = ", ".join(f"{index + 1}:{qtype}" for index, qtype in enumerate(plan))
    schema = '{"questions": [{"question_type": str, "question": str, "rubric": str, "topic": str, "options": [str], "correct_option": str}]}'
    prompt = f"Generate exactly {len(plan)} distinct practice questions. Use these question_type values in order: {slots}. For multiple_choice include options (4 strings) and correct_option. Return JSON only. Use markdown for tables or lists; use $...$ for inline math. {schema}. " + context
    result = prompt
    return result


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


def _mc_parts(data: dict) -> tuple[str, str]:
    options = data.get("options") or []
    lines = [f"{'ABCD'[index]}. {opt}" for index, opt in enumerate(options[:4])]
    extra_q = "\n\n" + "\n".join(lines) if lines else ""
    correct = str(data.get("correct_option") or "").strip()
    extra_r = f"Correct answer: {correct}. " if correct else ""
    result = (extra_q, extra_r)
    return result


def _format_question(data: dict, question_type: str, topic: str) -> tuple[str, str, str]:
    question = str(data.get("question") or f"Explain {topic} in your own words.")
    rubric = str(data.get("rubric") or f"Student demonstrates understanding of {topic}.")
    practice_topic = str(data.get("topic") or topic)
    if question_type == QuestionType.MULTIPLE_CHOICE:
        extra_q, extra_r = _mc_parts(data)
        question = question.strip() + extra_q
        rubric = extra_r + rubric
    result = (question, rubric, practice_topic)
    return result


def _attempt_from_data(ctx: _GenCtx, data: dict, qtype: str, topic: str) -> PracticeAttempt:
    question, rubric, practice_topic = _format_question(data, qtype, topic)
    attempt = PracticeAttempt(
        student_id=ctx.student_id, course_id=ctx.course_id, topic=practice_topic,
        question_type=qtype, question=question, rubric=rubric, session_id=ctx.session_id,
    )
    ctx.db.add(attempt)
    result = attempt
    return result


def _context_for(ctx: _GenCtx, topic: str) -> str:
    hits = retrieve(ctx.course_id, topic, ctx.store)
    text = build_context(ctx.db, ctx.student_id, f"practice on {topic}", hits, ctx.meta)
    result = text
    return result


def _json_keys(qtype: str) -> tuple[str, ...]:
    keys: tuple[str, ...] = ("question", "rubric", "topic")
    if qtype == QuestionType.MULTIPLE_CHOICE:
        keys = ("question", "rubric", "topic", "options", "correct_option")
    result = keys
    return result


def _generate_one(ctx: _GenCtx, qtype: str) -> PracticeAttempt:
    topic = weakest_topic(ctx.db, ctx.student_id) or "general"
    raw = _llm().complete(_build_prompt(qtype, _context_for(ctx, topic))).text
    data = parse_llm_json(raw, _json_keys(qtype))
    attempt = _attempt_from_data(ctx, data, qtype, topic)
    result = attempt
    return result


def _row_qtype(item: dict, plan: list[str], index: int) -> str:
    qtype = str(item.get("question_type") or plan[index])
    if qtype not in _TYPE_HINTS:
        qtype = plan[index]
    result = qtype
    return result


def _generate_batch(ctx: _GenCtx, plan: list[str]) -> list[PracticeAttempt]:
    topic = weakest_topic(ctx.db, ctx.student_id) or "general"
    raw = _llm().complete(_build_batch_prompt(plan, _context_for(ctx, topic))).text
    rows = _parse_batch(raw)[: len(plan)]
    attempts = [_attempt_from_data(ctx, item, _row_qtype(item, plan, index), topic) for index, item in enumerate(rows)]
    result = attempts
    return result


def _generate_chunk(ctx: _GenCtx, plan: list[str]) -> list[PracticeAttempt]:
    try:
        chunk = _generate_batch(ctx, plan)
    except Exception:
        chunk = []
    # batch LLM calls may time out; fill remaining slots one-by-one
    while len(chunk) < len(plan):
        index = len(chunk)
        try:
            chunk.append(_generate_one(ctx, plan[index]))
        except Exception:
            break
    result = chunk
    return result


def generate_practices(
    db: Session, student_id: int, course_id: int, store: ChromaStore, course_meta: dict,
    count: int = 1, question_types: list[str] | None = None, session_id: str | None = None,
) -> list[PracticeAttempt]:
    types = question_types or [QuestionType.SHORT_ANSWER]
    total = max(1, min(10, count))
    plan = _type_plan(types, total)
    ctx = _GenCtx(db, student_id, course_id, store, course_meta, session_id or str(uuid.uuid4()))
    attempts: list[PracticeAttempt] = []
    for start in range(0, total, _CHUNK_SIZE):
        chunk = _generate_chunk(ctx, plan[start : start + _CHUNK_SIZE])
        attempts.extend(chunk)
        db.commit()
        for row in chunk:
            db.refresh(row)
    if not attempts:
        raise ValueError("No exercises were generated")
    result = attempts
    return result


def generate_practice(db: Session, student_id: int, course_id: int, store: ChromaStore, course_meta: dict) -> PracticeAttempt:
    attempts = generate_practices(db, student_id, course_id, store, course_meta)
    result = attempts[0]
    return result
