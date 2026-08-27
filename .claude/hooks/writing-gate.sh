#!/usr/bin/env bash
# PostToolUse voice gate for writing-line. Reads a draft that Claude just wrote,
# checks it against the rule file for its profile, and reports violations as
# advisory feedback. It never blocks: the write has already landed, and a gate
# that stops work gets switched off.
#
# The scan runs in perl because the rule files use \b and other Perl-style
# regex. The awk and grep that ship with macOS are POSIX and do not support it.
set -uo pipefail

payload=$(cat)

tool=$(jq -r '.tool_name // empty' <<<"$payload" 2>/dev/null) || exit 0
case $tool in Write | Edit | MultiEdit) ;; *) exit 0 ;; esac

file=$(jq -r '.tool_input.file_path // empty' <<<"$payload" 2>/dev/null) || exit 0
[[ $file == */ai-swap/drafts/* ]] || exit 0
[[ -f $file ]] || exit 0

# The profile is the directory under drafts/. A file sitting loose in drafts/
# has no profile, so there is nothing to check it against.
rest=${file#*/ai-swap/drafts/}
profile=${rest%%/*}
[[ $profile != "$rest" ]] || exit 0

rules=${WRITING_LINE_RULES:-$HOME/.claude/skills/writing-line/rules}/$profile.md
[[ -f $rules ]] || exit 0

report=$(/usr/bin/perl - "$rules" "$file" <<'PERL'
use strict;
use warnings;
my ($rules_path, $draft_path) = @ARGV;

# --- rules -------------------------------------------------------------
# Only the fenced ```rules block counts. Every other line in the file is prose
# for a human, or a judgment rule the gate cannot check.
open my $rf, '<', $rules_path or exit 0;
my (@res, @densities, $maxwords, $maxwords_msg, $in_block);
while (my $line = <$rf>) {
    chomp $line;
    if (!$in_block) { $in_block = 1 if $line =~ /^```rules\s*$/; next }
    last if $line =~ /^```/;
    next if $line =~ /^\s*$/ or $line =~ /^#/;
    # Fields are tab separated. The kind comes first and the message last.
    # What sits between them depends on the kind.
    my ($kind, @rest) = split /\t/, $line;
    next unless @rest;
    my $msg = pop @rest;
    if ($kind eq 're' and @rest == 1) {
        # A rule file is hand-edited. One bad regex must not silence the gate.
        my $re = eval { qr/$rest[0]/ };
        push @res, [ $re, $msg ] if defined $re;
    }
    elsif ($kind eq 'maxwords' and @rest == 1) {
        $maxwords     = $rest[0] + 0;
        $maxwords_msg = $msg;
    }
    elsif ($kind eq 'density' and @rest == 2) {
        my $re = eval { qr/$rest[0]/ };
        push @densities, [ $re, $rest[1] + 0, $msg ] if defined $re;
    }
}
close $rf;

# --- draft -------------------------------------------------------------
open my $df, '<', $draft_path or exit 0;
my @lines = <$df>;
close $df;
chomp @lines;

# Front matter and code samples are not prose. Blank them rather than drop
# them, so the line numbers reported still match the file on disk.
my $i = 0;
if (@lines and $lines[0] =~ /^---\s*$/) {
    $lines[0] = '';
    for ($i = 1; $i <= $#lines; $i++) {
        my $closing = $lines[$i] =~ /^---\s*$/;
        $lines[$i] = '';
        if ($closing) { $i++; last }
    }
}
my $fenced = 0;
for (; $i <= $#lines; $i++) {
    if ($lines[$i] =~ /^\s*(?:```|~~~)/) { $fenced = !$fenced; $lines[$i] = ''; next }
    $lines[$i] = '' if $fenced;
}

# --- scan --------------------------------------------------------------
my $words = 0;
my %hits;

for my $n (0 .. $#lines) {
    my $line = $lines[$n];
    next if $line =~ /^\s*$/;

    for my $rule (@res) {
        printf "line %d: %s\n", $n + 1, $rule->[1] if $line =~ $rule->[0];
    }

    # A density rule asks how often a mark appears, not whether it appears.
    # Counting runs over the whole draft, so it is reported once at the end.
    $words += grep { /\S/ } split /\s+/, $line;
    for my $d (@densities) {
        my $n_hits = () = $line =~ /$d->[0]/g;
        $hits{ $d->[2] } += $n_hits;
    }

    next unless $maxwords;
    # A heading, a table row, a quote and a list item are not sentences.
    next if $line =~ m{^\s*(?:[#>|]|[-*+]\s|\d+[.)]\s)};
    for my $sentence (split /(?<=[.!?])\s+/, $line) {
        my @sentence_words = grep { /\S/ } split /\s+/, $sentence;
        if (@sentence_words > $maxwords) {
            printf "line %d: %s\n", $n + 1, $maxwords_msg;
            last;
        }
    }
}

# A rate needs enough words to mean anything. One em dash in a two-line Slack
# message is not a habit, and reporting it would be noise.
if ($words >= 150) {
    for my $d (@densities) {
        my $count = $hits{ $d->[2] } || 0;
        my $per_thousand = $count * 1000 / $words;
        # The threshold has to clear twice: as a rate, and as a plain count.
        # Without the second test, one mark in a short draft reads as a habit.
        printf "draft: %s (%d in %d words)\n", $d->[2], $count, $words
            if $count > $d->[1] and $per_thousand > $d->[1];
    }
}
PERL
)

[[ -z $report ]] && exit 0

context="writing-line gate, profile \"$profile\", on ${file##*/}:

$report

Advisory only. Fix what is a real violation. Ignore what the rule misread, and
say so if the same rule misreads twice."

jq -Rn --arg c "$context" \
  '{hookSpecificOutput: {hookEventName: "PostToolUse", additionalContext: $c}}'
exit 0
