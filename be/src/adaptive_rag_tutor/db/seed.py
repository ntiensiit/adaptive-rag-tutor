import json
from pathlib import Path

from sqlalchemy.orm import Session

from adaptive_rag_tutor.config import ROOT
from adaptive_rag_tutor.db.models import Course, Student, TopicMastery
from adaptive_rag_tutor.ingestion.chunker import chunk_document
from adaptive_rag_tutor.ingestion.loader import load_file
from adaptive_rag_tutor.vector_store.chroma_store import ChromaStore


def load_course_metadata(path: Path) -> dict:
    data = json.loads(path.read_text(encoding="utf-8"))
    result = data
    return result


def seed_demo(db: Session) -> tuple[Course, Student]:
    meta_path = ROOT / "data" / "courses" / "demo" / "course.json"
    metadata = load_course_metadata(meta_path) if meta_path.exists() else {"topics": [], "objectives": {}}
    course = db.query(Course).filter(Course.name == "Demo ML Course").first()
    if not course:
        course = Course(name="Demo ML Course", metadata_json=metadata)
        db.add(course)
        db.flush()
    student = db.query(Student).filter(Student.name == "Demo Student").first()
    if not student:
        student = Student(name="Demo Student")
        db.add(student)
        db.flush()
    topics = metadata.get("topics", [])
    for topic in topics:
        name = topic if isinstance(topic, str) else topic.get("name", "")
        existing = (
            db.query(TopicMastery).filter(TopicMastery.student_id == student.id, TopicMastery.topic == name).first()
        )
        if not existing and name:
            db.add(TopicMastery(student_id=student.id, topic=name, score=0.5))
    db.commit()
    db.refresh(course)
    db.refresh(student)
    _ingest_demo(course.id)
    result = (course, student)
    return result


def _ingest_demo(course_id: int) -> None:
    demo_dir = ROOT / "data" / "courses" / "demo"
    if not demo_dir.exists():
        return
    try:
        store = ChromaStore()
        chunks = []
        for path in demo_dir.glob("*.md"):
            text, meta = load_file(path)
            chunks.extend(chunk_document(text, meta["source_file"], course_id))
        if chunks:
            store.ingest(course_id, chunks)
    except Exception:
        return
