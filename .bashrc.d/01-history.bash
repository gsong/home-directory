export HISTCONTROL=ignoredups:erasedups:ignorespace
export HISTIGNORE="&:?:??:exit:history:j *:tmux"
export HISTSIZE=50000
export HISTFILESIZE=50000
export HISTTIMEFORMAT='%F %T '
shopt -s histappend

if [[ $- == *i* ]]; then
	bind '"\e[A"':history-search-backward # up arrow
	bind '"\e[B"':history-search-forward  # down arrow
fi
