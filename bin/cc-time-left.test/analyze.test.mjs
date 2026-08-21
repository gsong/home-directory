// Pinned before any assertion for the same reason as render.test.mjs: the debug
// lines carry reset timestamps and elapsed fractions read against a local clock.
process.env.TZ = "America/Los_Angeles";

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { analyze } from "../cc-time-left.mjs";

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "fixtures");

const loadFixture = (name) =>
  JSON.parse(readFileSync(join(FIXTURES, `${name}.json`), "utf-8"));

const PINNED_NOW = Number(
  readFileSync(join(FIXTURES, "01-golden.now"), "utf-8").trim(),
);

const lineFor = (lines, label) =>
  lines.find((line) => line.startsWith(`${label}:`));

test("returns lines instead of printing them", () => {
  const lines = analyze(loadFixture("01-golden"), PINNED_NOW);

  assert.ok(Array.isArray(lines));
  assert.ok(lines.every((line) => typeof line === "string"));
});

test("golden: one line per window, Fable included", () => {
  const lines = analyze(loadFixture("01-golden"), PINNED_NOW);

  assert.ok(lineFor(lines, "5-hour block"));
  assert.ok(lineFor(lines, "7-day usage"));
  assert.ok(lineFor(lines, "Fable weekly"));
});

test("the Fable line is at full parity with the other two", () => {
  const lines = analyze(loadFixture("01-golden"), PINNED_NOW);
  const fable = lineFor(lines, "Fable weekly");

  // Same four facts, same order, same formatting as the 5-hour and 7-day lines.
  assert.match(
    fable,
    /^Fable weekly: 5\.0% used, \d+\.\d% elapsed, burn ratio: \d+\.\d\dx, resets at .+$/,
  );
});

test("the Fable line uses the seven-day divisor", () => {
  const lines = analyze(loadFixture("01-golden"), PINNED_NOW);

  // Fable shares the weekly window to the millisecond, and both entries report the
  // same percent in this capture, so the elapsed fraction must match exactly.
  const elapsed = (label) =>
    lineFor(lines, label).match(/(\d+\.\d)% elapsed/)[1];

  assert.equal(elapsed("Fable weekly"), elapsed("7-day usage"));
});

test("a fast Fable burn gets the projected-exhaustion tail", () => {
  const data = loadFixture("01-golden");
  const fable = data.limits.find((limit) => limit.kind === "weekly_scoped");

  fable.percent = 30;

  // PINNED_NOW sits 97% through the weekly window, where 30% used is a slow burn.
  // Judge the tail from a tenth of the way in, where it is a 3x burn instead.
  const sevenDayMs = 7 * 24 * 60 * 60 * 1000;
  const tenthOfWindow =
    new Date(fable.resets_at).getTime() - sevenDayMs * 0.9;

  assert.match(
    lineFor(analyze(data, tenthOfWindow), "Fable weekly"),
    /burn ratio: 3\.00x, resets at .+ → projected exhaustion in /,
  );
});

test("no exhaustion tail while Fable is burning slower than the clock", () => {
  const fable = lineFor(analyze(loadFixture("01-golden"), PINNED_NOW), "Fable weekly");

  assert.ok(!fable.includes("projected exhaustion"));
});

test("the Fable line reports raw percent, not the clamped display value", () => {
  // The statusline clamps to 100 because the indicator has nowhere to put the
  // overflow. Debug has the width, so it should not hide it.
  assert.match(
    lineFor(analyze(loadFixture("06-fable-past-cap"), PINNED_NOW), "Fable weekly"),
    /^Fable weekly: 137\.0% used,/,
  );
});

const NO_WINDOW = [
  ["02-no-fable-entry", "no weekly_scoped Fable entry"],
  ["03-fable-hollow", "hollow entry"],
  ["07-limits-key-absent", "limits key absent"],
  ["10-limits-empty", "limits is empty"],
];

for (const [name, why] of NO_WINDOW) {
  test(`${name}: says so rather than going silent (${why})`, () => {
    const lines = analyze(loadFixture(name), PINNED_NOW);

    assert.equal(lineFor(lines, "Fable weekly"), "Fable weekly: no active window");
  });
}

test("05: at the cap the Fable line still reports, with no exhaustion tail", () => {
  const fable = lineFor(
    analyze(loadFixture("05-fable-at-cap"), PINNED_NOW),
    "Fable weekly",
  );

  assert.match(fable, /^Fable weekly: 100\.0% used,/);
  assert.ok(!fable.includes("projected exhaustion"));
});

test("11: reports no active 5-hour block", () => {
  const lines = analyze(loadFixture("11-five-hour-no-window"), PINNED_NOW);

  assert.equal(lineFor(lines, "5-hour block"), "5-hour block: no active block");
});

test("12: omits the 7-day line when the flat key is absent", () => {
  const lines = analyze(loadFixture("12-seven-day-absent"), PINNED_NOW);

  assert.equal(lineFor(lines, "7-day usage"), undefined);
  assert.ok(lineFor(lines, "Fable weekly"), "Fable is unaffected by the flat key");
});

test("every fixture analyzes without throwing", () => {
  for (let n = 1; n <= 12; n += 1) {
    const name = [
      "01-golden",
      "02-no-fable-entry",
      "03-fable-hollow",
      "04-fable-below-cap",
      "05-fable-at-cap",
      "06-fable-past-cap",
      "07-limits-key-absent",
      "08-fable-prefixed-name",
      "09-two-scoped-models",
      "10-limits-empty",
      "11-five-hour-no-window",
      "12-seven-day-absent",
    ][n - 1];

    assert.doesNotThrow(() => analyze(loadFixture(name), PINNED_NOW), name);
  }
});
