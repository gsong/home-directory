# Voice rules — comms

Email and Slack.

Thin on purpose. It grows from corrections the promotion hook surfaces.

## Greppable

```rules
maxwords	18	sentence runs over 18 words; split it
re	^(Great|Certainly|Sure|Of course|Absolutely|I'd be happy|Hope this finds you)	preamble; lead with the ask
re	\b(just wanted to|quick question|circle back|touch base|reach out)\b	filler opener; state the ask
density	(?:—|&mdash;)	4	4	em dashes are frequent here; a colon usually does the job, and a pair bracketing an aside is never right
re	(?<![\d-])\d+\s*[-—]\s*\d+(?![\d-])	number range with a hyphen or em dash; use an en dash (–)
re	\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*[-—]\s*(Mon|Tue|Wed|Thu|Fri|Sat|Sun|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)	date range with a hyphen or em dash; use an en dash (–)
re	\b[Ll]everag(e|es|ing|ed)\b	"leverage" as a verb; say "use"
re	\b(seamless|robust|cutting-edge|synerg)	corporate filler; cut it
re	\b(centre|licence|defence|whilst|amongst)\b	British spelling; use American
re	;	semicolon; use a period or a colon
re	\b([Bb]eing straight|[Tt]o be (honest|blunt|straight)|[Ff]rankly)\b	telling the reader you are being candid; just be candid
re	\b[Dd]elve	"delve"; say "look at"
re	\b[Uu]tiliz(e|es|ing|ed)\b	"utilize"; say "use"
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
