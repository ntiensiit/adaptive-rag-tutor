from fastapi import APIRouter, HTTPException
from sqlalchemy.orm import Session
import uuid

from adaptive_rag_tutor.api.deps import DbDep
from adaptive_rag_tutor.db.models import Course, Interaction, PracticeAttempt
from adaptive_rag_tutor.tutoring.evaluator import evaluate_response
from adaptive_rag_tutor.tutoring.pipeline import run_chat
from adaptive_rag_tutor.tutoring.practice_generator import generate_practice, generate_practices
from adaptive_rag_tutor.tutoring.progress_updater import all_mastery, update_mastery
from adaptive_rag_tutor.tutoring.schemas import (
    ChatRequest,
    ChatResponse,
    PracticeGenerateRequest,
    PracticeGenerateResponse,
    PracticeResponse,
    PracticeSubmitRequest,
    PracticeSubmitResponse,
    QuestionType,
    RespondRequest,
    RespondResponse,
)
from adaptive_rag_tutor.vector_store.chroma_store import ChromaStore

router = APIRouter()
store = ChromaStore()


@router.post("/chat", response_model=ChatResponse)
def chat(body: ChatRequest, db: Session = DbDep) -> ChatResponse:
    try:
        result = run_chat(db, body.student_id, body.course_id, body.message, store, body.conversation_id)
    except ValueError as err:
        raise HTTPException(status_code=404, detail=str(err)) from err
    return result


@router.post("/respond", response_model=RespondResponse)
def respond(body: RespondRequest, db: Session = DbDep) -> RespondResponse:
    row = db.get(Interaction, body.interaction_id)
    if not row:
        raise HTTPException(status_code=404, detail="Interaction not found")
    evaluation = evaluate_response(row.query, body.student_response, row.response, row.topic or "general")
    row.student_response = body.student_response
    row.evaluation_feedback = evaluation.feedback
    update_mastery(
        db,
        row.student_id,
        evaluation.topic or row.topic or "general",
        evaluation.correct,
        row.hint_count,
        evaluation.misconception,
    )
    db.commit()
    mastery = all_mastery(db, row.student_id)
    result = RespondResponse(
        correct=evaluation.correct,
        feedback=evaluation.feedback,
        misconception=evaluation.misconception,
        updated_mastery=mastery,
    )
    return result


def _to_practice_response(attempt: PracticeAttempt) -> PracticeResponse:
    result = PracticeResponse(
        attempt_id=attempt.id,
        topic=attempt.topic,
        question=attempt.question,
        question_type=attempt.question_type or QuestionType.SHORT_ANSWER,
    )
    return result


@router.get("/practice/{student_id}", response_model=PracticeResponse)
def practice(student_id: int, course_id: int, db: Session = DbDep) -> PracticeResponse:
    course = db.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    attempt = generate_practice(db, student_id, course_id, store, course.metadata_json)
    result = _to_practice_response(attempt)
    return result


@router.post("/practice/{student_id}/generate", response_model=PracticeGenerateResponse)
def generate_practice_session(
    student_id: int, course_id: int, body: PracticeGenerateRequest, db: Session = DbDep,
) -> PracticeGenerateResponse:
    course = db.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    types = [t.value for t in body.question_types] or [QuestionType.SHORT_ANSWER]
    session_id = str(uuid.uuid4())
    attempts = generate_practices(
        db, student_id, course_id, store, course.metadata_json, body.count, types, session_id,
    )
    rows = [_to_practice_response(row) for row in attempts]
    result = PracticeGenerateResponse(session_id=session_id, attempts=rows)
    return result


@router.post("/practice/{attempt_id}/submit", response_model=PracticeSubmitResponse)
def submit_practice(attempt_id: int, body: PracticeSubmitRequest, db: Session = DbDep) -> PracticeSubmitResponse:
    attempt = db.get(PracticeAttempt, attempt_id)
    if not attempt:
        raise HTTPException(status_code=404, detail="Practice attempt not found")
    evaluation = evaluate_response(attempt.question, body.student_answer, attempt.rubric, attempt.topic)
    attempt.student_answer = body.student_answer
    attempt.correct = evaluation.correct
    attempt.feedback = evaluation.feedback
    attempt.hints_used = body.hints_used
    db.commit()
    update_mastery(db, attempt.student_id, attempt.topic, evaluation.correct, body.hints_used, evaluation.misconception)
    mastery = all_mastery(db, attempt.student_id)
    result = PracticeSubmitResponse(correct=evaluation.correct, feedback=evaluation.feedback, updated_mastery=mastery)
    return result
