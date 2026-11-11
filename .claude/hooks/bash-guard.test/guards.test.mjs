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
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const GUARD = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "bash-guard.sh",
);

// The rm cases are written against the real home, since the guard reads
// $HOME and a fake one would also break the jq shim the guard starts.
const HOME = homedir();

// The guard writes a decision only when it has one. Silence is the pass-through
// case, and Claude Code reads it as an ordinary unguarded command. The payload
// carries the session's cwd, which the rm check resolves relative paths from.
function decide(command, cwd) {
  const result = spawnSync(GUARD, {
    input: JSON.stringify({ tool_input: { command }, ...(cwd && { cwd }) }),
    encoding: "utf-8",
  });

  assert.equal(result.error, undefined, `could not run ${GUARD}`);
  assert.equal(result.status, 0, `guard exited ${result.status}`);

  if (result.stdout.trim() === "") return "allow";

  return JSON.parse(result.stdout).hookSpecificOutput.permissionDecision;
}

function describe(group, cases, cwd) {
  for (const [expected, command, why] of cases) {
    test(`${group}: ${why}`, () => {
      assert.equal(decide(command, cwd), expected);
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

// The guard is a safety net against habit, not a security boundary, so it
// over-matches: anything that puts a force push in command position counts.
describe("force push, disguised", [
  ["deny", "git push -fu origin x", "-f in a short-flag cluster"],
  ["deny", "git push -uf origin x", "-f last in a cluster"],
  ["deny", "git push origin +main", "a + refspec"],
  ["deny", "git push origin +HEAD:main", "a + refspec with a source"],
  ["deny", "git push '-f'", "a quoted flag"],
  ["deny", "bash -c 'git push --force'", "inside bash -c"],
  ["deny", 'sh -c "git push -f"', "inside sh -c"],
  ["deny", "zsh -lc 'cd x && git push -f'", "inside zsh -lc"],
  ["deny", "eval 'git push -f'", "inside eval"],
  ["deny", "xargs git push --force", "behind xargs"],
  ["deny", "xargs -n 1 git push --force", "behind xargs and its flags"],
  ["deny", "if true; then git push --force; fi", "inside if/then"],
  ["deny", "while x; do git push -f; done", "inside a loop body"],
  ["deny", "{ git push --force; }", "inside a brace group"],
  ["deny", "! git push --force", "behind !"],
  ["deny", 'FOO="a b" git push -f', "behind a quoted env value"],
  [
    "deny",
    'GIT_SSH_COMMAND="ssh -i x" git push -f',
    "behind a spaced env value",
  ],
  ["deny", "/usr/bin/git push --force", "a path-prefixed git"],
  ["deny", "env -i git push -f", "behind env and its flags"],
  ["deny", "sudo -u me git push -f", "behind sudo and its flags"],
  ["deny", "exec git push -f", "behind exec"],
  ["deny", 'echo "$(git push --force)"', "a substitution inside quotes"],
  ["deny", "git push -f>/dev/null", "a redirect glued to the flag"],
  [
    "deny",
    "git push --force-if-includes origin +main",
    "a + refspec with no lease to check it",
  ],

  ["allow", "git push --force-with-lease=main", "--force-with-lease=ref"],
  [
    "allow",
    "git push --force-with-lease origin +main",
    "a + refspec under a lease",
  ],
  ["allow", 'git commit -m "x; git push --force"', "a separator inside quotes"],
  ["allow", "cat <<'EOF'\ngit push --force\nEOF", "a line of a heredoc"],
  ["allow", "echo 'git push -f' | pbcopy", "a quoted string piped on"],
]);

// Deleting remote refs is sometimes the job, so these prompt.
describe("remote deletion", [
  ["ask", "git push origin --delete x", "--delete"],
  ["ask", "git push origin -d x", "-d"],
  ["ask", "git push origin :x", "an empty-source refspec"],
  ["ask", "git push --mirror", "--mirror"],
  ["ask", "git push --prune origin", "--prune"],
  ["allow", "git push -u origin feature", "an upstream push"],
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
  ["deny", "git add -f ai-swap/x", "force-added"],
  ["deny", "git commit -m x -- ai-swap/y", "a commit pathspec after --"],
  ["deny", "git stash push -m wip -- ai-swap/", "a stash pathspec"],
  ["ask", "git add -f .", "a force add, which reaches ignored files"],
  ["ask", "git add --force src", "a long force add"],

  ["allow", 'git commit -m "mention ai-swap docs"', "named in a message"],
  ["allow", "git commit -am 'ai-swap notes'", "named in a clustered -m"],
  ["allow", "git commit --message=ai-swap", "named in --message="],
  ["allow", "git commit -F ai-swap/msg.txt", "the message read from it"],
  ["allow", "git stash push -m 'ai-swap wip'", "named in a stash message"],
  [
    "allow",
    "git commit -F - <<'EOF'\nkeep ai-swap/ local\nEOF",
    "named in a heredoc message",
  ],
  [
    "allow",
    `git commit -m "$(cat <<'EOF'\nkeep ai-swap/ local\nEOF\n)"`,
    "named in a substituted heredoc message",
  ],

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

// Each of these discards work that git cannot give back, so they prompt.
describe("destructive git", [
  ["ask", "git reset --hard", "reset --hard"],
  ["ask", "git reset --hard origin/main", "reset --hard to a ref"],
  ["ask", "git clean -f", "clean -f"],
  ["ask", "git clean -fd", "clean -fd"],
  ["ask", "git clean -fdx", "clean -fdx"],
  ["ask", "git clean -d --force", "clean --force"],
  ["allow", "git reset --soft HEAD~1", "a soft reset"],
  ["allow", "git reset HEAD file", "unstaging a file"],
  ["allow", "git clean -n", "a dry-run clean"],
]);

// A recursive forced rm prompts when its target is a home, the source root,
// or any path with fewer than three components. Relative paths resolve from
// the payload's cwd, so the same words can be routine in one place and
// sweeping in another.
describe(
  "sweeping rm",
  [
    ["ask", "rm -rf /", "the root"],
    ["ask", "rm -rf ~", "home as ~"],
    ["ask", "rm -rf ~/", "home as ~/"],
    ["ask", "rm -rf $HOME", "home as $HOME"],
    ["ask", 'rm -rf "$HOME"', "home as a quoted $HOME"],
    ["ask", "rm -rf ${HOME}/", "home as ${HOME}/"],
    ["ask", `rm -rf ${HOME}`, "home by absolute path"],
    ["ask", "rm -rf /Users/someone", "another user's home"],
    ["ask", `rm -rf ${dirname(HOME)}`, "a two-component path"],
    ["ask", "rm -rf /tmp", "a one-component path"],
    ["ask", "rm -rf ~/src", "the source root as ~/src"],
    ["ask", "rm -rf $HOME/src/", "the source root as $HOME/src/"],
    ["ask", "rm -fr ~", "-fr"],
    ["ask", "rm -r -f ~", "-r -f"],
    ["ask", "rm --recursive --force ~", "long flags"],
    ["ask", "rm -Rf ~", "-Rf"],
    ["ask", "rm -rf ~/*", "a glob over home"],
    ["ask", "rm -rf ~/src/proj/../..", "home reached through .."],
    ["ask", "sudo rm -rf /", "behind sudo"],
    ["ask", "rm -rf node_modules /", "the root among other targets"],

    ["allow", "rm -rf node_modules", "a build directory"],
    ["allow", "rm -rf ./build", "a ./ path"],
    ["allow", "rm -rf ~/src/proj", "a project under the source root"],
    ["allow", "rm -rf /tmp/x/y", "a deep absolute path"],
    ["allow", "rm -r ~", "recursive without force"],
    ["allow", "rm -f ~/x", "force without recursive"],
    ["allow", "echo rm -rf /", "named as an argument"],
  ],
  `${HOME}/src/proj`,
);

describe(
  "sweeping rm, from home",
  [
    ["ask", "rm -rf src", "the source root by a relative path"],
    ["ask", "rm -rf *", "a bare glob"],
    ["ask", "rm -rf .", "the cwd itself"],
    ["allow", "rm -rf build", "a directory three components deep"],
  ],
  HOME,
);

// A deny anywhere in the command outranks an ask that came first.
describe("precedence", [
  ["deny", "pkill node; git push -f", "a deny after an ask"],
  ["ask", "pkill node; git push", "only an ask"],
]);

// Anything the guard has no opinion on must come back silent.
describe("pass through", [
  ["allow", "", "an empty command"],
  ["allow", "git status --short", "a plain status"],
  ["allow", "git log --oneline -5", "a plain log"],
]);
