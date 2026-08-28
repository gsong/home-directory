# Voice rules — mixed

Write-ups and presentations for non-technical or mixed audiences.

Thin on purpose. It grows from corrections the promotion hook surfaces.

## Greppable

`common.md` holds the rules that apply to every profile, and the gate loads it
alongside this file. The field format is documented there. This block holds only
what is specific to a non-technical or mixed audience.

```rules
maxwords	30	sentence runs over 30 words; split it
re	^(Great|Certainly|Sure|Of course|Absolutely|I'd be happy)	preamble; lead with the outcome
re	[Ii]t('s| is) (important|worth) (to note|noting)	filler; state the point
re	\b(landscape|realm|tapestry|testament to)\b	metaphor; name the thing
density	\bwould rather\b	3	1	"would rather" is repeated; vary it or cut it
density	\b(genuinely|actually|really)\b	4	1.5	intensifier repeated; the sentence is stronger without it
```

## Judgment

- Lead with what the reader must do or decide.
- Define every term the audience does not already use.
- Give one concrete example for each abstract claim.
- Do not assume the reader knows the system. Name it before you use it.
- An em dash joins a clause of restatement or consequence: "This isn't
  sloppiness - it's intentionality." Never use a pair to bracket an aside.
  When cutting one, reach for a colon first. The colon is the workhorse
  mark in `references/george-song-voice.md`, used two to three times as
  often as the em dash.
- No semicolons. The reference corpus has none in 3,050 words. A period or
  a colon does the job.
- Use an en dash (–) for a range: 10–20, 2020–2024, Mon–Fri. A hyphen joins
  words; it does not span a range.
- State a limitation flat, then give the condition under which it is
  tolerable. Do not soften the limitation, and do not add a sentence telling
  the reader how much to care. "Naming it is the whole job."
- One idiom per piece, at most. A running seasoning of idiom is what reads
  as flippant.
- Never tell the reader you are being candid. Be candid.
- Enumerate with a list, not a long sentence. Three or more parallel items
  in one sentence is the signal. A sentence flagged for length is often an
  enumeration that wants to be a list; splitting it in two is the wrong fix.
  Body prose, not table cells.
- Vary the sentence length deliberately: a long clause-stacked sentence,
  then a short one that lands. Aim for roughly one sentence in six under
  eight words.

## Notes on the greppable block

- An HTML draft is flattened by `bin/html-prose.pl` before the gate scans it,
  so CSS, `<script>`, and HTML comments are excluded, entities are decoded, and
  a sentence wrapped over four source lines is measured as one sentence. Line
  numbers still point into the file on disk. Verified against pandoc on a real
  draft: identical word count, no prose dropped.
- The em dash density rule lives in `common.md` and matches `&mdash;` as well
  as the literal character. Belt and braces, since the converter already
  decodes it.
- `maxwords` was 22 until 2026-08-27. Measurement put the reference median at
  13 words with a real maximum of 37, so 22 flagged sentences that are ordinary
  in the voice being matched. It is now 30, which catches genuine run-ons and
  leaves the top of the natural range alone.
- The semicolon rule lives in `common.md` and is a bare `;`. It is safe because
  the converter strips CSS and decodes entities first. On the fallback path,
  where the converter is missing and the gate reads raw HTML, it will
  over-report.
