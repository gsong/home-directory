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

## Business CRM (crm/crm.json)

This is a minimal CRM (Customer Relationship Management) system that currently operates as a JSON-based data store. The system tracks client information, follow-ups, and custom fields for business relationship management.

### Architecture

- **Primary Data File**: `crm/crm.json` - Contains all client and follow-up data
- **Storage Format**: JSON with structured schema for clients and follow-ups
- **No Application Layer**: Currently a data-only system requiring manual JSON editing

### Client Schema

Each client record contains:

- `id`: Unique identifier (format: company-name-001)
- `name`: Company/client name
- `updated_at`: ISO 8601 timestamp of last modification
- `status`: Array of status tags (active, prospect, onboarding)
- `follow_ups`: Array of scheduled follow-up tasks with id, date, and purpose
- `custom_fields`: Flexible object for client-specific metadata

### Follow-up Schema

Each follow-up contains:

- `id`: Unique identifier (format: fu-XXX)
- `date`: Follow-up date in YYYY-MM-DD format
- `purpose`: Description of the follow-up objective

### Common Operations

#### Working with Timestamps

When updating client records, ALWAYS use the exact current UTC time by running this command first:

```bash
date -u +"%Y-%m-%dT%H:%M:%SZ"
```

Never guess or approximate timestamps - always get the actual current time.

#### Data Management Patterns

- Always update `updated_at` field when modifying client records
- Use consistent ID formatting: `company-name-001` for clients, `fu-XXX` for follow-ups
- Maintain JSON structure and avoid breaking syntax
- Use `null` instead of empty strings for optional fields
