if command -v python3 >/dev/null 2>&1; then
	PYTHON_VERSION=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
	POWERLINE_SCRIPT="${HOME}/.local/share/uv/tools/powerline-status/lib/python${PYTHON_VERSION}/site-packages/powerline/bindings/bash/powerline.sh"

	if [[ -f "$POWERLINE_SCRIPT" ]]; then
		POWERLINE_BASH_CONTINUATION=1
		POWERLINE_BASH_SELECT=1
		source "$POWERLINE_SCRIPT"
	fi
fi
