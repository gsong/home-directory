## tab completion for bash autocomplete
if ! command -v _split_longopt &>/dev/null; then
	_split_longopt() {
		_comp__split_longopt "$@"
	}
fi
