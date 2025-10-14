Generate a CRM summary report for clients requiring attention.

**Filtering Logic:**

- Include clients with status "active"
- Include clients with completed follow-ups since the cutoff date (default: 30 days ago if no date provided)
- Use the date argument $ARGUMENTS as YYYY-MM-DD format, or default to 30 days ago

**For each matching client, provide:**

1. **Client name** and current status array
2. **Overdue follow-ups** (due dates before today) - highlight these
3. **Upcoming follow-ups** (next 7 days)
4. **Recent completed activities** since cutoff date with outcomes

**Implementation:**

- Use `date +%Y-%m-%d` to get today's date for comparisons
- Default cutoff: `date -d "30 days ago" +%Y-%m-%d` if no argument provided
- Parse sahaj/crm.json structure with proper date comparisons
- Format output for Slack (clean, minimal formatting, easy to copy/paste)

**Output Format:**

```
## CRM Summary (since YYYY-MM-DD)

**OVERDUE ITEMS:**
- Client Name: overdue follow-up description (due YYYY-MM-DD)

**ACTIVE CLIENTS:**

**Client Name** [status]
- Next: upcoming follow-up (YYYY-MM-DD)
- Recent: completed activity outcome (completed YYYY-MM-DD)
```
