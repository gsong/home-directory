# Voice rules — mixed

Write-ups and presentations for non-technical or mixed audiences.

Thin on purpose. It grows from corrections the promotion hook surfaces.

## Greppable

```rules
maxwords	22	sentence runs over 22 words; split it
re	^(Great|Certainly|Sure|Of course|Absolutely|I'd be happy)	preamble; lead with the outcome
density	—	4	4	em dashes are frequent here; most of them want a period or a comma
re	(?<![\d-])\d+\s*[-—]\s*\d+(?![\d-])	number range with a hyphen or em dash; use an en dash (–)
re	\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*[-—]\s*(Mon|Tue|Wed|Thu|Fri|Sat|Sun|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)	date range with a hyphen or em dash; use an en dash (–)
re	\b[Dd]elve	"delve"; say "look at"
re	\b[Ll]everag(e|es|ing|ed)\b	"leverage" as a verb; say "use"
re	[Ii]t('s| is) (important|worth) (to note|noting)	filler; state the point
re	\b(seamless|robust|cutting-edge|game-chang)	marketing adjective; name the property
re	\b(landscape|realm|tapestry|testament to)\b	metaphor; name the thing
re	\b(centre|licence|defence|whilst|amongst)\b	British spelling; use American
```

## Judgment

- Lead with what the reader must do or decide.
- Define every term the audience does not already use.
- Give one concrete example for each abstract claim.
- Do not assume the reader knows the system. Name it before you use it.
- An em dash is fine where it earns its place. Reach for a period or a
  comma first, and keep em dashes rare.
- Use an en dash (–) for a range: 10–20, 2020–2024, Mon–Fri. A hyphen joins
  words; it does not span a range.
