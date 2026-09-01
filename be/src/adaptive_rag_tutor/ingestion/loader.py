from pathlib import Path

import fitz


def load_markdown(path: Path) -> tuple[str, dict]:
    text = path.read_text(encoding="utf-8")
    meta = {"source_file": path.name, "format": "markdown"}
    result = (text, meta)
    return result


def load_pdf(path: Path) -> tuple[str, dict]:
    doc = fitz.open(path)
    pages = [page.get_text() for page in doc]
    text = "\n".join(pages)
    meta = {"source_file": path.name, "format": "pdf", "pages": len(pages)}
    result = (text, meta)
    return result


def load_file(path: Path) -> tuple[str, dict]:
    suffix = path.suffix.lower()
    if suffix == ".md":
        result = load_markdown(path)
        return result
    if suffix == ".pdf":
        result = load_pdf(path)
        return result
    raise ValueError(f"Unsupported file type: {suffix}")
