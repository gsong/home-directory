// Drives format.sh as a subprocess, the way Claude Code invokes it: the hook
// payload arrives on stdin, naming the file Claude just wrote. Each case
// builds a throwaway repo, runs the hook from a chosen directory, and checks
// whether the file changed. Nothing is imported from the script, so these
// tests pin the contract rather than the implementation.
//
// Prettier is the real one on the PATH. Biome is a stand-in at the repo's
// node_modules/.bin/biome, which the hook prefers over a global Biome: it
// appends a marker, so a test can tell Biome ran without Biome installed.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, test } from "node:test";
import { fileURLToPath } from "node:url";

const HOOK = join(dirname(fileURLToPath(import.meta.url)), "..", "format.sh");

// A compact table. Prettier pads its rule row, so any change means Prettier ran.
const MARKDOWN = "| a | b |\n|---|---|\n| 1 | 2 |\n";
const TYPESCRIPT = "const a = 1;\n";
const BIOME_MARK = "// biome ran\n";
const PYTHON = "x = 1\n";
const SQL = "select 1\n";
const PYPROJECT = '[project]\nname = "x"\n';

const made = [];

afterEach(() => {
  while (made.length) rmSync(made.pop(), { recursive: true, force: true });
});

test("a repo with no formatter config keeps its own style", () => {
  const repo = makeRepo({});
  assert.equal(formatted(repo, "README.md", MARKDOWN), MARKDOWN);
});

test("a repo with a .prettierrc gets Prettier's style", () => {
  const repo = makeRepo({ ".prettierrc": "{}\n" });
  assert.notEqual(formatted(repo, "README.md", MARKDOWN), MARKDOWN);
});

test("a prettier key in package.json counts as a Prettier config", () => {
  const repo = makeRepo({ "package.json": '{ "prettier": {} }\n' });
  assert.notEqual(formatted(repo, "README.md", MARKDOWN), MARKDOWN);
});

test("a Prettier config in a subdirectory governs the files below it", () => {
  const repo = makeRepo({ "docs/.prettierrc": "{}\n" });
  assert.notEqual(formatted(repo, "docs/guide.md", MARKDOWN), MARKDOWN);
  assert.equal(formatted(repo, "README.md", MARKDOWN), MARKDOWN);
});

test(".prettierignore holds when the session started outside the repo", () => {
  const repo = makeRepo({
    ".prettierrc": "{}\n",
    ".prettierignore": "decks/\n",
  });
  assert.equal(formatted(repo, "decks/deck.md", MARKDOWN, "/"), MARKDOWN);
  assert.notEqual(formatted(repo, "README.md", MARKDOWN, "/"), MARKDOWN);
});

test("a .prettierignore at the git root holds for a nested config", () => {
  const repo = makeRepo({
    ".prettierignore": "pkg/decks/\n",
    "pkg/.prettierrc": "{}\n",
  });
  assert.equal(formatted(repo, "pkg/decks/deck.md", MARKDOWN), MARKDOWN);
  assert.notEqual(formatted(repo, "pkg/README.md", MARKDOWN), MARKDOWN);
});

test("a Prettier config outside the repo does not claim it", () => {
  const parent = makeDir();
  writeFileSync(join(parent, ".prettierrc"), "{}\n");
  const repo = makeRepo({}, join(parent, "repo"));
  assert.equal(formatted(repo, "README.md", MARKDOWN), MARKDOWN);
});

test("Biome formats the types it covers in a Biome repo", () => {
  const repo = makeBiomeRepo({});
  assert.equal(
    formatted(repo, "src/a.ts", TYPESCRIPT),
    TYPESCRIPT + BIOME_MARK,
  );
});

test("a Biome repo with no Prettier config leaves Markdown alone", () => {
  const repo = makeBiomeRepo({});
  assert.equal(formatted(repo, "README.md", MARKDOWN), MARKDOWN);
});

test("a Biome repo with a .prettierrc sends Markdown to Prettier", () => {
  const repo = makeBiomeRepo({ ".prettierrc": "{}\n" });
  assert.notEqual(formatted(repo, "README.md", MARKDOWN), MARKDOWN);
  assert.equal(
    formatted(repo, "src/a.ts", TYPESCRIPT),
    TYPESCRIPT + BIOME_MARK,
  );
});

test("a Prettier config nearer than Biome's takes the file", () => {
  const repo = makeBiomeRepo({ "web/.prettierrc": "{}\n" });
  const out = formatted(repo, "web/a.ts", "const   a = 1\n");
  assert.equal(out, "const a = 1;\n");
});

test("drafts under ai-swap/drafts are never formatted", () => {
  const repo = makeRepo({ ".prettierrc": "{}\n" });
  assert.equal(formatted(repo, "ai-swap/drafts/x.md", MARKDOWN), MARKDOWN);
});

test("a file outside any repo with no config above it is left alone", () => {
  const dir = makeDir();
  assert.equal(formatted(dir, "loose.md", MARKDOWN), MARKDOWN);
});

// Ruff and SQLFluff follow the same rule: they run only where the project
// configured them. Like Biome, each is a stand-in at the repo's .venv/bin,
// which the hook prefers over a global install; it appends one marker line
// per call naming its subcommand.

test("a repo with no Ruff config keeps its Python as written", () => {
  const repo = withStub(makeRepo({}), "ruff", "#");
  assert.equal(formatted(repo, "a.py", PYTHON), PYTHON);
});

test("a pyproject.toml without a Ruff table does not count", () => {
  const repo = withStub(makeRepo({ "pyproject.toml": PYPROJECT }), "ruff", "#");
  assert.equal(formatted(repo, "a.py", PYTHON), PYTHON);
});

for (const [config, content] of [
  ["ruff.toml", ""],
  [".ruff.toml", ""],
  ["pyproject.toml", `${PYPROJECT}[tool.ruff.lint]\nselect = ["F"]\n`],
]) {
  test(`a ${config} gets Ruff's fixes, then its format`, () => {
    const repo = withStub(makeRepo({ [config]: content }), "ruff", "#");
    assert.equal(
      formatted(repo, "pkg/a.py", PYTHON),
      `${PYTHON}# ruff check\n# ruff format\n`,
    );
  });
}

test("a Ruff config outside the repo does not claim it", () => {
  const parent = makeDir();
  writeFileSync(join(parent, "ruff.toml"), "");
  const repo = withStub(makeRepo({}, join(parent, "repo")), "ruff", "#");
  assert.equal(formatted(repo, "a.py", PYTHON), PYTHON);
});

test("the global Ruff fixes and formats when the repo pins none", {
  skip: !onPath("ruff") && "ruff is not on PATH",
}, () => {
  const repo = makeRepo({ "ruff.toml": "" });
  assert.equal(formatted(repo, "a.py", "import os\nx=1\n"), "x = 1\n");
});

test("Python drafts under ai-swap/drafts are never fixed", () => {
  const repo = withStub(makeRepo({ "ruff.toml": "" }), "ruff", "#");
  assert.equal(formatted(repo, "ai-swap/drafts/a.py", PYTHON), PYTHON);
});

test("a repo with no SQLFluff config keeps its SQL as written", () => {
  const repo = withStub(makeRepo({}), "sqlfluff", "--");
  assert.equal(formatted(repo, "q.sql", SQL), SQL);
});

for (const [config, content] of [
  [".sqlfluff", "[sqlfluff]\ndialect = ansi\n"],
  ["setup.cfg", "[sqlfluff]\ndialect = ansi\n"],
  ["tox.ini", "[sqlfluff]\ndialect = ansi\n"],
  ["pyproject.toml", `${PYPROJECT}[tool.sqlfluff.core]\ndialect = "ansi"\n`],
]) {
  test(`a ${config} SQLFluff config gets SQLFluff's fixes`, () => {
    const repo = withStub(makeRepo({ [config]: content }), "sqlfluff", "--");
    assert.equal(formatted(repo, "db/q.sql", SQL), `${SQL}-- sqlfluff fix\n`);
  });
}

test("a setup.cfg without a sqlfluff section does not count", () => {
  const repo = withStub(
    makeRepo({ "setup.cfg": "[metadata]\nname = x\n" }),
    "sqlfluff",
    "--",
  );
  assert.equal(formatted(repo, "q.sql", SQL), SQL);
});

// Writes content to path inside root, runs the hook from cwd (root by
// default) and returns what the file holds afterwards.
function formatted(root, path, content, cwd = root) {
  const file = join(root, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);

  const result = spawnSync(HOOK, {
    cwd,
    input: JSON.stringify({ tool_input: { file_path: file } }),
    encoding: "utf-8",
  });

  assert.equal(result.error, undefined, `could not run ${HOOK}`);
  assert.equal(
    result.status,
    0,
    `hook exited ${result.status}: ${result.stderr}`,
  );
  return readFileSync(file, "utf-8");
}

function makeBiomeRepo(files) {
  const repo = makeRepo({ "biome.json": "{}\n", ...files });
  const biome = join(repo, "node_modules/.bin/biome");
  mkdirSync(dirname(biome), { recursive: true });
  writeFileSync(
    biome,
    `#!/bin/sh\nfor f; do :; done\nprintf '${BIOME_MARK.trimEnd()}\\n' >> "$f"\n`,
  );
  chmodSync(biome, 0o755);
  return repo;
}

// Puts a stand-in tool at the repo's .venv/bin. Each call appends a line to
// the file it is given (the last argument): the comment prefix, the tool's
// name, and its first argument, the subcommand.
function withStub(repo, name, comment) {
  const bin = join(repo, ".venv/bin", name);
  mkdirSync(dirname(bin), { recursive: true });
  writeFileSync(
    bin,
    `#!/bin/sh\nfor f; do :; done\nprintf '%s ${name} %s\\n' '${comment}' "$1" >> "$f"\n`,
  );
  chmodSync(bin, 0o755);
  return repo;
}

function onPath(name) {
  return spawnSync("sh", ["-c", `command -v ${name}`]).status === 0;
}

function makeRepo(files, at = join(makeDir(), "repo")) {
  mkdirSync(at, { recursive: true });
  const init = spawnSync("git", ["init", "-q", at]);
  assert.equal(init.status, 0, "git init failed");
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(at, path)), { recursive: true });
    writeFileSync(join(at, path), content);
  }
  return at;
}

function makeDir() {
  const dir = mkdtempSync(join(tmpdir(), "format-hook-"));
  made.push(dir);
  return dir;
}
