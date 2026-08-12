#!/usr/bin/env bash
# Stop guard. CLAUDE.md requires questions to go through the AskUserQuestion
# tool, never inline prose. No tool event fires for "wrote a question as text",
# so this checks the finished turn instead: if the last line of the reply is a
# question, block the stop and say so.
#
# Heuristic. It only looks at the final non-empty line, so rhetorical questions
# mid-answer are ignored. It cannot see whether AskUserQuestion was called, but
# a turn that used the tool does not normally end on a question mark.
set -uo pipefail

payload=$(cat)

# stop_hook_active means we already blocked once this turn. Never loop.
[[ $(jq -r '.stop_hook_active // false' <<<"$payload") == "true" ]] && exit 0

msg=$(jq -r '.last_assistant_message // empty' <<<"$payload")
[[ -z $msg ]] && exit 0

last_line=$(printf '%s' "$msg" | sed 's/[[:space:]]*$//' | grep -v '^[[:space:]]*$' | tail -n 1)
[[ -z $last_line ]] && exit 0

# Markdown quotes, headings and table rows are prose, not a solicitation.
[[ $last_line =~ ^[[:space:]]*(\>|#|\||\`\`\`) ]] && exit 0

if [[ $last_line == *\? ]]; then
  jq -Rn --arg r "This turn ends with an inline question: \"$last_line\". CLAUDE.md requires the AskUserQuestion tool for questions, feedback requests, and any other user input. Ask it again through the tool." \
    '{decision: "block", reason: $r}'
fi

exit 0
