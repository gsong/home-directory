"""Recipient rule for gws-reply-draft, run against recorded thread JSON with no network.

Run: uv run --with pytest pytest ~/.agents/skills/gws-gmail/scripts/tests
"""

import base64
import copy
import email
import importlib.machinery
import importlib.util
import json
from pathlib import Path

import pytest

HERE = Path(__file__).parent
ME = "sam@example.com"


def load_script():
    path = HERE.parent / "gws-reply-draft"
    loader = importlib.machinery.SourceFileLoader("gws_reply_draft", str(path))
    spec = importlib.util.spec_from_loader(loader.name, loader)
    module = importlib.util.module_from_spec(spec)
    loader.exec_module(module)
    return module


grd = load_script()


@pytest.fixture
def thread():
    return json.loads((HERE / "fixtures" / "thread.json").read_text())


def emails(recipients):
    return [addr.lower() for _, addr in recipients]


def test_last_message_to_moves_to_cc(thread):
    reply = grd.build_reply(thread, ME)
    assert emails(reply["to"]) == ["ana@client.example"]
    assert "lohith@example.com" in emails(reply["cc"])


def test_sender_is_left_out_and_duplicates_dropped(thread):
    reply = grd.build_reply(thread, ME)
    assert emails(reply["cc"]) == ["lohith@example.com", "lee@example.com", "bob@client.example"]


def test_draft_message_is_skipped(thread):
    reply = grd.build_reply(thread, ME)
    assert reply["in_reply_to"] == "<second@client.example>"
    assert reply["references"] == "<first@example.com> <second@client.example>"
    assert ME not in emails(reply["to"])


def test_existing_re_is_not_doubled(thread):
    assert grd.build_reply(thread, ME)["subject"] == "Re: Discovery Readout Options"


def test_re_added_when_missing(thread):
    thread["messages"] = thread["messages"][:1]
    thread["messages"][0]["labelIds"] = ["INBOX"]
    other = grd.build_reply(thread, "someone@example.com")
    assert other["subject"] == "Re: Discovery Readout Options"


def test_reply_to_wins_over_from(thread):
    headers = thread["messages"][1]["payload"]["headers"]
    headers[0]["value"] = '"Ana via Group" <group@client.example>'
    headers.append({"name": "Reply-To", "value": "Ana Client <ana@client.example>"})
    reply = grd.build_reply(thread, ME)
    assert emails(reply["to"]) == ["ana@client.example"]


def test_replying_to_own_message_keeps_its_recipients(thread):
    thread["messages"] = thread["messages"][:1]
    reply = grd.build_reply(thread, ME)
    assert emails(reply["to"]) == ["ana@client.example"]
    assert emails(reply["cc"]) == ["lee@example.com"]


def test_printed_names_fall_back_to_address(thread):
    lines = grd.recipient_lines(grd.build_reply(thread, ME))
    assert lines == [
        "To: Ana Client <ana@client.example>",
        "Cc: Lohith Peer <lohith@example.com>",
        "Cc: Lee Lead <lee@example.com>",
        "Cc: bob@client.example",
    ]


def test_encoded_message_carries_headers(thread):
    reply = grd.build_reply(thread, ME)
    raw = grd.encode_message(reply, "Thanks.\n")
    msg = email.message_from_bytes(base64.urlsafe_b64decode(raw))
    assert msg["To"] == "Ana Client <ana@client.example>"
    assert "Lohith Peer <lohith@example.com>" in msg["Cc"]
    assert msg["In-Reply-To"] == "<second@client.example>"
    assert msg.get_payload().strip() == "Thanks."


def test_gws_keyring_line_is_skipped():
    out = 'Using keyring backend: file\n{\n  "id": "r-1"\n}\n'
    assert grd.parse_gws_json(out) == {"id": "r-1"}
