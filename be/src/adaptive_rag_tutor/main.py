from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from adaptive_rag_tutor.api.routes import conversations, courses, practices, students, tutor
from adaptive_rag_tutor.config import settings
from adaptive_rag_tutor.db.seed import seed_demo
from adaptive_rag_tutor.db.session import SessionLocal, init_db


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    db = SessionLocal()
    try:
        seed_demo(db)
    finally:
        db.close()
    yield


app = FastAPI(title="Adaptive RAG Tutor", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(courses.router, prefix="/courses", tags=["courses"])
app.include_router(students.router, prefix="/students", tags=["students"])
app.include_router(conversations.router, prefix="/conversations", tags=["conversations"])
app.include_router(practices.router, prefix="/practices", tags=["practices"])
app.include_router(tutor.router, prefix="/tutor", tags=["tutor"])


@app.get("/health")
def health() -> dict[str, str]:
    result = {"status": "ok"}
    return result
