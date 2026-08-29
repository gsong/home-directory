# Voice rules — technical

Docs and engineering explainers. Seeded from `output-styles/plain-technical.md`.

## Greppable

`common.md` holds the rules that apply to every profile, and the gate loads it
alongside this file. The field format is documented there. This block holds only
what is specific to docs and engineering explainers.

```rules
# Register — one idea per sentence
maxwords	20	sentence runs over 20 words; split it
re	--	double hyphen; use a period or a comma

# Preamble — the answer starts on line one
re	^(Great|Certainly|Sure|Of course|Absolutely|I'd be happy|Let me start by)	preamble; lead with the outcome

# Banned constructions — AI tells
re	[Ii]t('s| is) (important|worth) (to note|noting)	filler; state the point
re	\b(furthermore|moreover|additionally),	connective filler; start the sentence
re	\b(landscape|realm|tapestry|testament to)\b	metaphor; name the thing
re	[Nn]ot only .* but also	inflated pairing; use one clause
re	\bin (today's|the modern) (world|landscape)	throat-clearing; cut it

# Confidence — verified and inferred must not read alike
re	\b(arguably|somewhat|fairly|rather(?! than\b)) \b	hedge; state it or drop it
re	\b(basically|essentially|simply put)\b	filler qualifier; cut it
density	\b(genuinely|actually|really)\b	4	1.5	intensifier repeated; the sentence is stronger without it
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
- Enumerate with a list, not a long sentence. Three or more parallel items
  in one sentence is the signal. A sentence flagged for length is often an
  enumeration that wants to be a list; splitting it in two is the wrong fix.
  Body prose, not table cells.
- Use an en dash (–) for a range: 10–20, 2020–2024, Mon–Fri. A hyphen joins
  words; it does not span a range.
