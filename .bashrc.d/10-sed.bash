if command -v gsed >/dev/null 2>&1 && [[ -n "${HOMEBREW_PREFIX}" ]]; then
	export PATH="${HOMEBREW_PREFIX}/opt/gnu-sed/libexec/gnubin:${PATH}"
fi
