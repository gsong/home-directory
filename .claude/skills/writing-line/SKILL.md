---
name: writing-line
description: Gated writing pipeline for drafts under ai-swap/drafts/. Use when the user asks for a document, write-up, presentation, explainer, email, or Slack message, or asks to revise one. Carries the stages hooks cannot: profile choice, headline and outline approval, and the three exit passes.
---

# Writing line

A draft goes through fixed stages. Each stage ends with the user, not with you.

Two hooks run on their own. `writing-gate.sh` reports voice violations after
every write. `writing-capture.sh` logs each edit against the instruction that
caused it. Neither needs anything from you.

## 1. Pick the profile

| Profile | Content |
|---|---|
| `comms` | Email, Slack |
| `mixed` | Write-ups and presentations for non-technical or mixed audiences |
| `technical` | Docs, engineering explainers |

Ask with AskUserQuestion if the content does not clearly belong to one.

The profile sets the draft path, and the path arms the hooks:

    <repo>/ai-swap/drafts/<profile>/    when the writing belongs to a project
    ~/ai-swap/drafts/<profile>/         otherwise

A draft written anywhere else gets no gate and no capture.

## 2. Load the references

Read, in this order:

1. `~/.claude/skills/writing-line/rules/<profile>.md`, the Judgment section.
   The Greppable block is the hook's business, not yours.
2. `~/.claude/skills/writing-line/references/`, the terms that hold everywhere.
3. `<repo>/.claude/writing-line/references/`, if the repo has one. A project
   term overrides a global term of the same name.

The references directory starts near empty. Grow it only when a draft exposes
a gap.

## 3. Agree the promise — `mixed` only

Write three headline and subhead candidates. Score each against:

- Does it name a concrete outcome, not a topic?
- Would the audience recognize the problem in the first line?
- Does it promise something the draft can actually deliver?

Put the candidates to the user with AskUserQuestion. Do not pick for them.

Skip this stage for `technical` and `comms`.

## 4. Agree the outline

Write the full spine before any prose exists: every section, and one line
saying what each one does. Include the evidence each claim will rest on.

Put it to the user. Wait for approval. Do not start prose until you have it.

An outline is cheap to change. A draft is not.

## 5. Draft

Write it. The gate reports on every write. Fix real violations on your next
turn. If a rule misreads the same passage twice, say so — that is a signal the
rule is wrong, and the user can retire it.

## 6. The three exit passes

Run them in this order, one at a time. Each pass reads the whole draft.

**Humanizer.** Strip the AI-writing tells. Inflated pairings, throat-clearing
openers, marketing adjectives, connective filler. Cut hedges, or commit to the
claim. Read every em dash and ask whether a period or a comma does the job.

**Flow.** Fix readability and the bridges between ideas. Does each paragraph
follow from the one before? Does the reader ever have to rebuild a step you
skipped? Split any sentence carrying two ideas.

**Accuracy.** Check every claim is supported. Check the register matches the
audience you agreed in stage 1. Mark what you verified apart from what you
inferred. Cut any number you cannot source.

## 7. Hand it back

Tell the user to read it aloud. That check is theirs, and nothing automates it.

## What you do not do

Do not log corrections by hand. The capture hook does it.

Do not edit the rule files while drafting. The promotion hook surfaces patterns
at the end of a turn, and the user routes them.
