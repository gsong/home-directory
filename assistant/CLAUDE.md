## Reminders/Tasks

- Built-in reminder filters don't work reliably for overdue/today's tasks
- Always use `mcp__reminders__list_reminders` without filters first
- Manually compare dates to current date to determine status
- Check today's date from environment context when working with tasks

## Date Handling

- Always use bash command `date +%Y-%m-%d` to get today's date when logging contacts or time-sensitive information
- Don't rely on environment context for current date in contact tracking

## Contact Management (friends/contacts.json)

The JSON structure for tracking friend contacts:

```json
{
  "friends": [
    {
      "name": "Person Name",
      "contactFrequency": "2 weeks|1 month|6 weeks|2 months|3 months",
      "lastContact": "YYYY-MM-DD",
      "nextContact": "YYYY-MM-DD",
      "notes": [
        {
          "date": "YYYY-MM-DD",
          "content": "Note about interaction"
        }
      ]
    }
  ]
}
```

Common operations:

- **Add person**: Add new object to friends array with contactFrequency
- **Log contact**: Update lastContact to today (use `date +%Y-%m-%d`), calculate nextContact based on frequency, add note to notes array
- **Calculate next contact**: Add frequency period to lastContact date
- **Show contacts**: Read file and format as table, can sort by frequency or due dates
- **Update frequency**: Change contactFrequency field and recalculate nextContact if lastContact exists

Frequency calculations:

- 2 weeks = +14 days
- 1 month = +30 days
- 6 weeks = +42 days
- 2 months = +60 days
- 3 months = +90 days
