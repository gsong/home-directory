# ${HOME} Setup

Configurations and habits for JavaScript and Python development on macOS.

Here's the rough steps (not tested yet):

1. Install [Homebrew](https://brew.sh/)
1. `brew install stow`
1. Clone this repo to `${HOME}/.home-directory/` (or any other directory off of `${HOME}`)
1. `stow -R --no-folding --adopt .`

Setup inspired by <https://knowler.dev/blog/maintaining-dotfiles>.
