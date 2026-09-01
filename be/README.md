# Python project

## Folder structure

```text
src/PROJECT_NAME/
tests/
scripts/
notebooks/
.github/workflows/
artifacts/
configs/
data/
deploy/
docs/
logs/
.python-version
pyproject.toml
uv.toml
uv.lock
ruff.toml
pytest.ini
pytest.toml
mypy.toml
coverage.toml
hatch.toml
.env.example
.gitignore
CHANGELOG.md
README.md
```

## Setup

```bash
uv sync
```

## Run checks

```bash
uv run ruff check .
uv run pytest
```
