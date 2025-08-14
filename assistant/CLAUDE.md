## Critical Operations

### Date Handling

- Always use bash command `date +%Y-%m-%d` to get today's date for YYYY-MM-DD format
- For ISO 8601 timestamps (with time), use `date -u +"%Y-%m-%dT%H:%M:%SZ"`
- Never guess or approximate dates/timestamps - always get the actual current time
- When comparing dates (e.g., for overdue tasks), manually compare against current date
- Don't rely on environment context date for operations - always fetch fresh date

### Reminders/Tasks

- Built-in reminder filters don't work reliably for overdue/today's tasks
- Always use `mcp__reminders__list_reminders` without filters first
- Manually compare dates to current date to determine status

## Data Systems

### Contact Management (personal/friends.json)

JSON structure:

```json
{
  "friends": [
    {
      "name": "Person Name",
      "contactFrequency": "1 week|2 weeks|1 month|6 weeks|2 months|3 months",
      "lastContact": "YYYY-MM-DD",
      "nextContact": "YYYY-MM-DD",
      "notes": [{ "date": "YYYY-MM-DD", "content": "Note" }]
    }
  ]
}
```

Operations: add person, log contact, update frequency, show contacts  
Frequency calculations: 1 week=+7 days, 2 weeks=+14, 1 month=+30, 6 weeks=+42, 2 months=+60, 3 months=+90

### Sahaj CRM (sahaj/crm.json)

JSON-based CRM tracking clients and follow-ups.

**Client Schema:**

- `id`: company-name-001 format
- `name`, `updated_at` (ISO 8601), `status` array
- `follow_ups`: [{id: fu-XXX, date: YYYY-MM-DD, purpose}]
- `completed_follow_ups`: [+ completed_date, outcome]
- `custom_fields`: flexible metadata

**Operations:** Always update `updated_at`, use consistent ID formatting, maintain JSON structure

### Feedback Journal (costmine/feedback-journal.json)

Simple structure:

```json
{
  "feedback_journal": [
    {
      "name": "Person Name",
      "entries": [{ "date": "YYYY-MM-DD", "feedback": "content" }]
    }
  ]
}
```

Operations: add person, add feedback entry
