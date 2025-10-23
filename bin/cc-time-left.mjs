#!/usr/bin/env node

/**
 * Claude Code Usage API - Time Left Calculator
 *
 * This script queries the Anthropic API to get the exact end time of the current
 * 5-hour usage block for Claude Code when using a Claude subscription (OAuth).
 *
 * Caching:
 * - Results are cached for 5 minutes in ~/.cache/cc-time-left/usage-data.json
 * - Multiple script instances share the same cache
 * - Use --force-refresh to bypass cache and fetch fresh data
 * - Use --debug to see cache hit/miss information
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
 * API Response Structure:
 * {
 *   "five_hour": {
 *     "utilization": <number 0-100>,      // Percentage of 5-hour limit used
 *     "resets_at": "<ISO 8601 timestamp>" // When current block ends
 *   },
 *   "seven_day": {
 *     "utilization": <number 0-100>,      // Percentage of 7-day limit used
 *     "resets_at": "<ISO 8601 timestamp>" // When 7-day window resets
 *   },
 *   "seven_day_oauth_apps": null,         // OAuth apps usage (if applicable)
 *   "seven_day_opus": {
 *     "utilization": <number 0-100>,      // Opus-specific usage
 *     "resets_at": "<ISO 8601 timestamp>" // Opus limit reset time (null if unlimited)
 *   }
 * }
 *
 * Keychain Storage:
 * - Service: "Claude Code-credentials"
 * - Account: Current macOS username
 * - Location: ~/Library/Keychains/login.keychain-db
 * - Data: JSON with claudeAiOauth.accessToken
 */

import { execSync } from "child_process";
import { homedir } from "os";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

// Cache configuration
const CACHE_DIR = join(homedir(), ".cache", "cc-time-left");
const CACHE_FILE = join(CACHE_DIR, "usage-data.json");
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Visual indicators
const INDICATORS = {
  SAFE: "🟢",
  WARNING: "🟡",
  DANGER: "🔴",
};

// Utilization thresholds
const THRESHOLDS = {
  SAFE: 60, // < 60% is safe (green)
  WARNING: 85, // 60-85% is warning (yellow), >= 85% is danger (red)
};

/**
 * Ensures cache directory exists
 */
function ensureCacheDir() {
  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
  }
}

/**
 * Reads cached usage data if valid
 * @returns {Object|null} Cached usage data or null if expired/missing
 */
function readCache() {
  try {
    if (!existsSync(CACHE_FILE)) {
      return null;
    }

    const cacheData = JSON.parse(readFileSync(CACHE_FILE, "utf-8"));
    const now = Date.now();

    // Check if cache is still valid (within TTL)
    if (now - cacheData.timestamp < CACHE_TTL_MS) {
      if (process.argv.includes("--debug")) {
        console.error(
          "Using cached data (age: " +
            Math.round((now - cacheData.timestamp) / 1000) +
            "s)",
        );
      }
      return cacheData.data;
    }

    if (process.argv.includes("--debug")) {
      console.error("Cache expired, fetching fresh data");
    }
    return null;
  } catch (error) {
    if (process.argv.includes("--debug")) {
      console.error("Failed to read cache:", error.message);
    }
    return null;
  }
}

/**
 * Writes usage data to cache
 * @param {Object} data - Usage data to cache
 */
function writeCache(data) {
  try {
    ensureCacheDir();
    const cacheData = {
      timestamp: Date.now(),
      data: data,
    };
    writeFileSync(CACHE_FILE, JSON.stringify(cacheData, null, 2), "utf-8");
    if (process.argv.includes("--debug")) {
      console.error("Cache updated");
    }
  } catch (error) {
    if (process.argv.includes("--debug")) {
      console.error("Failed to write cache:", error.message);
    }
  }
}

/**
 * Retrieves OAuth token from macOS Keychain
 * @returns {string|null} OAuth access token or null if not found
 */
function getOAuthTokenFromKeychain() {
  try {
    // Query macOS keychain for Claude Code credentials
    const keychainData = execSync(
      'security find-generic-password -a "$USER" -s "Claude Code-credentials" -w',
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
    if (process.argv.includes("--debug")) {
      console.error("Failed to retrieve token from keychain:", error.message);
    }
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
    const response = await fetch("https://api.anthropic.com/api/oauth/usage", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "User-Agent": "claude-code/2.0.25",
        "anthropic-beta": "oauth-2025-04-20", // Required for OAuth endpoint
      },
    });

    if (!response.ok) {
      if (process.argv.includes("--debug")) {
        console.error(
          `API request failed: ${response.status} ${response.statusText}`,
        );
        const errorBody = await response.text();
        console.error("Error response:", errorBody);
      }
      return null;
    }

    const data = await response.json();

    // Debug: show full API response
    if (process.argv.includes("--debug")) {
      console.error("API Response:");
      console.error(JSON.stringify(data, null, 2));
    }

    return data;
  } catch (error) {
    if (process.argv.includes("--debug")) {
      console.error("Failed to fetch usage data:", error.message);
    }
    return null;
  }
}

/**
 * Formats a timestamp as local time (e.g., "4:30pm")
 * @param {string} isoTimestamp - ISO 8601 timestamp
 * @returns {string} Formatted time string
 */
function formatTime(isoTimestamp) {
  const date = new Date(isoTimestamp);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "pm" : "am";
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes.toString().padStart(2, "0");
  return `${displayHours}:${displayMinutes}${ampm}`;
}

/**
 * Gets visual indicator based on utilization percentage
 * @param {number} utilization - Percentage of 5-hour limit used (0-100)
 * @returns {string} Emoji indicator
 */
function getIndicatorForUtilization(utilization) {
  if (utilization < THRESHOLDS.SAFE) {
    return INDICATORS.SAFE;
  } else if (utilization < THRESHOLDS.WARNING) {
    return INDICATORS.WARNING;
  } else {
    return INDICATORS.DANGER;
  }
}

// Main execution
(async () => {
  // Step 1: Check cache first (unless --force-refresh is specified)
  let usageData = null;
  if (!process.argv.includes("--force-refresh")) {
    usageData = readCache();
  } else if (process.argv.includes("--debug")) {
    console.error("Force refresh requested, skipping cache");
  }

  // Step 2: If no valid cache, fetch from API
  if (!usageData) {
    const accessToken = getOAuthTokenFromKeychain();

    if (!accessToken) {
      console.log("No OAuth token found");
      process.exit(1);
    }

    if (process.argv.includes("--debug")) {
      console.error("OAuth token found:", accessToken.substring(0, 20) + "...");
    }

    usageData = await fetchUsageData(accessToken);

    if (!usageData) {
      console.log("Failed to fetch usage data");
      process.exit(1);
    }

    // Step 3: Cache the fresh data
    writeCache(usageData);
  }

  // Step 4: Extract 5-hour block reset time
  const fiveHourData = usageData.five_hour;

  if (!fiveHourData || !fiveHourData.resets_at) {
    console.log("No active block");
    process.exit(0);
  }

  // Step 5: Format and display the end time with visual indicator
  const endTimeStr = formatTime(fiveHourData.resets_at);
  const indicator = getIndicatorForUtilization(fiveHourData.utilization);

  console.log(`${indicator}${endTimeStr}`);

  // Debug: show additional info
  if (process.argv.includes("--debug")) {
    console.error("\n--- Usage Summary ---");
    console.error(
      `5-hour block: ${fiveHourData.utilization}% used, resets at ${fiveHourData.resets_at}`,
    );
    if (usageData.seven_day) {
      console.error(
        `7-day usage: ${usageData.seven_day.utilization}% used, resets at ${usageData.seven_day.resets_at}`,
      );
    }
    if (usageData.seven_day_opus) {
      console.error(
        `7-day Opus: ${usageData.seven_day_opus.utilization}% used, resets at ${usageData.seven_day_opus.resets_at || "unlimited"}`,
      );
    }
  }
})();
