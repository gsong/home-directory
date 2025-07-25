## Date Handling

- Always use bash command `date +%Y-%m-%d` to get today's date for YYYY-MM-DD format
- For ISO 8601 timestamps (with time), use `date -u +"%Y-%m-%dT%H:%M:%SZ"`
- Never guess or approximate dates/timestamps - always get the actual current time
- When comparing dates (e.g., for overdue tasks), manually compare against current date
- Don't rely on environment context date for operations - always fetch fresh date

## Reminders/Tasks

- Built-in reminder filters don't work reliably for overdue/today's tasks
- Always use `mcp__reminders__list_reminders` without filters first
- Manually compare dates to current date to determine status

## Contact Management @personal/friends.json

The JSON structure for tracking friend contacts:

```json
{
  "friends": [
    {
      "name": "Person Name",
      "contactFrequency": "1 week|2 weeks|1 month|6 weeks|2 months|3 months",
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
- **Log contact**: Update lastContact to today, calculate nextContact based on frequency, add note to notes array
- **Calculate next contact**: Add frequency period to lastContact date
- **Show contacts**: Read file and format as table, can sort by frequency or due dates
- **Update frequency**: Change contactFrequency field and recalculate nextContact if lastContact exists

Frequency calculations:

- 1 week = +7 days
- 2 weeks = +14 days
- 1 month = +30 days
- 6 weeks = +42 days
- 2 months = +60 days
- 3 months = +90 days

## Sahaj CRM @sahaj/crm.json

This is a minimal CRM (Customer Relationship Management) system that currently operates as a JSON-based data store. The system tracks client information, follow-ups, and custom fields for business relationship management.

### Architecture

- **Primary Data File**: `sahaj/crm.json` - Contains all client and follow-up data
- **Storage Format**: JSON with structured schema for clients and follow-ups
- **No Application Layer**: Currently a data-only system requiring manual JSON editing

### Client Schema

Each client record contains:

- `id`: Unique identifier (format: company-name-001)
- `name`: Company/client name
- `updated_at`: ISO 8601 timestamp of last modification
- `status`: Array of status tags (active, prospect, onboarding)
- `follow_ups`: Array of scheduled follow-up tasks with id, date, and purpose
- `completed_follow_ups`: Array of completed follow-up tasks with additional completion details
- `custom_fields`: Flexible object for client-specific metadata

### Follow-up Schema

Each follow-up contains:

- `id`: Unique identifier (format: fu-XXX)
- `date`: Follow-up date in YYYY-MM-DD format
- `purpose`: Description of the follow-up objective

### Completed Follow-up Schema

Each completed follow-up contains:

- `id`: Unique identifier (format: fu-XXX)
- `date`: Original scheduled date in YYYY-MM-DD format
- `purpose`: Original purpose of the follow-up
- `completed_date`: Date when the follow-up was completed in YYYY-MM-DD format
- `outcome`: Description of the follow-up result or outcome

### Common Operations

#### Data Management Patterns

- Always update `updated_at` field when modifying client records
- Use consistent ID formatting: `company-name-001` for clients, `fu-XXX` for follow-ups
- Maintain JSON structure and avoid breaking syntax
- Use `null` instead of empty strings for optional fields
