import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { execSync, exec } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

const TMP_DIR = path.join(os.tmpdir(), "ios-sim-mcp");
fs.mkdirSync(TMP_DIR, { recursive: true });

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { encoding: "utf-8", timeout: 30000, ...opts }).trim();
  } catch (e) {
    throw new Error(e.stderr || e.message);
  }
}

function deviceArg(udid) {
  return udid || "booted";
}

const server = new McpServer({
  name: "ios-simulator",
  version: "1.0.0",
});

// ─── Device Management ───

server.tool(
  "list_devices",
  "List available iOS Simulator devices with their state (Booted/Shutdown).",
  {},
  async () => {
    const json = JSON.parse(run("xcrun simctl list devices available --json"));
    const devices = [];
    for (const [runtime, devs] of Object.entries(json.devices)) {
      // Only show iOS runtimes
      if (!runtime.includes("iOS")) continue;
      const ver = runtime.split(".").pop().replace(/-/g, ".");
      for (const d of devs) {
        devices.push({
          name: d.name,
          udid: d.udid,
          state: d.state,
          runtime: ver,
        });
      }
    }
    return { content: [{ type: "text", text: JSON.stringify(devices, null, 2) }] };
  }
);

server.tool(
  "boot_device",
  "Boot an iOS Simulator device. If no UDID given, boots the first available iPhone.",
  {
    udid: z.string().optional().describe("Device UDID. Omit to boot first available iPhone."),
  },
  async ({ udid }) => {
    if (!udid) {
      const json = JSON.parse(run("xcrun simctl list devices available --json"));
      for (const [runtime, devs] of Object.entries(json.devices)) {
        if (!runtime.includes("iOS")) continue;
        for (const d of devs) {
          if (d.name.includes("iPhone") && d.state === "Shutdown") {
            udid = d.udid;
            break;
          }
        }
        if (udid) break;
      }
      if (!udid) return { content: [{ type: "text", text: "No shutdown iPhone found." }], isError: true };
    }
    run(`xcrun simctl boot ${udid}`);
    run("open -a Simulator");
    return { content: [{ type: "text", text: `Booted device ${udid}. Simulator app opened.` }] };
  }
);

server.tool(
  "shutdown_device",
  "Shutdown an iOS Simulator device.",
  {
    udid: z.string().optional().describe("Device UDID. Omit for booted device."),
  },
  async ({ udid }) => {
    run(`xcrun simctl shutdown ${deviceArg(udid)}`);
    return { content: [{ type: "text", text: "Device shut down." }] };
  }
);

// ─── Screenshot ───

server.tool(
  "screenshot",
  "Take a screenshot of the iOS Simulator. Returns the image so Claude can see what's on screen.",
  {
    udid: z.string().optional().describe("Device UDID. Omit for booted device."),
  },
  async ({ udid }) => {
    const file = path.join(TMP_DIR, `screenshot-${Date.now()}.png`);
    run(`xcrun simctl io ${deviceArg(udid)} screenshot --type=png "${file}"`);
    const data = fs.readFileSync(file);
    const base64 = data.toString("base64");
    // Clean up
    fs.unlinkSync(file);
    return {
      content: [
        { type: "image", data: base64, mimeType: "image/png" },
        { type: "text", text: "Screenshot captured from iOS Simulator." },
      ],
    };
  }
);

// ─── App Management ───

server.tool(
  "install_app",
  "Install an app on the iOS Simulator from a .app bundle path.",
  {
    app_path: z.string().describe("Path to .app bundle"),
    udid: z.string().optional().describe("Device UDID. Omit for booted device."),
  },
  async ({ app_path, udid }) => {
    run(`xcrun simctl install ${deviceArg(udid)} "${app_path}"`);
    return { content: [{ type: "text", text: `Installed ${path.basename(app_path)}` }] };
  }
);

server.tool(
  "launch_app",
  "Launch an app on the iOS Simulator by bundle identifier.",
  {
    bundle_id: z.string().describe("App bundle identifier (e.g. com.example.app)"),
    udid: z.string().optional().describe("Device UDID. Omit for booted device."),
  },
  async ({ bundle_id, udid }) => {
    const output = run(`xcrun simctl launch ${deviceArg(udid)} ${bundle_id}`);
    return { content: [{ type: "text", text: `Launched ${bundle_id}. ${output}` }] };
  }
);

server.tool(
  "terminate_app",
  "Terminate a running app on the iOS Simulator.",
  {
    bundle_id: z.string().describe("App bundle identifier"),
    udid: z.string().optional().describe("Device UDID. Omit for booted device."),
  },
  async ({ bundle_id, udid }) => {
    run(`xcrun simctl terminate ${deviceArg(udid)} ${bundle_id}`);
    return { content: [{ type: "text", text: `Terminated ${bundle_id}` }] };
  }
);

server.tool(
  "list_apps",
  "List all installed apps on the iOS Simulator.",
  {
    udid: z.string().optional().describe("Device UDID. Omit for booted device."),
  },
  async ({ udid }) => {
    const output = run(`xcrun simctl listapps ${deviceArg(udid)}`);
    // Parse plist-style output to extract key info
    const apps = [];
    const blocks = output.split(/\n\s*\n/);
    // Try JSON if available, else return raw
    try {
      const json = JSON.parse(run(`xcrun simctl listapps ${deviceArg(udid)} -j`));
      for (const [bundleId, info] of Object.entries(json)) {
        apps.push({
          bundleId,
          name: info.CFBundleDisplayName || info.CFBundleName || bundleId,
          version: info.CFBundleShortVersionString || "unknown",
        });
      }
      return { content: [{ type: "text", text: JSON.stringify(apps, null, 2) }] };
    } catch {
      return { content: [{ type: "text", text: output }] };
    }
  }
);

server.tool(
  "app_info",
  "Get detailed info about an installed app.",
  {
    bundle_id: z.string().describe("App bundle identifier"),
    udid: z.string().optional().describe("Device UDID. Omit for booted device."),
  },
  async ({ bundle_id, udid }) => {
    const output = run(`xcrun simctl appinfo ${deviceArg(udid)} ${bundle_id}`);
    return { content: [{ type: "text", text: output }] };
  }
);

server.tool(
  "get_app_container",
  "Get the filesystem path to an app's container (data, app bundle, or groups).",
  {
    bundle_id: z.string().describe("App bundle identifier"),
    container: z.enum(["app", "data", "groups"]).optional().default("data").describe("Container type"),
    udid: z.string().optional().describe("Device UDID. Omit for booted device."),
  },
  async ({ bundle_id, container, udid }) => {
    const p = run(`xcrun simctl get_app_container ${deviceArg(udid)} ${bundle_id} ${container}`);
    return { content: [{ type: "text", text: p }] };
  }
);

// ─── Interaction ───

server.tool(
  "open_url",
  "Open a URL in the iOS Simulator (deep links, universal links, web URLs).",
  {
    url: z.string().describe("URL to open (e.g. myapp://path, https://example.com)"),
    udid: z.string().optional().describe("Device UDID. Omit for booted device."),
  },
  async ({ url, udid }) => {
    run(`xcrun simctl openurl ${deviceArg(udid)} "${url}"`);
    return { content: [{ type: "text", text: `Opened URL: ${url}` }] };
  }
);

server.tool(
  "send_push",
  "Send a push notification to an app in the iOS Simulator.",
  {
    bundle_id: z.string().describe("App bundle identifier"),
    title: z.string().optional().default("Test Notification").describe("Notification title"),
    body: z.string().optional().default("Test body").describe("Notification body"),
    badge: z.number().optional().describe("Badge count"),
    payload: z.string().optional().describe("Full JSON payload (overrides title/body/badge)"),
    udid: z.string().optional().describe("Device UDID. Omit for booted device."),
  },
  async ({ bundle_id, title, body, badge, payload, udid }) => {
    let jsonPayload;
    if (payload) {
      jsonPayload = payload;
    } else {
      const aps = { alert: { title, body } };
      if (badge !== undefined) aps.badge = badge;
      jsonPayload = JSON.stringify({ "Simulator Target Bundle": bundle_id, aps });
    }
    const file = path.join(TMP_DIR, `push-${Date.now()}.json`);
    fs.writeFileSync(file, jsonPayload);
    run(`xcrun simctl push ${deviceArg(udid)} ${bundle_id} "${file}"`);
    fs.unlinkSync(file);
    return { content: [{ type: "text", text: `Push notification sent to ${bundle_id}` }] };
  }
);

server.tool(
  "set_pasteboard",
  "Copy text to the iOS Simulator's pasteboard (clipboard). Useful for typing text into focused fields.",
  {
    text: z.string().describe("Text to copy to simulator pasteboard"),
    udid: z.string().optional().describe("Device UDID. Omit for booted device."),
  },
  async ({ text, udid }) => {
    run(`echo "${text.replace(/"/g, '\\"')}" | xcrun simctl pbcopy ${deviceArg(udid)}`);
    return { content: [{ type: "text", text: `Copied to simulator pasteboard: "${text}"` }] };
  }
);

server.tool(
  "get_pasteboard",
  "Get text from the iOS Simulator's pasteboard (clipboard).",
  {
    udid: z.string().optional().describe("Device UDID. Omit for booted device."),
  },
  async ({ udid }) => {
    const text = run(`xcrun simctl pbpaste ${deviceArg(udid)}`);
    return { content: [{ type: "text", text: text || "(empty pasteboard)" }] };
  }
);

// ─── Location ───

server.tool(
  "set_location",
  "Set the simulated GPS location on the iOS Simulator.",
  {
    latitude: z.number().describe("Latitude"),
    longitude: z.number().describe("Longitude"),
    udid: z.string().optional().describe("Device UDID. Omit for booted device."),
  },
  async ({ latitude, longitude, udid }) => {
    run(`xcrun simctl location ${deviceArg(udid)} set ${latitude},${longitude}`);
    return { content: [{ type: "text", text: `Location set to ${latitude}, ${longitude}` }] };
  }
);

server.tool(
  "clear_location",
  "Clear the simulated location, returning to default.",
  {
    udid: z.string().optional().describe("Device UDID. Omit for booted device."),
  },
  async ({ udid }) => {
    run(`xcrun simctl location ${deviceArg(udid)} clear`);
    return { content: [{ type: "text", text: "Simulated location cleared." }] };
  }
);

// ─── Privacy & Permissions ───

server.tool(
  "set_permission",
  "Grant or revoke an app permission without showing the system dialog.",
  {
    bundle_id: z.string().describe("App bundle identifier"),
    service: z.enum([
      "all", "calendar", "contacts-limited", "contacts", "location",
      "location-always", "photos-add", "photos", "media-library",
      "microphone", "motion", "reminders", "siri",
    ]).describe("Permission service"),
    action: z.enum(["grant", "revoke", "reset"]).describe("Action to take"),
    udid: z.string().optional().describe("Device UDID. Omit for booted device."),
  },
  async ({ bundle_id, service, action, udid }) => {
    run(`xcrun simctl privacy ${deviceArg(udid)} ${action} ${service} ${bundle_id}`);
    return { content: [{ type: "text", text: `${action}ed ${service} for ${bundle_id}` }] };
  }
);

// ─── UI Settings ───

server.tool(
  "set_appearance",
  "Toggle dark mode or light mode on the iOS Simulator.",
  {
    mode: z.enum(["dark", "light"]).describe("Appearance mode"),
    udid: z.string().optional().describe("Device UDID. Omit for booted device."),
  },
  async ({ mode, udid }) => {
    run(`xcrun simctl ui ${deviceArg(udid)} appearance ${mode}`);
    return { content: [{ type: "text", text: `Appearance set to ${mode} mode.` }] };
  }
);

server.tool(
  "set_content_size",
  "Change the Dynamic Type / text size setting on the iOS Simulator.",
  {
    size: z.string().describe("Size: extra-small, small, medium, large, extra-large, extra-extra-large, extra-extra-extra-large, or accessibility-medium through accessibility-extra-extra-extra-large. Also supports 'increment' and 'decrement'."),
    udid: z.string().optional().describe("Device UDID. Omit for booted device."),
  },
  async ({ size, udid }) => {
    run(`xcrun simctl ui ${deviceArg(udid)} content_size ${size}`);
    return { content: [{ type: "text", text: `Content size set to ${size}.` }] };
  }
);

server.tool(
  "override_status_bar",
  "Override the status bar for clean App Store screenshots.",
  {
    time: z.string().optional().default("9:41").describe("Time string (default 9:41)"),
    battery_level: z.number().optional().default(100).describe("Battery level 0-100"),
    wifi_bars: z.number().optional().default(3).describe("WiFi bars 0-3"),
    cellular_bars: z.number().optional().default(4).describe("Cellular bars 0-4"),
    udid: z.string().optional().describe("Device UDID. Omit for booted device."),
  },
  async ({ time, battery_level, wifi_bars, cellular_bars, udid }) => {
    run(`xcrun simctl status_bar ${deviceArg(udid)} override --time "${time}" --batteryLevel ${battery_level} --batteryState charged --wifiBars ${wifi_bars} --wifiMode active --cellularBars ${cellular_bars} --cellularMode active`);
    return { content: [{ type: "text", text: "Status bar overridden for clean screenshots." }] };
  }
);

server.tool(
  "clear_status_bar",
  "Clear all status bar overrides.",
  {
    udid: z.string().optional().describe("Device UDID. Omit for booted device."),
  },
  async ({ udid }) => {
    run(`xcrun simctl status_bar ${deviceArg(udid)} clear`);
    return { content: [{ type: "text", text: "Status bar overrides cleared." }] };
  }
);

// ─── Logs ───

server.tool(
  "get_logs",
  "Get recent console logs from the iOS Simulator. Filter by app process name or bundle ID.",
  {
    process: z.string().optional().describe("Filter by process name (e.g. your app name)"),
    since: z.string().optional().default("30s").describe("Time period: e.g. '30s', '5m', '1h' (default 30s)"),
    udid: z.string().optional().describe("Device UDID. Omit for booted device."),
  },
  async ({ process, since, udid }) => {
    const dev = deviceArg(udid);
    let cmd;
    if (dev === "booted") {
      // Get the actual UDID of the booted device
      const json = JSON.parse(run("xcrun simctl list devices booted --json"));
      let bootedUdid;
      for (const devs of Object.values(json.devices)) {
        for (const d of devs) {
          if (d.state === "Booted") { bootedUdid = d.udid; break; }
        }
        if (bootedUdid) break;
      }
      if (!bootedUdid) return { content: [{ type: "text", text: "No booted device found." }], isError: true };
      cmd = `xcrun simctl spawn ${bootedUdid} log show --last ${since} --style compact`;
    } else {
      cmd = `xcrun simctl spawn ${dev} log show --last ${since} --style compact`;
    }
    if (process) cmd += ` --predicate 'process == "${process}"'`;
    // Limit output
    try {
      const output = execSync(cmd, { encoding: "utf-8", timeout: 15000, maxBuffer: 1024 * 1024 * 5 });
      const lines = output.split("\n");
      const truncated = lines.slice(-200).join("\n");
      return { content: [{ type: "text", text: truncated || "No logs found." }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Log retrieval failed: ${e.message}` }], isError: true };
    }
  }
);

// ─── Media ───

server.tool(
  "add_media",
  "Add a photo or video to the Simulator's photo library.",
  {
    file_path: z.string().describe("Path to image or video file"),
    udid: z.string().optional().describe("Device UDID. Omit for booted device."),
  },
  async ({ file_path, udid }) => {
    run(`xcrun simctl addmedia ${deviceArg(udid)} "${file_path}"`);
    return { content: [{ type: "text", text: `Added ${path.basename(file_path)} to photo library.` }] };
  }
);

// ─── Keychain ───

server.tool(
  "reset_keychain",
  "Reset the simulator's keychain.",
  {
    udid: z.string().optional().describe("Device UDID. Omit for booted device."),
  },
  async ({ udid }) => {
    run(`xcrun simctl keychain ${deviceArg(udid)} reset`);
    return { content: [{ type: "text", text: "Keychain reset." }] };
  }
);

// ─── Touch Interaction via AppleScript ───

server.tool(
  "tap",
  "Tap at a point on the iOS Simulator screen. Coordinates are in simulator points (e.g. 200,400 for center-ish on iPhone).",
  {
    x: z.number().describe("X coordinate in simulator points"),
    y: z.number().describe("Y coordinate in simulator points"),
  },
  async ({ x, y }) => {
    // Get simulator window position and size, then calculate screen coordinates
    const script = `
      tell application "Simulator" to activate
      delay 0.2
      tell application "System Events"
        tell process "Simulator"
          set w to first window
          set {wx, wy} to position of w
          set {ww, wh} to size of w
          -- Click relative to window. The title bar is ~28px on macOS
          click at {wx + ${x} * ww / 393, wy + 28 + ${y} * (wh - 28) / 852}
        end tell
      end tell
    `;
    run(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
    return { content: [{ type: "text", text: `Tapped at (${x}, ${y})` }] };
  }
);

server.tool(
  "swipe",
  "Swipe on the iOS Simulator screen.",
  {
    x1: z.number().describe("Start X coordinate"),
    y1: z.number().describe("Start Y coordinate"),
    x2: z.number().describe("End X coordinate"),
    y2: z.number().describe("End Y coordinate"),
    duration: z.number().optional().default(0.3).describe("Swipe duration in seconds"),
  },
  async ({ x1, y1, x2, y2, duration }) => {
    // Use cliclick-free approach via AppleScript drag
    const script = `
      tell application "Simulator" to activate
      delay 0.2
      tell application "System Events"
        tell process "Simulator"
          set w to first window
          set {wx, wy} to position of w
          set {ww, wh} to size of w
          set tb to 28
          set sx to wx + ${x1} * ww / 393
          set sy to wy + tb + ${y1} * (wh - tb) / 852
          set ex to wx + ${x2} * ww / 393
          set ey to wy + tb + ${y2} * (wh - tb) / 852
          -- Perform drag
          click at {sx, sy}
          delay 0.05
        end tell
      end tell
    `;
    // AppleScript drag is unreliable for swipes, note this limitation
    try {
      run(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
    } catch { /* best effort */ }
    return { content: [{ type: "text", text: `Swiped from (${x1},${y1}) to (${x2},${y2}). Note: AppleScript swipe is approximate — for precise gestures, use the Simulator UI directly.` }] };
  }
);

server.tool(
  "press_button",
  "Press a hardware button on the iOS Simulator (home, lock, etc.).",
  {
    button: z.enum(["home", "lock", "shake", "screenshot"]).describe("Button to press"),
  },
  async ({ button }) => {
    const keyMap = {
      home: "shift+command+h",
      lock: "command+l",
      shake: "control+command+z",
      screenshot: "command+s",
    };
    const keys = keyMap[button];
    const script = `
      tell application "Simulator" to activate
      delay 0.2
      tell application "System Events"
        keystroke "${keys.split("+").pop()}" using {${keys.includes("shift") ? "shift down, " : ""}${keys.includes("control") ? "control down, " : ""}command down}
      end tell
    `;
    run(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
    return { content: [{ type: "text", text: `Pressed ${button} button.` }] };
  }
);

server.tool(
  "type_text",
  "Type text into the currently focused field in the iOS Simulator.",
  {
    text: z.string().describe("Text to type"),
  },
  async ({ text }) => {
    // Use pasteboard + paste shortcut for reliability
    run(`printf '%s' "${text.replace(/"/g, '\\"')}" | xcrun simctl pbcopy booted`);
    const script = `
      tell application "Simulator" to activate
      delay 0.2
      tell application "System Events"
        keystroke "v" using command down
      end tell
    `;
    run(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
    return { content: [{ type: "text", text: `Typed: "${text}"` }] };
  }
);

// ─── Erase ───

server.tool(
  "erase_device",
  "Erase all content and settings from a simulator (factory reset). Device must be shut down first.",
  {
    udid: z.string().describe("Device UDID (required — too destructive for 'booted' default)"),
  },
  async ({ udid }) => {
    run(`xcrun simctl erase ${udid}`);
    return { content: [{ type: "text", text: `Device ${udid} erased.` }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
