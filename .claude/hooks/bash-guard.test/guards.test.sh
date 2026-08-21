#!/usr/bin/env bash
# Cases for bash-guard.sh. Run: bash .claude/hooks/bash-guard.test/guards.test.sh
#
# The payloads are themselves valid-looking git commands. That is why they live
# in a file: passing them on a command line puts them in command position, where
# the installed guard reads them as real invocations and blocks the test run.
set -uo pipefail

guard=${1:-"$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/bash-guard.sh"}
[[ -x $guard ]] || {
  echo "no guard at $guard" >&2
  exit 2
}

pass=0
fail=0

run() { # run <deny|ask|allow> <label> <command>
  local out decision
  out=$(printf '%s' "$3" | jq -Rs '{tool_input:{command:.}}' | "$guard")
  decision=$(printf '%s' "$out" | jq -r '.hookSpecificOutput.permissionDecision' 2>/dev/null)
  # No output means the guard passed the command through untouched.
  decision=${decision:-allow}
  if [[ $decision == "$1" ]]; then
    pass=$((pass + 1))
    printf '  ok    %-5s %s\n' "$decision" "$2"
  else
    fail=$((fail + 1))
    printf '  FAIL  got=%-5s want=%-5s %s\n' "$decision" "$1" "$2"
  fi
}

echo "=== force-push: deny ==="
run deny "bare --force" 'git push --force'
run deny "-f short flag" 'git push -f origin main'
run deny "--force before refspec" 'git push --force origin main'
run deny "second push offends" 'git push origin main; git push --force other main'
run deny "third of three" 'git push a; git push b; git push -f c'
run deny "after && chain" 'git status && git push --force'
run deny "-C global option" 'git -C /repo push --force'
run deny "-c global option" 'git -c user.name=x push --force'
run deny "env assignment prefix" 'GIT_SSH_COMMAND=x git push --force'
run deny "line-continuation wrap" 'git push \
  --force origin main'
run deny "newline separated" 'echo hi
git push --force'
run deny "inside command substitution" 'echo $(git push --force)'

echo "=== force-push: allow ==="
run allow "--force-with-lease" 'git push --force-with-lease'
run allow "--force-if-includes" 'git push --force-if-includes origin main'
run allow "lease after a plain push" 'git push origin main; git push --force-with-lease other'
run allow "rm -f then plain push" 'rm -f junk.txt && git push origin main'
run allow "grep -f then plain push" 'grep -f pats.txt log.txt && git push'
run allow "-f belongs to another cmd" 'find . -name x -exec rm -f {} \; && git push'
run allow "named in a quoted string" 'node -e "const s = 1 // git push --force is blocked"'
run allow "named in a trailing comment" 'git push origin main # never use git push --force'
run allow "plain push" 'git push origin main'

echo "=== scratch dir: deny ==="
run deny "stage the path" 'git add ai-swap/spec.md'
run deny "quoted path argument" "git add 'ai-swap/spec.md'"
run deny "commit naming the path" 'git commit ai-swap/x -m hi'
run deny "stash push of the path" 'git stash push ai-swap/'
run deny "second segment offends" 'git add ok.txt; git add ai-swap/bad'
run deny "-C global option" 'git -C /repo add ai-swap/x'
run deny "path after a flag" 'git add -A ai-swap/'

echo "=== scratch dir: allow ==="
run allow "named in a quoted string" 'node -e "const s = \"git add/commit for ai-swap/\""'
run allow "named in a trailing comment" "git commit -m 'note' # ai-swap/ stays local"
run allow "outside the git segment" 'git add src/foo.js && echo ai-swap/'
run allow "grep the path, then commit" 'grep -rn ai-swap/ notes && git commit -m x'
run allow "unrelated staging" 'git add src/foo.js'
run allow "sed on the path" "sed -i '' s/x/y/ ai-swap/notes.md"

echo "=== filter-branch ==="
run ask "real call" 'git filter-branch --tree-filter x HEAD'
run ask "second segment" 'echo hi; git filter-branch -f HEAD'
run allow "named in a quoted string" "echo 'do not use git filter-branch'"

echo "=== pass-through ==="
run allow "empty command" ''
run allow "plain status" 'git status --short'
run allow "plain log" 'git log --oneline -5'

echo
echo "pass=$pass fail=$fail"
[[ $fail -eq 0 ]]
