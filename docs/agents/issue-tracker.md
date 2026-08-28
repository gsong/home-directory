# Issue tracker: Local Markdown

Issues and specs for this repo live as markdown files in `ai-swap/`.

## Which `ai-swap` this means

Every path in this file is **relative to the repo root** — the `ai-swap/`
directory inside this git checkout.

It is **not** `~/ai-swap`. That is a separate, unrelated directory that happens
to share the name. Resolve every path below against the repo root, never against
`$HOME`, even though this repo is stowed into `$HOME`.

Two consequences worth knowing:

- `ai-swap/` is gitignored globally (`~/.config/git/ignore`), so tickets are
  never committed or pushed. They stay on this machine by design.
- `ai-swap` is listed in `.stow-local-ignore`, so tickets are never symlinked
  into `$HOME` either.

## Conventions

- One feature per directory: `ai-swap/<feature-slug>/`
- The spec is `ai-swap/<feature-slug>/spec.md`
- Implementation issues are one file per ticket at `ai-swap/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01` — never a single combined tickets file
- Triage state is recorded as a `Status:` line near the top of each issue file (see `triage-labels.md` for the role strings)
- Comments and conversation history append to the bottom of the file under a `## Comments` heading

## When a skill says "publish to the issue tracker"

Create a new file under `ai-swap/<feature-slug>/` (creating the directory if needed).

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path. The user will normally pass the path or the issue number directly.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a file with one **child** file per ticket.

- **Map**: `ai-swap/<effort>/map.md` — the Notes / Decisions-so-far / Fog body.
- **Child ticket**: `ai-swap/<effort>/issues/NN-<slug>.md`, numbered from `01`, with the question in the body. A `Type:` line records the ticket type (`research`/`prototype`/`grilling`/`task`); a `Status:` line records `claimed`/`resolved`.
- **Blocking**: a `Blocked by: NN, NN` line near the top. A ticket is unblocked when every file it lists is `resolved`.
- **Frontier**: scan `ai-swap/<effort>/issues/` for files that are open, unblocked, and unclaimed; first by number wins.
- **Claim**: set `Status: claimed` and save before any work.
- **Resolve**: append the answer under an `## Answer` heading, set `Status: resolved`, then append a context pointer (gist + link) to the map's Decisions-so-far in `map.md`.
