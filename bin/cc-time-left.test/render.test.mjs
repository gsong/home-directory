// formatTime prints a local wall-clock hour, so the golden bytes depend on the
// timezone. Pin it before any assertion. This is the capture machine's own zone,
// so there is no drift between the captured golden and these expectations.
process.env.TZ = "America/Los_Angeles";

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { render } from "../cc-time-left.mjs";

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "fixtures");

const loadFixture = (name) =>
  JSON.parse(readFileSync(join(FIXTURES, `${name}.json`), "utf-8"));

// The instant the golden response was captured. render() cannot be captured at an
// injected instant from the unmodified script, so the pinned now must BE the
// capture instant. It lives in a sidecar file, linked to the golden it belongs to.
const PINNED_NOW = Number(
  readFileSync(join(FIXTURES, "01-golden.now"), "utf-8").trim(),
);

// The byte-identical guarantee. 01-golden.expected is a recording of what the
// pre-change script printed at PINNED_NOW, so it holds the two pace segments only.
// It is evidence and is never edited: the guarantee is that those bytes survive
// verbatim, with at most the Fable segment appended to the right of them.
test("golden: the two pace segments survive byte-identically", () => {
  // No .trim(): 01-golden.expected has no trailing newline, so it compares
  // directly to render's return value.
  const recorded = readFileSync(join(FIXTURES, "01-golden.expected"), "utf-8");
  const line = render(loadFixture("01-golden"), PINNED_NOW);

  assert.ok(
    line === recorded || line.startsWith(`${recorded} `),
    `pace segments changed: got ${JSON.stringify(line)}, recorded ${JSON.stringify(recorded)}`,
  );

  // Whatever was appended is one segment, and it is the Fable one.
  const appended = line.slice(recorded.length);

  assert.equal(appended, " 🟩5");
});

// Expected strings are inline here, not in sidecar files: state 01 is a recording,
// these are what we have decided should happen. The first two segments of every row
// match the pre-change baseline exactly - that is the byte-identical guarantee.
const STATES = [
  ["01-golden", "🟢8pm 🟢5h 🟩5", "Fable at 5, is_active false and ignored"],
  ["02-no-fable-entry", "🟢8pm 🟢5h", "no weekly_scoped Fable entry"],
  [
    "03-fable-hollow",
    "🟢8pm 🟢5h",
    "hollow entry means no window, not 0% used",
  ],
  ["04-fable-below-cap", "🟢8pm 🟢5h 🟩30", "green band"],
  ["05-fable-at-cap", "🟢8pm 🟢5h ⛔100", "at the cap"],
  ["06-fable-past-cap", "🟢8pm 🟢5h ⛔100", "past the cap, clamped to 100"],
  ["07-limits-key-absent", "🟢8pm 🟢5h", "limits key absent entirely"],
  [
    "08-fable-prefixed-name",
    "🟢8pm 🟢5h 🟩5",
    "matched by substring, not equality",
  ],
  [
    "09-two-scoped-models",
    "🟢8pm 🟢5h 🟩5",
    "Opus listed first is skipped, not rendered",
  ],
  ["10-limits-empty", "🟢8pm 🟢5h", "limits is an empty array"],
  ["11-five-hour-no-window", "– 🟢5h 🟩5", "flat five_hour has no window"],
  ["12-seven-day-absent", "🟢8pm – 🟩5", "flat seven_day key absent"],
  [
    "13-two-fable-entries",
    "🟢8pm 🟢5h 🟩30",
    "hollow Fable entry first, live one wins",
  ],
];

for (const [name, expected, why] of STATES) {
  test(`${name}: ${why}`, () => {
    assert.equal(render(loadFixture(name), PINNED_NOW), expected);
  });
}

test("09: renders exactly one Fable segment, never two", () => {
  const line = render(loadFixture("09-two-scoped-models"), PINNED_NOW);

  assert.equal(line.split(" ").length, 3);
  assert.ok(!line.includes("62"), "Opus percent must not appear");
});

// No fixture reaches the yellow or red band, so drive the boundaries directly.
// Clone-and-mutate keeps render() the only interface under test.
function withFablePercent(percent) {
  const data = loadFixture("01-golden");

  for (const limit of data.limits) {
    if (limit.kind === "weekly_scoped") limit.percent = percent;
  }

  return data;
}

const BANDS = [
  [1, "🟩1", "green floor: the lowest percent that shows at all"],
  [59, "🟩59", "green ceiling"],
  [60, "🟨60", "yellow floor"],
  [84, "🟨84", "yellow ceiling"],
  [85, "🟥85", "red floor"],
  [99, "🟥99", "red ceiling"],
  [
    99.6,
    "🟥99",
    "floored, not rounded: 99.6 stays red rather than tripping the cap",
  ],
  [100, "⛔100", "cap is exact, not early"],
  [
    137,
    "⛔100",
    "overflow clamps; the display cannot distinguish 100 from 137",
  ],
  [0.4, "", "floors to zero, so nothing is shown"],
  [-5, "", "negative clamps to zero and shows nothing"],
];

for (const [percent, segment, why] of BANDS) {
  test(`band ${percent}: ${why}`, () => {
    const line = render(withFablePercent(percent), PINNED_NOW);

    assert.equal(line, segment ? `🟢8pm 🟢5h ${segment}` : "🟢8pm 🟢5h");
  });
}

test("the absent case leaves no trailing space", () => {
  const line = render(loadFixture("02-no-fable-entry"), PINNED_NOW);

  assert.equal(line, line.trimEnd());
});

test("a malformed limits value does not throw", () => {
  for (const limits of [
    null,
    "nonsense",
    42,
    [null],
    [{}],
    [{ kind: "weekly_scoped" }],
  ]) {
    const data = { ...loadFixture("01-golden"), limits };

    assert.equal(render(data, PINNED_NOW), "🟢8pm 🟢5h");
  }
});
