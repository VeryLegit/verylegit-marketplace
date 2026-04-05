# VeryLegit Plugins

A curated collection of plugins for [Claude Code](https://claude.ai/claude-code). Sharper decisions. Angrier answers. Bear notes. iOS Simulator eyes.

## Quick Start

```bash
# Add the marketplace
claude plugins marketplace add VeryLegit/verylegit-marketplace

# Install what you want
claude plugins install debate@verylegit-marketplace
claude plugins install wtf@verylegit-marketplace
claude plugins install bear-notes@verylegit-marketplace
claude plugins install ios-simulator@verylegit-marketplace
```

---

## debate

**Adversarial analysis for any plan, proposal, or technical decision.**

Three AI subagents argue it out so you don't have to:

| Role | Job |
|------|-----|
| **Proponent** | Makes the strongest case *for* your plan. Concrete benefits, anticipated objections. |
| **Critic** | Makes the strongest case *against*. Identifies risks, hidden costs, false assumptions. Proposes alternatives. |
| **Judge** | Reads both arguments in full, identifies the strongest and weakest points from each side, and delivers a clear verdict: approve, reject, or approve with modifications. Always opens with *"Decorum! Decorum!"* |

### How it works

```
Plan → Proponent + Critic (parallel) → Judge → Verdict
```

1. You describe a proposal
2. Proponent and Critic are dispatched in parallel (both get full context)
3. Judge receives both complete arguments — no summaries, no shortcuts
4. You get a structured verdict with a concrete recommended action

### Usage

```
/debate Should we rewrite the auth system in Rust?
```

```
/debate We're considering moving from PostgreSQL to DynamoDB for the events table
```

The skill also auto-triggers when Claude detects phrases like "debate this", "argue both sides", or "devil's advocate".

---

## wtf

**Like `/btw` but angry.**

You know that feeling when you've been staring at a bug for 45 minutes and you just need someone to explain what's going on — but also validate your frustration? That's `/wtf`.

It channels the energy of a senior dev who just found out the intern deployed to prod on a Friday at 4:59 PM. Dramatic, exasperated, colorfully annoyed — but still gives you the correct answer.

### Usage

```
/wtf Why is this returning undefined?
```

```
/wtf How is this passing in CI but failing locally?
```

```
/wtf What does this regex even do?
```

---

## bear-notes

**Search, read, create, and manage Bear notes directly from Claude Code.**

Bundles an MCP server that reads Bear's local SQLite database for instant access to all your notes. Write operations use Bear's x-callback-url scheme.

### Tools (via MCP)

| Tool | What it does |
|------|-------------|
| `search_notes` | Full-text search across titles and content |
| `get_note` | Read full note content by ID |
| `list_recent_notes` | See recently modified notes |
| `list_tags` | All tags with note counts |
| `get_notes_by_tag` | Filter notes by tag |
| `create_note` | Create a new note in Bear |
| `add_to_note` | Append/prepend text to existing note |
| `open_note` | Open a note in the Bear app |

### Usage

```
/bear search meeting notes
/bear recent 10
/bear tags
/bear read 42
/bear create "My New Note"
```

The skill also auto-triggers when you reference "my notes", "Bear notes", or say "save this to a note".

### Requirements

- macOS with [Bear](https://bear.app) installed
- Node.js 18+

---

## ios-simulator

**Full iOS Simulator control from Claude Code. Claude can finally see your app.**

Bundles an MCP server wrapping `xcrun simctl` and AppleScript for complete simulator interaction. Claude can screenshot the simulator, see the image, and act on what it sees.

### Tools (via MCP)

| Category | Tools |
|----------|-------|
| **Visual** | `screenshot`, `set_appearance`, `set_content_size`, `override_status_bar`, `clear_status_bar` |
| **Device** | `list_devices`, `boot_device`, `shutdown_device`, `erase_device` |
| **Apps** | `install_app`, `launch_app`, `terminate_app`, `list_apps`, `app_info`, `get_app_container` |
| **Interaction** | `tap`, `swipe`, `type_text`, `press_button`, `set_pasteboard`, `get_pasteboard` |
| **Testing** | `send_push`, `open_url`, `set_location`, `clear_location`, `set_permission` |
| **Debug** | `get_logs`, `add_media`, `reset_keychain` |

### Usage

```
/sim screenshot        — See the app
/sim boot              — Boot a simulator
/sim dark              — Switch to dark mode
/sim push com.my.app "Hello" "World"  — Test push
/sim tap 200 400       — Tap center of screen
/sim log MyApp 1m      — Last minute of logs
/sim appstore          — Clean status bar + screenshot
```

### What makes this an unlock

- **Claude can see the simulator** — screenshots return actual images
- **Push notification testing** — custom payloads, no server needed
- **Deep link testing** — `open_url` with any scheme
- **Location simulation** — test geo features without moving
- **Permission control** — grant/revoke without system dialogs
- **App Store screenshots** — one command for clean status bar + capture
- **Log reading** — filter console output by process name

### Requirements

- macOS with Xcode installed
- Node.js 18+

---

## License

MIT
