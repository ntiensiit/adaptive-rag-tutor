from collections.abc import Generator

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from adaptive_rag_tutor.config import settings
from adaptive_rag_tutor.db.models import Base

_connect_args = {"check_same_thread": False}
_pool_kwargs = {}
if settings.sqlite_url.endswith(":memory:") or settings.sqlite_url == "sqlite:///:memory:":
    _pool_kwargs["poolclass"] = StaticPool
engine = create_engine(settings.sqlite_url, connect_args=_connect_args, **_pool_kwargs)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


def _migrate_db() -> None:
    insp = inspect(engine)
    tables = insp.get_table_names()
    with engine.begin() as conn:
        if "interactions" in tables:
            cols = {c["name"] for c in insp.get_columns("interactions")}
            if "conversation_id" not in cols:
                conn.execute(text("ALTER TABLE interactions ADD COLUMN conversation_id INTEGER"))
            if "student_response" not in cols:
                conn.execute(text("ALTER TABLE interactions ADD COLUMN student_response TEXT"))
            if "evaluation_feedback" not in cols:
                conn.execute(text("ALTER TABLE interactions ADD COLUMN evaluation_feedback TEXT"))
        if "practice_attempts" in tables:
            cols = {c["name"] for c in insp.get_columns("practice_attempts")}
            if "feedback" not in cols:
                conn.execute(text("ALTER TABLE practice_attempts ADD COLUMN feedback TEXT"))


def init_db() -> None:
    settings.chroma_path.mkdir(parents=True, exist_ok=True)
    db_path = settings.sqlite_url.replace("sqlite:///", "")
    if db_path:
        parent = __import__("pathlib").Path(db_path).parent
        parent.mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(bind=engine)
    _migrate_db()


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
