# File listing
alias ls='eza $LS_OPTIONS --no-quotes'
alias l='eza $LS_OPTIONS --no-quotes -l'
alias ll='eza $LS_OPTIONS --no-quotes -la'

# Search & diff
alias ag='ag --hidden'
alias diff=delta

# Process management
alias pgrep='pgrep -f -l'
alias pkill='pkill -f -l'
alias top='top -s 5 -o cpu -stats pid,user,command,cpu,rsize,vsize,threads,state'

# Editors
alias nv='neovide --fork'
alias vimr='vimr --cur-env'

if command -v vimr >/dev/null 2>&1; then
	if [[ "$TERM_PROGRAM" == "Apple_Terminal" ]] || [[ "$TERM_PROGRAM" == "tmux" ]]; then
		alias vi='vimr --cur-env'
	fi
fi

# Docker
alias start-docker='open -ga Docker'
alias stop-docker='osascript -e '\''quit app "Docker"'\'
alias restart-docker='stop-docker && start-docker'

# CLI tools
alias ccd='ccmcp --allow-dangerously-skip-permissions'
alias ios-simulator="open /Applications/Xcode.app/Contents/Developer/Applications/Simulator.app/"
alias npx='pnpm dlx'
alias pdfcombine='"/System/Library/Automator/Combine PDF Pages.action/Contents/Resources/join.py"'
alias speedtest='speedtest --secure'
