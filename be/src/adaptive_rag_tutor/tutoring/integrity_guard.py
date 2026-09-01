import re

from llama_index.llms.ollama import Ollama

from adaptive_rag_tutor.config import settings
from adaptive_rag_tutor.tutoring.llm_json import parse_llm_json
from adaptive_rag_tutor.tutoring.schemas import IntegrityResult

_BENIGN = re.compile(r"^(hi|hello|hey|thanks|thank you|ok|okay|yes|no|help)\.?!?$", re.IGNORECASE)
_GRADED = re.compile(
    r"\b(exam|final|midterm|quiz|homework|assignment|graded|coursework|test paper|take-home)\b",
    re.IGNORECASE,
)


def _llm() -> Ollama:
    model = Ollama(model=settings.ollama_chat_model, base_url=settings.ollama_base_url, request_timeout=120.0)
    return model


def _benign_result() -> IntegrityResult:
    result = IntegrityResult(allowed=True, assessment_context="learning", reason="")
    return result


def _is_benign(query: str) -> bool:
    text = query.strip()
    if len(text) < 12 and not _GRADED.search(text):
        result = True
        return result
    if _BENIGN.match(text):
        result = True
        return result
    result = False
    return result


def _llm_check(query: str) -> IntegrityResult:
    prompt = (
        "Classify this student tutoring query. "
        'Return JSON only: {"allowed": bool, "assessment_context": "learning|practice|graded|exam", "reason": str}. '
        "Set allowed=false ONLY when the student asks for direct answers to graded assignments or live exams. "
        "Allow greetings, study questions, concept help, and practice. Query: " + query
    )
    raw = _llm().complete(prompt).text
    data = parse_llm_json(raw, ("allowed", "assessment_context", "reason"))
    allowed = bool(data.get("allowed", True))
    context = str(data.get("assessment_context", "learning"))
    reason = str(data.get("reason", ""))
    if context in {"graded", "exam"}:
        allowed = False
    result = IntegrityResult(allowed=allowed, assessment_context=context, reason=reason)
    return result


def check_integrity(query: str) -> IntegrityResult:
    if _is_benign(query):
        result = _benign_result()
        return result
    if not _GRADED.search(query):
        result = _benign_result()
        return result
    result = _llm_check(query)
    return result
