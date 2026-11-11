#!/usr/bin/env bash
# PostToolUse formatter. Formats a file Claude just wrote with the formatter
# its project chose for that file type: Ruff for Python and SQLFluff for SQL
# when the project configures them, Biome when the nearest formatter config
# is a Biome config and Biome formats the type, Prettier when a Prettier
# config governs the file. A file no config governs is left as written, so a
# repo that never chose a formatter keeps its own style. It never blocks,
# since the write has already landed.
#
# The search walks up from the file and stops at the git root, so a config
# outside the repo never claims it. It does not reach $HOME/biome.jsonc, which
# would otherwise claim every repo under $HOME. A file outside any repo walks
# all the way up, which is how loose scripts under $HOME reach that config.
set -uo pipefail

file=$(jq -r '.tool_input.file_path // ""' 2>/dev/null)
[[ -n $file && -f $file ]] || exit 0
[[ $file == */ai-swap/drafts/* ]] && exit 0
file=$(realpath "$file")

main() {
  local start config_dir
  start=$(dirname "$file")

  case $file in
  *.py)
    config_dir=$(find_config_dir "$start" has_ruff_config)
    if [[ -n $config_dir ]]; then run_ruff "$config_dir"; fi
    return
    ;;
  *.sql)
    config_dir=$(find_config_dir "$start" has_sqlfluff_config)
    if [[ -n $config_dir ]]; then run_sqlfluff "$config_dir"; fi
    return
    ;;
  esac

  if biome_formats "$file"; then
    config_dir=$(find_biome_config_dir "$start")
    if [[ -n $config_dir ]]; then
      run_biome "$config_dir"
      return
    fi
  fi

  # A Biome config on the way does not stop this search: Biome does not
  # format every type, and a repo can pair it with Prettier for the rest.
  config_dir=$(find_config_dir "$start" has_prettier_config)
  if [[ -n $config_dir ]]; then
    run_prettier "$config_dir"
  fi
}

# Prints the directory holding the Biome config that governs the file, or
# nothing when a Prettier config is nearer or no config is found.
find_biome_config_dir() {
  local dir=$1 root
  root=$(git -C "$dir" rev-parse --show-toplevel 2>/dev/null)

  while :; do
    if [[ -f $dir/biome.json || -f $dir/biome.jsonc ]]; then
      echo "$dir"
      return
    fi
    has_prettier_config "$dir" && return
    [[ $dir == "$root" || $dir == / ]] && return
    dir=$(dirname "$dir")
  done
}

# Prints the nearest directory, from dir up to the git root, for which the
# predicate holds, or nothing when none does.
find_config_dir() { # find_config_dir <dir> <predicate>
  local dir=$1 has_config=$2 root
  root=$(git -C "$dir" rev-parse --show-toplevel 2>/dev/null)

  while :; do
    if "$has_config" "$dir"; then
      echo "$dir"
      return
    fi
    [[ $dir == "$root" || $dir == / ]] && return
    dir=$(dirname "$dir")
  done
}

has_prettier_config() {
  local dir=$1 name
  for name in "$dir"/.prettierrc "$dir"/.prettierrc.* "$dir"/prettier.config.*; do
    [[ -f $name ]] && return 0
  done
  [[ -f $dir/package.json ]] && jq -e 'has("prettier")' "$dir/package.json" >/dev/null 2>&1
}

# A bare pyproject.toml is not a Ruff config: every Python project has one.
has_ruff_config() {
  local dir=$1
  [[ -f $dir/ruff.toml || -f $dir/.ruff.toml ]] && return 0
  [[ -f $dir/pyproject.toml ]] && grep -q '^\[tool\.ruff' "$dir/pyproject.toml"
}

has_sqlfluff_config() {
  local dir=$1 name
  [[ -f $dir/.sqlfluff ]] && return 0
  for name in "$dir"/setup.cfg "$dir"/tox.ini; do
    [[ -f $name ]] && grep -q '^\[sqlfluff' "$name" && return 0
  done
  [[ -f $dir/pyproject.toml ]] && grep -q '^\[tool\.sqlfluff' "$dir/pyproject.toml"
}

# Biome does not format Markdown or YAML, so those go to Prettier when the
# project has a Prettier config, and are left alone when it does not.
biome_formats() {
  case ${1##*.} in
  js | jsx | mjs | cjs | ts | tsx | mts | cts | json | jsonc | css | graphql | gql) return 0 ;;
  *) return 1 ;;
  esac
}

# Runs from the config directory so Biome resolves that config and its
# includes. Prefers the project's pinned Biome over the global one. Output is
# dropped: diagnostics the fixes cannot resolve belong to lint, not to a hook
# that runs on every edit.
run_biome() {
  local dir=$1 biome=biome
  [[ -x $dir/node_modules/.bin/biome ]] && biome=$dir/node_modules/.bin/biome
  (cd "$dir" && "$biome" check --write --no-errors-on-unmatched "$file") >/dev/null 2>&1
  return 0
}

# Runs from the config directory because Prettier reads .prettierignore and
# .gitignore from the directory it runs in, not from the file's. Run from
# anywhere else, an ignored file would be formatted anyway. The git root's
# ignore files are named too, since a nested config would otherwise skip them.
# Prettier resolves each file's patterns from that file's directory. Prefers
# the project's pinned Prettier over the global one, as run_biome does, so a
# repo whose CI checks the format gets the bytes CI expects, and a repo with
# its own format hook gets the same bytes from both.
run_prettier() {
  local dir=$1 root d ignores=() prettier=prettier
  [[ -x $dir/node_modules/.bin/prettier ]] && prettier=$dir/node_modules/.bin/prettier
  root=$(git -C "$dir" rev-parse --show-toplevel 2>/dev/null)
  for d in "$dir" ${root:+"$root"}; do
    ignores+=(--ignore-path "$d/.prettierignore" --ignore-path "$d/.gitignore")
  done
  (cd "$dir" && "$prettier" --write --ignore-unknown "${ignores[@]}" "$file")
}

# Applies Ruff's lint fixes, then its formatter, as Ruff's docs order them.
# Prefers the project's pinned Ruff, as run_biome does. Output is dropped and
# a missing Ruff is skipped: unfixable diagnostics belong to lint.
run_ruff() {
  local ruff
  ruff=$(pinned_tool "$1" ruff) || return 0
  (cd "$1" && "$ruff" check --fix "$file" && "$ruff" format "$file") >/dev/null 2>&1
  return 0
}

# stdin is closed so a SQLFluff that would prompt aborts instead of hanging.
run_sqlfluff() {
  local sqlfluff
  sqlfluff=$(pinned_tool "$1" sqlfluff) || return 0
  (cd "$1" && "$sqlfluff" fix "$file") </dev/null >/dev/null 2>&1
  return 0
}

# Prints the tool from a .venv at the config directory or the git root, else
# the one on PATH. Fails when neither exists.
pinned_tool() { # pinned_tool <config dir> <name>
  local dir=$1 name=$2 root d
  root=$(git -C "$dir" rev-parse --show-toplevel 2>/dev/null)
  for d in "$dir" ${root:+"$root"}; do
    if [[ -x $d/.venv/bin/$name ]]; then
      echo "$d/.venv/bin/$name"
      return 0
    fi
  done
  command -v "$name"
}

main
