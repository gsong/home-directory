#!/usr/bin/env node

import { execSync } from "child_process";
import { basename } from "path";

/**
 * Send macOS notification for Claude Code events
 * Reads event JSON from stdin and dispatches based on hook_event_name
 * Only sends if not in tmux or tmux pane is inactive
 */

const readStdin = async () => {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString();
};

const isInTmux = () => {
  return !!process.env.TMUX;
};

const isActiveTmuxPane = () => {
  if (!isInTmux()) {
    return false;
  }

  try {
    const tmuxPane = process.env.TMUX_PANE;
    if (!tmuxPane) {
      return false;
    }
    const result = execSync(
      `tmux display-message -pt "${tmuxPane}" '#{pane_active} #{window_active}'`,
      {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "ignore"],
      },
    ).trim();
    // Both pane and window must be active
    return result === "1 1";
  } catch (error) {
    return false;
  }
};

const shouldNotify = (force = false) => {
  // Force flag overrides all checks
  if (force) {
    return true;
  }
  // Don't notify if we're in the active tmux pane
  if (isActiveTmuxPane()) {
    return false;
  }
  return true;
};

const getDirectoryInfo = () => {
  const pwd = process.cwd();
  const parts = pwd.split("/").filter(Boolean);
  const lastTwo = parts.slice(-2).join("/");
  const current = basename(pwd);

  return { lastTwo, current };
};

const sendNotification = ({
  title,
  subtitle,
  message,
  sound = "default",
  force = false,
}) => {
  if (!shouldNotify(force)) {
    return;
  }

  const escapeArg = (arg) => {
    return `'${arg.replace(/'/g, "'\\''")}'`;
  };

  const cmd = [
    "terminal-notifier",
    "-title",
    escapeArg(title),
    "-subtitle",
    escapeArg(subtitle),
    "-message",
    escapeArg(message),
    "-sound",
    sound,
  ];

  try {
    execSync(cmd.join(" "), {
      stdio: "ignore",
      shell: true,
    });
  } catch (error) {
    console.error("Failed to send notification:", error.message);
  }
};

// Parse command line arguments
const args = process.argv.slice(2);
const parseArgs = () => {
  const options = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i].slice(2);
      // Handle boolean flags
      if (args[i + 1] && !args[i + 1].startsWith("--")) {
        options[key] = args[i + 1];
        i++;
      } else {
        options[key] = true;
      }
    }
  }

  return options;
};

const getNotificationConfig = (eventData) => {
  const { lastTwo, current } = getDirectoryInfo();

  switch (eventData.hook_event_name) {
    case "Notification":
      return {
        title: "CC: Input Required",
        subtitle: current,
        message: eventData.message || "Input required",
        sound: "Ping",
      };

    case "Stop":
      return {
        title: "CC: Done",
        subtitle: current,
        message: `Task completed: ${lastTwo}`,
        sound: "Glass",
      };

    default:
      return {
        title: "Claude Code",
        subtitle: current,
        message: eventData.message || `Event: ${eventData.hook_event_name}`,
        sound: "default",
      };
  }
};

const main = async () => {
  const options = parseArgs();
  const { lastTwo, current } = getDirectoryInfo();

  // Try to read event JSON from stdin
  let eventData = null;
  let stdinData = "";

  try {
    stdinData = await readStdin();
    if (stdinData.trim()) {
      eventData = JSON.parse(stdinData);
    }
  } catch (error) {
    // Not JSON or no stdin, fall back to CLI args
  }

  const inTmux = isInTmux();
  const activePane = isActiveTmuxPane();

  if (options.debug) {
    console.log("Debug info:");
    console.log("  TMUX:", process.env.TMUX);
    console.log("  TMUX_PANE:", process.env.TMUX_PANE);
    if (inTmux && process.env.TMUX_PANE) {
      try {
        const status = execSync(
          `tmux display-message -pt "${process.env.TMUX_PANE}" '#{pane_active} #{window_active}'`,
          { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] },
        ).trim();
        const [paneActive, windowActive] = status.split(" ");
        console.log("  pane_active:", paneActive);
        console.log("  window_active:", windowActive);
      } catch (e) {}
    }
    console.log("  isInTmux:", inTmux);
    console.log("  isActiveTmuxPane:", activePane);
    console.log("  shouldNotify:", shouldNotify(options.force));
    console.log("  force:", options.force);
    console.log("  eventData:", eventData);
  }

  let title, subtitle, message, sound, force;

  // If we have event data with hook_event_name, use that
  if (eventData && eventData.hook_event_name) {
    const config = getNotificationConfig(eventData);
    title = config.title;
    subtitle = config.subtitle;
    message = config.message;
    sound = config.sound;
    force = false; // Events don't force notifications
  } else {
    // Fall back to CLI args for backward compatibility
    message = (options.message || "")
      .replace("{{dir}}", lastTwo)
      .replace("{{basename}}", current);

    subtitle = (options.subtitle || current)
      .replace("{{dir}}", lastTwo)
      .replace("{{basename}}", current);

    title = options.title || "Claude Code";
    sound = options.sound || "default";
    force = options.force;
  }

  sendNotification({
    title,
    subtitle,
    message,
    sound,
    force,
  });
};

main();
