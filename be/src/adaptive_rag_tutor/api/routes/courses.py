import tempfile
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from adaptive_rag_tutor.api.deps import DbDep
from adaptive_rag_tutor.db.models import Course, TopicMastery
from adaptive_rag_tutor.ingestion.chunker import chunk_document
from adaptive_rag_tutor.ingestion.loader import load_file
from adaptive_rag_tutor.vector_store.chroma_store import ChromaStore

router = APIRouter()
store = ChromaStore()


class CourseCreate(BaseModel):
    name: str
    metadata_json: dict = {}


class CourseOut(BaseModel):
    id: int
    name: str
    metadata_json: dict


@router.post("", response_model=CourseOut)
def create_course(body: CourseCreate, db: Session = DbDep) -> CourseOut:
    course = Course(name=body.name, metadata_json=body.metadata_json)
    db.add(course)
    db.commit()
    db.refresh(course)
    result = CourseOut(id=course.id, name=course.name, metadata_json=course.metadata_json)
    return result


@router.get("/{course_id}", response_model=CourseOut)
def get_course(course_id: int, db: Session = DbDep) -> CourseOut:
    course = db.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    result = CourseOut(id=course.id, name=course.name, metadata_json=course.metadata_json)
    return result


@router.post("/{course_id}/ingest")
def ingest_course(course_id: int, db: Session = DbDep, files: list[UploadFile] = File(...)) -> dict:
    course = db.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    all_chunks = []
    for upload in files:
        suffix = Path(upload.filename or "file.md").suffix
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(upload.file.read())
            temp = Path(tmp.name)
        text, meta = load_file(temp)
        chunks = chunk_document(text, meta["source_file"], course_id)
        all_chunks.extend(chunks)
    count = store.ingest(course_id, all_chunks)
    result = {"chunks_ingested": count, "files": len(files)}
    return result


@router.get("/{course_id}/weak-topics")
def weak_topics(course_id: int, db: Session = DbDep) -> dict:
    rows = db.query(TopicMastery).all()
    scores: dict[str, list[float]] = {}
    for row in rows:
        scores.setdefault(row.topic, []).append(row.score)
    weak = {topic: sum(vals) / len(vals) for topic, vals in scores.items() if sum(vals) / len(vals) < 0.5}
    result = {"course_id": course_id, "weak_topics": weak}
    return result
