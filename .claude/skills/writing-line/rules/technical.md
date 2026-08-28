# Voice rules — technical

Docs and engineering explainers. Seeded from `output-styles/plain-technical.md`.

## Greppable

The gate reads the block below. Each line is three tab-separated fields.
The kind comes first and the message last. `re` takes one regular expression.
`maxwords` takes one number. `density` takes a regular expression, a floor
count, and a rate per thousand words: it reports only when both are exceeded. Lines starting with `#` are comments.
Fenced code blocks and front matter in the draft are never checked.

```rules
# Register — one idea per sentence
maxwords	20	sentence runs over 20 words; split it
density	(?:—|&mdash;)	4	4	em dashes are frequent here; a colon usually does the job, and a pair bracketing an aside is never right
re	(?<![\d-])\d+\s*[-—]\s*\d+(?![\d-])	number range with a hyphen or em dash; use an en dash (–)
re	\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*[-—]\s*(Mon|Tue|Wed|Thu|Fri|Sat|Sun|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)	date range with a hyphen or em dash; use an en dash (–)
re	;	semicolon; use a period or a colon
re	--	double hyphen; use a period or a comma

# Preamble — the answer starts on line one
re	^(Great|Certainly|Sure|Of course|Absolutely|I'd be happy|Let me start by)	preamble; lead with the outcome

# Banned constructions — AI tells
re	\b[Dd]elve	"delve"; say "look at"
re	\b[Ll]everag(e|es|ing|ed)\b	"leverage" as a verb; say "use"
re	\b[Uu]tiliz(e|es|ing|ed)\b	"utilize"; say "use"
re	[Ii]t('s| is) (important|worth) (to note|noting)	filler; state the point
re	\b(seamless|robust|comprehensive|cutting-edge|game-chang)	marketing adjective; name the property
re	\b(furthermore|moreover|additionally),	connective filler; start the sentence
re	\b(landscape|realm|tapestry|testament to)\b	metaphor; name the thing
re	[Nn]ot only .* but also	inflated pairing; use one clause
re	\bin (today's|the modern) (world|landscape)	throat-clearing; cut it
re	\b([Bb]eing straight|[Tt]o be (honest|blunt|straight)|[Ff]rankly)\b	telling the reader you are being candid; just be candid

# Confidence — verified and inferred must not read alike
re	\b(arguably|somewhat|fairly|rather) \b	hedge; state it or drop it
re	\b(basically|essentially|simply put)\b	filler qualifier; cut it
density	\b(genuinely|actually|really)\b	4	1.5	intensifier repeated; the sentence is stronger without it

# American English
re	\b(colou?r|behaviour|favour|honour|labour|organis|recognis|analys|prioritis|customis|optimis|apologis|realis|summaris)	British spelling; use American
re	\b(centre|licence|defence|whilst|amongst)\b	British spelling; use American
```

## Judgment

The gate cannot check these. They load as context when the skill runs.

- Lead with the outcome or the recommendation. Then give the premise.
- Never make the reader rebuild a step you skipped.
- Prose by default. Use a table only for a real comparison.
- After you edit code, point to `file:line` instead of pasting the diff.
- Show code only when its shape is the explanation.
- Use the active voice. Name the actor.
- Use one word for one meaning. Do not swap in synonyms for variety.
- Do not invent jargon. Define an acronym at first use, or drop it.
- Avoid noun clusters longer than three words.
- Use the project's own names for things. Read `CONTEXT.md` if the repo has one.
- Say plainly what you verified and what you inferred.
- An em dash joins a clause of restatement or consequence: "This isn't
  sloppiness - it's intentionality." Never use a pair to bracket an aside.
  When cutting one, reach for a colon first.
- Never tell the reader you are being candid. Be candid.
- Use an en dash (–) for a range: 10–20, 2020–2024, Mon–Fri. A hyphen joins
  words; it does not span a range.
