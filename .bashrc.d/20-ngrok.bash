# Only load in interactive shells
[[ $- == *i* ]] || return

if command -v ngrok >/dev/null 2>&1; then
	eval "$(ngrok completion)"
fi
