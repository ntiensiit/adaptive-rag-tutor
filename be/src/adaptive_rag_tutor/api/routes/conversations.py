from fastapi import APIRouter, HTTPException
from sqlalchemy.orm import Session

from adaptive_rag_tutor.api.deps import DbDep
from adaptive_rag_tutor.db.models import Conversation, Interaction
from adaptive_rag_tutor.tutoring.schemas import Citation, MessageOut

router = APIRouter()


def _interaction_messages(row: Interaction) -> list[MessageOut]:
    citations = [Citation(**c) for c in row.citations_json or []]
    student = MessageOut(id=row.id * 1000, role="student", content=row.query, created_at=row.created_at)
    tutor = MessageOut(
        id=row.id * 1000 + 1,
        role="tutor",
        content=row.response,
        action_type=row.action_type,
        citations=citations,
        created_at=row.created_at,
    )
    msgs = [student, tutor]
    if row.student_response:
        follow = MessageOut(
            id=row.id * 1000 + 2, role="student", content=row.student_response, created_at=row.created_at,
        )
        msgs.append(follow)
    if row.evaluation_feedback:
        eval_msg = MessageOut(
            id=row.id * 1000 + 3, role="tutor", content=row.evaluation_feedback, created_at=row.created_at,
        )
        msgs.append(eval_msg)
    result = msgs
    return result


@router.get("/{conversation_id}/messages", response_model=list[MessageOut])
def conversation_messages(conversation_id: int, db: Session = DbDep) -> list[MessageOut]:
    conv = db.get(Conversation, conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    rows = (
        db.query(Interaction)
        .filter(Interaction.conversation_id == conversation_id)
        .order_by(Interaction.id.asc())
        .all()
    )
    messages: list[MessageOut] = []
    for row in rows:
        messages.extend(_interaction_messages(row))
    result = messages
    return result
