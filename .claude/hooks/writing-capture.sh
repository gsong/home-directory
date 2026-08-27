#!/usr/bin/env bash
# PostToolUse capture for writing-line. Pairs each edit Claude makes inside a
# draft with the instruction that caused it, and appends the pair to a log.
# Nothing is classified here. Recurrence sorts style from content later.
#
# The hook is silent on stdout. Its whole output is the log line and the fresh
# snapshot it leaves behind.
set -uo pipefail

payload=$(cat)

tool=$(jq -r '.tool_name // empty' <<<"$payload" 2>/dev/null) || exit 0
case $tool in Write | Edit | MultiEdit) ;; *) exit 0 ;; esac

file=$(jq -r '.tool_input.file_path // empty' <<<"$payload" 2>/dev/null) || exit 0
[[ $file == */ai-swap/drafts/* ]] || exit 0
[[ -f $file ]] || exit 0

rest=${file#*/ai-swap/drafts/}
profile=${rest%%/*}
[[ $profile != "$rest" ]] || exit 0

state=${WRITING_LINE_STATE:-$HOME/.claude/state/writing-line}
snapshots=$state/snapshots
mkdir -p "$snapshots" || exit 0

# The snapshot is keyed by path, so two drafts never read as edits of each
# other. The hash keeps the key flat and safe as a filename.
key=$(printf '%s' "$file" | shasum -a 256 | cut -c1-40)
snapshot=$snapshots/$key

# The first write of a draft has nothing to compare against. Logging it would
# record the whole draft as a correction.
if [[ ! -f $snapshot ]]; then
  cp "$file" "$snapshot" 2>/dev/null
  exit 0
fi

cmp -s "$snapshot" "$file" && exit 0

# The removed and added lines, not the whole file. A correction is a few lines,
# and an unbounded field makes the log unreadable.
diff_out=$(diff "$snapshot" "$file" 2>/dev/null)
original=$(sed -n 's/^< //p' <<<"$diff_out")
rewrite=$(sed -n 's/^> //p' <<<"$diff_out")

# The reason is the user's own instruction for this turn. prompt_id holds
# steady from one user prompt to the next, so every edit in a turn pairs with
# the same words. Records of type "user" also carry tool results and injected
# context, which are not the user speaking.
transcript=$(jq -r '.transcript_path // empty' <<<"$payload" 2>/dev/null)
prompt_id=$(jq -r '.prompt_id // empty' <<<"$payload" 2>/dev/null)
session_id=$(jq -r '.session_id // empty' <<<"$payload" 2>/dev/null)

reason=""
if [[ -n $transcript && -f $transcript && -n $prompt_id ]]; then
  reason=$(jq -rn --arg pid "$prompt_id" '
    [ inputs
      | select(.type == "user" and .promptId == $pid)
      | select(has("toolUseResult") | not)
      | select(.isMeta != true)
      | .message.content
      | if type == "string" then .
        else ([.[] | select(.type == "text") | .text] | join("\n"))
        end
      | select(. != null and . != "")
    ] | (first // "")' "$transcript" 2>/dev/null) || reason=""
fi

# Two tool calls in one turn can land together. A directory is the one lock
# primitive that is atomic everywhere and needs no flock binary.
lock=$state/.lock
for _ in 1 2 3 4 5 6 7 8 9 10; do
  if mkdir "$lock" 2>/dev/null; then
    trap 'rmdir "$lock" 2>/dev/null' EXIT
    break
  fi
  sleep 0.05
done

jq -cn \
  --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --arg session_id "$session_id" \
  --arg prompt_id "$prompt_id" \
  --arg profile "$profile" \
  --arg file "$file" \
  --arg reason "$reason" \
  --arg original "$original" \
  --arg rewrite "$rewrite" \
  '{$timestamp, $session_id, $prompt_id, $profile, $file}
   + {reason: $reason[:2000], original: $original[:2000], rewrite: $rewrite[:2000]}' \
  >>"$state/corrections.jsonl"

cp "$file" "$snapshot" 2>/dev/null
exit 0
