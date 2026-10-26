#!/usr/bin/env bun
// Tests for bin/clean-url.ts. Run with `bun`, not `bun test`: bun test never
// auto-installs packages, so it cannot load the versioned normalize-url import.
import assert from "node:assert/strict";
import { mkdtemp, readFile, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  cleanUrl,
  LIST_NAMES,
  loadLists,
  NO_LISTS,
  singleUrl,
} from "../clean-url.ts";

const FIXTURES = join(import.meta.dir, "fixtures");
const DAY_MS = 24 * 60 * 60 * 1000;

const offline: typeof fetch = async () => {
  throw new Error("offline");
};

// Brave's lists as downloaded on 2026-10-26.
const braveLists = await loadLists({ cacheDir: FIXTURES, fetch: offline });

const CASES: [name: string, input: string, expected: string][] = [
  [
    "utm_*",
    "https://example.com/article?id=42&utm_source=newsletter&utm_medium=email&utm_campaign=fall",
    "https://example.com/article?id=42",
  ],
  [
    "fbclid",
    "https://www.nytimes.com/2026/10/01/tech/story.html?fbclid=IwAR0abc",
    "https://www.nytimes.com/2026/10/01/tech/story.html",
  ],
  [
    "gclid",
    "https://shop.example.com/p/123?gclid=Cj0KCQ&color=red",
    "https://shop.example.com/p/123?color=red",
  ],
  [
    "msclkid",
    "https://shop.example.com/p/123?msclkid=abc123",
    "https://shop.example.com/p/123",
  ],
  [
    "Mailchimp",
    "https://blog.example.com/post?mc_cid=abc&mc_eid=def",
    "https://blog.example.com/post",
  ],
  [
    "HubSpot",
    "https://blog.example.com/post?_hsenc=p2AN&_hsmi=12345",
    "https://blog.example.com/post",
  ],
  [
    "youtu.be si",
    "https://youtu.be/dQw4w9WgXcQ?si=AbCdEf",
    "https://youtu.be/dQw4w9WgXcQ",
  ],
  [
    "YouTube keeps v and t",
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ&si=x&feature=share&t=42",
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42",
  ],
  [
    "Spotify si",
    "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC?si=1a2b3c",
    "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC",
  ],
  [
    "X s and t",
    "https://x.com/user/status/123?s=20&t=abcd",
    "https://x.com/user/status/123",
  ],
  [
    "Instagram igsh",
    "https://www.instagram.com/p/ABC/?igsh=xyz",
    "https://www.instagram.com/p/ABC/",
  ],
  [
    "Reddit share",
    "https://www.reddit.com/r/x/comments/abc/title/?share_id=xyz&utm_content=1&utm_medium=ios_app",
    "https://www.reddit.com/r/x/comments/abc/title/",
  ],
  [
    "TikTok",
    "https://www.tiktok.com/@u/video/123?_r=1&_t=8abc&is_from_webapp=1",
    "https://www.tiktok.com/@u/video/123",
  ],
  [
    "LinkedIn",
    "https://www.linkedin.com/posts/foo-123?utm_source=share&rcm=ACoAA",
    "https://www.linkedin.com/posts/foo-123",
  ],
  [
    "Amazon",
    "https://www.amazon.com/Some-Product/dp/B0C1234567/ref=sr_1_3?crid=2X&keywords=foo&qid=1700000000&sprefix=foo&sr=8-3",
    "https://www.amazon.com/Some-Product/dp/B0C1234567",
  ],
  [
    "Google redirect",
    "https://www.google.com/url?q=https%3A%2F%2Fexample.com%2Fpage%3Futm_source%3Dx&sa=D&source=docs",
    "https://example.com/page",
  ],
  [
    "Facebook redirect",
    "https://l.facebook.com/l.php?u=https%3A%2F%2Fexample.com%2Fpage&h=AT0abc",
    "https://example.com/page",
  ],
  [
    "keeps a reset token",
    "https://example.com/reset?token=abc123&utm_medium=email",
    "https://example.com/reset?token=abc123",
  ],
  // Brave keeps ie on Google search; it is harmless.
  [
    "keeps Google q",
    "https://www.google.com/search?q=arc+browser&oq=arc&sourceid=chrome&ie=UTF-8",
    "https://www.google.com/search?q=arc+browser&ie=UTF-8",
  ],
  [
    "keeps the hash",
    "https://docs.example.com/page?utm_source=x#section",
    "https://docs.example.com/page#section",
  ],
  [
    "keeps a clean URL",
    "https://github.com/ClearURLs/Addon/issues?q=is%3Aopen",
    "https://github.com/ClearURLs/Addon/issues?q=is%3Aopen",
  ],
];
const tests: [name: string, run: () => unknown][] = [];
const test = (name: string, run: () => unknown) => tests.push([name, run]);

for (const [name, input, expected] of CASES) {
  test(`cleanUrl with Brave's lists: ${name}`, () =>
    assert.equal(cleanUrl(input, braveLists), expected));
}

test("cleanUrl without lists still strips utm_* and the local rules, but keeps Brave-only parameters", () => {
  assert.equal(
    cleanUrl("https://example.com/a?fbclid=1&utm_source=x", NO_LISTS),
    "https://example.com/a?fbclid=1",
  );
  assert.equal(
    cleanUrl("https://www.amazon.de/dp/B0C1/ref=sr_1_3?sr=8-3&th=1", NO_LISTS),
    "https://www.amazon.de/dp/B0C1?th=1",
  );
  assert.equal(
    cleanUrl(
      "https://www.google.com/url?q=https%3A%2F%2Fexample.com%2F",
      NO_LISTS,
    ),
    "https://example.com/",
  );
});

test("singleUrl accepts one http(s) URL with surrounding whitespace", () => {
  assert.equal(
    singleUrl("  https://example.com/a?b=1\n"),
    "https://example.com/a?b=1",
  );
});

test("singleUrl rejects anything else", () => {
  for (const text of [
    "",
    "hello world",
    "https://a.com https://b.com",
    "mailto:me@example.com",
    "example.com",
  ]) {
    assert.equal(singleUrl(text), undefined, text);
  }
});

const list = [{ include: ["*://*/*"], exclude: [], params: ["x"] }];

test("loadLists uses a fresh cache without downloading", async () => {
  const dir = await cacheWith(list, DAY_MS / 2);
  let calls = 0;
  const lists = await loadLists({
    cacheDir: dir,
    fetch: (async () => {
      calls++;
      return Response.json([]);
    }) as typeof fetch,
  });
  assert.equal(calls, 0);
  assert.deepEqual(lists.debounce, list);
});

test("loadLists downloads a stale list and caches it", async () => {
  const dir = await cacheWith([], 2 * DAY_MS);
  const lists = await loadLists({
    cacheDir: dir,
    fetch: (async () => Response.json(list)) as typeof fetch,
  });
  assert.deepEqual(lists["query-filter"], list);
  assert.deepEqual(
    JSON.parse(await readFile(join(dir, "query-filter.json"), "utf8")),
    list,
  );
});

test("loadLists falls back to a stale cache when the download fails", async () => {
  const dir = await cacheWith(list, 2 * DAY_MS);
  const failing = (async () =>
    new Response("down", { status: 503 })) as typeof fetch;
  assert.deepEqual(
    (await loadLists({ cacheDir: dir, fetch: failing }))["clean-urls"],
    list,
  );
});

test("loadLists returns empty lists with no cache and no network", async () => {
  const dir = await mkdtemp(join(tmpdir(), "clean-url-"));
  assert.deepEqual(
    await loadLists({ cacheDir: join(dir, "missing"), fetch: offline }),
    NO_LISTS,
  );
});

async function cacheWith(content: unknown, ageMs: number) {
  const dir = await mkdtemp(join(tmpdir(), "clean-url-"));
  const mtime = new Date(Date.now() - ageMs);
  for (const name of LIST_NAMES) {
    await writeFile(join(dir, `${name}.json`), JSON.stringify(content));
    await utimes(join(dir, `${name}.json`), mtime, mtime);
  }
  return dir;
}

let failed = 0;
for (const [name, run] of tests) {
  try {
    await run();
    console.log(`ok - ${name}`);
  } catch (error) {
    failed++;
    console.log(
      `not ok - ${name}\n${(error as Error).message.replace(/^/gm, "  ")}`,
    );
  }
}
console.log(`\n${tests.length - failed}/${tests.length} passed`);
process.exit(failed ? 1 : 0);
