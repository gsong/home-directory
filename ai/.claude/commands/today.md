# Show Overdue Tasks

Get all reminders, filter for tasks due today or earlier, and organize by topic. Show only incomplete tasks that are overdue or due today.

**🚨 CRITICAL DATE FILTERING - FUTURE TASKS MUST BE EXCLUDED 🚨**

**STEP 1: GET TODAY'S DATE**

- ALWAYS check today's date from environment context FIRST
- Example: "Today's date: 2025-07-18" means TODAY = July 18, 2025

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
2. Get today's exact date from environment context
3. For EVERY task with a due date:
   - Parse the task's due date (e.g., "Jul 19, 2025" → 2025-07-19)
   - Compare: Is task date > today? → EXCLUDE IT
   - Compare: Is task date <= today? → Include it
4. Double-check: NO FUTURE TASKS should appear in output
5. Categorize included tasks by:
   - Personal vs. Work-related
   - Physical vs. Virtual (phone/computer tasks)
6. FINAL VERIFICATION: Re-scan output to ensure NO dates after today

**⚠️ COMMON MISTAKES TO AVOID:**

- DO NOT include "tomorrow's" tasks
- DO NOT include "next week's" tasks
- DO NOT be fooled by #today tags on future-dated tasks
- DO NOT show any date that comes after today

**EXAMPLE FILTERING:**
If today is July 18, 2025:

- ✅ INCLUDE: Jul 18, 2025 (today)
- ✅ INCLUDE: Jul 17, 2025 (yesterday)
- ✅ INCLUDE: May 20, 2025 (past)
- ❌ EXCLUDE: Jul 19, 2025 (tomorrow)
- ❌ EXCLUDE: Jul 20, 2025 (future)
- ❌ EXCLUDE: Aug 1, 2025 (future)

**FINAL REMINDER**: If you see ANY task with a date after today in your output, you have made an error. Future tasks are NEVER today's tasks.
