# Only run in interactive shells
[[ $- == *i* ]] || return

# --cmd j keeps autojump's `j` muscle memory (and the `j *` HISTIGNORE entry).
if command -v zoxide >/dev/null 2>&1; then
	eval "$(zoxide init bash --cmd j)"
fi
