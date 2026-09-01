from sqlalchemy.orm import Session

from adaptive_rag_tutor.config import settings
from adaptive_rag_tutor.db.models import Misconception, MasterySnapshot, TopicMastery


def clip_score(value: float) -> float:
    clipped = max(0.0, min(1.0, value))
    result = clipped
    return result


def next_mastery(current: float, correct: bool, hints: int, misconception: bool) -> float:
    c = 1.0 if correct else 0.0
    h = float(hints)
    e = 1.0 if misconception else 0.0
    delta = settings.mastery_alpha * c - settings.mastery_beta * h - settings.mastery_gamma * e
    updated = clip_score(current + delta)
    result = updated
    return result


def update_mastery(db: Session, student_id: int, topic: str, correct: bool, hints: int, misconception: str) -> float:
    row = db.query(TopicMastery).filter(TopicMastery.student_id == student_id, TopicMastery.topic == topic).first()
    current = row.score if row else 0.5
    has_misconception = bool(misconception)
    score = next_mastery(current, correct, hints, has_misconception)
    if row:
        row.score = score
    else:
        db.add(TopicMastery(student_id=student_id, topic=topic, score=score))
    if has_misconception:
        misc = (
            db.query(Misconception)
            .filter(
                Misconception.student_id == student_id,
                Misconception.topic == topic,
                Misconception.pattern == misconception,
            )
            .first()
        )
        if misc:
            misc.count += 1
        else:
            db.add(Misconception(student_id=student_id, topic=topic, pattern=misconception, count=1))
    db.commit()
    _log_snapshot(db, student_id)
    result = score
    return result


def _log_snapshot(db: Session, student_id: int) -> None:
    rows = db.query(TopicMastery).filter(TopicMastery.student_id == student_id).all()
    if not rows:
        return
    avg = sum(row.score for row in rows) / len(rows)
    db.add(MasterySnapshot(student_id=student_id, avg_score=avg))
    db.commit()


def all_mastery(db: Session, student_id: int) -> dict[str, float]:
    rows = db.query(TopicMastery).filter(TopicMastery.student_id == student_id).all()
    mapping = {row.topic: row.score for row in rows}
    result = mapping
    return result
