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
if [[ $cmd =~ git[[:space:]]+(add|commit|stash) ]] && [[ $cmd == *ai-swap* ]]; then
  deny "ai-swap/ is local-only and must not be committed. Remove it from this command."
fi

# Preference, not a prohibition: git-filter-repo is the better tool, but
# filter-branch is occasionally the right one. Prompt rather than block.
if [[ $cmd =~ git[[:space:]]+filter-branch ]]; then
  ask "Prefer git-filter-repo over git filter-branch. Approve only if filter-branch is genuinely the right tool here."
fi

exit 0
