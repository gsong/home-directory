// Drives ask-via-tool.sh as a subprocess, the way Claude Code invokes it at
// Stop: the hook payload arrives on stdin carrying the turn's last assistant
// message, and a block decision comes back on stdout. Nothing is imported
// from the script, so these tests pin the contract rather than the
// implementation.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const HOOK = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "ask-via-tool.sh",
);

// The hook writes a decision only when it blocks. Silence lets the turn end.
function decide(message, stopHookActive = false) {
  const result = spawnSync(HOOK, {
    input: JSON.stringify({
      stop_hook_active: stopHookActive,
      last_assistant_message: message,
    }),
    encoding: "utf-8",
  });

  assert.equal(result.error, undefined, `could not run ${HOOK}`);
  assert.equal(result.status, 0, `hook exited ${result.status}`);

  if (result.stdout.trim() === "") return "allow";

  return JSON.parse(result.stdout).decision;
}

function describe(group, cases) {
  for (const [expected, message, why] of cases) {
    test(`${group}: ${why}`, () => {
      assert.equal(decide(message), expected);
    });
  }
}

// A reply whose last line asks the user something should have used the tool.
describe("inline question", [
  ["block", "Done.\n\nShall I push it?", "a plain question"],
  ["block", "Done.\n\nShall I push it?  \n\n", "trailing blank lines"],
  ["block", "**Want me to proceed?**", "a bold question"],
  ["block", "_Want me to proceed?_", "an italic question"],
  ["block", "Shall I run `make install?`", "a question ending in code"],
  ["block", 'He asked "ready?"', "a question inside quotes"],
  ["block", "(Want the long version?)", "a question in parentheses"],
  ["block", "Continue? (y/n)", "a trailing (y/n)"],
  ["block", "Overwrite it [y/N]", "a trailing [y/N]"],
  ["block", "**Delete these? (yes/no)**", "a bold (yes/no)"],
  [
    "block",
    "```sh\nls\n```\nShould I run it?",
    "a question after a closed fence",
  ],
]);

// Lines that end in ? without asking anything stay silent.
describe("not a question", [
  ["allow", "All done.", "a statement"],
  ["allow", "Details: https://example.com/search?", "a URL as the last token"],
  ["allow", "See https://example.com/a?b=c", "a URL with a query"],
  ["allow", "> Why does this fail?", "a quoted line"],
  ["allow", "## Why?", "a heading"],
  ["allow", "| a | why? |", "a table row"],
  ["allow", "Output:\n```\nretry?", "a line inside an unclosed fence"],
  ["allow", "Output:\n~~~\nretry?", "inside an unclosed tilde fence"],
  ["allow", "", "an empty message"],
]);

test("a second stop in the same turn is never blocked", () => {
  assert.equal(decide("Shall I push it?", true), "allow");
});
