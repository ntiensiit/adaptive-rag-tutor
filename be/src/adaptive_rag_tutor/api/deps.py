from collections.abc import Generator

from fastapi import Depends
from sqlalchemy.orm import Session

from adaptive_rag_tutor.db.session import get_db


def db_session() -> Generator[Session, None, None]:
    yield from get_db()


DbDep = Depends(db_session)
