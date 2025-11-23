# Only run in interactive shells
[[ $- == *i* ]] || return

# Only run if ssh-agent is available
if [[ -n "$SSH_AUTH_SOCK" ]] && command -v ssh-add >/dev/null 2>&1; then
	# macOS: load keys from keychain
	if [[ "$OSTYPE" == "darwin"* ]]; then
		ssh-add -A 2>/dev/null
	fi
fi
