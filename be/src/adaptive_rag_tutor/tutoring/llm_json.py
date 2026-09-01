import json
import re


def _fix_escapes(raw: str) -> str:
    fixed = re.sub(r'\\(?!["\\/bfnrtu])', r"\\\\", raw)
    result = fixed
    return result


def _extract_fields(raw: str, keys: tuple[str, ...]) -> dict:
    data: dict = {}
    for key in keys:
        found = re.search(rf'"{key}"\s*:\s*"([^"]*)"', raw, re.DOTALL)
        if found:
            data[key] = found.group(1)
    result = data
    return result


def parse_llm_json(text: str, keys: tuple[str, ...] = ()) -> dict:
    match = re.search(r"\{[\s\S]*\}", text)
    if not match:
        result: dict = {}
        return result
    raw = match.group()
    try:
        data = json.loads(raw)
        result = data
        return result
    except json.JSONDecodeError:
        pass
    try:
        data = json.loads(_fix_escapes(raw))
        result = data
        return result
    except json.JSONDecodeError:
        pass
    result = _extract_fields(raw, keys) if keys else {}
    return result
