from dataclasses import dataclass

import chromadb
from llama_index.core import Document, VectorStoreIndex
from llama_index.core.schema import TextNode
from llama_index.embeddings.ollama import OllamaEmbedding
from llama_index.vector_stores.chroma import ChromaVectorStore

from adaptive_rag_tutor.config import settings
from adaptive_rag_tutor.ingestion.chunker import Chunk


@dataclass
class SearchHit:
    text: str
    topic: str
    source_file: str
    score: float


def _collection_name(course_id: int) -> str:
    name = f"course_{course_id}"
    return name


def _embed_model() -> OllamaEmbedding:
    model = OllamaEmbedding(model_name=settings.ollama_embed_model, base_url=settings.ollama_base_url)
    return model


class ChromaStore:
    def __init__(self) -> None:
        settings.chroma_path.mkdir(parents=True, exist_ok=True)
        self._client = chromadb.PersistentClient(path=str(settings.chroma_path))

    def ingest(self, course_id: int, chunks: list[Chunk]) -> int:
        name = _collection_name(course_id)
        collection = self._client.get_or_create_collection(name)
        nodes = [
            TextNode(
                text=chunk.text,
                metadata={"topic": chunk.topic, "source_file": chunk.source_file, "course_id": course_id},
            )
            for chunk in chunks
        ]
        docs = [Document(text=node.text, metadata=node.metadata) for node in nodes]
        vector_store = ChromaVectorStore(chroma_collection=collection)
        index = VectorStoreIndex.from_documents(docs, embed_model=_embed_model(), vector_store=vector_store)
        count = len(index.docstore.docs)
        result = count
        return result

    def search(self, course_id: int, query: str, k: int = 5) -> list[SearchHit]:
        name = _collection_name(course_id)
        collection = self._client.get_or_create_collection(name)
        vector_store = ChromaVectorStore(chroma_collection=collection)
        index = VectorStoreIndex.from_vector_store(vector_store, embed_model=_embed_model())
        retriever = index.as_retriever(similarity_top_k=k)
        nodes = retriever.retrieve(query)
        hits = [
            SearchHit(
                text=node.node.get_content(),
                topic=str(node.node.metadata.get("topic", "")),
                source_file=str(node.node.metadata.get("source_file", "")),
                score=float(node.score or 0.0),
            )
            for node in nodes
        ]
        result = hits
        return result
