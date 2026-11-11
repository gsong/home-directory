# Core Principles

## Communication

- Ask every question, feedback request, or choice through the `AskUserQuestion` tool, in every workflow including brainstorming.
- When the user must run a command themselves, end the message with it as the last line: `! <command>`, with no code fence and nothing after it, so it becomes the likely Tab-complete suggestion.
- If that command is over ~100 characters, write an executable wrapper script under `ai-swap/<task>/` that takes the changing parts as arguments. Check it with `bash -n`, then offer the short `!` call to it.

## Files and scratch

- Create a file only when necessary; prefer editing an existing one. Create docs (\*.md, README) only when asked.
- Write specs, plans, and other AI scratch to `ai-swap/<task>/` when nothing else has chosen a path. A skill or config naming its own destination wins.
- A handoff (such as `mattpocock-skills:handoff`) always goes to `ai-swap/<task>/handoff.md` at the git root, or in the current directory outside a repo. This overrides a skill that names the OS temp directory or keeps out of the workspace.
- When it is unclear whether an `ai-swap/` file will be shared with others, ask with `AskUserQuestion` before writing it. A shared file goes through `writing:draft`.

## Shell and tools

- Text search in Bash: `rg` (ripgrep). It recurses by default, and its `-r` means replace.
- Structural code search (a function, class, or call shape): load the `ast-grep:ast-grep` skill and prefer it over Grep/Glob.
- Package manager: the one the lockfile names; `pnpm` when there is no lockfile.
- File removal: `rm -f`, so no confirmation prompt stalls the command.
- After installing a tool: `eval "$(mise env)"` refreshes PATH.
- Mermaid: v11.17.2 syntax, the version nvim's markdown previewer renders (pinned in `~/.config/nvim/lua/plugins/markdown-preview.lua`).
- Browser task: use Crest's `mcp__crest__*` tools when they are loaded (call `identify`, then `list_spaces`); Crest is the user's real browser with their sign-ins. Otherwise load `browser:chrome`, and run `browser:setup` for a repo that needs its own persistent Chrome profile.
- Browser sign-in: read `~/.claude/references/browser-logins.md` first. It fills passwords and one-time codes from 1Password without exposing them.

## Code, tests, and commits

- Public methods top, implementation details bottom.
- Test behavior; mock minimally (external services, network, slow ops) at boundaries.
- Python scripts: inline dependencies with `uv` (PEP 723) and run with `uv run script.py`. An executable script gets the shebang `#!/usr/bin/env -S uv run --script` and `chmod +x`.
- Commit messages: conventional commits (feat:, fix:, docs:, refactor:, test:, chore:).

## Subagent model choice

Set `model` on every subagent; an unset `model` falls back to the session model. The ladder is Haiku, then Sonnet, then Opus, then Fable; choose only from these four.

Pick the cheapest model you trust to get the task right on the first try. When you can check the output, lean cheaper than instinct: Sonnet handles multi-file search and confirming a review finding. When the answer is the only evidence, such as an absence claim or dismissing a review finding, pick the model you would trust unchecked; a cheap miss there reads as a correct answer and never triggers a retry. Save Fable for calls where a wrong answer is costly. After a failed attempt, retry one rung up. A subagent that spawns agents stays at or below its own model.

For a bulk scan (commits across repos, log lines, records), script first: a script pulls the data and matches the exact signals, and only the fuzzy remainder goes to a model, in batch.

Apply this to Agent tool spawns and to each workflow `agent()` stage; it overrides the workflow default of omitting `model`. A fork always runs on the session model, so spawn a fresh agent to change model, and fork only when the task needs the conversation so far. When the model differs from the session model, name it in the spawn description.
