#!/usr/bin/env bash
# PreToolUse guard for Bash. Blocks or prompts for irreversible actions that
# CLAUDE.md used to only ask for in prose. Reads the hook payload on stdin,
# writes a permissionDecision on stdout.
#
# This is a safety net against model habit, not a security boundary. It
# over-matches on purpose: a wrapper, keyword, quoted flag, or nested shell
# that puts a command in command position still counts, and a rare false
# prompt is the accepted price. Known over-matches: a word like 'if' or 'do'
# is peeled wherever it starts a command, every 'bash -c' payload is read as
# a command, and rm flags count even after the operands, where BSD rm would
# take them as file names.
#
# A deny ends the run at once. An ask is held until the whole command has
# been read, so a later deny still wins.
set -uo pipefail

main() {
  local payload out cmd
  payload=$(cat)
  # One jq run returns both fields; the command can span lines, so it goes
  # last and takes everything after the first newline.
  out=$(jq -r '(.cwd // ""), (.tool_input.command // "")' <<<"$payload" 2>/dev/null) || exit 0
  CWD=${out%%$'\n'*}
  cmd=${out#*$'\n'}
  [[ -z $cmd ]] && exit 0

  check_trailer "$cmd"
  scan "$cmd"
  [[ -n $ASKED ]] && decide ask "$ASKED"
  exit 0
}

CWD=
ASKED=

decide() { # decide <deny|ask> <reason>
  jq -Rn --arg d "$1" --arg r "$2" \
    '{hookSpecificOutput: {hookEventName: "PreToolUse", permissionDecision: $d, permissionDecisionReason: $r}}'
  exit 0
}
deny() { decide deny "$1"; }
ask() { [[ -n $ASKED ]] || ASKED=$1; }

# The attribution setting only stops Claude Code asking for a Claude trailer;
# the model still adds one from habit. This check reads the whole command,
# because the trailer sits inside a quoted, multi-line message.
check_trailer() {
  local folded=${1//$'\\\n'/ }
  shopt -s nocasematch
  if [[ $folded =~ (git[[:space:]].*commit|gh[[:space:]]+pr[[:space:]]) ]] &&
    [[ $folded =~ co-authored-by:[^$'\n']*(claude|anthropic) ]]; then
    deny "Rerun with the message alone, with no Co-Authored-By line. Commits and PRs here carry no AI attribution."
  fi
  shopt -u nocasematch
}

# Checks every simple command in a shell string. The lexer below does the
# shell's quote removal, so each command arrives as its words. Text inside a
# quoted string, a heredoc body, or a comment never reaches command position.
scan() { # scan <shell text>
  local -a words
  while IFS=$'\037' read -r -a words; do
    ((${#words[@]})) && check_command "${words[@]}"
  done < <(LC_ALL=C awk "$LEXER" <<<"$1")
}

# Peels whatever can stand in front of a command (env assignments, shell
# keywords, wrappers and their flags), then dispatches on the command name.
check_command() {
  local -a w=("$@")
  local n=${#w[@]} i=0 word
  while ((i < n)); do
    word=${w[i]}
    case $word in
    [A-Za-z_]*=*)
      [[ ${word%%=*} =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || break
      ((i++))
      ;;
    if | then | do | else | elif | while | until | '!' | '{' | time | exec | command | builtin | nohup)
      ((i++))
      ;;
    sudo | doas | env | xargs | nice | timeout | caffeinate)
      i=$(skip_wrapper "$i" "${w[@]}")
      ;;
    *) break ;;
    esac
  done
  ((i < n)) || return 0

  case ${w[i]##*/} in
  bash | sh | zsh | dash | ksh) check_shell "${w[@]:i+1}" ;;
  eval) scan "${w[*]:i+1}" ;;
  pkill | killall) ask "Run 'pgrep -fl' with the same pattern first, and approve only if it lists just the processes you mean to stop." ;;
  rm) check_rm "${w[@]:i+1}" ;;
  git) check_git "${w[@]:i+1}" ;;
  esac
}

# Prints the index of the first word after a wrapper and its flags. The flags
# listed take a value as the next word; timeout also takes a duration.
skip_wrapper() { # skip_wrapper <index> <words...>
  local i=$1
  shift
  local -a w=("$@")
  local wrapper=${w[i]} takes
  case $wrapper in
  sudo | doas) takes=' -u -g -h -p -U -C -D -r -t ' ;;
  env) takes=' -u -C -P -S ' ;;
  xargs) takes=' -I -J -L -n -P -s -E -R -S -d -a ' ;;
  nice) takes=' -n ' ;;
  timeout) takes=' -s -k ' ;;
  *) takes=' ' ;;
  esac
  ((i++))
  while ((i < ${#w[@]})) && [[ ${w[i]} == -* ]]; do
    [[ $takes == *" ${w[i]} "* ]] && ((i++))
    ((i++))
  done
  [[ $wrapper == timeout ]] && ((i++))
  echo "$i"
}

# 'bash -c <payload>' runs the payload as a command string, so scan it too.
# Any short-flag cluster holding c counts, so -lc and -ec do.
check_shell() {
  local a has_c=0
  for a; do
    case $a in
    --*) ;;
    -*c*) has_c=1 ;;
    -*) ;;
    *)
      ((has_c)) && scan "$a"
      return 0
      ;;
    esac
  done
}

# Peels git's own global options so they do not hide the subcommand, so that
# 'git -C /repo push --force' is read as a push and not skipped.
check_git() {
  while (($#)); do
    case $1 in
    -C | -c | --git-dir | --work-tree | --namespace | --config-env) shift 2 || return 0 ;;
    -*) shift ;;
    *) break ;;
    esac
  done
  (($#)) || return 0
  local sub=$1
  shift

  case $sub in
  push) check_push "$@" ;;
  add) check_add "$@" ;;
  commit) check_pathspecs 'mFCct' ' --message --file --reuse-message --reedit-message --fixup --squash --author --date --template --cleanup --trailer ' "$@" ;;
  stash) check_stash "$@" ;;
  reset) has_word --hard "$@" &&
    ask "Use 'git stash' to set work aside. Approve only after 'git status' shows nothing uncommitted worth keeping." ;;
  clean) has_force "$@" &&
    ask "Run 'git clean -n' with the same flags first, and approve only if it lists just disposable files." ;;
  filter-branch)
    # Preference, not a prohibition: git-filter-repo is the better tool, but
    # filter-branch is occasionally the right one. Prompt rather than block.
    ask "Use 'git filter-repo' for history rewrites. Approve this only if filter-repo cannot do the job."
    ;;
  esac
}

# Force comes as --force, a short cluster holding f (-f, -fu, -uf), or a +
# refspec. A lease checks every ref it pushes, + refspecs included, so a
# --force-with-lease push passes; --force-if-includes alone adds no check.
# Removing remote refs is sometimes the job, so those prompt instead.
check_push() {
  local a force=0 lease=0 removes=0
  for a; do
    case $a in
    --force-with-lease | --force-with-lease=*) lease=1 ;;
    --force) force=1 ;;
    --de* | --mi* | --pru*) removes=1 ;;
    --*) ;;
    -*f*) force=1 ;;
    -*d*) removes=1 ;;
    +*) [[ $a == +?* ]] && force=2 ;;
    :?*) removes=1 ;;
    esac
  done
  ((force == 1 || (force == 2 && !lease))) &&
    deny "Use 'git push --force-with-lease' to rewrite a remote branch. It refuses when the remote moved since your last fetch."
  ((removes)) &&
    ask "Check the remote refs this push removes with 'git ls-remote <remote>', and approve only if each removal is intended."
}

# ai-swap/ is in the global gitignore, so it enters history only through a
# force add or a pathspec that names it. Message text (-m, -F) is not a
# pathspec and is never read.
check_add() {
  check_pathspecs '' ' --chmod --pathspec-from-file ' "$@"
  has_force "$@" &&
    ask "Check that the pathspec covers only the ignored files meant for history, and nothing under ai-swap/."
}

# 'git stash save' takes its message as a positional word, so only 'push'
# and the bare form are read for pathspecs.
check_stash() {
  if [[ ${1-} == push ]]; then
    shift
  elif [[ -n ${1-} && ${1-} != -* ]]; then
    return 0
  fi
  check_pathspecs 'm' ' --message --pathspec-from-file ' "$@"
}

# Denies when a pathspec names ai-swap/. A pathspec is any word that is not
# an option or an option's value. short lists the letters whose option takes
# a value (the rest of the cluster, or the next word); long lists the long
# options that take the next word when written without '='.
check_pathspecs() { # check_pathspecs <short> <long> <args...>
  local short=$1 long=$2 a k skip=0 opts=1
  shift 2
  for a; do
    if ((skip)); then
      skip=0
      continue
    fi
    if ((opts)); then
      case $a in
      --)
        opts=0
        continue
        ;;
      --*)
        [[ $long == *" $a "* ]] && skip=1
        continue
        ;;
      -?*)
        for ((k = 1; k < ${#a}; k++)); do
          if [[ -n $short && $short == *"${a:k:1}"* ]]; then
            ((k == ${#a} - 1)) && skip=1
            break
          fi
        done
        continue
        ;;
      esac
    fi
    [[ $a == *ai-swap* ]] &&
      deny "Stage project files only: ai-swap/ is local scratch. Rerun with the ai-swap/ paths taken out."
  done
}

# A recursive, forced rm prompts when any target sweeps too wide.
check_rm() {
  local a recursive=0 force=0 opts=1
  local -a targets=()
  for a; do
    if ((opts)) && [[ $a == -?* ]]; then
      case $a in
      --) opts=0 ;;
      --recursive) recursive=1 ;;
      --force) force=1 ;;
      --*) ;;
      *)
        [[ $a == *[rR]* ]] && recursive=1
        [[ $a == *f* ]] && force=1
        ;;
      esac
      continue
    fi
    targets+=("$a")
  done
  ((recursive && force && ${#targets[@]})) || return 0
  for a in "${targets[@]}"; do
    if sweeps "$a"; then
      ask "Approve only if '$a' is meant to go: it is a home, the source root, or a path within two levels of /."
      return 0
    fi
  done
}

# True when a path, once ~ and $HOME are expanded and it is resolved against
# the session cwd, is $HOME/src or has fewer than three components. A glob
# counts as the directory it sits in, so ~/* is home.
sweeps() { # sweeps <path>
  local p=$1 part
  local -a parts out=()
  case $p in
  '~' | '~/'*) p=$HOME${p#\~} ;;
  '~'*) p=${HOME%/*}/${p#\~} ;;
  '$HOME' | '$HOME/'*) p=$HOME${p#\$HOME} ;;
  '${HOME}' | '${HOME}/'*) p=$HOME${p#\$\{HOME\}} ;;
  esac
  [[ $p == /* ]] || p=${CWD:-$PWD}/$p
  if [[ $p == *[*?[]* ]]; then
    p=${p%%[*?[]*}
    p=${p%/*}
  fi

  IFS=/ read -r -a parts <<<"$p"
  for part in ${parts[@]+"${parts[@]}"}; do
    case $part in
    '' | .) ;;
    ..) ((${#out[@]})) && out=("${out[@]:0:${#out[@]}-1}") ;;
    *) out+=("$part") ;;
    esac
  done
  ((${#out[@]} < 3)) && return 0
  local IFS=/
  [[ "/${out[*]}" == "$HOME/src" ]]
}

has_word() { # has_word <word> <args...>
  local want=$1 a
  shift
  for a; do [[ $a == "$want" ]] && return 0; done
  return 1
}

# --force, or a short-flag cluster that holds f.
has_force() {
  local a
  for a; do
    case $a in
    --force) return 0 ;;
    --*) ;;
    -*f*) return 0 ;;
    esac
  done
  return 1
}

# Splits shell text into simple commands, one per output line, with the words
# of each joined by \037 and quotes removed. It knows enough shell to keep
# quoted text, heredoc bodies, and comments out of command position:
#   - ' and " quote; \ escapes; \<newline> continues the line.
#   - ; & | ( ) and newline end a command.
#   - $( ) and backticks nest, inside double quotes too, and their contents
#     are emitted as commands of their own.
#   - <<WORD skips the body up to WORD; a redirect drops its target.
# A newline inside a word becomes a space, so each command stays on a line.
LEXER='
function reset_level(k) {
  W[k] = ""; HW[k] = 0; SKIPW[k] = 0; C[k] = ""; NC[k] = 0
  DQ[k] = 0; DEPTH[k] = 0
}
function endword() {
  if (HW[d] || W[d] != "") {
    if (!SKIPW[d]) { C[d] = NC[d] ? C[d] US W[d] : W[d]; NC[d]++ }
    SKIPW[d] = 0
  }
  W[d] = ""; HW[d] = 0
}
function endcmd() {
  endword()
  if (NC[d]) print C[d]
  C[d] = ""; NC[d] = 0
}
function push(kind) { HW[d] = 1; d++; reset_level(d); KIND[d] = kind }
function pop() { endcmd(); d-- }
function addc(ch) { W[d] = W[d] (ch == "\n" ? " " : ch); HW[d] = 1 }
# Reads the heredoc delimiter that starts at i and queues it.
function heredoc(   dash, delim, ch) {
  dash = 0
  if (substr(s, i, 1) == "-") { dash = 1; i++ }
  while (substr(s, i, 1) ~ /[ \t]/) i++
  delim = ""
  for (; i <= n; i++) {
    ch = substr(s, i, 1)
    if (ch ~ /[ \t\n;&|<>()]/) break
    if (ch != "\"" && ch != "\047" && ch != "\\") delim = delim ch
  }
  i--
  nhd++; HD[nhd] = delim; HDASH[nhd] = dash
}
# At a newline, skips the bodies of the queued heredocs.
function skip_heredocs(   k, ln, line) {
  ln = line_at(i + 1)
  for (k = 1; k <= nhd; k++) {
    for (; ln <= nl; ln++) {
      line = L[ln]
      if (HDASH[k]) sub(/^\t+/, "", line)
      if (line == HD[k]) { ln++; break }
    }
  }
  i = (ln <= nl ? P[ln] : n + 1) - 1
  nhd = 0
}
# Binary search for the line that starts at position pos.
function line_at(pos,   lo, hi, mid) {
  lo = 1; hi = nl
  while (lo < hi) {
    mid = int((lo + hi + 1) / 2)
    if (P[mid] <= pos) lo = mid; else hi = mid - 1
  }
  return lo
}
{ nl++; L[nl] = $0; P[nl] = length(s) + 1; s = s $0 "\n" }
END {
  US = "\037"; n = length(s); d = 0; nhd = 0; reset_level(0); KIND[0] = ""
  for (i = 1; i <= n; i++) {
    c = substr(s, i, 1); nx = substr(s, i + 1, 1)
    if (DQ[d]) {
      if (c == "\\") {
        if (nx == "\n") { i++; continue }
        if (nx ~ /[$`"\\]/) { addc(nx); i++; continue }
        addc(c); continue
      }
      if (c == "\"") { DQ[d] = 0; continue }
      if (c == "$" && nx == "(") { push("("); i++; continue }
      if (c == "`") { push("`"); continue }
      addc(c); continue
    }
    if (c == "\047") {
      j = index(substr(s, i + 1), "\047"); if (j == 0) j = n - i + 1
      chunk = substr(s, i + 1, j - 1); gsub(/\n/, " ", chunk)
      W[d] = W[d] chunk; HW[d] = 1; i += j; continue
    }
    if (c == "\"") { DQ[d] = 1; HW[d] = 1; continue }
    if (c == "\\") { i++; if (nx != "\n") addc(nx); continue }
    if (c == "#" && W[d] == "" && !HW[d]) {
      while (i < n && substr(s, i + 1, 1) != "\n") i++
      continue
    }
    if (c == " " || c == "\t") { endword(); continue }
    if (c == "\n") { endcmd(); if (nhd) skip_heredocs(); continue }
    if (c == ";" || c == "&" || c == "|") { endcmd(); continue }
    if (c == "$" && nx == "(") { push("("); i++; continue }
    if (c == "`") { if (KIND[d] == "`") pop(); else push("`"); continue }
    if (c == "(") { endcmd(); if (d > 0) DEPTH[d]++; continue }
    if (c == ")") {
      if (d > 0 && KIND[d] == "(" && DEPTH[d] == 0) pop()
      else { endcmd(); if (DEPTH[d] > 0) DEPTH[d]-- }
      continue
    }
    if (c == "<" && nx == "<" && substr(s, i + 2, 1) != "<") { i += 2; heredoc(); continue }
    if (c == "<" || c == ">") {
      if (W[d] ~ /^[0-9]+$/) { W[d] = ""; HW[d] = 0 }
      endword()
      while (substr(s, i + 1, 1) ~ /[<>&|]/) i++
      SKIPW[d] = 1; continue
    }
    addc(c)
  }
  while (d > 0) pop()
  endcmd()
}
'

main
