#!/usr/bin/env bash
# Stop hook for writing-line. Counts the corrections the capture hook logged
# and stays silent until one pattern has recurred. Then it surfaces that
# pattern once and asks the user where it belongs.
#
# One decision per pattern, not per correction. A one-off never recurs, so it
# never costs the user a decision.
set -uo pipefail

payload=$(cat)

# The Stop hook fires again after it blocks. Without this the hook loops.
[[ $(jq -r '.stop_hook_active // false' <<<"$payload" 2>/dev/null) == "true" ]] && exit 0

state=${WRITING_LINE_STATE:-$HOME/.claude/state/writing-line}
log=$state/corrections.jsonl
[[ -f $log ]] || exit 0

reason=$(/usr/bin/perl - "$log" "$state/surfaced.txt" <<'PERL'
use strict;
use warnings;
use JSON::PP;

my ($log_path, $surfaced_path) = @ARGV;

# A word that appears in every other instruction carries no signal. So do the
# verbs and nouns that show up in any request to change a draft.
my %stop = map { $_ => 1 } qw(
    about after again against all also always another any anything are because
    been before being between both came cannot come could does doing done down
    each even every from give given goes going have having here into itself
    just keep kept less like line lines little long look made make many maybe
    more most much must need needs never next none only onto other over para
    paragraph paragraphs part please rather really said same say says section
    sentence sentences should since some something still such take text than
    that their them then there these they thing things this those through
    time under until upon used using very want wants were what when where
    which while will with without word words would your yours
    add added adding change changed changes changing cut delete deleted
    draft drafts edit edited fix fixed instead move moved put remove removed
    rewrite rewrote swap tweak update updated write wrote
);

# Light stemming, so "hedging", "hedged" and "hedges" land on one key.
sub stem {
    my $w = lc shift;
    $w =~ s/[^a-z0-9]//g;
    return () if length($w) < 4;
    return () if $stop{$w};
    for my $suffix (qw(ing edly ed ly es s)) {
        if ($w =~ /\Q$suffix\E$/ and length($w) - length($suffix) >= 3) {
            $w = substr($w, 0, length($w) - length($suffix));
            last;
        }
    }
    return $w;
}

my %surfaced;
if (open my $sf, '<', $surfaced_path) {
    while (my $id = <$sf>) { chomp $id; $surfaced{$id} = 1 if length $id }
    close $sf;
}

# Every edit in one turn answers one instruction. Collapse them, or a single
# correction that touched three files looks like three corrections.
open my $lf, '<', $log_path or exit 0;
my (%turn_reason, %turn_profile, @turn_order);
while (my $line = <$lf>) {
    my $rec = eval { decode_json($line) } or next;
    my ($id, $profile, $why) = @{$rec}{qw(prompt_id profile reason)};
    next unless defined $id and length $id;
    next unless defined $profile and length $profile;
    next unless defined $why and $why =~ /\S/;
    next if $surfaced{$id};
    my $key = "$profile\t$id";
    next if exists $turn_reason{$key};
    $turn_reason{$key}  = $why;
    $turn_profile{$key} = $profile;
    push @turn_order, $key;
}
close $lf;

# A cluster is the set of turns whose instruction shares a distinctive word.
# Crude, and easy to explain back to the user, which matters more here than
# precision: the user is the classifier, the hook only decides when to ask.
my %cluster;
for my $key (@turn_order) {
    my %seen;
    for my $word (map { stem($_) } split /\s+/, $turn_reason{$key}) {
        next if $seen{$word}++;
        push @{ $cluster{ $turn_profile{$key} }{$word} }, $key;
    }
}

my $THRESHOLD = 3;
my ($best_profile, $best_word, $best_keys);
for my $profile (sort keys %cluster) {
    for my $word (sort keys %{ $cluster{$profile} }) {
        my $keys = $cluster{$profile}{$word};
        next if @$keys < $THRESHOLD;
        next if $best_keys and @$keys <= @$best_keys;
        ($best_profile, $best_word, $best_keys) = ($profile, $word, $keys);
    }
}
exit 0 unless $best_keys;

# Mark before speaking. If anything downstream fails, the worst case is a
# pattern that never gets asked about, not one that is asked about forever.
open my $sf, '>>', $surfaced_path or exit 0;
for my $key (@$best_keys) { my (undef, $id) = split /\t/, $key; print $sf "$id\n" }
close $sf;

my $n = scalar @$best_keys;
print <<"END";
writing-line has $n corrections in the "$best_profile" profile that share the
same idea. The word they have in common is "$best_word".

END
print "  - $turn_reason{$_}\n" for @$best_keys;
print <<"END";

Ask the user where this belongs, using the AskUserQuestion tool. The options:

  1. A voice rule for the "$best_profile" profile. Append it to
     ~/.claude/skills/writing-line/rules/$best_profile.md. Put it in the
     Greppable block if one regex can express it, and in Judgment if not.
  2. A reference entry, if the correction is about a term or a fact rather
     than about voice. Ask whether it holds everywhere or only in this repo,
     then write it to the global references directory or to
     <repo>/.claude/writing-line/references/.
  3. Discard it, if it is neither.

Write the file the user picks, then stop. This pattern will not be raised
again either way.
END
PERL
)

[[ -z $reason ]] && exit 0

jq -Rn --arg r "$reason" '{decision: "block", reason: $r}'
exit 0
