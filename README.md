# ${HOME} Setup

macOS dotfiles for JS/Python development.

> **Reading this as a reference?** This is one person's personal setup. The
> steps below are his, for his machines — don't run them. If you're new to
> macOS, start with
> [docs/macos-for-windows-devs.md](docs/macos-for-windows-devs.md) instead. It
> explains the concepts and points back at the files here as examples.

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
6. Switch to Homebrew's bash. The Brewfile installs it, but macOS only accepts a
   login shell listed in `/etc/shells`:

   ```bash
   echo "$(brew --prefix)/bin/bash" | sudo tee -a /etc/shells
   chsh -s "$(brew --prefix)/bin/bash"
   ```

   Open a new terminal window, then check `echo "$SHELL"`. Apple's `/bin/bash`
   is stuck at 3.2 (GPLv3), so this is what gets a current bash.
7. Create `~/.gitconfig.local` with your git identities. `.gitconfig` includes
   it, and stow doesn't manage it, so a fresh machine has no identity until you
   write this file. Copy [docs/gitconfig-local.example](docs/gitconfig-local.example)
   and fill it in. Per-client identities go in real files under
   `~/.config/git/`, never in this repo.

## Tests

`bin/run-tests` runs everything. Arguments pass through to node, so
`bin/run-tests --watch` works.

Call it rather than `node --test`. Bare `node --test` skips dot directories
when it looks for tests, so it silently misses every test under `.claude` and
still reports a green suite. The runner names those paths.

Inspired by <https://knowler.dev/blog/maintaining-dotfiles>.
