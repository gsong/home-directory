#!/usr/bin/env bash
# PostToolUse formatter. Formats a file Claude just wrote with the formatter
# the file's project uses: Biome when the nearest formatter config is a Biome
# config, Prettier otherwise. It never blocks, since the write has already
# landed.
#
# The search walks up from the file and stops at the git root, so a repo with
# no formatter config of its own keeps Prettier's defaults. It does not reach
# $HOME/biome.jsonc, which would otherwise claim every such repo under $HOME.
# A file outside any repo walks all the way up, which is how loose scripts
# under $HOME reach that config.
set -uo pipefail

file=$(jq -r '.tool_input.file_path // ""' 2>/dev/null)
[[ -n $file && -f $file ]] || exit 0
[[ $file == */ai-swap/drafts/* ]] && exit 0
file=$(realpath "$file")

main() {
  local config_dir
  config_dir=$(find_biome_config_dir "$(dirname "$file")")

  if [[ -n $config_dir ]] && biome_formats "$file"; then
    run_biome "$config_dir"
  else
    prettier --write --ignore-unknown "$file"
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

has_prettier_config() {
  local dir=$1 name
  for name in "$dir"/.prettierrc "$dir"/.prettierrc.* "$dir"/prettier.config.*; do
    [[ -f $name ]] && return 0
  done
  [[ -f $dir/package.json ]] && jq -e 'has("prettier")' "$dir/package.json" >/dev/null 2>&1
}

# Biome does not format Markdown or YAML, so those still go to Prettier.
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

main
