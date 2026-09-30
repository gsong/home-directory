# Voice rules — comms

Email and Slack.

Thin on purpose. It grows from corrections the promotion hook surfaces.

## Greppable

`common.md` holds the rules that apply to every profile, and the gate loads it
alongside this file. The field format is documented there. This block holds only
what is specific to email and Slack.

```rules
maxwords	24	sentence runs over 24 words; split it, unless it carries one idea in one clause
re	^(Great|Certainly|Sure|Of course|Absolutely|I'd be happy|Hope this finds you)	preamble; lead with the ask
re	\b(just wanted to|quick question|circle back|touch base|reach out)\b	filler opener; state the ask
```

## Judgment

- Put the ask in the first sentence. Context comes after.
- Name the deadline and the owner. Both, or neither is real.
- One message, one ask. Split anything longer.
- Ask the question. Do not argue for it. A reader who can answer needs the
  question, not the evidence behind it or what goes wrong if you guess.
  "Is `ab_id` the `interact_id`?" beats three sentences ending in "a number in
  the wrong column looks exactly like a correct one." Give a reason only when
  it changes the answer.
- Do not explain your own system to the person outside it. How your build uses
  a column is not context for whoever owns the column. Cut the sentence that
  teaches the reader your reasoning when they only have to reply.
- An em dash joins a clause of restatement or consequence: "This isn't
  sloppiness - it's intentionality." Never use a pair to bracket an aside.
  When cutting one, reach for a colon first.
- No semicolons. See `references/george-song-voice.md`.
- Never tell the reader you are being candid. Be candid. The wider rule: cut
  any sentence that performs a posture instead of doing the thing. Modesty,
  helpfulness, gratitude and rigor are all done by acting, never by narrating.
  See `references/george-song-voice.md`, *What he cuts from a draft*.
- Name whose decision it is in one plain clause: "something you need to
  determine internally." Never narrate your own restraint: "we would rather
  not pretend to a view on it" performs modesty instead of drawing the line.
  Same rule as candor, different coat.
- An offer of help is one open sentence: "Let me know if you would like help
  making that decision." Do not stage the help ("we are glad to sit in on the
  call and translate"). The reader picks the shape of it, not the writer.
- The length flag is a prompt to look, not an order to cut. A sentence that
  carries one idea in one natural clause stays whole even at 20–25 words. Two
  clipped sentences in a row, where one would read naturally, is the worse
  failure. Split when the sentence carries two ideas or an enumeration.
- Enumerate with a list, not a long sentence. Three or more parallel items
  in one sentence is the signal. A sentence flagged for length is often an
  enumeration that wants to be a list; splitting it in two is the wrong fix.
  Body prose, not table cells.
- Use an en dash (–) for a range: 10–20, 2020–2024, Mon–Fri. A hyphen joins
  words; it does not span a range.

## Notes on the rules

- `maxwords` was 18 until 2026-09-21. On a client mail the gate split a
  24-word sentence that carried one idea, and George rejoined it by hand. His
  measured median is 13 with a real maximum of 37, so 18 flagged sentences
  that are ordinary in the voice. It is now 24. The gate also cannot see a
  bold lead-in ("**Why.** The tool...") as its own sentence, so a paragraph
  that opens with one is over-counted by the lead-in's length. Read those
  flags before acting on them.
