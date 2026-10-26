#!/usr/bin/env bun
// Cleans the URL on the clipboard. It unwraps redirect links and strips
// tracking parameters, using Brave's URL lists plus a few local rules.
// Karabiner runs it right after ⇧⌘C in Crest; see .config/karabiner/karabiner.json.
//
// Dependencies are pinned in the import specifiers, so Bun installs them on
// first run. That only works while no node_modules exists in or above bin/.
import normalizeUrl from "normalize-url@10.0.0";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

export type Rule = {
  include: string[];
  exclude: string[];
  params?: string[];
  action?: string;
  param?: string;
};
export type ListName = (typeof LIST_NAMES)[number];
export type Lists = Record<ListName, Rule[]>;

export const LIST_NAMES = ["query-filter", "clean-urls", "debounce"] as const;
export const NO_LISTS: Lists = {
  "query-filter": [],
  "clean-urls": [],
  debounce: [],
};

// Returns the text as a URL when it is exactly one http(s) URL, else undefined.
export function singleUrl(text: string): string | undefined {
  const trimmed = text.trim();
  if (!trimmed || /\s/.test(trimmed) || !URL.canParse(trimmed))
    return undefined;
  return /^https?:$/.test(new URL(trimmed).protocol) ? trimmed : undefined;
}

export function cleanUrl(input: string, lists: Lists): string {
  const url = new URL(unwrapRedirects(input, lists));
  if (AMAZON_HOST.test(url.hostname))
    url.pathname = url.pathname.replace(/\/ref=[^/]*$/, "");
  const params = [...lists["query-filter"], ...lists["clean-urls"]]
    .filter((rule) => applies(rule, url.href))
    .flatMap((rule) => rule.params ?? []);
  const localParams = LOCAL_PARAMS.filter(([host]) =>
    host.test(url.hostname),
  ).flatMap(([, names]) => names);
  return normalizeUrl(url.href, {
    // Brave leaves utm_* alone on most sites, so it is added for every site.
    removeQueryParameters: [/^utm_/, ...params, ...localParams],
    // The defaults rewrite parts of the URL that are not tracking.
    stripWWW: false,
    removeTrailingSlash: false,
    removeSingleSlash: false,
    sortQueryParameters: false,
    stripTextFragment: false,
    stripAuthentication: false,
  });
}

// Reads each Brave list from the cache. A list older than MAX_AGE_MS is
// downloaded again; if that fails the stale copy is used, and with no copy at
// all the list is empty.
export async function loadLists({
  cacheDir = join(homedir(), ".cache", "clean-url"),
  fetch = globalThis.fetch,
  now = Date.now(),
}: {
  cacheDir?: string;
  fetch?: typeof globalThis.fetch;
  now?: number;
} = {}): Promise<Lists> {
  const entries = await Promise.all(
    LIST_NAMES.map(
      async (name) =>
        [name, await loadList(name, cacheDir, fetch, now)] as const,
    ),
  );
  return Object.fromEntries(entries) as Lists;
}

const BRAVE_LISTS =
  "https://raw.githubusercontent.com/brave/adblock-lists/master/brave-lists";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
// Karabiner waits on this script after every copy, so a slow download gives up early.
const FETCH_TIMEOUT_MS = 2000;

const AMAZON_HOST = /(^|\.)amazon\.[a-z.]+$/;

// Parameters Brave's lists miss, by host.
const LOCAL_PARAMS: [RegExp, string[]][] = [
  [AMAZON_HOST, ["sr"]],
  [/(^|\.)tiktok\.com$/, ["_r", "is_from_webapp"]],
];

// Redirect links Brave's lists miss: host, path, and the parameters that may hold the target.
const LOCAL_REDIRECTS: [RegExp, string, string[]][] = [
  [/(^|\.)google\.[a-z.]+$/, "/url", ["q", "url"]],
  [/^lm?\.facebook\.com$/, "/l.php", ["u"]],
];

// Follows redirect links until none apply. The limit stops a rule loop.
function unwrapRedirects(input: string, lists: Lists): string {
  let url = input;
  for (let hop = 0; hop < 5; hop++) {
    const target = redirectTarget(url, lists);
    if (!target) break;
    url = target;
  }
  return url;
}

function redirectTarget(input: string, lists: Lists): string | undefined {
  const url = new URL(input);
  const params = [
    ...lists.debounce
      .filter((rule) => rule.action === "redirect" && applies(rule, input))
      .flatMap((rule) => rule.param ?? []),
    ...LOCAL_REDIRECTS.filter(
      ([host, path]) => host.test(url.hostname) && url.pathname === path,
    ).flatMap(([, , names]) => names),
  ];
  return params
    .map((name) => url.searchParams.get(name) ?? "")
    .find((target) => singleUrl(target));
}

function applies(rule: Rule, url: string): boolean {
  return (
    rule.include.some((pattern) => matches(pattern, url)) &&
    !rule.exclude.some((pattern) => matches(pattern, url))
  );
}

// Brave rules use extension match patterns such as "*://*.host/path*". A
// "*." host also matches the bare host, and the path glob is matched against
// the path plus the query.
function matches(pattern: string, url: string): boolean {
  const [, scheme, host, path] =
    pattern.match(/^(\*|https?):\/\/([^/]+)(\/.*)$/) ?? [];
  if (!host) return false;
  const target = new URL(url);
  if (scheme !== "*" && target.protocol !== `${scheme}:`) return false;
  const hostOk =
    host === "*" ||
    (host.startsWith("*.")
      ? target.hostname === host.slice(2) ||
        target.hostname.endsWith(host.slice(1))
      : target.hostname === host);
  const pathRe = new RegExp(
    "^" +
      path
        .split("*")
        .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
        .join(".*") +
      "$",
  );
  return hostOk && pathRe.test(target.pathname + target.search);
}

async function loadList(
  name: ListName,
  cacheDir: string,
  fetch: typeof globalThis.fetch,
  now: number,
) {
  const file = join(cacheDir, `${name}.json`);
  const cached = await readCached(file);
  if (cached && now - cached.mtimeMs < MAX_AGE_MS) return cached.rules;
  try {
    const res = await fetch(`${BRAVE_LISTS}/${name}.json`, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const rules = JSON.parse(text);
    if (!Array.isArray(rules)) throw new Error("not a list");
    await mkdir(cacheDir, { recursive: true });
    await writeFile(file, text);
    return rules as Rule[];
  } catch (error) {
    console.error(
      `clean-url: could not refresh ${name}: ${(error as Error).message}`,
    );
    return cached?.rules ?? [];
  }
}

async function readCached(
  file: string,
): Promise<{ rules: Rule[]; mtimeMs: number } | undefined> {
  try {
    const [text, info] = await Promise.all([
      readFile(file, "utf8"),
      stat(file),
    ]);
    return { rules: JSON.parse(text), mtimeMs: info.mtimeMs };
  } catch {
    return undefined;
  }
}

async function main() {
  const url = singleUrl(await Bun.$`/usr/bin/pbpaste`.text());
  if (!url) return;
  const cleaned = cleanUrl(url, await loadLists());
  if (cleaned !== url)
    await Bun.$`/usr/bin/printf %s ${cleaned} | /usr/bin/pbcopy`;
}

if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    // Leave the clipboard as Crest wrote it rather than fail the copy.
    console.error(`clean-url: ${(error as Error).message}`);
  }
}
