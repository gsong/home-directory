#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Log which model Clef would pick for each Agent spawn. Phase 1 of issue #10.

Runs as an async hook, so Claude Code never waits for it and ignores its
output. It never changes the spawn.

PreToolUse: strip model names from the description and the prompt, ask Clef
one choice question, and append one JSON line to $CLEF_SPAWN_LOG.
PostToolUse: append the model the spawn actually ran on to the sibling
<stem>-resolved.jsonl. The review joins the two files on tool_use_id.

With CLEF_SPAWN_LOG unset the hook does nothing. Every failure exits 0: an
unreachable or confused Clef becomes an error field in the log line, and a log
that cannot be written is dropped.
"""

import fcntl
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import UTC, datetime
from pathlib import Path

CLEF_MODEL = "clef"
TIMEOUT_S = 120

QUESTION = {
    "type": "choice",
    "instructions": "Which model should run this subagent task?",
    "criteria": {
        "haiku": "a mechanical task such as one lookup, a file or log summary, a test run, or a fixed-format conversion",
        "sonnet": "a search across many files, doc or web research, or an edit the prompt fully specifies",
        "opus": "implementation, code review, or debugging",
        "fable": "design, architecture, a stubborn root cause, or a call where a wrong answer is costly",
    },
}

# Descriptions such as "Search Slack (Sonnet)" leak the answer. Full IDs go
# first so "claude-opus-5-5" is removed whole, not left as "claude--5-5".
MODEL_NAME = re.compile(r"[ \t]*\b(?:claude-[a-z0-9.-]+|haiku|sonnet|opus|fable)\b", re.IGNORECASE)
EMPTY_PARENS = re.compile(r"[ \t]*\(\s*\)")

# An empty ProxyHandler drops the proxies urllib reads from the environment and
# from macOS. Clef is always local.
OPENER = urllib.request.build_opener(urllib.request.ProxyHandler({}))


def main():
    log_path = os.environ.get("CLEF_SPAWN_LOG")
    if not log_path:
        return
    log_path = Path(log_path).expanduser()
    payload = json.load(sys.stdin)

    if payload.get("hook_event_name") == "PostToolUse":
        append(resolved_path(log_path), resolved_record(payload))
    else:
        append(log_path, spawn_record(payload))


def spawn_record(payload):
    tool_input = payload.get("tool_input") or {}
    description = strip_model_names(tool_input.get("description") or "")
    prompt = strip_model_names(tool_input.get("prompt") or "")
    answer, error, latency = ask_clef(f"Description: {description}\n\nPrompt:\n{prompt}")

    return {
        "time": now(),
        "session_id": payload.get("session_id"),
        "tool_use_id": payload.get("tool_use_id"),
        "agent_id": payload.get("agent_id"),
        "subagent_type": tool_input.get("subagent_type"),
        "description": description,
        "prompt": prompt,
        "claude_model": tool_input.get("model"),
        "clef_model": CLEF_MODEL,
        "pick": answer.get("choice"),
        "probabilities": answer.get("probabilities"),
        "confidence": answer.get("confidence"),
        "latency_s": latency,
        "error": error,
    }


def resolved_record(payload):
    response = payload.get("tool_response")
    return {
        "time": now(),
        "session_id": payload.get("session_id"),
        "tool_use_id": payload.get("tool_use_id"),
        "resolved_model": response.get("resolvedModel") if isinstance(response, dict) else None,
    }


def strip_model_names(text):
    return EMPTY_PARENS.sub("", MODEL_NAME.sub("", text)).strip()


def ask_clef(state):
    """Return (answer, error, latency_s). The answer is {} when there is an error."""
    url = os.environ.get("CLEF_URL", "http://127.0.0.1:11434").rstrip("/") + "/v1/systemone"
    body = json.dumps({"model": CLEF_MODEL, "state": state, "questions": {"model": QUESTION}})
    request = urllib.request.Request(url, body.encode(), {"Content-Type": "application/json"})
    started = time.monotonic()

    try:
        with OPENER.open(request, timeout=TIMEOUT_S) as response:
            reply = json.load(response)
        answer = reply["answers"]["model"]
        if answer.get("choice") not in QUESTION["criteria"]:
            raise ValueError
        return answer, None, elapsed(started)
    except TimeoutError:
        return {}, "timeout", elapsed(started)
    except urllib.error.HTTPError as e:
        return {}, f"http {e.code}", elapsed(started)
    except urllib.error.URLError as e:
        error = "timeout" if isinstance(e.reason, TimeoutError) else "unreachable"
        return {}, error, elapsed(started)
    except (ValueError, KeyError, TypeError, AttributeError):
        return {}, "bad reply", elapsed(started)


def resolved_path(log_path):
    return log_path.with_name(f"{log_path.stem}-resolved{log_path.suffix}")


def append(path, record):
    # Parallel spawns run parallel hooks. The lock keeps their lines whole.
    path.parent.mkdir(parents=True, exist_ok=True)
    line = (json.dumps(record, ensure_ascii=False) + "\n").encode()
    fd = os.open(path, os.O_WRONLY | os.O_APPEND | os.O_CREAT, 0o600)
    try:
        fcntl.flock(fd, fcntl.LOCK_EX)
        os.write(fd, line)
    finally:
        os.close(fd)


def now():
    return datetime.now(UTC).isoformat(timespec="seconds")


def elapsed(started):
    return round(time.monotonic() - started, 2)


if __name__ == "__main__":
    try:
        main()
    except Exception:
        pass
    sys.exit(0)
