from llama_index.llms.ollama import Ollama

from adaptive_rag_tutor.config import settings
from adaptive_rag_tutor.tutoring.llm_json import parse_llm_json
from adaptive_rag_tutor.tutoring.schemas import EvaluationResult


def _llm() -> Ollama:
    model = Ollama(model=settings.ollama_chat_model, base_url=settings.ollama_base_url, request_timeout=120.0)
    return model


def evaluate_response(question: str, student_answer: str, rubric: str, topic: str) -> EvaluationResult:
    prompt = (
        "Evaluate the student answer. Return JSON: "
        '{"correct": bool, "misconception": str, "feedback": str, "topic": str}. '
        f"Topic: {topic}\nQuestion: {question}\nRubric: {rubric}\nAnswer: {student_answer}"
    )
    raw = _llm().complete(prompt).text
    data = parse_llm_json(raw, ("correct", "misconception", "feedback", "topic"))
    correct = bool(data.get("correct", False))
    misconception = str(data.get("misconception", ""))
    feedback = str(data.get("feedback", "Review the concept and try again."))
    eval_topic = str(data.get("topic", topic))
    result = EvaluationResult(correct=correct, misconception=misconception, feedback=feedback, topic=eval_topic)
    return result
