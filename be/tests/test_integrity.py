from unittest.mock import patch

from adaptive_rag_tutor.tutoring.integrity_guard import check_integrity


def test_hi_allowed_without_llm() -> None:
    with patch("adaptive_rag_tutor.tutoring.integrity_guard._llm") as mock_llm:
        result = check_integrity("hi")
    assert result.allowed is True
    mock_llm.assert_not_called()


def test_integrity_refusal_for_exam() -> None:
    fake = '{"allowed": false, "assessment_context": "exam", "reason": "exam question"}'
    with patch("adaptive_rag_tutor.tutoring.integrity_guard._llm") as mock_llm:
        mock_llm.return_value.complete.return_value.text = fake
        result = check_integrity("Answer question 4 on the final exam")
    assert result.allowed is False
    assert result.assessment_context == "exam"
