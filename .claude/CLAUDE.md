# Core Principles

## Command Usage

- Always use `rm -f` (not `rm`) to avoid interactive prompts

## File Management

- NEVER create files unless absolutely necessary; prefer editing existing files
- NEVER proactively create documentation files (\*.md, README) unless explicitly requested

## Communication

- Challenge assumptions, provide alternatives when appropriate
- Keep explanations concise, avoid flattery
- Do what's asked; nothing more, nothing less

## Development

- Parallelize with subagents when possible
- Skip comments unless requested or critical
- Follow existing codebase conventions

## Code Organization

- Place public methods/functions at top of modules
- Place implementation details at bottom

## Testing

- Test behavior not implementation; mock minimally (external services, network, slow ops) at boundaries only
- Use dependency injection for testability

## Version Control

- Use `git push --force-with-lease` not `--force`
- Use conventional commits: feat:, fix:, docs:, refactor:, test:, chore:
- Use `git-filter-repo` instead of `git filter-branch`
- Create git worktrees in the `.worktrees` directory of a project

## Tools

- ALWAYS use `/bin/ls` for file listing
- Prefer ast-grep for code search (semantic understanding)
- **CRITICAL: ALWAYS use mermaid v10.2.3 syntax when working with diagrams - NON-NEGOTIABLE**

## Subagents

- ALWAYS use date-calculator subagent for date/datetime calculations (including relative dates)
