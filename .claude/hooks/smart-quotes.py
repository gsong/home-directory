#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""PreToolUse guard for Artifact. Blocks a publish whose visible text holds
straight quotes (' or "). CLAUDE.md asks for smart quotes in every artifact;
this makes the rule stick. Reads the hook payload on stdin, writes a
permissionDecision on stdout.

Checked: text nodes of .html/.htm/.svg files, prose of .md files, and string
values of .json files (run through the HTML check when they hold markup).
Exempt: tags, attribute values, <code>/<pre>/<script>/<style> and similar,
Markdown code spans and fences, JSON syntax. Any error lets the call through.
"""

import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

MAX_HITS = 20
SKIP_TAGS = {"code", "pre", "script", "style", "kbd", "samp", "textarea", "var"}
VOID_TAGS = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}


def main() -> None:
    try:
        payload = json.load(sys.stdin)
    except ValueError:
        return
    tool_input = payload.get("tool_input") or {}
    if tool_input.get("action", "publish") != "publish" or tool_input.get("asset"):
        return

    hits: list[str] = []
    for path in _published_paths(tool_input, Path(payload.get("cwd") or ".")):
        hits.extend(_check_file(path))

    if hits:
        shown = hits[:MAX_HITS]
        more = f"\n…and {len(hits) - MAX_HITS} more" if len(hits) > MAX_HITS else ""
        _deny(
            "Straight quotes in visible artifact text. Use smart quotes (’ ‘ “ ”) and publish again. "
            "Wrap real code in <code> or <pre> to exempt it.\n" + "\n".join(shown) + more
        )


def _published_paths(tool_input: dict, cwd: Path) -> list[Path]:
    root = Path(tool_input["root"]) if tool_input.get("root") else cwd
    if not root.is_absolute():
        root = cwd / root

    sources: list[str] = []
    if tool_input.get("file_path"):
        sources.append(tool_input["file_path"])
    files = tool_input.get("files")
    if isinstance(files, dict):
        for value in files.values():
            if isinstance(value, str):
                sources.append(value)
            elif isinstance(value, dict) and value.get("from"):
                sources.append(value["from"])
    elif isinstance(files, list):
        for item in files:
            if isinstance(item, str):
                sources.append(item)
            elif isinstance(item, dict) and item.get("path"):
                sources.append(item["path"])

    paths = []
    for source in sources:
        path = Path(source).expanduser()
        if not path.is_absolute():
            path = root / path
        if path.is_file():
            paths.append(path)
    return paths


def _check_file(path: Path) -> list[str]:
    suffix = path.suffix.lower()
    try:
        text = path.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError):
        return []
    if suffix in {".html", ".htm", ".svg"}:
        return [f"{path}:{line}: {snippet}" for line, snippet in _html_hits(text)]
    if suffix == ".md":
        return [f"{path}:{line}: {snippet}" for line, snippet in _markdown_hits(text)]
    if suffix == ".json":
        return _json_hits(path, text)
    return []


def _html_hits(markup: str) -> list[tuple[int, str]]:
    parser = _TextScanner()
    parser.feed(markup)
    parser.close()
    return parser.hits


def _markdown_hits(text: str) -> list[tuple[int, str]]:
    hits = []
    in_fence = False
    for number, line in enumerate(text.splitlines(), 1):
        if re.match(r"\s*(```|~~~)", line):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        prose = re.sub(r"`[^`]*`", "", line)
        prose = re.sub(r"<[^>]*>", "", prose)  # inline HTML attributes
        prose = re.sub(r"\]\([^)]*\)", "]", prose)  # link targets
        if "'" in prose or '"' in prose:
            hits.append((number, _snippet(prose)))
    return hits


def _json_hits(path: Path, text: str) -> list[str]:
    try:
        data = json.loads(text)
    except ValueError:
        return []
    hits = []

    def walk(node, where: str) -> None:
        if isinstance(node, dict):
            for key, value in node.items():
                walk(value, f"{where}.{key}")
        elif isinstance(node, list):
            for index, value in enumerate(node):
                walk(value, f"{where}[{index}]")
        elif isinstance(node, str):
            if "<" in node and ">" in node:
                hits.extend(f"{path} {where}: {snippet}" for _, snippet in _html_hits(node))
            elif "'" in node or '"' in node:
                hits.append(f"{path} {where}: {_snippet(node)}")

    walk(data, "$")
    return hits


class _TextScanner(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.skip_depth = 0
        self.hits: list[tuple[int, str]] = []

    def handle_starttag(self, tag, attrs):
        if tag in SKIP_TAGS and tag not in VOID_TAGS:
            self.skip_depth += 1

    def handle_endtag(self, tag):
        if tag in SKIP_TAGS and self.skip_depth:
            self.skip_depth -= 1

    def handle_data(self, data):
        if self.skip_depth or ("'" not in data and '"' not in data):
            return
        line = self.getpos()[0]
        for offset, text_line in enumerate(data.split("\n")):
            if "'" in text_line or '"' in text_line:
                self.hits.append((line + offset, _snippet(text_line)))


def _snippet(text: str) -> str:
    text = " ".join(text.split())
    return text if len(text) <= 100 else text[:97] + "…"


def _deny(reason: str) -> None:
    json.dump(
        {
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "permissionDecision": "deny",
                "permissionDecisionReason": reason,
            }
        },
        sys.stdout,
        ensure_ascii=False,
    )


if __name__ == "__main__":
    try:
        main()
    except Exception:  # a broken guard must never block a publish
        sys.exit(0)
