# macOS for Windows Developers

A guide for developers moving from Windows to macOS. It explains the parts of a
Mac that surprise people, and it uses this repo as the worked example.

## Read this first

**This repo is one person's personal setup. Treat it as reference, not as
instructions.**

Nothing here is a product. It is George's home directory, tracked in git. The
setup steps in `README.md` are his, for his machines. Do not run them. Read the
files, take the ideas you like, and build your own.

Every section below teaches a macOS concept first. It then points at a file in
this repo that shows one way to handle it. You do not need to clone anything to
follow along. Browse the files on GitHub.

## Contents

1. [Before anything else](#before-anything-else)
2. [Homebrew](#homebrew)
3. [Picking a shell](#picking-a-shell)
4. [Language runtimes](#language-runtimes)
5. [Unix traps that bite Windows developers](#unix-traps-that-bite-windows-developers)
6. [Symlinks and stow](#symlinks-and-stow)
7. [Desktop habits](#desktop-habits)
8. [What is in `.claude`](#what-is-in-claude)

---

## Before anything else

| On Windows | On macOS |
| --- | --- |
| Visual Studio Build Tools | Xcode Command Line Tools |
| "Run as Administrator" | `sudo` at the start of a command |
| SmartScreen blocks an unknown app | Gatekeeper blocks an unsigned app |
| UAC prompt | Password prompt in Terminal, or a system dialog |

### Install the Xcode Command Line Tools

macOS ships without a compiler. Many tools need one. Install the toolchain
first:

```bash
xcode-select --install
```

A dialog appears. Accept it and wait. The download is large.

Homebrew installs this for you if it is missing. Doing it first makes the
failure mode clearer.

You do **not** need the full Xcode app. That is a 10 GB IDE for building Apple
apps. The Command Line Tools are the compiler and headers only.

### `sudo` is not "Run as Administrator"

On Windows you launch a whole process elevated. On macOS you elevate a single
command. You type `sudo` in front of it and enter your password.

```bash
sudo cat /dev/null    # does nothing, but caches your password for a while
```

Your account must be an administrator for `sudo` to work. Most personal Macs
have one account and it is an administrator.

Never run a whole development session as root. You do not need to. If a tool
tells you to `sudo npm install`, that tool is wrong.

### Gatekeeper and "cannot be opened"

macOS checks that downloaded apps are signed by a registered developer. An
unsigned app gives you this:

> "AppName" cannot be opened because the developer cannot be verified.

To allow it once: open **System Settings → Privacy & Security**, scroll down,
and click **Open Anyway**. The button appears only right after you tried to open
the app.

Apps installed through Homebrew usually skip this. Homebrew fetches them
directly, so macOS does not mark them as quarantined.

---

## Homebrew

Homebrew is the package manager macOS does not ship. It is the closest thing to
`apt`, and it is what `winget` or Chocolatey were reaching for.

| On Windows | On macOS |
| --- | --- |
| `winget install X` / Chocolatey | `brew install X` |
| An `.msi` installer you double-click | `brew install --cask X` |
| "Programs and Features" | `brew list`, `brew uninstall X` |
| No standard package list | A `Brewfile` |
| `C:\Program Files\` | `/opt/homebrew/` |

### Install it

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Read the output. It ends by telling you to add Homebrew to your `PATH`. Do that
step. Nothing works until you do. See [Picking a shell](#picking-a-shell) for
what `PATH` is.

### Where it installs

Homebrew puts everything under one prefix:

```
/opt/homebrew
```

Commands land in `/opt/homebrew/bin`. Nothing is written to `/System` or
`/usr`, which is why Homebrew needs no `sudo` once it is set up.

Older guides say `/usr/local`. Ignore them. Do not hardcode either path — ask
Homebrew instead:

```bash
brew --prefix    # prints /opt/homebrew
```

This repo exports the answer as `HOMEBREW_PREFIX` in
[`.bashrc.d/01-homebrew.bash`](../.bashrc.d/01-homebrew.bash). Everything else
references that variable.

### Formulae and casks

Homebrew installs two kinds of thing.

- A **formula** is a command-line tool. `brew install ripgrep`.
- A **cask** is a GUI application. `brew install --cask slack`.

A cask drops a real `.app` into `/Applications`. It behaves like any other Mac
app. You just never downloaded a `.dmg` by hand.

### A Brewfile is your package list

A `Brewfile` lists everything you want installed. One file, checked into git.
On a new machine you run `brew bundle` and get your whole toolchain back.

This is the single biggest quality-of-life win over Windows. There is no
equivalent habit there.

See [`.Brewfile`](../.Brewfile) in this repo. It holds 53 formulae and 63 casks,
grouped with comments. `HOMEBREW_BUNDLE_FILE` in
[`.bashrc.d/01-homebrew.bash`](../.bashrc.d/01-homebrew.bash) tells Homebrew
where to find it.

To capture what you already have:

```bash
brew bundle dump --file ~/.Brewfile
```

That `~` is a **tilde**. In a path it stands for your home directory, so
`~/.Brewfile` means `/Users/you/.Brewfile`. On a US keyboard it is Shift and the
key above Tab. [Paths](#paths) has the rest.

---

## Picking a shell

This is the section Windows developers most need, and the one they most often
skip.

### What a shell actually is

A shell is a program that reads what you type and runs it. PowerShell is a
shell. `cmd.exe` is a shell. On macOS the shell is `zsh` by default.

The difference that matters: PowerShell passes **objects** between commands. Unix
shells pass **text**. Every Unix tool reads text in and writes text out, so one
tool's output becomes the next tool's input. That is why `grep`, `sed`, and
`awk` exist.

The character that joins them is `|`, called a **pipe**. On a US keyboard it
sits above the backslash, at Shift+\. Say it out loud as "pipe" — you *pipe*
`ls` into `grep` — and a chain of them is a **pipeline**.

```bash
ls | grep report      # list the files, keep only ones matching "report"
```

PowerShell uses the same key and the same word. What changes is what flows
through it. So stop reaching for `Get-ChildItem | Where-Object` and reach for
`ls | grep`.

| On Windows | On macOS |
| --- | --- |
| PowerShell profile (`$PROFILE`) | `~/.zshrc` or `~/.bashrc` |
| `$env:PATH` | `$PATH` |
| System Properties → Environment Variables | Edit a text file. There is no dialog. |
| `Get-Command foo` | `command -v foo` or `which foo` |
| `Get-ChildItem` | `ls` |
| `Select-String` | `grep` |
| `$env:USERPROFILE` | `$HOME` or `~` |

### zsh is the default, and it is fine

macOS has shipped `zsh` as the default login shell since Catalina in 2019.

**If you are new to macOS, stay on zsh.** It is modern, it is maintained by
Apple, and every macOS tutorial assumes it. You will not be fighting your
machine.

### Why Apple's bash is stuck in 2007

macOS also ships `bash`. Check the version:

```bash
/bin/bash --version
# GNU bash, version 3.2.57(1)-release
```

Bash 3.2 is from 2007. Bash 4 changed its license to GPLv3, and Apple will not
ship GPLv3 code. So the system bash will never be updated.

Bash 3.2 is missing things you will read about in any modern guide:

- Associative arrays (`declare -A`)
- `mapfile` / `readarray`
- `${var,,}` and `${var^^}` for case conversion
- `**` for recursive globbing

If you write a bash script and target `/bin/bash`, you are targeting 2007.

### Why this repo uses Homebrew's bash

George chose Homebrew's bash. That gets a current version:

```bash
brew install bash
/opt/homebrew/bin/bash --version
# GNU bash, version 5.3.15(1)-release
```

The reasoning is portability. Bash is the shell that exists on every Linux
server, in every CI runner, and in every Docker image. Writing bash daily keeps
that muscle memory sharp. zsh scripts do not run on a plain Linux box; bash
scripts do.

That is a preference, not a rule. Plenty of good developers use zsh and write
bash scripts when they need to.

### How to switch, if you want to

macOS will only let you use a shell that is listed in `/etc/shells`. Add
Homebrew's bash, then switch:

```bash
# 1. Add it to the list of allowed shells
echo "$(brew --prefix)/bin/bash" | sudo tee -a /etc/shells

# 2. Make it your login shell
chsh -s "$(brew --prefix)/bin/bash"

# 3. Open a new terminal window, then confirm
echo "$SHELL"
# /opt/homebrew/bin/bash
```

`chsh` takes effect on your next new terminal window, not the current one.

To go back, run `chsh -s /bin/zsh`.

### Startup files, and which one runs when

This trips up everyone. Bash reads a different file depending on how it starts.

| How the shell starts | File bash reads |
| --- | --- |
| Login shell (a new Terminal tab, an SSH session) | `~/.bash_profile` |
| Interactive non-login shell (a subshell) | `~/.bashrc` |
| Script (`bash foo.sh`) | Neither |

macOS Terminal starts a **login** shell every time you open a tab. Linux
terminals usually do not. This is the single most common source of "it works on
my Linux box but not my Mac".

The standard fix is one line in `~/.bash_profile`:

```bash
[[ -f ~/.bashrc ]] && source ~/.bashrc
```

Now both paths lead to the same place. See
[`.bash_profile`](../.bash_profile) in this repo.

zsh has the same split: `~/.zprofile` for login, `~/.zshrc` for interactive.
Most people put everything in `~/.zshrc`.

### Splitting your config into fragments

A single 400-line `.bashrc` becomes unmanageable. This repo splits it into
numbered fragments under [`.bashrc.d/`](../.bashrc.d/), and
[`.bashrc`](../.bashrc) sources them in order:

```bash
for config in "$HOME"/.bashrc.d/*.bash; do
	source "$config"
done
```

The numbers control order, and order matters. `01-homebrew.bash` must set
`HOMEBREW_PREFIX` before anything uses it. `11-mise.bash` must run after every
fragment that prepends to `PATH`, or mise's shims end up behind system tools.
The comment at the top of
[`.bashrc.d/11-mise.bash`](../.bashrc.d/11-mise.bash) explains that constraint.

### PATH, and the missing dialog

`PATH` is a list of directories. When you type a command, the shell walks the
list left to right and runs the first match it finds.

On Windows you edit `PATH` in a System Properties dialog. **On macOS there is no
dialog.** You edit a text file, and the change applies to shells you start after
that.

To see yours, one directory per line:

```bash
echo "$PATH" | tr ':' '\n'
```

To find out which copy of a command wins:

```bash
command -v python3     # the one that runs
type -a python3        # every copy, in PATH order
```

To add a directory, prepend it in your shell config:

```bash
export PATH="$HOME/bin:$PATH"
```

Order is everything. Directories earlier in `PATH` win. That is how Homebrew's
bash beats `/bin/bash`, and how GNU `sed` beats BSD `sed` in the next section.

See [`.bashrc.d/02-path.bash`](../.bashrc.d/02-path.bash) for the pattern.

### Tab completion

Bash on macOS has almost no completion out of the box. Install it:

```bash
brew install bash-completion@2
```

Then source it from your config. See
[`.bashrc.d/20-completion.bash`](../.bashrc.d/20-completion.bash). Note the
guard on the first line: completion is only useful in an interactive shell, so
the fragment exits early otherwise.

`~/.inputrc` tunes how completion behaves. See
[`.inputrc`](../.inputrc) in this repo — three lines that show ambiguous matches
immediately and make completion case-insensitive, which matches how the
filesystem already behaves.

zsh's completion is better and needs less setup. Another point in its favor.

---

## Language runtimes

Do not install Node or Python from a downloaded installer. Do not use the
Python that macOS ships. That one belongs to the operating system, and changing
it can break system tools.

| On Windows | On macOS |
| --- | --- |
| nvm-windows | `mise` (or nvm, fnm, volta) |
| The python.org installer | `mise` (or pyenv, uv) |
| Per-language installers, per-language rules | One tool for every language |

### Use a version manager

A version manager installs runtimes into your home directory and switches
between them per project. You never touch the system copy.

This repo uses [`mise`](https://mise.jdx.dev/). One tool handles Node, Python,
Ruby, Go, and more. It replaces nvm, pyenv, rbenv, and the rest.

```bash
brew install mise
```

Then activate it in your shell config. See
[`.bashrc.d/11-mise.bash`](../.bashrc.d/11-mise.bash):

```bash
eval "$(mise activate bash)"
```

Per project, you commit a `mise.toml` naming the versions. Anyone who enters the
directory gets the same runtimes. This is the habit worth copying, whichever
tool you pick.

### Guard rails worth stealing

[`.bashrc.d/10-python.bash`](../.bashrc.d/10-python.bash) sets:

```bash
export PIP_REQUIRE_VIRTUALENV=true
```

That makes `pip install` refuse to run outside a virtual environment. It stops
you polluting a global site-packages by accident. There is an escape hatch
function, `syspip`, for the rare time you mean it.

---

## Unix traps that bite Windows developers

### BSD tools are not GNU tools

macOS inherits its command-line tools from BSD, not from Linux. The names match.
The flags do not. Every Stack Overflow answer you find assumes GNU.

The worst offender is `sed -i`:

```bash
sed -i 's/a/b/' file      # GNU: edits in place
sed -i 's/a/b/' file      # BSD: error, -i wants a backup suffix
sed -i '' 's/a/b/' file   # BSD: what you actually have to write
```

`date`, `grep`, `readlink`, `find`, and `stat` all differ too.

Two ways out. First, install the GNU versions:

```bash
brew install gnu-sed coreutils findutils
```

Homebrew prefixes them with `g` by default: `gsed`, `gdate`, `gfind`. Safe, but
your scripts stop working on Linux.

Second, put the GNU versions at the front of `PATH` under their normal names.
This repo does that for sed in
[`.bashrc.d/10-sed.bash`](../.bashrc.d/10-sed.bash):

```bash
export PATH="${HOMEBREW_PREFIX}/opt/gnu-sed/libexec/gnubin:${PATH}"
```

Now `sed` is GNU sed, and scripts behave the way the internet says they should.

### The filesystem ignores case, but remembers it

macOS formats disks as case-**insensitive** by default. `README.md` and
`readme.md` are the same file.

This bites in one specific way. You rename `Button.tsx` to `button.tsx`, git
sees no change, and your import breaks on the Linux CI runner where case
matters.

To rename safely, go through a temporary name:

```bash
git mv Button.tsx temp.tsx
git mv temp.tsx button.tsx
```

Or set git to notice:

```bash
git config --global core.ignorecase false
```

### Line endings

Windows ends lines with CRLF. macOS and Linux use LF alone. A file with the
wrong endings breaks shell scripts in a way that reads as nonsense:

```
./script.sh: line 2: $'\r': command not found
```

Set git to store LF and leave your working copy alone:

```bash
git config --global core.autocrlf input
```

This repo sets it in [`.gitconfig`](../.gitconfig).

### The executable bit

Windows decides a file is runnable by its extension. Unix uses a permission bit
on the file.

```bash
chmod +x script.sh    # make it runnable
./script.sh           # now this works
ls -l script.sh       # -rwxr-xr-x  the x characters are the bit
```

Git tracks this bit. A script committed from Windows often arrives without it,
and the fix is `chmod +x` followed by a commit.

### Paths

| On Windows | On macOS |
| --- | --- |
| `C:\Users\you` | `/Users/you` |
| Backslash `\` | Forward slash `/` |
| Drive letters | One tree, rooted at `/` |
| `%USERPROFILE%` | `$HOME`, or `~` |
| `;` separates `PATH` entries | `:` separates `PATH` entries |

`~`, the **tilde**, is shorthand for your home directory. `~/bin` and
`/Users/you/bin` are the same place. The shell expands it before the command
runs — but only unquoted. `echo ~/bin` prints your real path; `echo "~/bin"`
prints a literal `~/bin`. That is why scripts write `"$HOME/bin"` instead, and
why the fragments in this repo do.

There are no drive letters. An external disk appears at `/Volumes/Something`.

A leading `.` on a filename means hidden. That is the whole mechanism. It is why
every config file here starts with a dot.

---

## Symlinks and stow

A symlink is a file that points at another file. Programs that open it get the
target.

Windows has symlinks, but creating one needs administrator rights or Developer
Mode. Almost nobody uses them. **On macOS any user can create one, and nothing
prompts.**

```bash
ln -s /path/to/real/file ~/link-name
```

This makes a whole approach to dotfiles possible, and it explains why this repo
looks the way it does.

### Why the repo is shaped like a home directory

Config files have to live at fixed paths. Git wants them in a repo. Symlinks
resolve that: the real file lives in the repo, and a link sits at the path the
tool expects.

`~/.bashrc` is not a file here. It is a link to
`~/.home-directory/.bashrc`. Edit either path and you edit the same bytes. Run
`git status` in the repo and you see the change.

This is why the repo's layout mirrors a home directory. `.bashrc` at the top,
`.config/` beside it, `bin/` beside that.

### What stow does

[GNU stow](https://www.gnu.org/software/stow/) creates those links for you. Point
it at a directory and a target, and it links every file across, keeping the
structure.

```bash
stow -R --no-folding -t ~ .
```

`.stow-local-ignore` lists what to skip. `README.md`, `docs/`, and `CLAUDE.md`
are all in it. Those are repo files, not config, and they have no business in a
home directory.

You do not have to use stow. Some people write a small install script instead.
The idea to take away is the one underneath: **keep the real file in git, put a
link where the tool looks for it.**

---

## Desktop habits

| On Windows | On macOS |
| --- | --- |
| Ctrl+C, Ctrl+V, Ctrl+S | Cmd+C, Cmd+V, Cmd+S |
| Alt | Option (⌥) |
| Windows key | Cmd (⌘) |
| Alt+Tab | Cmd+Tab |
| Ctrl+F4 (close tab) | Cmd+W |
| Home / End | Cmd+← / Cmd+→ |
| Ctrl+← / Ctrl+→ (word jump) | Option+← / Option+→ |
| Delete (forward) | Fn+Delete |
| Start menu search | Spotlight (Cmd+Space) |
| Print Screen | Cmd+Shift+4 |
| Explorer | Finder |

### Cmd took over, except in the terminal

macOS moved almost every shortcut from Ctrl to Cmd. This frees Ctrl for the
terminal, which is the point.

**In a terminal, Ctrl still means Ctrl.** Ctrl+C interrupts. Ctrl+D sends
end-of-file. Ctrl+R searches history. Cmd+C copies. On Windows those two
meanings fight over one key. Here they do not.

### Home and End

Mac laptops have no Home or End key. Use Cmd+← and Cmd+→ for line start and
line end. Cmd+↑ and Cmd+↓ go to the top and bottom of a document.

Option+← and Option+→ move by word. Option+Delete deletes the previous word.
These work in almost every GUI text field on the system.

**In a terminal it depends on the emulator.** The keys only work if your
terminal sends the escape sequence bash expects. Ghostty and iTerm2 do;
Terminal.app needs configuring. Bash's own word-movement keys always work:
Option+F forward, Option+B back, Ctrl+W to delete the previous word.

### Finder

Finder is not Explorer. Three differences that catch people:

- **No Cut.** Copy with Cmd+C, then move with Cmd+Option+V.
- **Hidden files are hidden.** Press Cmd+Shift+. to toggle them. You need this
  constantly as a developer.
- **The path bar is off.** Turn it on: **View → Show Path Bar**.

To open a Finder window from the terminal, run `open .`. To open the current
Finder folder in a terminal, drag it onto the terminal icon.

### Pick a real terminal

The built-in Terminal.app works but is dated. Better options, all installable
with Homebrew:

```bash
brew install --cask ghostty     # what this repo uses
brew install --cask iterm2      # the long-standing default
brew install --cask wezterm
```

This repo uses Ghostty and pairs it with tmux. See
[`.tmux.conf`](../.tmux.conf) and
[`.bashrc.d/10-ghostty.bash`](../.bashrc.d/10-ghostty.bash).

### An app launcher pays for itself

Spotlight (Cmd+Space) opens apps, finds files, and does arithmetic. Learn it
first.

Third-party launchers go further. This repo installs Alfred. Raycast is the
common modern choice. Either replaces a lot of clicking.

---

## What is in `.claude`

**This part is the most personal thing in the repo. Read it for ideas, then
build your own.**

[`.claude/`](../.claude/) holds a Claude Code configuration, stowed into
`~/.claude`. It is tuned to one person's work, tools, and writing voice. Copying
it wholesale will give you someone else's opinions.

What is in there:

- **`CLAUDE.md`** — standing instructions the agent reads in every session.
  Preferences about tooling, commit style, and how to communicate.
- **`hooks/`** — shell scripts the agent runs at fixed points. One guards risky
  bash commands. Others gate a writing workflow.
- **`mcp-configs/`** — connections to external services. Every one reads its
  credentials from an environment variable. **No secrets are committed.** The
  files do name internal endpoints, so they are examples of shape, not things
  you can use.
- **`output-styles/`** — how the agent writes prose.
- **`skills/`** — packaged instructions for specific recurring tasks.
- **`settings.json`** — permissions, environment, and hook wiring.

The idea worth taking is the general one: an agent works far better with written
standing instructions than without them. Start with a short `CLAUDE.md` in your
own project. Add to it when you catch yourself repeating a correction.

---

## Where to go next

- [`README.md`](../README.md) — how this repo is set up, for its owner
- [`gitconfig-local.example`](gitconfig-local.example) — how to give git a
  different identity per client directory. Not a macOS thing, but useful and
  little known.
- [Homebrew documentation](https://docs.brew.sh/)
- [mise documentation](https://mise.jdx.dev/)
- [GNU stow manual](https://www.gnu.org/software/stow/manual/stow.html)
