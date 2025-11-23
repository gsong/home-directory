# Only run in interactive shells
[[ $- == *i* ]] || return

if command -v direnv >/dev/null 2>&1; then
	eval "$(direnv hook bash)"
fi
