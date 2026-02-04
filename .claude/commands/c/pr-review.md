# PR Review

Perform a comprehensive code review for PR #$ARGUMENTS

**All output goes to `ai-swap/pr-review-$ARGUMENTS.md` - never post comments to GitHub.**

## Phase 1: Setup

1. Checkout the PR branch: `gh pr checkout $ARGUMENTS`
2. Get PR metadata: `gh pr view $ARGUMENTS --json title,body,files,additions,deletions`

## Phase 2: Initial Reviews (parallel)

Launch these two agents in parallel. **Agents return findings only - do not write to files.**

1. **superpowers:code-reviewer agent** (Task tool)
   - Prompt: "Review PR #$ARGUMENTS. Return your findings as structured output. Do not write to any files. Do not post comments to GitHub."

2. **Built-in /review skill** (Skill tool)
   - Run: `/review $ARGUMENTS`

Wait for both to complete before proceeding.

## Phase 3: Final Review (serial)

After Phase 2 completes, run:

- **/code-review:code-review skill** (Skill tool)
  - Run: `/code-review:code-review $ARGUMENTS`

This must run after the initial reviews complete.

## Phase 4: Synthesis

**You (the orchestrator) write the final report.** Do not delegate this step.

1. Read the findings returned by all three agents
2. Deduplicate issues (same issue from multiple agents = one item)
3. Categorize by severity and actionability
4. Write the consolidated report to `ai-swap/pr-review-$ARGUMENTS.md`

## Output Format

The final report must contain:

```markdown
# PR #$ARGUMENTS Review

## Decision: MERGE | NO MERGE

## Action Items

<!-- Issues that must be fixed before merge -->

## Needs Decision

<!-- Items requiring user input or clarification -->

## Findings by Source

### superpowers:code-reviewer

<!-- Summary of findings -->

### Built-in /review

<!-- Summary of findings -->

### /code-review:code-review

<!-- Summary of findings -->
```

## Review Focus

- User-facing behavior correctness
- Maintainability
- Testing philosophy (minimize mocks, test real implementations)

Skip praise and lengthy analysis - actionable items only.
