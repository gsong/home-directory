#!/usr/bin/env bash
# PreToolUse guard for Bash. Blocks three irreversible actions that CLAUDE.md
# used to only ask for in prose. Reads the hook payload on stdin, writes a
# permissionDecision on stdout.
set -uo pipefail

decide() { # decide <deny|ask> <reason>
  jq -Rn --arg d "$1" --arg r "$2" \
    '{hookSpecificOutput: {hookEventName: "PreToolUse", permissionDecision: $d, permissionDecisionReason: $r}}'
  exit 0
}
deny() { decide deny "$1"; }
ask() { decide ask "$1"; }

cmd=$(jq -r '.tool_input.command // empty' 2>/dev/null) || exit 0
[[ -z $cmd ]] && exit 0

# Bare --force on a push. --force-with-lease and --force-if-includes pass.
# Scan only the push segment, so an unrelated -f earlier in a compound command
# (rm -f, grep -f) does not trip the guard.
push_seg=$(printf '%s' "$cmd" | grep -oE 'git[[:space:]]+push[^&|;]*' | head -n 1)
if [[ -n $push_seg ]]; then
  if [[ $push_seg =~ --force([^-]|$) ]] || [[ $push_seg =~ [[:space:]]-f([[:space:]]|$) ]]; then
    deny "Bare force-push blocked. Use 'git push --force-with-lease' instead."
  fi
fi

# ai-swap/ holds local-only specs and plans. It must never enter git history.
# Only text in command position counts. Split the command on shell separators,
# then look at segments that actually start with git, so the path named inside
# a quoted string, a heredoc, or a trailing comment does not trip the guard.
# A quoted path argument still trips it: quotes are deliberately not stripped.
folded=${cmd//$'\\\n'/ }
while IFS= read -r seg; do
  seg=${seg%%[[:space:]]#*}
  # Peel leading env assignments and wrappers so they do not hide the verb.
  while [[ $seg =~ ^[[:space:]]*([A-Za-z_][A-Za-z0-9_]*=[^[:space:]]*|sudo|command|nohup|time|env)[[:space:]]+ ]]; do
    seg=${seg#"${BASH_REMATCH[0]}"}
  done
  [[ $seg =~ ^[[:space:]]*git[[:space:]]+(add|commit|stash)([[:space:]]|$) ]] || continue
  [[ $seg == *ai-swap* ]] &&
    deny "ai-swap/ is local-only and must not be committed. Remove it from this command."
done < <(printf '%s\n' "$folded" | tr ';|&()`' '\n\n\n\n\n\n\n')

# Preference, not a prohibition: git-filter-repo is the better tool, but
# filter-branch is occasionally the right one. Prompt rather than block.
if [[ $cmd =~ git[[:space:]]+filter-branch ]]; then
  ask "Prefer git-filter-repo over git filter-branch. Approve only if filter-branch is genuinely the right tool here."
fi

exit 0
