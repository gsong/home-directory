# Review Docs AI

Review and edit all AI-optimized documentation to optimize for Claude Code effectiveness.

## Goal

Improve docs as quick reference material for Claude Code lookups. Prioritize:

- **Effectiveness**: Easy to find answers without extensive searching
- **Conciseness**: File references over code snippets, brief explanations
- **Accuracy**: Verify information matches current codebase

## Execution

### Phase 1: Structural Analysis

1. **Discover docs directory**: Check for these locations in order:
   - `docs-ai/`
   - `docs/ai/`
   - `.claude/docs/`
   - If none exist, ask user for location
2. **Launch completeness evaluation subagent**: Use Task tool with general-purpose subagent to analyze:
   - **Project context**: Read key project files (package.json, go.mod, Cargo.toml, etc.) to understand project type and tech stack
   - **Codebase patterns**: Use Glob/Grep to identify major patterns (components, routes, state management, API endpoints, etc.)
   - **Existing docs**: Read all current docs to understand what's covered
   - **Documentation gaps**: Identify missing topics that should be documented based on project complexity
   - **Redundancy**: Find overlapping content that should be consolidated
   - **Extraneous docs**: Identify docs that don't match current codebase reality
   - **README.md accuracy**: Verify the documentation map accurately reflects available docs and their headings

   Subagent should output:
   - **Files to add**: List with rationale
   - **Files to remove**: List with rationale
   - **Files to consolidate**: Merge suggestions with rationale
   - **README.md updates needed**: Sections to add/remove/reorganize

3. **Present recommendations**: Show structural analysis to user and ask for approval before proceeding

### Phase 2: Content Review

Launch parallel subagents (one per doc file) to review and edit simultaneously.

Each subagent must:

1. **Read assigned doc** - Understand current content
2. **Verify accuracy** - Check referenced files/code exist and are correct
3. **Remove unnecessary content**:
   - Outdated information
   - Verbose explanations that could be one line
   - Code snippets that could be file:line references
   - Redundant information covered elsewhere
4. **Edit for effectiveness**:
   - Use file:line references (e.g., `src/store/useAppStore.ts:45`) instead of code blocks
   - Keep explanations concise and scannable
   - Ensure headings clearly indicate content
   - Add cross-references to related docs where helpful
   - Focus on "what Claude Code needs to know" not "what humans want to read"
5. **Report changes** - Summarize what was modified and why

Steps:

1. **Discover docs**: Use Glob tool to find all markdown files in the docs directory (including any newly created ones from Phase 1)
2. **Launch parallel review subagents**: Use Task tool with general-purpose subagent type to launch one agent per doc file in parallel (single message with multiple Task tool calls)
3. **Summarize**: After all agents complete, summarize total changes across all docs
