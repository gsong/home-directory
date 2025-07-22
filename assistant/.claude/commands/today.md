# Show Overdue Tasks

Get all reminders, filter for tasks due today or earlier, and organize by topic. Show only incomplete tasks that are overdue or due today.

**🚨 CRITICAL DATE FILTERING - FUTURE TASKS MUST BE EXCLUDED 🚨**

**STEP 1: GET TODAY'S DATE WITH CORRECT TIMEZONE**

- ALWAYS get the current date in the user's timezone using: `TZ="US/Pacific" date +"%Y-%m-%d %H:%M:%S %Z"`
- DO NOT rely on environment context date - it may be in UTC or wrong timezone
- Example: If user is in US/Pacific timezone, get Pacific time first
- Parse the actual current date in user's timezone for comparison

**STEP 2: STRICT FILTERING LOGIC**

```
FOR each task:
  IF task.dueDate > TODAY:
    EXCLUDE (DO NOT SHOW)
  ELSE:
    INCLUDE (SHOW)
```

**ABSOLUTELY EXCLUDE THESE:**

- ❌ Tasks due TOMORROW (e.g., Jul 19 when today is Jul 18)
- ❌ Tasks due NEXT WEEK
- ❌ Tasks due NEXT MONTH
- ❌ Tasks due NEXT YEAR
- ❌ ANY task where date > today

**ONLY INCLUDE THESE:**

- ✅ Tasks due TODAY
- ✅ Tasks due YESTERDAY or earlier
- ✅ Tasks from past months/years

**IMPLEMENTATION CHECKLIST:**

1. Use `mcp__reminders__list_reminders` to get all reminders
2. Get today's exact date in user's timezone using `TZ="US/Pacific" date +"%Y-%m-%d %H:%M:%S %Z"`
3. **MANDATORY DATE PARSING:** For EVERY task with a due date, use bash to convert dates:
   ```bash
   # Convert reminder date format to YYYY-MM-DD for comparison
   date -j -f "%b %d, %Y" "Jul 19, 2025" "+%Y-%m-%d"  # → 2025-07-19
   date -j -f "%b %d, %Y" "Jul 18, 2025" "+%Y-%m-%d"  # → 2025-07-18
   ```
4. **STRICT COMPARISON:** Use bash date comparison to verify:
   ```bash
   # Only include if task_date <= today_date
   if [[ "2025-07-19" > "2025-07-18" ]]; then echo "EXCLUDE"; fi
   ```
5. **MANDATORY VERIFICATION:** Before showing any task, verify its date:
   - Show the parsed date next to each task
   - Double-check: NO FUTURE TASKS should appear in output
6. Categorize included tasks by:
   - Personal vs. Work-related
   - Physical vs. Virtual (phone/computer tasks)
7. **FINAL VERIFICATION:** Re-scan output to ensure NO dates after today

**⚠️ COMMON MISTAKES TO AVOID:**

- DO NOT include "tomorrow's" tasks
- DO NOT include "next week's" tasks
- DO NOT be fooled by #today tags on future-dated tasks
- DO NOT show any date that comes after today
- DO NOT rely on environment context date - always get timezone-specific date
- DO NOT assume UTC time is user's local time

**EXAMPLE FILTERING:**
If today is July 18, 2025:

- ✅ INCLUDE: Jul 18, 2025 (today)
- ✅ INCLUDE: Jul 17, 2025 (yesterday)
- ✅ INCLUDE: May 20, 2025 (past)
- ❌ EXCLUDE: Jul 19, 2025 (tomorrow)
- ❌ EXCLUDE: Jul 20, 2025 (future)
- ❌ EXCLUDE: Aug 1, 2025 (future)

**FINAL REMINDER**: If you see ANY task with a date after today in your output, you have made an error. Future tasks are NEVER today's tasks.
