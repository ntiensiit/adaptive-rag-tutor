from adaptive_rag_tutor.tutoring.llm_json import parse_llm_json


def test_parse_latex_json() -> None:
    raw = (
        '{"question": "What is \\\\theta in gradient descent?", '
        '"rubric": "Defines parameter", "topic": "gradient descent"}'
    )
    data = parse_llm_json(raw, ("question", "rubric", "topic"))
    assert "gradient descent" in data.get("question", "")


def test_parse_invalid_json_fallback() -> None:
    raw = 'Here is JSON: {"question": "Explain loss functions", "topic": "loss functions"}'
    data = parse_llm_json(raw, ("question", "topic"))
    assert data.get("question") == "Explain loss functions"
