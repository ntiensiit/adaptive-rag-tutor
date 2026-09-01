from llama_index.llms.ollama import Ollama

from adaptive_rag_tutor.config import settings
from adaptive_rag_tutor.tutoring.llm_json import parse_llm_json
from adaptive_rag_tutor.tutoring.retriever import hits_to_citations
from adaptive_rag_tutor.tutoring.schemas import ActionType, TeachingAction
from adaptive_rag_tutor.vector_store.chroma_store import SearchHit


def _llm() -> Ollama:
    model = Ollama(model=settings.ollama_chat_model, base_url=settings.ollama_base_url, request_timeout=120.0)
    return model


def _parse_action(text: str) -> dict:
    result = parse_llm_json(text, ("action_type", "content", "topic"))
    return result


def _action_prompt(context: str, refusal: bool) -> str:
    actions = ", ".join(a.value for a in ActionType)
    mode = "refusal" if refusal else "one teaching action"
    prompt = (
        f"Choose {mode} from: {actions}. Return JSON with action_type, content, topic. "
        "Use Socratic tutoring grounded in course passages.\n" + context
    )
    result = prompt
    return result


def generate_action(context: str, hits: list[SearchHit], refusal: bool = False) -> TeachingAction:
    raw = _llm().complete(_action_prompt(context, refusal)).text
    data = _parse_action(raw)
    action_type = ActionType(data.get("action_type", ActionType.REFUSAL if refusal else ActionType.SOCRATIC))
    content = str(data.get("content", "Let's work through this step by step."))
    topic = str(data.get("topic", hits[0].topic if hits else "general"))
    citations = hits_to_citations(hits)
    action = TeachingAction(action_type=action_type, content=content, topic=topic, citations=citations)
    result = action
    return result
