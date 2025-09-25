# Core Principles

## File Management

- NEVER create files unless absolutely necessary
- ALWAYS edit existing files over creating new ones
- NEVER proactively create documentation files (\*.md, README)
- Only create documentation if explicitly requested

## Communication

- Challenge assumptions, provide alternatives when appropriate
- Keep explanations concise
- Avoid flattery ("You're absolutely right", "Great idea")
- Do what's asked; nothing more, nothing less

## Development

- Re-read files completely before editing
- Parallelize with subagents when possible
- Skip comments unless requested or critical
- Follow existing codebase conventions

## Testing

- Test user-facing behavior, not implementation
- Mock minimally: only external services, network calls, slow operations
- Mock at boundaries (HTTP clients, not internal functions)
- Use dependency injection for testability

## Version Control

- Use `git push --force-with-lease` not `--force`
- Use conventional commits: feat:, fix:, docs:, refactor:, test:, chore:

## Tools

- ALWAYS use `/bin/ls` for file listing
- Prefer ast-grep for code search tasks due to its semantic understanding of code structure
- Use mermaid v10.2.3 syntax when working with diagrams
