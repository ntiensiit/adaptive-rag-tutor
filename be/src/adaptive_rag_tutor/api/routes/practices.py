from fastapi import APIRouter, HTTPException
from sqlalchemy.orm import Session

from adaptive_rag_tutor.api.deps import DbDep
from adaptive_rag_tutor.db.models import PracticeAttempt
from adaptive_rag_tutor.tutoring.schemas import PracticeDetailOut

router = APIRouter()


@router.get("/{attempt_id}", response_model=PracticeDetailOut)
def practice_detail(attempt_id: int, db: Session = DbDep) -> PracticeDetailOut:
    row = db.get(PracticeAttempt, attempt_id)
    if not row:
        raise HTTPException(status_code=404, detail="Practice attempt not found")
    submitted = row.student_answer is not None
    result = PracticeDetailOut(
        attempt_id=row.id,
        topic=row.topic,
        question=row.question,
        question_type=row.question_type or "short_answer",
        student_answer=row.student_answer,
        feedback=row.feedback,
        correct=row.correct,
        submitted=submitted,
    )
    return result
