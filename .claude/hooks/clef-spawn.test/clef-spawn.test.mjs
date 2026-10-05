// Drives clef-spawn.py as a subprocess, the way Claude Code invokes it: the
// hook payload arrives on stdin, and the hook appends to the log named by
// CLEF_SPAWN_LOG. A local HTTP server stands in for Clef's /v1/systemone
// endpoint, so the tests run without Ollama. Nothing is imported from the
// script, so these tests pin the contract rather than the implementation.

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, test } from "node:test";
import { fileURLToPath } from "node:url";

const HOOK = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "clef-spawn.py",
);

const ANSWER = {
  model: "clef",
  answers: {
    model: {
      type: "choice",
      choice: "sonnet",
      probabilities: { haiku: 0.1, sonnet: 0.8, opus: 0.07, fable: 0.03 },
      confidence: 0.6,
    },
  },
};

const cleanups = [];

afterEach(async () => {
  while (cleanups.length) await cleanups.pop()();
});

test("a spawn logs Clef's pick next to the model Claude chose", async () => {
  const clef = await stubClef(JSON.stringify(ANSWER));
  const { log, result } = await runHook(
    preToolUse({ description: "Find callers", prompt: "Find every caller." }),
    { CLEF_URL: clef.url },
  );

  assert.equal(result.status, 0);
  assert.equal(result.stdout, "");
  const [line] = readLines(log);
  assert.equal(line.claude_model, "opus");
  assert.equal(line.pick, "sonnet");
  assert.deepEqual(line.probabilities, ANSWER.answers.model.probabilities);
  assert.equal(line.session_id, "session-1");
  assert.equal(line.tool_use_id, "toolu-1");
  assert.equal(line.error, null);
});

test("Clef sees the task with model names stripped", async () => {
  const clef = await stubClef(JSON.stringify(ANSWER));
  const { log } = await runHook(
    preToolUse({
      description: "Search Slack for Asset Management (Sonnet)",
      prompt: "Run on claude-opus-5-5 if you can. Opus, HAIKU and fable too.",
      model: null,
    }),
    { CLEF_URL: clef.url },
  );

  const sent = JSON.parse(clef.requests[0]);
  assert.equal(sent.model, "clef");
  assert.doesNotMatch(sent.state, /sonnet|opus|haiku|fable|claude-|\(\)/i);
  assert.deepEqual(Object.keys(sent.questions.model.criteria), [
    "haiku",
    "sonnet",
    "opus",
    "fable",
  ]);

  const [line] = readLines(log);
  assert.equal(line.description, "Search Slack for Asset Management");
  assert.equal(line.claude_model, null);
});

test("the line's time marks the spawn, not Clef's answer", async () => {
  const clef = await stubClef(JSON.stringify(ANSWER), { delayMs: 3000 });
  const started = Date.now();
  const { log } = await runHook(preToolUse({}), { CLEF_URL: clef.url });

  const [line] = readLines(log);
  assert.ok(line.latency_s >= 3, `latency_s ${line.latency_s}`);
  // The time has whole seconds, so it can only fall at or before the real one.
  assert.ok(
    Date.parse(line.time) < started + 2000,
    `time ${line.time} is not near the spawn at ${new Date(started).toISOString()}`,
  );
});

test("with Clef down, the spawn is still logged, with the error", async () => {
  const { log, result } = await runHook(preToolUse({}), {
    CLEF_URL: "http://127.0.0.1:9",
  });

  assert.equal(result.status, 0);
  assert.equal(result.stdout, "");
  const [line] = readLines(log);
  assert.equal(line.pick, null);
  assert.equal(line.error, "unreachable");
});

test("a reply that is not a choice among the four models is logged as bad", async () => {
  for (const reply of [
    "not json",
    JSON.stringify({ answers: {} }),
    JSON.stringify({ answers: { model: { choice: "gpt" } } }),
  ]) {
    const clef = await stubClef(reply);
    const { log } = await runHook(preToolUse({}), { CLEF_URL: clef.url });

    const [line] = readLines(log);
    assert.equal(line.pick, null, reply);
    assert.equal(line.error, "bad reply", reply);
  }
});

test("PostToolUse logs the model the spawn ran on to the sibling file", async () => {
  const { dir, log } = await runHook({
    hook_event_name: "PostToolUse",
    session_id: "session-1",
    tool_use_id: "toolu-1",
    tool_name: "Agent",
    tool_response: { resolvedModel: "claude-sonnet-5-5" },
  });

  assert.equal(existsSync(log), false);
  const [line] = readLines(join(dir, "spawns-resolved.jsonl"));
  assert.equal(line.tool_use_id, "toolu-1");
  assert.equal(line.resolved_model, "claude-sonnet-5-5");
});

test("with CLEF_SPAWN_LOG unset, the hook does nothing", async () => {
  const clef = await stubClef(JSON.stringify(ANSWER));
  const { result } = await runHook(preToolUse({}), {
    CLEF_URL: clef.url,
    CLEF_SPAWN_LOG: "",
  });

  assert.equal(result.status, 0);
  assert.equal(result.stdout, "");
  assert.equal(clef.requests.length, 0);
});

function preToolUse({
  description = "Summarize logs",
  prompt = "Summarize the log.",
  model = "opus",
}) {
  return {
    hook_event_name: "PreToolUse",
    session_id: "session-1",
    tool_use_id: "toolu-1",
    tool_name: "Agent",
    // A spawn with no model has no model key at all.
    tool_input: {
      description,
      prompt,
      subagent_type: "Explore",
      ...(model && { model }),
    },
  };
}

// The stub has to answer while the hook runs, so the hook runs through an
// async spawn: spawnSync would block the event loop the stub needs.
async function runHook(payload, env = {}) {
  const dir = mkdtempSync(join(tmpdir(), "clef-spawn-"));
  cleanups.push(() => rmSync(dir, { recursive: true, force: true }));
  const log = join(dir, "spawns.jsonl");

  const child = spawn(HOOK, {
    env: { ...process.env, CLEF_SPAWN_LOG: log, ...env },
  });
  let stdout = "";
  child.stdout.on("data", (chunk) => {
    stdout += chunk;
  });
  child.stdin.end(JSON.stringify(payload));
  const status = await new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", resolve);
  });

  return { dir, log, result: { status, stdout } };
}

async function stubClef(reply, { delayMs = 0 } = {}) {
  const requests = [];
  const server = createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      requests.push(body);
      setTimeout(() => {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(reply);
      }, delayMs);
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  cleanups.push(() => new Promise((resolve) => server.close(resolve)));

  return { url: `http://127.0.0.1:${server.address().port}`, requests };
}

function readLines(path) {
  return readFileSync(path, "utf-8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
}
