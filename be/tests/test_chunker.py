from adaptive_rag_tutor.ingestion.chunker import chunk_document, split_sections


def test_split_sections() -> None:
    text = "# Alpha\nBody one.\n# Beta\nBody two."
    sections = split_sections(text)
    topics = [topic for topic, _ in sections]
    assert "alpha" in topics
    assert "beta" in topics


def test_chunk_document() -> None:
    text = "# Topic A\n" + ("word " * 600)
    chunks = chunk_document(text, "lecture.md", course_id=1, max_chars=500)
    assert len(chunks) >= 2
    assert chunks[0].topic == "topic a"
