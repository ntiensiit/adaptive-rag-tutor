"""Ingest demo course files into Chroma."""


from adaptive_rag_tutor.config import ROOT
from adaptive_rag_tutor.db.models import Course
from adaptive_rag_tutor.db.session import SessionLocal, init_db
from adaptive_rag_tutor.ingestion.chunker import chunk_document
from adaptive_rag_tutor.ingestion.loader import load_file
from adaptive_rag_tutor.vector_store.chroma_store import ChromaStore


def main() -> None:
    init_db()
    db = SessionLocal()
    course = db.query(Course).filter(Course.name == "Demo ML Course").first()
    if not course:
        print("Run the API once to seed the demo course.")
        return
    demo_dir = ROOT / "data" / "courses" / "demo"
    store = ChromaStore()
    all_chunks = []
    for path in demo_dir.glob("*.md"):
        text, meta = load_file(path)
        chunks = chunk_document(text, meta["source_file"], course.id)
        all_chunks.extend(chunks)
    count = store.ingest(course.id, all_chunks)
    print(f"Ingested {count} chunks for course {course.id}")


if __name__ == "__main__":
    main()
