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

main() {
  local payload out stop_hook_active msg line
  payload=$(cat)

  # Starting jq costs far more than the parse: the jq on PATH is a mise shim,
  # which starts mise before jq ever sees the input, about 60ms a call. One run
  # returns both fields. The message runs to many lines, so it goes last and
  # takes everything after the first newline.
  out=$(jq -r '.stop_hook_active // false, .last_assistant_message // ""' \
    <<<"$payload" 2>/dev/null)
  stop_hook_active=${out%%$'\n'*}
  msg=${out#*$'\n'}

  # stop_hook_active means we already blocked once this turn. Never loop.
  [[ $stop_hook_active == "true" ]] && exit 0
  [[ -z $msg ]] && exit 0

  read_last_line "$msg"
  [[ -z $LAST_LINE ]] && exit 0
  # A last line inside an unclosed code fence is output, not prose.
  ((FENCES % 2)) && exit 0

  if asks "$LAST_LINE"; then
    jq -Rn --arg r "Put this question to the user through the AskUserQuestion tool: \"$LAST_LINE\"" \
      '{decision: "block", reason: $r}'
  fi
  exit 0
}

LAST_LINE=
FENCES=0

# Sets LAST_LINE to the last non-blank line, trailing space trimmed, and
# FENCES to the number of code-fence lines (``` or ~~~) in the message.
read_last_line() {
  local line
  while IFS= read -r line; do
    [[ $line =~ ^[[:space:]]*(\`\`\`|~~~) ]] && ((FENCES++))
    [[ $line == *[![:space:]]* ]] && LAST_LINE=${line%"${line##*[![:space:]]}"}
  done <<<"$1"
}

# True when the line asks something: it ends in ? once closing markdown and
# punctuation are stripped, or it ends in a (y/n) style prompt.
asks() {
  local line=$1 last_token
  # Markdown quotes, headings and table rows are prose, not a solicitation.
  [[ $line =~ ^[[:space:]]*(\>|#|\||\`\`\`|~~~) ]] && return 1
  # A URL's ? starts its query string.
  last_token=${line##*[[:space:]]}
  [[ $last_token == *://* ]] && return 1

  local yes_no='[([](y|n|yes|no)/(y|n|yes|no)[])][*_`"'\''[:space:]]*$'
  shopt -s nocasematch
  if [[ $line =~ $yes_no ]]; then
    shopt -u nocasematch
    return 0
  fi
  shopt -u nocasematch

  while [[ $line == *[*_\`\"\'\)\][:space:]] ]]; do
    line=${line%?}
  done
  [[ $line == *\? ]]
}

main
