"""Check Python functions for Google-style docstring sections."""

from __future__ import annotations

import argparse
import ast
import re
import sys
from pathlib import Path


def _section_names(docstring: str, section: str) -> set[str]:
    """Return documented names from a Google-style docstring section."""
    match = re.search(
        rf"^\s*{section}:\s*$([\s\S]*?)(?=^\s*(?:Args|Returns|Raises):\s*$|\Z)",
        docstring,
        re.MULTILINE,
    )
    if not match:
        return set()
    return set(re.findall(r"^\s{4,}([A-Za-z_]\w*)\s*:", match.group(1), re.MULTILINE))


def check_docstring(node: ast.FunctionDef | ast.AsyncFunctionDef) -> tuple[bool, str]:
    """Validate a function docstring and return its status and reason."""
    docstring = ast.get_docstring(node)
    if not docstring:
        return False, "missing docstring"

    argument_names = {
        argument.arg
        for argument in (*node.args.posonlyargs, *node.args.args, *node.args.kwonlyargs)
        if argument.arg not in {"self", "cls"}
    }
    documented_args = _section_names(docstring, "Args")
    missing_args = argument_names - documented_args
    if argument_names and missing_args:
        return False, f"missing Args: {', '.join(sorted(missing_args))}"

    if node.returns is not None and not re.search(r"^Returns:\s*$", docstring, re.MULTILINE):
        return False, "missing Returns section"

    raises = [item for item in ast.walk(node) if isinstance(item, ast.Raise)]
    if raises and not re.search(r"^Raises:\s*$", docstring, re.MULTILINE):
        return False, "missing Raises section"

    return True, ""


def analyze_directory(directory: Path) -> list[tuple[Path, str, int, str]]:
    """Return functions with missing or incomplete Google-style docstrings."""
    if not directory.is_dir():
        raise NotADirectoryError(f"Not a directory: {directory}")

    issues: list[tuple[Path, str, int, str]] = []
    for path in directory.rglob("*.py"):
        try:
            tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
        except SyntaxError as error:
            raise SyntaxError(f"Invalid Python syntax in {path}: {error}") from error
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                valid, reason = check_docstring(node)
                if not valid:
                    issues.append((path, node.name, node.lineno, reason))
    return issues


def main() -> int:
    """Run the command-line checker."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", type=Path, help="Directory to scan.")
    args = parser.parse_args()
    try:
        issues = analyze_directory(args.directory)
    except (NotADirectoryError, OSError, SyntaxError) as error:
        parser.error(str(error))

    sys.stdout.write(f"Total issues: {len(issues)}\n")
    for path, name, line, reason in issues:
        sys.stdout.write(f"{path}: {name} at line {line} ({reason})\n")
    return 1 if issues else 0


if __name__ == "__main__":
    raise SystemExit(main())
