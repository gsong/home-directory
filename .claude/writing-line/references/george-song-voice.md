# George Song's voice — measured

Not a style opinion. Counts taken from three published articles on gsong.dev on
2026-08-27, roughly 3,050 words of prose with code blocks and headings excluded.

| Article                           | Prose words | Register                                                                   |
| --------------------------------- | ----------- | -------------------------------------------------------------------------- |
| `articles/datalist-autosuggest`   | 786         | technical explainer. George names this one as carrying a lot of his prose. |
| `articles/ai-dev-workflow`        | 1,477       | professional explanatory. Closest match to a client write-up.              |
| `articles/workplace-justice-ally` | 788         | personal essay. Use only for how he admits fault.                          |

## The numbers

| Measure                   | Value            | Spread across the three     |
| ------------------------- | ---------------- | --------------------------- |
| Median sentence           | 13 words         | 12 / 13 / 15                |
| Longest sentence          | 26–37 words      | rare, and always deliberate |
| Sentences under 8 words   | ~16%             | 19% / 19% / 10%             |
| Semicolons                | **0**            | 0 / 0 / 0                   |
| Colons per 1,000 words    | 12.5             | 16.5 / 7.4 / 17.8           |
| Em dashes per 1,000 words | 4.6              | 1.3 / 8.1 / 1.3             |
| Exclamation points        | 1 in 3,050 words | "Ship it!"                  |
| Marketing adjectives      | 0                | none in any article         |

## The colon is the workhorse

He uses colons two to three times as often as em dashes. The shape is a longer
setup, then a colon, then a short clause that lands.

> the point is clear: words matter

When a draft is em-dash heavy, the fix is usually a colon, not a period.

## Em dashes join, they do not bracket

Every em dash he writes joins a clause of restatement or consequence.

> This isn't sloppiness—it's intentionality about the development approach.

He never uses a pair of em dashes to bracket a parenthetical aside. That
construction is the one to cut. Keep the restatement ones.

## Rhythm

Long clause-stacked sentence, then a short one that lands. He does not run even.

> Why is that?

> Exactly zero.

> Sounds exactly like what we need.

## How he states a limitation

State the limitation flat, as a fact. Then, in a second clause, give the
condition under which it is tolerable. Never soften the limitation itself, and
never tell the reader how much to care about it.

> Claude Code's token budget is generous, but it's not infinite.

> There are potentially some accessibility issues that may prevent you from
> using this technique, specifically screen readers do not convey datalist
> changes.

> Skills are a brand new primitive in Claude Code, and I'm still figuring out
> how they fit into my workflow.

The recurring frame is "X, but Y" or "This isn't A — it's B". He never says a
thing is simply bad, and he never adds a sentence telling the reader the limit
is worth knowing. Naming it is the whole job.

## How he admits fault

Plainly. Active voice, no hedge, no joke to soften the landing.

> By assuming my experience is the normal experience, I actively caused harm to
> another person that I care about.

> By not taking these simple steps, I reinforced harmful gender normative
> behaviors.

A section header reading "One of My Own Mistakes", not a euphemism.

## Where the claim goes

The two professional articles lead with the claim, then support it. The personal
essay builds to it. **For anything work-facing, lead with the claim.**

The document as a whole still lands its recommendation at the end. Paragraph
level and document level differ here.

## Enumerate with a list, not a long sentence

His own words, 2026-08-27: "I like to enumerate using lists rather than put
lots of stuff in one sentence where it makes sense."

The measured articles agree. Bullets carry parallel enumerable items and sets of
standalone facts; prose carries reasoning, sequence, and anything needing a
"because".

Three or more parallel items in one sentence is the signal. A sentence the gate
flags for length is very often an enumeration that wants to be a list, and
splitting it into two sentences is the wrong fix.

The judgment in "where it makes sense": a narrow table cell is already a
scannable unit, so a bullet list inside one adds noise without helping. Convert
enumerations in body prose, not in table cells.

## What he cuts from a draft

Four cuts observed on 21 September 2026, across two client mails. Each removes
a sentence that **performs a posture instead of doing the thing**. That is the
through-line, and it is worth more than the four instances.

| He wrote | He cut | The posture |
|---|---|---|
| "something you need to determine internally" | "It is theirs, not ours, and we would rather not pretend to a view on it" | modesty |
| "Let me know if you would like help making that decision." | "If it helps, we are glad to sit in on the conversation with Google and translate" | helpfulness |
| "Hannah, thank you." | "The export is what we asked for, and it arrived a day after the list." | gratitude |
| "Is `ab_id` the `interact_id`?" | the evidence for asking, and what goes wrong if we guess | rigor |

He keeps the act every time. He draws the line, offers the help, says thank
you, asks the question. He removes the sentence that shows him doing it.

**The fourth is the one to watch**, because it does not look like a flourish.
Justifying an ask reads as thorough. To a reader who can answer in one line it
is three sentences of homework they did not set. The same instinct writes the
sentence that explains your own system to the person who owns the data.

He also joined two short sentences the length gate had split into one of 24
words. The staccato was the draft's failure, not the length.

## Idiom tolerance

At most one small aside per piece. Across 3,050 words: "Composition FTW",
"why make a mountain out of a molehill?" (voicing an imagined objector, not his
own view), and "One. Step. At. A. Time." as a closer.

A running seasoning of idiom is not his voice. If a draft has more than one,
cut down to one or none.

## Hedging

Almost none, and only ever on a subjective judgment, never on a fact.

> I think a better experience would be to sort by three major sections.

He does not hedge his own assertions, and he does not hedge his own admissions
of fault.

## Person

Heavy "we", moderate "you", light "I". He describes what he did rather than
prescribing to the reader. Zero instances of "you should", "you must", or "you
need to" across all three articles.

> This is conversation, not instruction.

**One observed exception, in client mail.** Editing a draft on 21 September
2026 he wrote "something you need to determine internally" to a client, and
closed with "Let me know if you would like help making that decision." Two
things follow, each from one data point, so treat them as directional:

- The zero count on "you need to" is from articles, where the reader is
  nobody in particular. In mail to a named person who owns a decision, he does
  say the decision is theirs, plainly and with "you". The rule is against
  prescribing to a general reader, not against telling one person what is
  theirs to decide.
- The body of a mail stays "we". The closing offer switches to "I": "Let me
  know". One person offers help, even when a team did the work.

## Absent throughout

No exclamation points beyond one. No marketing adjectives. No parenthetical
asides set off by em dashes. No semicolons. No all-caps emphasis. No emoji
outside a single technical aside. No self-congratulation about the writing
itself — he never tells the reader he is being candid, he just is.

## Caveat on the sample

Three articles, ~3,050 words. Treat the density figures as directional, not as a
corpus statistic. The em dash rate in particular splits: 1.3 per 1,000 in two
articles and 8.1 in the third. The qualitative rule (join, do not bracket) is
more reliable than the count.
