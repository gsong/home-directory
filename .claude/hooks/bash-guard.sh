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

# Every check below cares about text in command position, not text that merely
# appears somewhere in the command. Normalize once: fold line continuations,
# then split on shell separators so each segment holds at most one command.
# The same words inside a quoted string, a heredoc, or a comment are just text.
folded=${cmd//$'\\\n'/ }

while IFS= read -r seg; do
  seg=${seg%%[[:space:]]#*}
  # Peel env assignments and wrappers so they do not hide the git call.
  while [[ $seg =~ ^[[:space:]]*([A-Za-z_][A-Za-z0-9_]*=[^[:space:]]*|sudo|command|nohup|time|env)[[:space:]]+ ]]; do
    seg=${seg#"${BASH_REMATCH[0]}"}
  done
  [[ $seg =~ ^[[:space:]]*git[[:space:]]+(.*)$ ]] || continue
  rest=${BASH_REMATCH[1]}
  # Peel git's own global options so they do not hide the subcommand, so that
  # 'git -C /repo push --force' is read as a push and not skipped.
  while [[ $rest =~ ^((-C|-c)[[:space:]]+[^[:space:]]+|--(git-dir|work-tree|namespace)=[^[:space:]]*|--no-pager|--bare|-P)[[:space:]]+ ]]; do
    rest=${rest#"${BASH_REMATCH[0]}"}
  done
  [[ $rest =~ ^([a-z][a-z-]*) ]] || continue

  case ${BASH_REMATCH[1]} in
    push)
      # Bare --force. --force-with-lease and --force-if-includes pass. An
      # unrelated -f elsewhere (rm -f, grep -f) is in another segment already.
      if [[ $rest =~ --force([^-]|$) ]] || [[ $rest =~ [[:space:]]-f([[:space:]]|$) ]]; then
        deny "Bare force-push blocked. Use 'git push --force-with-lease' instead."
      fi
      ;;
    add | commit | stash)
      # ai-swap/ holds local-only specs and plans. It must never enter history.
      # Quotes are deliberately left intact, so a quoted path still trips this.
      [[ $rest == *ai-swap* ]] &&
        deny "ai-swap/ is local-only and must not be committed. Remove it from this command."
      ;;
    filter-branch)
      # Preference, not a prohibition: git-filter-repo is the better tool, but
      # filter-branch is occasionally the right one. Prompt rather than block.
      ask "Prefer git-filter-repo over git filter-branch. Approve only if filter-branch is genuinely the right tool here."
      ;;
  esac
done < <(printf '%s\n' "$folded" | tr ';|&()`' '\n\n\n\n\n\n\n')

exit 0
