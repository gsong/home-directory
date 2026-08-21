#!/usr/bin/env node

/**
 * Claude Code Usage API - Time Left Calculator
 *
 * Prints a compact statusline showing how much of each Claude Code usage window is
 * spent and when it resets. Consumed by ccstatusline, so horizontal width is scarce.
 *
 * Output:
 *   [5-hour segment] [7-day segment] [Fable segment, only when Fable has a live window]
 *   e.g. "🟢8pm 🟢5h 🟩5", or "🟢8pm 🟢5h" on a day Fable is untouched.
 *   Uses – as a placeholder when the 5-hour or 7-day window has no data.
 *
 *   The two pace segments use circles 🟢 🟡 🔴 and mean "usage versus time elapsed".
 *   The Fable segment uses squares 🟩 🟨 🟥 plus ⛔ and means "distance to the Fable cap".
 *   Different shapes because they answer different questions.
 *
 * Caching:
 * - Results are cached for 5 minutes in ~/.cache/cc-time-left/usage-data.json
 * - Multiple script instances share the same cache
 * - Use --force-refresh to bypass cache and fetch fresh data
 * - Use --debug to see cache hit/miss information and per-window burn rates
 * - 5 minutes is deliberate for the Fable segment too. Fable percent moves far too
 *   slowly to cross an indicator band inside one cache window.
 * - The TTL is free to change: the byte-identical guarantee on the two pace segments
 *   covers the rendered string for a given response, not how often it is refetched.
 *
 * Testing:
 *   node --test bin/cc-time-left.test/*.test.mjs
 *
 *   Name the files, not the directory: `node --test bin/cc-time-left.test/` fails,
 *   because Node reads a path ending in .test as a module to load rather than a
 *   directory to walk.
 *
 *   Importing this module runs nothing: all I/O lives in main(), called only under
 *   import.meta.main. Tests import render() and analyze() and pass a fixture plus a
 *   pinned `now`. Requires Node 24.2+ for import.meta.main.
 *
 * API Details:
 * - Endpoint: https://api.anthropic.com/api/oauth/usage
 * - Authentication: OAuth Bearer token from macOS Keychain
 * - Required Headers:
 *   - Authorization: Bearer <oauth_token>
 *   - Content-Type: application/json
 *   - User-Agent: claude-code/2.0.25
 *   - anthropic-beta: oauth-2025-04-20 (CRITICAL - enables OAuth on this endpoint)
 *
 * The endpoint is undocumented and unversioned. It appears in no Anthropic documentation;
 * the authority of last resort is the Claude Code binary's bundled JS. Expect the shape
 * below to drift.
 *
 * API Response Structure (the fields this script reads):
 * {
 *   // Flat keys. Primary source for the two pace segments.
 *   "five_hour": {
 *     "utilization": <number 0-100>,        // Percentage of 5-hour limit used
 *     "resets_at": "<ISO 8601>" | null      // null when there is no active block
 *   },
 *   "seven_day": { ...same shape... },       // may be absent entirely
 *   "seven_day_opus": null,                  // per-model flat keys went permanently
 *   "seven_day_sonnet": null,                // null around 2026-07-02; do not rely on them
 *
 *   // Self-describing array. Authoritative source for per-model (scoped) limits.
 *   "limits": [
 *     {
 *       "kind": "session" | "weekly_all" | "weekly_scoped",   // open-ended, expect new values
 *       "percent": <number, may be fractional, may exceed 100>,
 *       "resets_at": "<ISO 8601>" | null,
 *       "scope": {
 *         "model": {
 *           "id": null,                      // always null in practice
 *           "display_name": "Fable"          // prefixed names like "Claude 3.5 Fable" occur
 *         },
 *         "surface": null
 *       },
 *       "group": "weekly",                   // ignored
 *       "severity": "normal",                // ignored: boundaries are unknowable
 *       "is_active": <boolean>               // ignored: Anthropic's own client does not read it
 *     }
 *   ]
 * }
 *
 * Reading rules established by research:
 * - `limits` may be absent, empty, or hold several weekly_scoped entries.
 * - Match a scoped model by case-insensitive substring on scope.model.display_name.
 * - A hollow entry (percent 0 with resets_at null) means "no window", not "0% used".
 * - weekly_scoped.percent is a share of that model's own allowance, so the cap is 100.
 *   It is not a component of the weekly total, and needs no conversion.
 *
 * Also present and deliberately unused: extra_usage, spend (credit overflow),
 * member_dashboard_available, and a set of opaque code-named keys.
 *
 * Keychain Storage:
 * - Service: "Claude Code-credentials"
 * - Account: Current macOS username
 * - Location: ~/Library/Keychains/login.keychain-db
 * - Data: JSON with claudeAiOauth.accessToken
 */

import { execSync } from "child_process";
import { homedir } from "os";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

// Configuration
const CONFIG = {
  API_ENDPOINT: "https://api.anthropic.com/api/oauth/usage",
  USER_AGENT: "claude-code/2.0.25",
  ANTHROPIC_BETA: "oauth-2025-04-20",
  KEYCHAIN_SERVICE: "Claude Code-credentials",
  CACHE_TTL_MS: 5 * 60 * 1000, // 5 minutes
};

// Period durations in milliseconds
const PERIOD_DURATION = {
  FIVE_HOUR: 5 * 60 * 60 * 1000,
  SEVEN_DAY: 7 * 24 * 60 * 60 * 1000,
};

// Cache configuration
const CACHE_DIR = join(homedir(), ".cache", "cc-time-left");
const CACHE_FILE = join(CACHE_DIR, "usage-data.json");

// Visual indicators for the two pace segments: usage versus time elapsed
const INDICATORS = {
  SAFE: "🟢",
  WARNING: "🟡",
  DANGER: "🔴",
};

// Visual indicators for the Fable segment: distance to the Fable cap.
// Squares, not circles, so a budget reading is not mistaken for a pace reading.
// Same rendered width, so the distinction costs no characters.
const FABLE_INDICATORS = {
  SAFE: "🟩",
  WARNING: "🟨",
  DANGER: "🟥",
  CAPPED: "⛔",
};

// Fable indicator bands, as floored percent used of the Fable allowance
const FABLE_THRESHOLD = {
  WARNING: 60,
  DANGER: 85,
  CAP: 100,
};

// Matched case-insensitively as a substring: prefixed names like
// "Claude 3.5 Fable" have been seen in the wild
const FABLE_MODEL_NAME = "fable";

// Parse command-line flags
const flags = {
  debug: process.argv.includes("--debug"),
  forceRefresh: process.argv.includes("--force-refresh"),
  help: process.argv.includes("--help") || process.argv.includes("-h"),
};

/**
 * Renders the statusline for a usage response
 * @param {Object} usageData - Usage data from the API, already validated
 * @param {number} now - Current time in epoch milliseconds
 * @returns {string} The statusline, segments joined by a single space
 */
export function render(usageData, now) {
  const fiveHourDisplay = buildSegmentDisplay(
    usageData.five_hour,
    PERIOD_DURATION.FIVE_HOUR,
    formatTime,
    now,
  );
  const sevenDayDisplay = buildSegmentDisplay(
    usageData.seven_day,
    PERIOD_DURATION.SEVEN_DAY,
    formatTimeRemaining,
    now,
  );

  // Empty when Fable has no live window. Join non-empty segments rather than
  // interpolating a possibly empty slot, which would leave a trailing space.
  const fableDisplay = buildFableDisplay(usageData);

  return [fiveHourDisplay, sevenDayDisplay, fableDisplay]
    .filter(Boolean)
    .join(" ");
}

/**
 * Builds detailed burn rate information, one line per usage window
 * @param {Object} usageData - Usage data from the API
 * @param {number} now - Current time in epoch milliseconds
 * @returns {string[]} Lines for --debug output
 */
export function analyze(usageData, now) {
  const lines = ["\n--- Usage Summary ---"];

  // 5-hour block analysis
  const fiveHourData = usageData.five_hour;

  if (fiveHourData && fiveHourData.resets_at) {
    lines.push(
      buildBurnRateLine(
        "5-hour block",
        fiveHourData.utilization,
        fiveHourData.resets_at,
        PERIOD_DURATION.FIVE_HOUR,
        now,
      ),
    );
  } else {
    lines.push("5-hour block: no active block");
  }

  // 7-day usage analysis
  if (usageData.seven_day) {
    lines.push(
      buildBurnRateLine(
        "7-day usage",
        usageData.seven_day.utilization,
        usageData.seven_day.resets_at,
        PERIOD_DURATION.SEVEN_DAY,
        now,
      ),
    );
  }

  // Fable weekly usage. Shares the 7-day window to the millisecond, so the
  // elapsed fraction uses the same divisor. Pace lives here and not on the
  // statusline: the segment deliberately shows distance to the cap instead.
  const fableLimit = findScopedLimit(usageData, FABLE_MODEL_NAME);

  if (fableLimit && hasLiveWindow(fableLimit)) {
    lines.push(
      buildBurnRateLine(
        "Fable weekly",
        fableLimit.percent,
        fableLimit.resets_at,
        PERIOD_DURATION.SEVEN_DAY,
        now,
      ),
    );
  } else {
    lines.push("Fable weekly: no active window");
  }

  // Opus usage
  if (usageData.seven_day_opus) {
    lines.push(
      `7-day Opus: ${usageData.seven_day_opus.utilization}% used, resets at ${usageData.seven_day_opus.resets_at || "unlimited"}`,
    );
  }

  return lines;
}

/**
 * Debug logging helper
 * @param {...any} args - Arguments to log
 */
function debug(...args) {
  if (flags.debug) {
    console.error(...args);
  }
}

/**
 * Shows help text
 */
function showHelp() {
  console.log(`Usage: cc-time-left.mjs [options]

Displays Claude Code usage limits and reset times.

Options:
  --debug           Show detailed debug information
  --force-refresh   Skip cache and fetch fresh data
  --help, -h        Show this help message

Output format:
  [5hr indicator][reset time] [7day indicator][time remaining] [Fable indicator][% used]
  e.g. "🟢8pm 🟢5h 🟩5"
  Uses – as placeholder when the 5hr or 7day period has no active data.
  The Fable segment is omitted entirely when Fable has no active window.

  Pace indicators (circles) - quota used versus time elapsed:
    🟢 Safe - on track or below quota
    🟡 Warning - using quota faster than time
    🔴 Danger - likely to exceed quota

  Fable indicators (squares) - percent of the Fable allowance spent:
    🟩 0-59   plenty left
    🟨 60-84  slow down or switch model
    🟥 85-99  stop soon
    ⛔ 100    at the cap, Fable requests are rejected`);
  process.exit(0);
}

/**
 * Validates API response structure
 * @param {Object} data - API response data
 * @returns {boolean} True if valid
 */
function validateUsageData(data) {
  if (!data || typeof data !== "object") return false;
  if (!data.five_hour || typeof data.five_hour.utilization !== "number")
    return false;
  // Allow null resets_at when no active block (utilization is 0)
  return true;
}

/**
 * Reads cached usage data if valid
 * @returns {Object|null} Cached usage data or null if expired/missing
 */
function readCache() {
  try {
    const cacheData = JSON.parse(readFileSync(CACHE_FILE, "utf-8"));
    const now = Date.now();

    // Check if cache is still valid (within TTL)
    if (now - cacheData.timestamp < CONFIG.CACHE_TTL_MS) {
      debug(
        `Using cached data (age: ${Math.round((now - cacheData.timestamp) / 1000)}s)`,
      );
      return cacheData.data;
    }

    debug("Cache expired, fetching fresh data");
    return null;
  } catch (error) {
    debug("Failed to read cache:", error.message);
    return null;
  }
}

/**
 * Writes usage data to cache
 * @param {Object} data - Usage data to cache
 */
function writeCache(data) {
  try {
    mkdirSync(CACHE_DIR, { recursive: true });
    const cacheData = {
      timestamp: Date.now(),
      data: data,
    };
    writeFileSync(CACHE_FILE, JSON.stringify(cacheData, null, 2), "utf-8");
    debug("Cache updated");
  } catch (error) {
    debug("Failed to write cache:", error.message);
  }
}

/**
 * Retrieves OAuth token from macOS Keychain
 * Note: Uses execSync for simplicity since keychain access is fast and synchronous by nature
 * @returns {string|null} OAuth access token or null if not found
 */
function getOAuthTokenFromKeychain() {
  try {
    // Query macOS keychain for Claude Code credentials
    const keychainData = execSync(
      `security find-generic-password -a "$USER" -s "${CONFIG.KEYCHAIN_SERVICE}" -w`,
      { encoding: "utf-8" },
    ).trim();

    if (!keychainData) {
      return null;
    }

    // Parse the JSON stored in keychain
    const credentials = JSON.parse(keychainData);

    // Extract the OAuth access token
    return credentials?.claudeAiOauth?.accessToken || null;
  } catch (error) {
    debug("Failed to retrieve token from keychain:", error.message);
    return null;
  }
}

/**
 * Fetches usage data from Anthropic API
 * @param {string} accessToken - OAuth access token
 * @returns {Promise<Object|null>} Usage data or null on error
 */
async function fetchUsageData(accessToken) {
  try {
    const response = await fetch(CONFIG.API_ENDPOINT, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "User-Agent": CONFIG.USER_AGENT,
        "anthropic-beta": CONFIG.ANTHROPIC_BETA,
      },
    });

    if (!response.ok) {
      debug(`API request failed: ${response.status} ${response.statusText}`);
      if (flags.debug) {
        const errorBody = await response.text();
        debug("Error response:", errorBody);
      }
      return null;
    }

    const data = await response.json();

    // Debug: show full API response
    if (flags.debug) {
      debug("API Response:");
      debug(JSON.stringify(data, null, 2));
    }

    return data;
  } catch (error) {
    debug("Failed to fetch usage data:", error.message);
    return null;
  }
}

/**
 * Formats a timestamp as local time, rounded to nearest hour (e.g., "4pm")
 * @param {string} isoTimestamp - ISO 8601 timestamp
 * @returns {string} Formatted time string
 */
function formatTime(isoTimestamp) {
  const date = new Date(isoTimestamp);
  const minutes = date.getMinutes();
  let hours = date.getHours();

  // Round up if 30 minutes or more
  if (minutes >= 30) {
    hours = (hours + 1) % 24;
  }

  const ampm = hours >= 12 ? "pm" : "am";
  const displayHours = hours % 12 || 12;
  return `${displayHours}${ampm}`;
}

/**
 * Calculates time remaining until timestamp and formats as "Xd" or "Xh"
 * @param {string} isoTimestamp - ISO 8601 timestamp
 * @param {number} now - Current time in epoch milliseconds
 * @returns {string} Formatted time remaining (e.g., "2d", "6h")
 */
function formatTimeRemaining(isoTimestamp, now) {
  const resetTime = new Date(isoTimestamp).getTime();
  const msRemaining = resetTime - now;

  if (msRemaining <= 0) {
    return "0h";
  }

  const hoursRemaining = Math.floor(msRemaining / (1000 * 60 * 60));

  if (hoursRemaining >= 24) {
    const daysRemaining = Math.floor(hoursRemaining / 24);
    return `${daysRemaining}d`;
  } else if (hoursRemaining > 0) {
    return `${hoursRemaining}h`;
  } else {
    // Less than 1 hour - show minutes
    const minutesRemaining = Math.floor(msRemaining / (1000 * 60));
    return `${minutesRemaining}m`;
  }
}

/**
 * Formats milliseconds as "Xd", "X.Xh", or "Xm"
 * @param {number} msRemaining - Milliseconds remaining
 * @returns {string} Formatted time (e.g., "2d", "1.5h", "45m")
 */
function formatMsRemaining(msRemaining) {
  if (msRemaining <= 0) {
    return "0m";
  }

  const hoursRemaining = msRemaining / (1000 * 60 * 60);

  if (hoursRemaining >= 24) {
    const daysRemaining = Math.floor(hoursRemaining / 24);
    return `${daysRemaining}d`;
  } else if (hoursRemaining >= 1) {
    return `${hoursRemaining.toFixed(1)}h`;
  } else {
    const minutesRemaining = Math.floor(msRemaining / (1000 * 60));
    return `${minutesRemaining}m`;
  }
}

/**
 * Calculates time until tokens are exhausted based on current burn rate
 * @param {number} utilization - Percentage used (0-100)
 * @param {string} resetsAt - ISO 8601 timestamp when period resets
 * @param {number} periodDurationMs - Total period duration in milliseconds
 * @param {number} now - Current time in epoch milliseconds
 * @returns {number|null} Milliseconds until exhaustion, or null if not applicable
 */
function calculateTimeUntilExhausted(
  utilization,
  resetsAt,
  periodDurationMs,
  now,
) {
  const resetTime = new Date(resetsAt).getTime();
  const startTime = resetTime - periodDurationMs;
  const timeElapsed = now - startTime;

  // If we haven't used anything yet, can't calculate
  if (utilization === 0 || timeElapsed <= 0) {
    return null;
  }

  const remainingPercent = 100 - utilization;

  // Already exhausted
  if (remainingPercent <= 0) {
    return 0;
  }

  // Calculate burn rate: percentage per millisecond
  const burnRatePerMs = utilization / timeElapsed;

  // Calculate time until exhaustion
  const msUntilExhausted = remainingPercent / burnRatePerMs;

  return msUntilExhausted;
}

/**
 * Gets visual indicator based on burn rate (usage vs time elapsed)
 * @param {number} utilization - Percentage of limit used (0-100)
 * @param {string} resetsAt - ISO 8601 timestamp when period resets
 * @param {number} periodDurationMs - Total period duration in milliseconds
 * @param {number} now - Current time in epoch milliseconds
 * @returns {string} Emoji indicator
 */
function getIndicatorForBurnRate(utilization, resetsAt, periodDurationMs, now) {
  const resetTime = new Date(resetsAt).getTime();
  const startTime = resetTime - periodDurationMs;
  const timeElapsed = now - startTime;

  // Calculate percentage of time elapsed
  const timeElapsedPercent = (timeElapsed / periodDurationMs) * 100;

  // Edge case: too early in the period to judge (< 10% time OR < 15% usage)
  if (timeElapsedPercent < 10 && utilization < 15) {
    return INDICATORS.SAFE;
  }

  // Calculate burn ratio: how fast we're using quota vs how fast time is passing
  const burnRatio = utilization / timeElapsedPercent;

  // Thresholds based on burn rate
  if (burnRatio < 1.0) {
    // Using at or below the rate of time passing (on track or better)
    return INDICATORS.SAFE;
  } else if (burnRatio < 1.3) {
    // Using 0-30% faster than time (might exceed)
    return INDICATORS.WARNING;
  } else {
    // Using 30%+ faster than time (likely to exceed)
    return INDICATORS.DANGER;
  }
}

/**
 * Builds one --debug line: percent used, percent elapsed, burn ratio, reset time,
 * plus a projected-exhaustion tail once the ratio reaches the danger threshold
 * @param {string} label - Window name for the line prefix
 * @param {number} utilization - Percentage of limit used
 * @param {string} resetsAt - ISO 8601 timestamp when the window resets
 * @param {number} periodDurationMs - Total period duration in milliseconds
 * @param {number} now - Current time in epoch milliseconds
 * @returns {string} The debug line
 */
function buildBurnRateLine(
  label,
  utilization,
  resetsAt,
  periodDurationMs,
  now,
) {
  const resetTime = new Date(resetsAt).getTime();
  const startTime = resetTime - periodDurationMs;
  const elapsedPercent = ((now - startTime) / periodDurationMs) * 100;
  const burnRatio = utilization / elapsedPercent;

  let line =
    `${label}: ${utilization.toFixed(1)}% used, ${elapsedPercent.toFixed(1)}% elapsed, ` +
    `burn ratio: ${burnRatio.toFixed(2)}x, resets at ${resetsAt}`;

  if (burnRatio >= 1.3) {
    const msUntilExhausted = calculateTimeUntilExhausted(
      utilization,
      resetsAt,
      periodDurationMs,
      now,
    );
    if (msUntilExhausted !== null) {
      line += ` → projected exhaustion in ${formatMsRemaining(msUntilExhausted)}`;
    }
  }

  return line;
}

/**
 * Builds the display segment for a pace-based usage period
 * @param {Object} periodData - Flat usage key, e.g. usageData.five_hour
 * @param {number} periodDurationMs - Total period duration in milliseconds
 * @param {Function} formatTimeFn - Formats the reset timestamp for display
 * @param {number} now - Current time in epoch milliseconds
 * @returns {string} The segment, or – when the period has no window
 */
function buildSegmentDisplay(periodData, periodDurationMs, formatTimeFn, now) {
  if (!periodData || !periodData.resets_at) return "–";

  const timeStr = formatTimeFn(periodData.resets_at, now);
  const indicator = getIndicatorForBurnRate(
    periodData.utilization,
    periodData.resets_at,
    periodDurationMs,
    now,
  );

  if (indicator === INDICATORS.DANGER) {
    const msUntilExhausted = calculateTimeUntilExhausted(
      periodData.utilization,
      periodData.resets_at,
      periodDurationMs,
      now,
    );
    if (msUntilExhausted !== null) {
      return `${indicator}${formatMsRemaining(msUntilExhausted)}/${timeStr}`;
    }
  }

  return `${indicator}${timeStr}`;
}

/**
 * Builds the Fable segment: indicator plus floored percent used, no unit.
 * Fable shares the weekly reset time that the 7-day segment already prints,
 * so repeating it here would only spend width.
 * @param {Object} usageData - Usage data from the API
 * @returns {string} The segment, or "" when nothing has been spent on Fable
 */
function buildFableDisplay(usageData) {
  const limit = findScopedLimit(usageData, FABLE_MODEL_NAME);

  if (!limit) return "";

  const percentUsed = flooredPercentUsed(limit.percent);

  // Nothing spent, nothing shown. Zero width cost on days Fable is untouched.
  // This covers the hollow entry (no window at all) and a live window that is
  // genuinely still at zero, which read the same on a statusline.
  if (percentUsed === 0) return "";

  return `${getIndicatorForBudget(percentUsed)}${percentUsed}`;
}

/**
 * Finds the weekly_scoped limit whose model display name contains the given
 * name. The API may list the same model twice, narrowed by scope.surface, so a
 * live window beats a hollow entry regardless of array order; with no live
 * window the first match still wins. Never reads scope.model.id, which is
 * always null.
 * @param {Object} usageData - Usage data from the API
 * @param {string} modelName - Lowercase substring to match, e.g. "fable"
 * @returns {Object|null} The matching limits[] entry, or null
 */
function findScopedLimit(usageData, modelName) {
  const limits = Array.isArray(usageData?.limits) ? usageData.limits : [];

  const matches = limits.filter((limit) => {
    if (limit?.kind !== "weekly_scoped") return false;
    const displayName = limit?.scope?.model?.display_name;
    return (
      typeof displayName === "string" &&
      displayName.toLowerCase().includes(modelName)
    );
  });

  return matches.find(hasLiveWindow) ?? matches[0] ?? null;
}

/**
 * Tells a live window from a hollow entry. Zero percent with no reset time
 * means "no window", not "0% used".
 * @param {Object} limit - A limits[] entry
 * @returns {boolean} True when the entry describes a real window
 */
function hasLiveWindow(limit) {
  return !(!limit.percent && !limit.resets_at);
}

/**
 * Clamps a scoped percent into 0-100 and floors it for display, matching what
 * the first-party client does. The server may send fractions, and may report
 * past the cap when usage has overflowed.
 * @param {number} percent - Raw percent from a limits[] entry
 * @returns {number} Integer 0-100
 */
function flooredPercentUsed(percent) {
  const bounded = Math.min(
    Math.max(typeof percent === "number" ? percent : 0, 0),
    FABLE_THRESHOLD.CAP,
  );

  return Math.floor(bounded);
}

/**
 * Gets the Fable indicator from distance to the cap. No time component: Fable
 * is a budget you choose to spend, not a clock you race.
 * @param {number} percentUsed - Floored percent used, 0-100
 * @returns {string} Emoji indicator
 */
function getIndicatorForBudget(percentUsed) {
  if (percentUsed >= FABLE_THRESHOLD.CAP) return FABLE_INDICATORS.CAPPED;
  if (percentUsed >= FABLE_THRESHOLD.DANGER) return FABLE_INDICATORS.DANGER;
  if (percentUsed >= FABLE_THRESHOLD.WARNING) return FABLE_INDICATORS.WARNING;
  return FABLE_INDICATORS.SAFE;
}

/**
 * Gets cached data with status information
 * @returns {{valid: boolean, data: Object|null}} Cache result with validity flag
 */
function getCachedData() {
  if (flags.forceRefresh) {
    debug("Force refresh requested, skipping cache");
    return { valid: false, data: null };
  }

  const data = readCache();
  return { valid: !!data, data };
}

/**
 * Entry point. All I/O lives here so importing this module runs nothing.
 */
async function main() {
  if (flags.help) {
    showHelp();
  }

  // Step 1: Try to get cached data
  const cache = getCachedData();
  let usageData = cache.data;

  // Step 2: If no valid cache, fetch from API
  if (!cache.valid) {
    const accessToken = getOAuthTokenFromKeychain();

    if (!accessToken) {
      console.error("Error: No OAuth token found in keychain.");
      console.error("Please ensure you're logged into Claude Code.");
      process.exit(1);
    }

    debug("OAuth token found, fetching usage data...");

    usageData = await fetchUsageData(accessToken);

    if (!usageData) {
      console.error("Error: Failed to fetch usage data from API.");
      console.error("Please check your network connection and try again.");
      process.exit(1);
    }

    // Step 3: Validate API response
    if (!validateUsageData(usageData)) {
      console.error("Error: Invalid usage data received from API.");
      process.exit(1);
    }

    // Step 4: Cache the fresh data
    writeCache(usageData);
  }

  const now = Date.now();

  console.log(render(usageData, now));

  // Debug: show additional info with burn rate analysis
  if (flags.debug) {
    for (const line of analyze(usageData, now)) {
      console.error(line);
    }
  }
}

if (import.meta.main) {
  await main();
}
