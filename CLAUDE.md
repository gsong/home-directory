# home-directory

macOS dotfiles, managed with GNU stow. See `README.md` for setup.

## Agent skills

### Issue tracker

Issues and specs live as markdown files under `ai-swap/<feature-slug>/` in this repo. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical roles, unchanged: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context. `CONTEXT.md` and `docs/adr/` would live at the repo root, but neither
exists yet. The skills create them lazily; don't create them upfront. See
`docs/agents/domain.md`.
