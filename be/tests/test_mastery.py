from adaptive_rag_tutor.tutoring.progress_updater import clip_score, next_mastery


def test_clip_bounds() -> None:
    assert clip_score(-0.2) == 0.0
    assert clip_score(1.5) == 1.0
    assert clip_score(0.4) == 0.4


def test_next_mastery_correct() -> None:
    score = next_mastery(0.5, correct=True, hints=0, misconception=False)
    assert score == 0.6


def test_next_mastery_hints_penalty() -> None:
    score = next_mastery(0.5, correct=True, hints=2, misconception=False)
    assert score == 0.5


def test_next_mastery_misconception_penalty() -> None:
    score = next_mastery(0.5, correct=False, hints=0, misconception=True)
    assert score == 0.42
