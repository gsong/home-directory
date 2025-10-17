#!/usr/bin/env node

import { readFileSync, statSync, existsSync, readdirSync } from "fs";
import { join, dirname, basename } from "path";
import { homedir } from "os";

/**
 * Recursively finds all JSONL files in a directory
 */
function findJsonlFiles(dir, results = []) {
  try {
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        findJsonlFiles(fullPath, results);
      } else if (entry.isFile() && entry.name.endsWith(".jsonl")) {
        results.push(fullPath);
      }
    }
  } catch {
    // Ignore errors (permission denied, etc.)
  }

  return results;
}

/**
 * Gets all timestamps from a JSONL file
 */
function getAllTimestampsFromFile(filePath) {
  const timestamps = [];
  try {
    const content = readFileSync(filePath, "utf-8");
    const lines = content
      .trim()
      .split("\n")
      .filter((line) => line.length > 0);

    for (const line of lines) {
      try {
        const json = JSON.parse(line);

        // Only treat entries with real token usage as block activity
        const usage = json.message?.usage;
        if (!usage) continue;

        const hasInputTokens = typeof usage.input_tokens === "number";
        const hasOutputTokens = typeof usage.output_tokens === "number";
        if (!hasInputTokens || !hasOutputTokens) continue;

        if (json.isSidechain === true) continue;

        const timestamp = json.timestamp;
        if (typeof timestamp !== "string") continue;

        const date = new Date(timestamp);
        if (!isNaN(date.getTime())) {
          timestamps.push(date);
        }
      } catch {
        // Skip invalid JSON lines
        continue;
      }
    }

    return timestamps;
  } catch {
    return [];
  }
}

/**
 * Floors a timestamp to the beginning of the hour in Pacific timezone
 */
function floorToHourPacific(timestamp) {
  // Convert to Pacific time string and parse components
  const pacificString = timestamp.toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  // Parse: "MM/DD/YYYY, HH:MM:SS"
  const match = pacificString.match(/(\d+)\/(\d+)\/(\d+),\s+(\d+):(\d+):(\d+)/);
  if (!match) return timestamp;

  const [, month, day, year, hours, minutes, seconds] = match;

  // Construct ISO string for the start of this hour in Pacific time
  const hourStartISO = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${hours.padStart(2, "0")}:00:00-07:00`; // PDT
  const hourStartPST = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${hours.padStart(2, "0")}:00:00-08:00`; // PST

  // Try both offsets and see which is closer to our timestamp
  const pdtTime = new Date(hourStartISO);
  const pstTime = new Date(hourStartPST);

  // Pick whichever is closer but not after the timestamp
  if (pdtTime.getTime() <= timestamp.getTime()) {
    return pdtTime;
  } else if (pstTime.getTime() <= timestamp.getTime()) {
    return pstTime;
  }

  return timestamp; // fallback
}

/**
 * Efficiently finds the most recent 5-hour block start time from JSONL files
 */
function findMostRecentBlockStartTime(rootDir, sessionDurationHours = 5) {
  const sessionDurationMs = sessionDurationHours * 60 * 60 * 1000;
  const now = new Date();

  // Find all JSONL files with their modification times
  const projectsDir = join(rootDir, "projects");
  if (!existsSync(projectsDir)) return null;

  const files = findJsonlFiles(projectsDir);

  if (files.length === 0) return null;

  // Get file stats and sort by modification time (most recent first)
  const filesWithStats = files.map((file) => {
    const stats = statSync(file);
    return { file, mtime: stats.mtime };
  });

  filesWithStats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

  // Progressive lookback - start small and expand if needed
  const lookbackChunks = [10, 20, 48]; // hours

  let timestamps = [];
  let mostRecentTimestamp = null;
  let continuousWorkStart = null;
  let foundSessionGap = false;

  for (const lookbackHours of lookbackChunks) {
    const cutoffTime = new Date(now.getTime() - lookbackHours * 60 * 60 * 1000);
    timestamps = [];

    // Collect timestamps for this lookback period
    for (const { file, mtime } of filesWithStats) {
      if (mtime.getTime() < cutoffTime.getTime()) break;
      const fileTimestamps = getAllTimestampsFromFile(file);
      timestamps.push(...fileTimestamps);
    }

    if (timestamps.length === 0) continue;

    // Sort timestamps (most recent first)
    timestamps.sort((a, b) => b.getTime() - a.getTime());

    // Get most recent timestamp (only set once)
    if (!mostRecentTimestamp && timestamps[0]) {
      mostRecentTimestamp = timestamps[0];

      // Check if the most recent activity is within the current session period
      const timeSinceLastActivity =
        now.getTime() - mostRecentTimestamp.getTime();
      if (timeSinceLastActivity > sessionDurationMs) {
        return null; // No activity within the current session period
      }
    }

    // Look for a session gap in this chunk
    continuousWorkStart = mostRecentTimestamp;
    for (let i = 1; i < timestamps.length; i++) {
      const currentTimestamp = timestamps[i];
      const previousTimestamp = timestamps[i - 1];

      if (!currentTimestamp || !previousTimestamp) continue;

      const gap = previousTimestamp.getTime() - currentTimestamp.getTime();

      if (gap >= sessionDurationMs) {
        foundSessionGap = true;
        break;
      }

      continuousWorkStart = currentTimestamp;
    }

    if (foundSessionGap) break;

    // If this was our last chunk, use what we have
    if (lookbackHours === lookbackChunks[lookbackChunks.length - 1]) break;
  }

  if (!mostRecentTimestamp || !continuousWorkStart) return null;

  // Build actual blocks from timestamps going forward
  const blocks = [];
  const sortedTimestamps = timestamps
    .slice()
    .sort((a, b) => a.getTime() - b.getTime());

  let currentBlockStart = null;
  let currentBlockEnd = null;

  for (const timestamp of sortedTimestamps) {
    if (timestamp.getTime() < continuousWorkStart.getTime()) continue;

    if (
      !currentBlockStart ||
      (currentBlockEnd && timestamp.getTime() > currentBlockEnd.getTime())
    ) {
      // Start new block
      currentBlockStart = floorToHourPacific(timestamp);
      currentBlockEnd = new Date(
        currentBlockStart.getTime() + sessionDurationMs,
      );
      blocks.push({ start: currentBlockStart, end: currentBlockEnd });
    }
  }

  // Find current block
  for (const block of blocks) {
    if (
      now.getTime() >= block.start.getTime() &&
      now.getTime() <= block.end.getTime()
    ) {
      // Verify we have activity in this block
      const hasActivity = timestamps.some(
        (t) =>
          t.getTime() >= block.start.getTime() &&
          t.getTime() <= block.end.getTime(),
      );

      if (hasActivity) {
        return {
          startTime: block.start,
          lastActivity: mostRecentTimestamp,
        };
      }
    }
  }

  return null;
}

/**
 * Gets block metrics for the current 5-hour block
 */
function getBlockMetrics() {
  const claudePath = join(homedir(), ".claude");

  if (!existsSync(claudePath)) {
    return null;
  }

  try {
    return findMostRecentBlockStartTime(claudePath);
  } catch {
    return null;
  }
}

// Main execution
const blockMetrics = getBlockMetrics();

if (!blockMetrics) {
  console.log("No active block");
  process.exit(0);
}

// Debug: show block start time
if (process.argv.includes("--debug")) {
  console.error("Block start (UTC):", blockMetrics.startTime.toISOString());
  console.error("Block start (local):", blockMetrics.startTime.toString());
  console.error("Last activity:", blockMetrics.lastActivity.toString());
}

const now = new Date();
const elapsed = now.getTime() - blockMetrics.startTime.getTime();
const fiveHours = 5 * 60 * 60 * 1000;
const remaining = fiveHours - elapsed;
const blockEndTime = new Date(blockMetrics.startTime.getTime() + fiveHours);

// Format end time (e.g., "4:30pm")
const hours = blockEndTime.getHours();
const minutes = blockEndTime.getMinutes();
const ampm = hours >= 12 ? "pm" : "am";
const displayHours = hours % 12 || 12;
const displayMinutes = minutes.toString().padStart(2, "0");
const endTimeStr = `${displayHours}:${displayMinutes}${ampm}`;

if (remaining <= 0) {
  console.log(`0m (${endTimeStr})`);
} else {
  const remainingHours = Math.floor(remaining / (60 * 60 * 1000));
  const remainingMinutes = Math.floor(
    (remaining % (60 * 60 * 1000)) / (60 * 1000),
  );

  let timeLeft;
  if (remainingHours === 0) {
    timeLeft = `${remainingMinutes}m`;
  } else if (remainingMinutes === 0) {
    timeLeft = `${remainingHours}hr`;
  } else {
    timeLeft = `${remainingHours}hr${remainingMinutes}m`;
  }

  console.log(`${timeLeft} (${endTimeStr})`);
}
