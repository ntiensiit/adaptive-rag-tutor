from adaptive_rag_tutor.tutoring.schemas import Citation
from adaptive_rag_tutor.vector_store.chroma_store import ChromaStore, SearchHit


def _to_citation(hit: SearchHit) -> Citation:
    excerpt = hit.text[:200]
    citation = Citation(source_file=hit.source_file, topic=hit.topic, excerpt=excerpt)
    return citation


def retrieve(course_id: int, query: str, store: ChromaStore, k: int = 5) -> list[SearchHit]:
    hits = store.search(course_id, query, k)
    result = hits
    return result


def hits_to_citations(hits: list[SearchHit]) -> list[Citation]:
    citations = [_to_citation(hit) for hit in hits]
    result = citations
    return result
