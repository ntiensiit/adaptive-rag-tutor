import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()
ROOT = Path(__file__).resolve().parents[2]


def _env(key: str, default: str) -> str:
    value = os.getenv(key, default)
    result = value
    return result


def _cors_origins() -> list[str]:
    origins = [o.strip() for o in _env("CORS_ORIGINS", "http://localhost:3000").split(",")]
    result = origins
    return result


class Settings:
    app_env: str = _env("APP_ENV", "development")
    log_level: str = _env("LOG_LEVEL", "INFO")
    ollama_base_url: str = _env("OLLAMA_BASE_URL", "http://localhost:11434")
    ollama_chat_model: str = _env("OLLAMA_CHAT_MODEL", "llama3.2")
    ollama_embed_model: str = _env("OLLAMA_EMBED_MODEL", "nomic-embed-text")
    chroma_path: Path = Path(_env("CHROMA_PATH", str(ROOT / "data" / "chroma")))
    sqlite_url: str = _env("SQLITE_URL", f"sqlite:///{ROOT / 'data' / 'tutor.db'}")
    mastery_alpha: float = float(_env("MASTERY_ALPHA", "0.1"))
    mastery_beta: float = float(_env("MASTERY_BETA", "0.05"))
    mastery_gamma: float = float(_env("MASTERY_GAMMA", "0.08"))

    @property
    def cors_origins(self) -> list[str]:
        result = _cors_origins()
        return result


settings = Settings()
