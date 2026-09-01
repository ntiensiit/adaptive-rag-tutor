import os
from pathlib import Path

os.environ["SQLITE_URL"] = "sqlite:///:memory:"
os.environ["CHROMA_PATH"] = str(Path(__file__).parent / "test_chroma")
