# shellcheck source=/dev/null
# Only load in interactive shells
[[ $- == *i* ]] || return

export BASH_COMPLETION_COMPAT_DIR="${HOMEBREW_PREFIX}/etc/bash_completion.d"

command -v brew >/dev/null 2>&1 &&
	[[ -r "${HOMEBREW_PREFIX}/etc/profile.d/bash_completion.sh" ]] &&
	source "${HOMEBREW_PREFIX}/etc/profile.d/bash_completion.sh"
