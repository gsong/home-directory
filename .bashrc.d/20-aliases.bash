alias ios-simulator="open /Applications/Xcode.app/Contents/Developer/Applications/Simulator.app/"

alias diff=delta
alias l='eza $LS_OPTIONS --no-quotes -l'
alias ll='eza $LS_OPTIONS --no-quotes -la'
alias ls='eza $LS_OPTIONS --no-quotes'

alias ag='ag --hidden'
alias npx='pnpm dlx'
alias pdfcombine='"/System/Library/Automator/Combine PDF Pages.action/Contents/Resources/join.py"'
alias pgrep='pgrep -f -l'
alias pkill='pkill -f -l'
alias rm='rm -i'
alias top='top -s 5 -o cpu -stats pid,user,command,cpu,rsize,vsize,threads,state'

alias start-docker='open -ga Docker'
alias stop-docker='osascript -e '\''quit app "Docker"'\'
alias restart-docker='stop-docker && start-docker'

alias speedtest='speedtest --secure'

alias aider-scrape='uv tool run --from aider-chat python -m aider.scrape'

alias vimr='vimr --cur-env'

if hash vimr 2>/dev/null; then
	if [[ "$TERM_PROGRAM" == "Apple_Terminal" ]] || [[ "$TERM_PROGRAM" == "tmux" ]]; then
		alias vi='vimr --cur-env'
	fi
fi

alias tm='task-master'
alias taskmaster='task-master'
