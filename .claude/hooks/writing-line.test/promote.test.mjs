// Drives writing-promote.sh as a subprocess. It is a Stop hook: it stays quiet
// almost always, and blocks the stop only when a correction pattern has
// recurred enough to be worth a rule.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const PROMOTE = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "writing-promote.sh",
);

let turn = 0;
function correction(reason, { profile = "technical", promptId } = {}) {
  return {
    timestamp: "2026-08-27T10:00:00Z",
    session_id: "s1",
    prompt_id: promptId ?? `turn-${++turn}`,
    profile,
    file: `/w/ai-swap/drafts/${profile}/d.md`,
    reason,
    original: "before",
    rewrite: "after",
  };
}

function state(corrections) {
  const dir = mkdtempSync(join(tmpdir(), "wl-prom-"));
  writeFileSync(
    join(dir, "corrections.jsonl"),
    corrections.map((c) => JSON.stringify(c)).join("\n") + "\n",
  );
  return dir;
}

function promote(dir, { stopHookActive = false } = {}) {
  const result = spawnSync(PROMOTE, {
    input: JSON.stringify({
      hook_event_name: "Stop",
      stop_hook_active: stopHookActive,
      session_id: "s1",
    }),
    encoding: "utf-8",
    env: { ...process.env, WRITING_LINE_STATE: dir },
  });
  assert.equal(result.error, undefined, `could not run ${PROMOTE}`);
  assert.equal(
    result.status,
    0,
    `promote exited ${result.status}: ${result.stderr}`,
  );
  if (result.stdout.trim() === "") return null;
  return JSON.parse(result.stdout);
}

const HEDGING = [
  correction("stop hedging, say it plainly"),
  correction("stop hedging in the second paragraph"),
  correction("you are hedging again, drop it"),
];

// Silence is the normal case. A hook that speaks on every turn gets ignored.
test("an empty log says nothing", () => {
  assert.equal(promote(state([])), null);
});

test("two corrections are not yet a pattern", () => {
  assert.equal(promote(state(HEDGING.slice(0, 2))), null);
});

test("unrelated corrections never cluster", () => {
  const log = state([
    correction("the latency is 400ms, not 4 seconds"),
    correction("her title is staff engineer"),
    correction("the release shipped in June"),
  ]);
  assert.equal(promote(log), null);
});

test("three corrections on one pattern block the stop", () => {
  const out = promote(state(HEDGING));
  assert.ok(out, "expected the hook to speak");
  assert.equal(out.decision, "block");
  assert.match(out.reason, /hedging/i);
  assert.match(out.reason, /technical/);
  assert.match(out.reason, /AskUserQuestion/);
});

// Voice is per profile. A Slack habit is not a docs rule, and mixing them
// produces a cluster that means nothing.
test("a pattern split across profiles does not cluster", () => {
  const log = state([
    correction("stop hedging here", { profile: "technical" }),
    correction("stop hedging here", { profile: "mixed" }),
    correction("stop hedging here", { profile: "comms" }),
  ]);
  assert.equal(promote(log), null);
});

// Three edits answering one instruction are one correction, not three.
test("edits sharing a prompt id count once", () => {
  const log = state([
    correction("stop hedging", { promptId: "same-turn" }),
    correction("stop hedging", { promptId: "same-turn" }),
    correction("stop hedging", { promptId: "same-turn" }),
  ]);
  assert.equal(promote(log), null);
});

// Asking twice about the same pattern is worse than never asking.
test("a surfaced pattern does not come back", () => {
  const dir = state(HEDGING);
  assert.ok(promote(dir), "expected the first run to speak");
  assert.equal(promote(dir), null, "the second run repeated itself");
  assert.equal(existsSync(join(dir, "surfaced.txt")), true);
});

// The Stop hook fires again after it blocks. Without this guard it loops.
test("stop_hook_active silences the hook", () => {
  assert.equal(promote(state(HEDGING), { stopHookActive: true }), null);
});

test("the reason quotes the corrections it is built from", () => {
  const out = promote(state(HEDGING));
  assert.match(out.reason, /say it plainly/);
});

// Corrections with no reason carry no pattern. They come from served sessions
// where the transcript was unavailable.
test("empty reasons never cluster", () => {
  const log = state([correction(""), correction(""), correction("")]);
  assert.equal(promote(log), null);
});

test("a missing log file says nothing", () => {
  const dir = mkdtempSync(join(tmpdir(), "wl-prom-empty-"));
  assert.equal(promote(dir), null);
});

// The routing choices are the whole point of the prompt. All three must be
// offered, or the user cannot answer.
test("the reason offers all three routes", () => {
  const { reason } = promote(state(HEDGING));
  assert.match(reason, /voice rule/i);
  assert.match(reason, /reference/i);
  assert.match(reason, /discard/i);
});
