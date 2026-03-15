# Source Ghostty shell integration when inside tmux (Ghostty's automatic
# injection doesn't work inside tmux, but PROMPT_COMMAND may reference its hook)
if [[ -n "$GHOSTTY_RESOURCES_DIR" && -z "$GHOSTTY_BASH_INJECT" ]]; then
  builtin source "$GHOSTTY_RESOURCES_DIR/shell-integration/bash/ghostty.bash"
fi
