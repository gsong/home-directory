# PR Review

Perform a comprehensive code review for PR #$ARGUMENTS

**All output goes to `ai-swap/pr-review-$ARGUMENTS.md` - never post comments to GitHub.**

## Setup

1. Create output file: `ai-swap/pr-review-$ARGUMENTS.md`
2. Checkout the PR branch: `gh pr checkout $ARGUMENTS`

## Reviews

### Phase 1: Initial Reviews (parallel)

Run these two in parallel. Include in each prompt:

> "Write findings to `ai-swap/pr-review-$ARGUMENTS.md`. Do not post comments to GitHub."

1. **Agent review**: Launch `superpowers:code-reviewer` agent (Task tool) for PR #$ARGUMENTS
2. **Built-in review**: Run `/review $ARGUMENTS` (Skill tool)

Wait for both to complete, then draft the preliminary report to `ai-swap/pr-review-$ARGUMENTS.md`.

### Phase 2: Final Review

Run `/code-review:code-review $ARGUMENTS` (Skill tool) with the same constraint.

Update the report with its findings.

## Output Format

The final report in `ai-swap/pr-review-$ARGUMENTS.md` should contain:

- **Decision**: MERGE or NO MERGE
- **Action Items**: Issues that require fixing
- **Needs Decision**: Items requiring user input or clarification

Focus on:

- User-facing behavior
- Maintainability
- Testing philosophy (minimize mocks, test real implementations)

Skip praise and lengthy analysis - actionable items only.
