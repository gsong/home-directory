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

- **FIRST STEP**: Read project-specific .claude/CLAUDE.md and follow ALL pre-flight checklists
- Skip comments unless requested or critical
- Follow existing codebase conventions

## Package Management

- ALWAYS use `pnpm` over `npm` for Node.js projects

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

- **STRONGLY PREFER subagents for ALL tasks**
- **Use subagents when they can do things faster** - speed and efficiency are paramount
- Parallelize subagents whenever possible for maximum efficiency
- **CRITICAL**: Check project-specific .claude/CLAUDE.md for MANDATORY subagent usage (e.g., docs-lookup)
- **ALWAYS** follow project-specific pre-flight checklists before coding
- ALWAYS use date-calculator subagent for date/datetime calculations (including relative dates)
- ALWAYS use Explore subagent for codebase exploration, understanding structure, finding patterns
- When project has docs-lookup agent: USE IT for refactoring, UI changes, new features, state changes
