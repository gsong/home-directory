# PR Review

Perform a comprehensive code review for PR #$ARGUMENTS

## Review Process

1. **Run `/review` command**: First run `/review $ARGUMENTS` and incorporate its results into your analysis
2. **Analyze Changes**: Examine all modified files and understand the scope of changes
3. **Code Quality**: Check for adherence to project conventions, best practices, and style guidelines
4. **Security**: Review for potential security vulnerabilities or data exposure
5. **Performance**: Identify potential performance issues or improvements
6. **Documentation**: Ensure code is self-documenting and complex logic is explained

## Output Format

Focus on actionable items and decisions only. Skip praise and in-depth analysis.

Provide a concise review with:

- **Decision**: MERGE or NO MERGE
- **Action Items**: Only include items that require fixing or decisions
- **Needs Decision**: Items that require user input or clarification

Focus on user-facing behavior, maintainability, and adherence to the project's testing philosophy of minimizing mocks and testing real implementations.

Ultrathink and create a structured markdown file with the assessment in the ai-swap/ directory.
