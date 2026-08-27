# Voice rules — comms

Email and Slack.

Thin on purpose. It grows from corrections the promotion hook surfaces.

## Greppable

```rules
maxwords	18	sentence runs over 18 words; split it
re	^(Great|Certainly|Sure|Of course|Absolutely|I'd be happy|Hope this finds you)	preamble; lead with the ask
re	\b(just wanted to|quick question|circle back|touch base|reach out)\b	filler opener; state the ask
density	—	3	em dashes are frequent here; most of them want a period or a comma
re	(?<![\d-])\d+\s*[-—]\s*\d+(?![\d-])	number range with a hyphen or em dash; use an en dash (–)
re	\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*[-—]\s*(Mon|Tue|Wed|Thu|Fri|Sat|Sun|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)	date range with a hyphen or em dash; use an en dash (–)
re	\b[Ll]everag(e|es|ing|ed)\b	"leverage" as a verb; say "use"
re	\b(seamless|robust|cutting-edge|synerg)	corporate filler; cut it
re	\b(centre|licence|defence|whilst|amongst)\b	British spelling; use American
```

## Judgment

- Put the ask in the first sentence. Context comes after.
- Name the deadline and the owner. Both, or neither is real.
- One message, one ask. Split anything longer.
- An em dash is fine where it earns its place. Reach for a period or a
  comma first, and keep em dashes rare.
- Use an en dash (–) for a range: 10–20, 2020–2024, Mon–Fri. A hyphen joins
  words; it does not span a range.
