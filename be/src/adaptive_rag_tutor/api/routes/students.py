from datetime import date, datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from adaptive_rag_tutor.api.deps import DbDep
from adaptive_rag_tutor.db.models import Conversation, Interaction, MasterySnapshot, Misconception, PracticeAttempt, Student, TopicMastery
from adaptive_rag_tutor.tutoring.progress_updater import all_mastery
from adaptive_rag_tutor.tutoring.schemas import ConversationOut, DayProgressOut, PracticeSummaryOut, ProgressTimelineOut

router = APIRouter()


class StudentCreate(BaseModel):
    name: str


class StudentOut(BaseModel):
    id: int
    name: str


class ProgressOut(BaseModel):
    student_id: int
    mastery: dict[str, float]
    misconceptions: list[dict]
    recent_interactions: list[dict]


@router.post("", response_model=StudentOut)
def create_student(body: StudentCreate, db: Session = DbDep) -> StudentOut:
    student = Student(name=body.name)
    db.add(student)
    db.commit()
    db.refresh(student)
    result = StudentOut(id=student.id, name=student.name)
    return result


@router.get("", response_model=list[StudentOut])
def list_students(db: Session = DbDep) -> list[StudentOut]:
    rows = db.query(Student).all()
    result = [StudentOut(id=row.id, name=row.name) for row in rows]
    return result


@router.get("/{student_id}/conversations", response_model=list[ConversationOut])
def list_conversations(student_id: int, course_id: int = 1, db: Session = DbDep) -> list[ConversationOut]:
    student = db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    rows = (
        db.query(Conversation)
        .filter(Conversation.student_id == student_id, Conversation.course_id == course_id)
        .order_by(Conversation.updated_at.desc())
        .all()
    )
    result = []
    for row in rows:
        count = db.query(func.count(Interaction.id)).filter(Interaction.conversation_id == row.id).scalar() or 0
        result.append(
            ConversationOut(
                id=row.id,
                course_id=row.course_id,
                title=row.title or "Untitled",
                created_at=row.created_at,
                updated_at=row.updated_at,
                message_count=count,
            ),
        )
    return result


def _practice_title(question: str) -> str:
    text = question.strip().replace("\n", " ")
    title = text[:80] + ("..." if len(text) > 80 else "")
    return title


@router.get("/{student_id}/practices", response_model=list[PracticeSummaryOut])
def list_practices(student_id: int, course_id: int = 1, db: Session = DbDep) -> list[PracticeSummaryOut]:
    student = db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    rows = (
        db.query(PracticeAttempt)
        .filter(PracticeAttempt.student_id == student_id, PracticeAttempt.course_id == course_id)
        .order_by(PracticeAttempt.id.desc())
        .all()
    )
    result = [
        PracticeSummaryOut(
            id=row.id,
            course_id=row.course_id,
            topic=row.topic,
            title=_practice_title(row.question),
            created_at=row.created_at,
            submitted=row.student_answer is not None,
            correct=row.correct,
        )
        for row in rows
    ]
    return result


def _month_range(year: int, month: int) -> tuple[datetime, datetime]:
    start = datetime(year, month, 1)
    end = datetime(year + 1, 1, 1) if month == 12 else datetime(year, month + 1, 1)
    result = (start, end)
    return result


@router.get("/{student_id}/progress/timeline", response_model=ProgressTimelineOut)
def progress_timeline(student_id: int, year: int, month: int, topic: str | None = None, db: Session = DbDep) -> ProgressTimelineOut:
    student = db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    if month < 1 or month > 12:
        raise HTTPException(status_code=400, detail="Invalid month")
    start, end = _month_range(year, month)
    days_in_month = (end - start).days
    day_map: dict[str, DayProgressOut] = {}
    for day in range(1, days_in_month + 1):
        key = date(year, month, day).isoformat()
        day_map[key] = DayProgressOut(date=key)
    topic_mastery: float | None = None
    if topic:
        row = db.query(TopicMastery).filter(TopicMastery.student_id == student_id, TopicMastery.topic == topic).first()
        topic_mastery = row.score if row else None
    else:
        snapshots = (
            db.query(MasterySnapshot)
            .filter(MasterySnapshot.student_id == student_id, MasterySnapshot.recorded_at >= start, MasterySnapshot.recorded_at < end)
            .order_by(MasterySnapshot.recorded_at.asc())
            .all()
        )
        for row in snapshots:
            key = row.recorded_at.date().isoformat()
            if key in day_map:
                day_map[key].avg_mastery = row.avg_score
    chat_query = db.query(Interaction).filter(Interaction.student_id == student_id, Interaction.created_at >= start, Interaction.created_at < end)
    if topic:
        chat_query = chat_query.filter(Interaction.topic == topic)
    for row in chat_query.all():
        key = row.created_at.date().isoformat()
        if key in day_map:
            day_map[key].chats += 1
    practice_query = db.query(PracticeAttempt).filter(PracticeAttempt.student_id == student_id, PracticeAttempt.created_at >= start, PracticeAttempt.created_at < end)
    if topic:
        practice_query = practice_query.filter(PracticeAttempt.topic == topic)
    for row in practice_query.all():
        key = row.created_at.date().isoformat()
        if key not in day_map:
            continue
        if row.student_answer is not None:
            day_map[key].exercises += 1
            if row.correct:
                day_map[key].exercises_correct += 1
    if not topic:
        last_mastery: float | None = None
        for key in sorted(day_map.keys()):
            day = day_map[key]
            if day.avg_mastery is not None:
                last_mastery = day.avg_mastery
            elif last_mastery is not None:
                day.avg_mastery = last_mastery
    days = [day_map[key] for key in sorted(day_map.keys())]
    result = ProgressTimelineOut(student_id=student_id, year=year, month=month, topic=topic, topic_mastery=topic_mastery, days=days)
    return result


@router.get("/{student_id}/progress", response_model=ProgressOut)
def student_progress(student_id: int, db: Session = DbDep) -> ProgressOut:
    student = db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    mastery = all_mastery(db, student_id)
    misc_rows = db.query(Misconception).filter(Misconception.student_id == student_id).all()
    misconceptions = [{"topic": row.topic, "pattern": row.pattern, "count": row.count} for row in misc_rows]
    interactions = (
        db.query(Interaction)
        .filter(Interaction.student_id == student_id)
        .order_by(Interaction.id.desc())
        .limit(5)
        .all()
    )
    recent = [
        {"query": row.query, "action_type": row.action_type, "topic": row.topic, "integrity_flag": row.integrity_flag}
        for row in interactions
    ]
    result = ProgressOut(
        student_id=student_id, mastery=mastery, misconceptions=misconceptions, recent_interactions=recent,
    )
    return result
