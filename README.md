# Adaptive RAG Tutor

LLM + RAG tutor for university courses: grounded in official material, Socratic teaching, practice by weakness, mastery tracking, and exam guardrails.

**Stack:** FastAPI, SQLite, Chroma, Ollama, Next.js

## Setup

Requires Python 3.12+, [uv](https://docs.astral.sh/uv/), pnpm, and Ollama (`llama3.2`, `nomic-embed-text`).

```bash
# backend
cd be && cp .env.example .env && uv sync
uv run uvicorn adaptive_rag_tutor.main:app --reload

# frontend
cd fe && cp .env.example .env && pnpm install && pnpm dev
```

- UI: http://localhost:3000
- API: http://localhost:8000/docs

First API start seeds a demo course and student and ingests `be/data/courses/demo/`.

## Tests

```bash
cd be && uv run ruff check . && uv run pytest
```
