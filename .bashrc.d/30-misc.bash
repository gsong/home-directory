export EDITOR=edit
export LANG=en_US.UTF-8

# Keep bash history across terminals and write immediately
# http://linuxcommando.blogspot.com/2007/11/keeping-command-history-across-multiple.html
export PROMPT_COMMAND="history -a${PROMPT_COMMAND:+;$PROMPT_COMMAND}"

# use .localrc for settings specific to one system
[[ -r ~/.localrc ]] && source ~/.localrc

ulimit -n 24576 2>/dev/null || true

export LS_OPTIONS="--git --group-directories-first"
