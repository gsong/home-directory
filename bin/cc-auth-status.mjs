#!/usr/bin/env node

import { execSync } from "child_process";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const CONFIG_FILE = join(
  homedir(),
  ".home-directory",
  ".config",
  "cc-auth-status",
  "accounts.json",
);
const CACHE_DIR = join(homedir(), ".cache", "cc-auth-status");
const CACHE_FILE = join(CACHE_DIR, "status.json");
const CACHE_TTL = 60_000; // 60 seconds

const flags = {
  debug: process.argv.includes("--debug"),
  forceRefresh: process.argv.includes("--force-refresh"),
};

function debug(...args) {
  if (flags.debug) console.error(...args);
}

function readCache() {
  try {
    const cache = JSON.parse(readFileSync(CACHE_FILE, "utf8"));
    if (Date.now() - cache.timestamp < CACHE_TTL) {
      debug("Cache hit");
      return cache.data;
    }
    debug("Cache expired");
    return null;
  } catch {
    return null;
  }
}

function writeCache(data) {
  try {
    mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(CACHE_FILE, JSON.stringify({ timestamp: Date.now(), data }));
  } catch {}
}

function loadAccountMap() {
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, "utf8"));
  } catch {
    debug("No accounts config found at", CONFIG_FILE);
    return {};
  }
}

function getAuthStatus() {
  try {
    // Unset ANTHROPIC_API_KEY so claude reports OAuth identity, not API key auth
    const env = { ...process.env };
    delete env.ANTHROPIC_API_KEY;
    const output = execSync("claude auth status", {
      encoding: "utf8",
      timeout: 5000,
      env,
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();
    return JSON.parse(output);
  } catch (err) {
    debug("Failed to get auth status:", err.message);
    return null;
  }
}

try {
  let status = flags.forceRefresh ? null : readCache();

  if (!status) {
    status = getAuthStatus();
    if (status) writeCache(status);
  }

  if (!status || !status.loggedIn) {
    process.stdout.write("?");
    process.exit(0);
  }

  debug("Auth status:", JSON.stringify(status, null, 2));

  const accounts = loadAccountMap();
  const label = accounts[status.orgId] || status.orgName || "?";

  process.stdout.write(label);
} catch {
  process.stdout.write("?");
}
