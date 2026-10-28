[[ -d ~/bin ]] && export PATH=${HOME}/bin:$PATH
[[ -d ~/.local/bin ]] && export PATH=${HOME}/.local/bin:$PATH

[[ -d "${HOME}/.docker/bin" ]] && export PATH="${PATH}:${HOME}/.docker/bin"
