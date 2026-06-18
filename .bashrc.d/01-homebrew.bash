CPU=$(uname -m)

if [[ "$CPU" == "arm64" ]]; then
	export HOMEBREW_PREFIX="/opt/homebrew"
else
	export HOMEBREW_PREFIX="/usr/local"
fi

export PATH="${HOMEBREW_PREFIX}/bin:${HOMEBREW_PREFIX}/sbin${PATH+:$PATH}"
export MANPATH="${HOMEBREW_PREFIX}/share/man${MANPATH+:$MANPATH}:"
export INFOPATH="${HOMEBREW_PREFIX}/share/info:${INFOPATH:-}"

export HOMEBREW_INSTALL_BADGE=☕
export HOMEBREW_BUNDLE_FILE=${HOME}/.Brewfile
export HOMEBREW_BUNDLE_NO_LOCK=1

# Disable default "ask mode" (added in Homebrew ~5.x) so install/upgrade/reinstall
# don't prompt "Do you want to proceed? [y/n]". Explicit --ask still prompts.
export HOMEBREW_NO_ASK=1

# For czkawka_gui
export XDG_DATA_DIRS="${HOMEBREW_PREFIX}/share:${XDG_DATA_DIRS:-}"
