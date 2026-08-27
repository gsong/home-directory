// Drives writing-gate.sh as a subprocess, the way Claude Code invokes it: the
// PostToolUse payload arrives on stdin, advisory feedback comes back on stdout.
// Nothing is imported from the script, so these tests pin the contract.
//
// Most tests run against a fixture rules directory, so growing the shipped
// rules cannot break them. One smoke test reads the real rules instead.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const GATE = join(HERE, "..", "writing-gate.sh");
const SHIPPED_RULES = join(HERE, "..", "..", "skills", "writing-line", "rules");

const FIXTURE_RULES = mkdtempSync(join(tmpdir(), "wl-rules-"));
writeFileSync(
  join(FIXTURE_RULES, "technical.md"),
  [
    "## Greppable",
    "",
    "```rules",
    "# a comment line is skipped",
    "maxwords\t8\ttoo long",
    "re\tbanned\tthe word banned",
    "density\t—\t3\ttoo many em dashes",
    "```",
    "",
  ].join("\n"),
);

// Prose long enough for a rate to mean anything. Each line is 10 words.
function padding(lines) {
  return Array.from(
    { length: lines },
    () => "one two three. four five six. seven eight nine ten.",
  ).join("\n");
}

// Writes a draft at <tmp>/ai-swap/drafts/<profile>/draft.md and returns its path.
function draft(profile, body) {
  const root = mkdtempSync(join(tmpdir(), "wl-draft-"));
  const dir = join(root, "ai-swap", "drafts", profile);
  mkdirSync(dir, { recursive: true });
  const path = join(dir, "draft.md");
  writeFileSync(path, body);
  return path;
}

// The gate reports only when it has something to say. Silence is the pass case,
// and Claude Code reads it as an ordinary write with no feedback.
function gate(payload, rules = FIXTURE_RULES) {
  const result = spawnSync(GATE, {
    input: JSON.stringify(payload),
    encoding: "utf-8",
    env: { ...process.env, WRITING_LINE_RULES: rules },
  });

  assert.equal(result.error, undefined, `could not run ${GATE}`);
  assert.equal(
    result.status,
    0,
    `gate exited ${result.status}: ${result.stderr}`,
  );

  if (result.stdout.trim() === "") return null;
  return JSON.parse(result.stdout).hookSpecificOutput.additionalContext;
}

function onWrite(path, rules) {
  return gate({ tool_name: "Write", tool_input: { file_path: path } }, rules);
}

// The gate speaks only for drafts written by a file-writing tool. Everything
// else passes through untouched.
test("predicate: a file outside the draft glob is ignored", () => {
  const root = mkdtempSync(join(tmpdir(), "wl-other-"));
  const path = join(root, "notes.md");
  writeFileSync(path, "banned banned banned");
  assert.equal(onWrite(path), null);
});

test("predicate: a tool other than Write, Edit or MultiEdit is ignored", () => {
  const path = draft("technical", "banned");
  assert.equal(
    gate({ tool_name: "Read", tool_input: { file_path: path } }),
    null,
  );
});

test("predicate: Edit and MultiEdit are both checked", () => {
  const path = draft("technical", "banned");
  for (const tool_name of ["Edit", "MultiEdit"]) {
    const out = gate({ tool_name, tool_input: { file_path: path } });
    assert.match(out ?? "", /the word banned/, `${tool_name} was not checked`);
  }
});

test("predicate: a profile with no rule file is ignored", () => {
  const path = draft("nosuchprofile", "banned");
  assert.equal(onWrite(path), null);
});

test("predicate: a file sitting directly in drafts/ is ignored", () => {
  const root = mkdtempSync(join(tmpdir(), "wl-bare-"));
  const dir = join(root, "ai-swap", "drafts");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, "loose.md");
  writeFileSync(path, "banned");
  assert.equal(onWrite(path), null);
});

test("predicate: a missing file is ignored", () => {
  assert.equal(onWrite("/no/such/ai-swap/drafts/technical/gone.md"), null);
});

// Violations carry the line number so Claude can fix the right line without
// re-reading the file.
test("report: a regex violation names the line and the rule", () => {
  const out = onWrite(draft("technical", "fine line\nthis one is banned\n"));
  assert.match(out, /line 2: the word banned/);
});

test("report: every offending line is listed", () => {
  const out = onWrite(draft("technical", "banned\nok\nbanned\n"));
  assert.match(out, /line 1: /);
  assert.match(out, /line 3: /);
});

test("report: a clean draft says nothing", () => {
  assert.equal(onWrite(draft("technical", "short and clean\n")), null);
});

test("report: sentence length is counted per sentence, not per line", () => {
  const nine = "one two three four five six seven eight nine.";
  assert.match(onWrite(draft("technical", nine)), /line 1: too long/);
  // Two short sentences on one line stay under the limit.
  assert.equal(
    onWrite(draft("technical", "one two three. four five six.")),
    null,
  );
});

// A code sample is not prose. Checking it produces noise that trains the reader
// to ignore the gate.
test("skip: fenced code blocks are not checked", () => {
  const body = [
    "prose is fine",
    "```js",
    "const banned = 1;",
    "```",
    "more prose",
  ].join("\n");
  assert.equal(onWrite(draft("technical", body)), null);
});

test("skip: YAML front matter is not checked", () => {
  const body = ["---", "title: banned", "---", "", "clean prose"].join("\n");
  assert.equal(onWrite(draft("technical", body)), null);
});

test("skip: headings and table rows are exempt from sentence length", () => {
  const long = "one two three four five six seven eight nine ten";
  const body = [`# ${long}`, `| ${long} |`, `> ${long}`].join("\n");
  assert.equal(onWrite(draft("technical", body)), null);
});

// An em dash is allowed. Using one where a period belongs, over and over, is
// the habit the rule is after, so the gate counts them instead of banning them.
test("density: one em dash in a long draft is not reported", () => {
  const out = onWrite(draft("technical", `a single — mark\n${padding(20)}`));
  assert.equal(out, null);
});

test("density: a high rate is reported once, with the count", () => {
  const dashes = Array.from({ length: 12 }, () => "a — b").join("\n");
  const out = onWrite(draft("technical", `${dashes}\n${padding(20)}`));
  const reported = (out.match(/too many em dashes/g) ?? []).length;
  assert.equal(reported, 1, `expected one report, got ${reported}: ${out}`);
  assert.match(out, /draft: too many em dashes \(12 in \d+ words\)/);
});

test("density: a short draft is never rated", () => {
  const dashes = Array.from({ length: 8 }, () => "a — b").join("\n");
  assert.equal(onWrite(draft("technical", dashes)), null);
});

// The shipped rules must load and fire. These are the only tests that read
// them, so adding a rule cannot break the rest of the file.
test("shipped rules: a hyphen between numbers is flagged as a range", () => {
  const out = onWrite(
    draft("technical", "the run took 10-20 minutes\n"),
    SHIPPED_RULES,
  );
  assert.match(out, /line 1: number range/);
});

test("shipped rules: an ISO date is not read as a range", () => {
  assert.equal(
    onWrite(
      draft("technical", "shipped on 2026-08-27 as planned\n"),
      SHIPPED_RULES,
    ),
    null,
  );
});

test("shipped rules: an en dash range passes", () => {
  assert.equal(
    onWrite(draft("technical", "the run took 10–20 minutes\n"), SHIPPED_RULES),
    null,
  );
});

test("shipped rules: a weekday range with a hyphen is flagged", () => {
  const out = onWrite(
    draft("technical", "the window is Mon-Fri each week\n"),
    SHIPPED_RULES,
  );
  assert.match(out, /line 1: date range/);
});

test("shipped rules: a single em dash is not reported", () => {
  const out = onWrite(
    draft("technical", `an em dash — right here\n${padding(20)}`),
    SHIPPED_RULES,
  );
  assert.equal(out, null);
});

test("shipped rules: all three profiles parse", () => {
  for (const profile of ["technical", "mixed", "comms"]) {
    const out = onWrite(draft(profile, "clean prose here\n"), SHIPPED_RULES);
    assert.equal(out, null, `${profile} reported on clean prose: ${out}`);
  }
});
