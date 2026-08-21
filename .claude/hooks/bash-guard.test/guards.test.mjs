// Drives bash-guard.sh as a subprocess, the way Claude Code invokes it: the
// hook payload arrives on stdin, the decision comes back on stdout. Nothing is
// imported from the script, so these tests pin the contract rather than the
// implementation.
//
// The commands below are themselves valid-looking git invocations. That is the
// reason they sit in a file: on a command line they occupy command position,
// where the installed guard reads them as real calls and blocks the test run.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const GUARD = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "bash-guard.sh",
);

// The guard writes a decision only when it has one. Silence is the pass-through
// case, and Claude Code reads it as an ordinary unguarded command.
function decide(command) {
  const result = spawnSync(GUARD, {
    input: JSON.stringify({ tool_input: { command } }),
    encoding: "utf-8",
  });

  assert.equal(result.error, undefined, `could not run ${GUARD}`);
  assert.equal(result.status, 0, `guard exited ${result.status}`);

  if (result.stdout.trim() === "") return "allow";

  return JSON.parse(result.stdout).hookSpecificOutput.permissionDecision;
}

function describe(group, cases) {
  for (const [expected, command, why] of cases) {
    test(`${group}: ${why}`, () => {
      assert.equal(decide(command), expected);
    });
  }
}

// A bare force flag discards whatever the remote gained since the last fetch.
// --force-with-lease and --force-if-includes carry that check, so they pass.
// Every push in a compound command is examined, not only the first.
describe("force push", [
  ["deny", "git push --force", "bare --force"],
  ["deny", "git push -f origin main", "-f short flag"],
  ["deny", "git push --force origin main", "--force before the refspec"],
  [
    "deny",
    "git push origin main; git push --force other main",
    "the second push offends",
  ],
  ["deny", "git push a; git push b; git push -f c", "the third of three"],
  ["deny", "git status && git push --force", "after an && chain"],
  ["deny", "git -C /repo push --force", "routed through -C"],
  ["deny", "git -c user.name=x push --force", "routed through -c"],
  ["deny", "GIT_SSH_COMMAND=x git push --force", "behind an env assignment"],
  ["deny", "git push \\\n  --force origin main", "wrapped over a continuation"],
  ["deny", "echo hi\ngit push --force", "on its own line"],
  ["deny", "echo $(git push --force)", "inside a command substitution"],

  ["allow", "git push --force-with-lease", "--force-with-lease"],
  ["allow", "git push --force-if-includes origin main", "--force-if-includes"],
  [
    "allow",
    "git push origin main; git push --force-with-lease other",
    "a lease push after a plain one",
  ],
  ["allow", "rm -f junk.txt && git push origin main", "rm -f, then a push"],
  ["allow", "grep -f pats.txt log.txt && git push", "grep -f, then a push"],
  [
    "allow",
    "find . -name x -exec rm -f {} \\; && git push",
    "-f belongs to another command",
  ],
  [
    "allow",
    'node -e "const s = 1 // git push --force is blocked"',
    "named inside a quoted string",
  ],
  [
    "allow",
    "git push origin main # never use git push --force",
    "named in a trailing comment",
  ],
  ["allow", "git push origin main", "a plain push"],
]);

// ai-swap/ holds local-only specs and plans and must never enter history. The
// path is caught as an argument to a staging command, including when quoted,
// and ignored when it is merely mentioned.
describe("scratch dir", [
  ["deny", "git add ai-swap/spec.md", "staged by path"],
  ["deny", "git add 'ai-swap/spec.md'", "staged as a quoted argument"],
  ["deny", "git commit ai-swap/x -m hi", "named on a commit"],
  ["deny", "git stash push ai-swap/", "pushed to the stash"],
  ["deny", "git add ok.txt; git add ai-swap/bad", "the second segment offends"],
  ["deny", "git -C /repo add ai-swap/x", "routed through -C"],
  ["deny", "git add -A ai-swap/", "after a flag"],

  [
    "allow",
    'node -e "const s = \\"git add/commit for ai-swap/\\""',
    "named inside a quoted string",
  ],
  [
    "allow",
    "git commit -m 'note' # ai-swap/ stays local",
    "named in a trailing comment",
  ],
  ["allow", "git add src/foo.js && echo ai-swap/", "outside the git segment"],
  [
    "allow",
    "grep -rn ai-swap/ notes && git commit -m x",
    "grepped, then a commit",
  ],
  ["allow", "git add src/foo.js", "an unrelated staging"],
  [
    "allow",
    "sed -i '' s/x/y/ ai-swap/notes.md",
    "edited in place, never staged",
  ],
]);

// A preference, not a prohibition: git-filter-repo is the better tool, but
// filter-branch is occasionally the right one, so this prompts rather than
// blocks.
describe("filter-branch", [
  ["ask", "git filter-branch --tree-filter x HEAD", "a real call"],
  ["ask", "echo hi; git filter-branch -f HEAD", "in the second segment"],
  [
    "allow",
    "echo 'do not use git filter-branch'",
    "named inside a quoted string",
  ],
]);

// Anything the guard has no opinion on must come back silent.
describe("pass through", [
  ["allow", "", "an empty command"],
  ["allow", "git status --short", "a plain status"],
  ["allow", "git log --oneline -5", "a plain log"],
]);
