# Core Principles (CRITICAL - Always Follow)

## File Management

- **NEVER** create files unless absolutely necessary for the goal
- **ALWAYS** prefer editing existing files over creating new ones
- **NEVER** proactively create documentation files (\*.md) or README files
- Only create documentation if explicitly requested

_Rationale: Minimizes codebase clutter and maintains existing project structure_

## Communication Style

- Challenge assumptions and provide alternative perspectives when appropriate
- Keep explanations concise - avoid unnecessary elaboration
- Avoid flattery phrases like "You're absolutely right" or "Great idea"
- Do what has been asked; nothing more, nothing less

# Development Workflow

## Analysis Phase

- Re-read existing files completely before making edits to understand context
- Parallelize tasks with subagents as much as possible

## Coding Standards

- Skip comments unless explicitly requested or critical for complex logic
- Follow existing conventions and patterns in the codebase

## Testing Philosophy

- Write tests that verify user-facing behavior, not internal implementation
- Test from the user's perspective of how they interact with the code
- Validate all modifications against actual implementation before finalizing
- **Mock minimally**: Prefer real implementations when possible
- Only mock external services, network calls, or slow operations
- When mocking is necessary, mock at boundaries (HTTP clients, not internal functions)
- Use dependency injection and factory patterns for testability

## Version Control

- Use `git push --force-with-lease` instead of `git push --force`
- Use conventional commits: "feat:", "fix:", "docs:", "refactor:", "test:", "chore:"

# Tool Preferences

- **ALWAYS** use built-in `/bin/ls` command for listing files and directories
- **NEVER** use ls aliases, exa, or other alternatives
- This ensures consistent, predictable output across all systems
