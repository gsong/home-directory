# Today's Tasks Dashboard

Show all tasks due today or overdue from multiple sources, organized by category.

## Data Sources

1. **Reminders**: via `mcp__reminders__list_reminders`
2. **CRM Follow-ups**: `sahaj/crm.json`
3. **Friend Contacts**: `personal/friends.json`

## Implementation Steps

### 1. Get Current Date

```bash
# Get today's date in user's timezone (US/Pacific)
TODAY=$(TZ="US/Pacific" date +"%Y-%m-%d")
```

### 2. Fetch All Tasks

**Reminders:**

- Call `mcp__reminders__list_reminders` without filters
- Parse dates and compare: include only if dueDate <= TODAY
- Skip tasks without due dates

**CRM Follow-ups:**

- Read `sahaj/crm.json` (if exists)
- For each client in `clients` array, check `follow_ups` array
- Include if `date` <= TODAY
- Format: "[Client Name] - purpose (due: date)"

**Friend Contacts:**

- Read `personal/friends.json` (if exists)
- For each friend in `friends` array, check `nextContact` date
- Include if `nextContact` <= TODAY
- Calculate days overdue: (TODAY - nextContact)
- Format: "Name (frequency) - X days overdue"

### 3. Date Comparison

For consistent date comparison across formats:

```bash
# Platform-aware date parsing (macOS uses -j, Linux uses -d)
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS: Convert reminder format to YYYY-MM-DD
  parsed_date=$(date -j -f "%b %d, %Y" "$date_string" "+%Y-%m-%d" 2>/dev/null)
else
  # Linux: Convert reminder format to YYYY-MM-DD
  parsed_date=$(date -d "$date_string" "+%Y-%m-%d" 2>/dev/null)
fi

# Compare dates: include if task_date <= today
if [[ "$parsed_date" > "$TODAY" ]]; then
  # EXCLUDE - this is a future task
else
  # INCLUDE - this is due today or overdue
fi
```

### 4. Output Format

```
📅 TODAY'S TASKS (YYYY-MM-DD)

💼 WORK
━━━━━━━━━━━━━━━━
CRM Follow-ups:
• [Client Name] - Follow-up purpose (due: YYYY-MM-DD)


Work Reminders:
• Task description (due: YYYY-MM-DD)

🏠 PERSONAL
━━━━━━━━━━━━━━━━
Friend Contacts:
• Name (frequency) - X days overdue

Personal Reminders:
• Task description (due: YYYY-MM-DD)

📊 SUMMARY: X work tasks, Y personal tasks
```

## Critical Rules

1. **NEVER show future tasks** - Any date > TODAY must be excluded
2. **Handle missing data gracefully** - Check if files exist before reading
3. **Sort by urgency** - Most overdue tasks first within each category
4. **Empty sections** - Hide sections with no tasks

## Contact Frequency Mapping

When calculating next contact date and overdue days:

- "1 week" = 7 days
- "2 weeks" = 14 days
- "1 month" = 30 days
- "6 weeks" = 42 days
- "2 months" = 60 days
- "3 months" = 90 days

Example calculation:

```bash
# Days between two dates
days_overdue=$(( ($(date -j -f "%Y-%m-%d" "$TODAY" "+%s") - $(date -j -f "%Y-%m-%d" "$nextContact" "+%s")) / 86400 ))
```

## Error Handling

- If reminder service is unavailable, note it and continue with other sources
- If JSON files don't exist or are malformed, skip that source
- Always show at least the summary line, even if no tasks found
