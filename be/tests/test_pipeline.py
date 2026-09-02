from unittest.mock import patch

from fastapi.testclient import TestClient

from adaptive_rag_tutor.db.seed import seed_demo
from adaptive_rag_tutor.db.session import SessionLocal, init_db
from adaptive_rag_tutor.main import app

client = TestClient(app)


def _ensure_seed() -> None:
    init_db()
    db = SessionLocal()
    try:
        seed_demo(db)
    finally:
        db.close()


def test_health() -> None:
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_students_and_progress() -> None:
    _ensure_seed()
    students = client.get("/students").json()
    assert len(students) >= 1
    student_id = students[0]["id"]
    progress = client.get(f"/students/{student_id}/progress").json()
    assert "mastery" in progress
    timeline = client.get(f"/students/{student_id}/progress/timeline?year=2026&month=9").json()
    assert timeline["year"] == 2026
    assert timeline["month"] == 9
    assert len(timeline["days"]) == 30


def test_progress_timeline_invalid_month() -> None:
    _ensure_seed()
    students = client.get("/students").json()
    student_id = students[0]["id"]
    res = client.get(f"/students/{student_id}/progress/timeline?year=2026&month=13")
    assert res.status_code == 400


def test_chat_mocked() -> None:
    _ensure_seed()
    integrity = '{"allowed": true, "assessment_context": "learning", "reason": ""}'
    action = (
        '{"action_type": "socratic_hint", "content": "What do you know about gradients?", "topic": "gradient descent"}'
    )
    with (
        patch("adaptive_rag_tutor.tutoring.integrity_guard._llm") as ig,
        patch("adaptive_rag_tutor.tutoring.tutor_llm._llm") as tg,
        patch("adaptive_rag_tutor.vector_store.chroma_store.ChromaStore.search", return_value=[]),
    ):
        ig.return_value.complete.return_value.text = integrity
        tg.return_value.complete.return_value.text = action
        students = client.get("/students").json()
        course_id = 1
        student_id = students[0]["id"]
        res = client.post(
            "/tutor/chat",
            json={"student_id": student_id, "course_id": course_id, "message": "Explain gradient descent"},
        )
    assert res.status_code == 200
    body = res.json()
    assert body["action_type"] == "socratic_hint"
    assert "conversation_id" in body
    conv_id = body["conversation_id"]
    convs = client.get(f"/students/{student_id}/conversations?course_id={course_id}").json()
    assert any(c["id"] == conv_id for c in convs)
    msgs = client.get(f"/conversations/{conv_id}/messages").json()
    assert len(msgs) >= 2


def test_practice_list_and_detail() -> None:
    _ensure_seed()
    students = client.get("/students").json()
    student_id = students[0]["id"]
    course_id = 1
    practice_json = (
        '{"question": "What is gradient descent?", "rubric": "Explains iterative optimization.", '
        '"topic": "gradient descent"}'
    )
    with (
        patch("adaptive_rag_tutor.tutoring.practice_generator._llm") as pg,
        patch("adaptive_rag_tutor.vector_store.chroma_store.ChromaStore.search", return_value=[]),
    ):
        pg.return_value.complete.return_value.text = practice_json
        created = client.get(f"/tutor/practice/{student_id}?course_id={course_id}")
    assert created.status_code == 200
    attempt_id = created.json()["attempt_id"]
    rows = client.get(f"/students/{student_id}/practices?course_id={course_id}").json()
    assert any(r["id"] == attempt_id for r in rows)
    detail = client.get(f"/practices/{attempt_id}").json()
    assert detail["question"] == "What is gradient descent?"
    assert detail["question_type"] == "short_answer"
    assert detail["submitted"] is False


def test_practice_generate_session() -> None:
    _ensure_seed()
    students = client.get("/students").json()
    student_id = students[0]["id"]
    course_id = 1
    batch_json = (
        '{"questions": ['
        '{"question_type": "multiple_choice", "question": "Pick the best definition.", '
        '"rubric": "Chooses gradient descent.", "topic": "gradient descent", '
        '"options": ["A", "B", "C", "D"], "correct_option": "A"},'
        '{"question_type": "conceptual", "question": "Why use gradients?", '
        '"rubric": "Explains optimization.", "topic": "gradient descent"}'
        "]}"
    )
    with (
        patch("adaptive_rag_tutor.tutoring.practice_generator._llm") as pg,
        patch("adaptive_rag_tutor.vector_store.chroma_store.ChromaStore.search", return_value=[]),
    ):
        pg.return_value.complete.return_value.text = batch_json
        created = client.post(
            f"/tutor/practice/{student_id}/generate?course_id={course_id}",
            json={"count": 2, "question_types": ["multiple_choice", "conceptual"]},
        )
    assert created.status_code == 200
    body = created.json()
    assert body["session_id"]
    attempts = body["attempts"]
    assert len(attempts) == 2
    assert attempts[0]["question_type"] == "multiple_choice"
    assert attempts[1]["question_type"] == "conceptual"
    session = client.get(f"/students/{student_id}/practice-sessions/{body['session_id']}?course_id={course_id}")
    assert session.status_code == 200
    assert len(session.json()["attempts"]) == 2


def _batch_json_for_range(types: list[str], start: int, count: int) -> str:
    rows = []
    for offset in range(count):
        index = start + offset
        qtype = types[index % len(types)]
        if qtype == "multiple_choice":
            rows.append(
                f'{{"question_type": "{qtype}", "question": "Q{index}", "rubric": "R{index}", '
                f'"topic": "topic", "options": ["A", "B", "C", "D"], "correct_option": "A"}}'
            )
        else:
            rows.append(
                f'{{"question_type": "{qtype}", "question": "Q{index}", "rubric": "R{index}", "topic": "topic"}}'
            )
    result = '{"questions": [' + ",".join(rows) + "]}"
    return result


def test_practice_generate_ten_mixed_types() -> None:
    _ensure_seed()
    students = client.get("/students").json()
    student_id = students[0]["id"]
    course_id = 1
    types = ["short_answer", "conceptual", "application", "multiple_choice"]
    chunks = [_batch_json_for_range(types, start, 2) for start in range(0, 10, 2)]
    call_index = {"n": 0}

    def complete(_prompt: str):
        class Response:
            text = chunks[call_index["n"]]
        call_index["n"] += 1
        return Response()

    with (
        patch("adaptive_rag_tutor.tutoring.practice_generator._llm") as pg,
        patch("adaptive_rag_tutor.vector_store.chroma_store.ChromaStore.search", return_value=[]),
    ):
        pg.return_value.complete.side_effect = complete
        created = client.post(
            f"/tutor/practice/{student_id}/generate?course_id={course_id}",
            json={"count": 10, "question_types": types},
        )
    assert created.status_code == 200
    body = created.json()
    assert body["session_id"]
    attempts = body["attempts"]
    assert len(attempts) == 10
    assert attempts[3]["question_type"] == "multiple_choice"
    assert attempts[4]["question_type"] == "short_answer"
