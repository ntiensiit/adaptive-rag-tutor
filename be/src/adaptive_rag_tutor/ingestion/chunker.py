import re
from dataclasses import dataclass


@dataclass
class Chunk:
    text: str
    topic: str
    source_file: str
    course_id: int


def _heading_topic(line: str) -> str:
    topic = re.sub(r"^#+\s*", "", line).strip().lower()
    result = topic
    return result


def split_sections(text: str) -> list[tuple[str, str]]:
    parts = re.split(r"^(#{1,3}\s+.+)$", text, flags=re.MULTILINE)
    sections: list[tuple[str, str]] = []
    heading = "general"
    body = parts[0].strip() if parts else ""
    if body:
        sections.append((heading, body))
    idx = 1
    while idx < len(parts):
        heading = _heading_topic(parts[idx])
        body = parts[idx + 1].strip() if idx + 1 < len(parts) else ""
        if body:
            sections.append((heading, body))
        idx += 2
    result = sections
    return result


def _split_size(text: str, max_chars: int) -> list[str]:
    if len(text) <= max_chars:
        result = [text]
        return result
    chunks: list[str] = []
    start = 0
    while start < len(text):
        end = min(start + max_chars, len(text))
        chunks.append(text[start:end])
        start = end
    result = chunks
    return result


def chunk_document(text: str, source_file: str, course_id: int, max_chars: int = 2000) -> list[Chunk]:
    sections = split_sections(text)
    chunks: list[Chunk] = []
    for topic, body in sections:
        for piece in _split_size(body, max_chars):
            chunks.append(Chunk(text=piece, topic=topic, source_file=source_file, course_id=course_id))
    result = chunks
    return result
