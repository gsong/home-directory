# Clean Claude Code Cache

Clean up cache and temporary files older than 3 months from the `~/.claude` (or `${HOME}/.claude`) directory in the user's home.

## Directories to Clean

Flat directories (delete old files directly):

- `debug/` - Debug logs (.txt files)
- `todos/` - Historical todo lists (.json files)
- `shell-snapshots/` - Bash environment snapshots (.sh files)
- `statsig/` - Feature flag cache files
- `_memory/` - Context/memory storage

Nested directories (delete old files, then cleanup empty subdirs):

- `file-history/` - Session-based subdirectories with versioned file history
- `projects/` - Project-based subdirectories with conversation history (.jsonl files)

## Process

1. **Calculate cutoff date** - Use date-calculator subagent to get date from 3 months ago
2. **Show preview** - Display files to be deleted with count and size per directory
3. **Confirm with user** - Ask for confirmation before proceeding
4. **Delete old files** - Use `find ... -type f -mtime +90 -exec rm -f {} +`
5. **Remove empty directories** - Use `find ... -type d -empty -delete` for nested structures
6. **Show results** - Display what was deleted and space freed

## Important Notes

- Calculate date dynamically, don't hardcode
- For flat directories: just delete old files
- For nested directories: delete old files first, then remove empty subdirectories
- Use `rm -f` (no interactive prompts)
- Preserve directory structure at top level
