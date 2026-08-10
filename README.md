# ${HOME} Setup

macOS dotfiles for JS/Python development.

## What's Included

Shell (bash), git, tmux, and editor configs.

## Prerequisites

- macOS
- [Homebrew](https://brew.sh/)

## Setup

1. `brew install stow`
2. `git clone <this repo> ~/.home-directory && cd ~/.home-directory`
3. `git submodule update --init --recursive`
4. `stow -R --no-folding --adopt -t ~ .`
   Note: `--adopt` moves any pre-existing files in `~` into the repo, overwriting
   the tracked versions. Check `git status` / `git diff` afterwards and reset
   anything you didn't mean to keep.
5. Start a new shell (so `.bashrc.d` sets `HOMEBREW_BUNDLE_FILE`), then run
   `bin/brew-install`.

Inspired by <https://knowler.dev/blog/maintaining-dotfiles>.
