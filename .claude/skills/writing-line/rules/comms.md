# Voice rules — comms

Email and Slack.

Thin on purpose. It grows from corrections the promotion hook surfaces.

## Greppable

`common.md` holds the rules that apply to every profile, and the gate loads it
alongside this file. The field format is documented there. This block holds only
what is specific to email and Slack.

```rules
maxwords	18	sentence runs over 18 words; split it
re	^(Great|Certainly|Sure|Of course|Absolutely|I'd be happy|Hope this finds you)	preamble; lead with the ask
re	\b(just wanted to|quick question|circle back|touch base|reach out)\b	filler opener; state the ask
```

## Judgment

- Put the ask in the first sentence. Context comes after.
- Name the deadline and the owner. Both, or neither is real.
- One message, one ask. Split anything longer.
- An em dash joins a clause of restatement or consequence: "This isn't
  sloppiness - it's intentionality." Never use a pair to bracket an aside.
  When cutting one, reach for a colon first.
- No semicolons. See `references/george-song-voice.md`.
- Never tell the reader you are being candid. Be candid.
- Enumerate with a list, not a long sentence. Three or more parallel items
  in one sentence is the signal. A sentence flagged for length is often an
  enumeration that wants to be a list; splitting it in two is the wrong fix.
  Body prose, not table cells.
- Use an en dash (–) for a range: 10–20, 2020–2024, Mon–Fri. A hyphen joins
  words; it does not span a range.
