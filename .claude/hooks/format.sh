#!/usr/bin/env bash
# PostToolUse formatter. Formats a file Claude just wrote with the formatter
# its project chose for that file type: Biome when the nearest formatter
# config is a Biome config and Biome formats the type, Prettier when a
# Prettier config governs the file. A file no config governs is left as
# written, so a repo that never chose a formatter keeps its own style. It
# never blocks, since the write has already landed.
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

  if biome_formats "$file"; then
    config_dir=$(find_biome_config_dir "$start")
    if [[ -n $config_dir ]]; then
      run_biome "$config_dir"
      return
    fi
  fi

  config_dir=$(find_prettier_config_dir "$start")
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

# Prints the directory holding the nearest Prettier config, or nothing when
# none is found. A Biome config on the way does not stop the search: Biome
# does not format every type, and a repo can pair it with Prettier for the
# rest.
find_prettier_config_dir() {
  local dir=$1 root
  root=$(git -C "$dir" rev-parse --show-toplevel 2>/dev/null)

  while :; do
    if has_prettier_config "$dir"; then
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

main
