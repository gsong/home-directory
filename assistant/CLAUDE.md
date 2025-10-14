## Data Systems

### Contact Management (personal/friends.json)

**Fields**: name, contactFrequency (1 week|2 weeks|1 month|6 weeks|2 months|3 months), lastContact (YYYY-MM-DD), nextContact (YYYY-MM-DD), notes[{date, content}]

**Operations**: add person, log contact, update frequency, show contacts
**Frequency**: 1 week=+7d, 2 weeks=+14d, 1 month=+30d, 6 weeks=+42d, 2 months=+60d, 3 months=+90d

### Sahaj CRM (sahaj/crm.json)

**Fields**: id (company-name-001), name, updated_at (ISO 8601), status[], follow_ups[{id: fu-XXX, date: YYYY-MM-DD, purpose}], completed_follow_ups[+ completed_date, outcome], custom_fields{}

**Operations**: Always update `updated_at`, use consistent ID formatting, maintain JSON structure

### Feedback Journal (costmine/feedback-journal.json)

**Fields**: name, entries[{date: YYYY-MM-DD, feedback}]

**Operations**: add person, add feedback entry

**Recording**: Edit input for clarity/readability while retaining intent - improve grammar and flow, don't use verbatim
