---
description: "Control the iOS Simulator. Usage: /sim screenshot, /sim boot, /sim push, /sim dark, /sim location"
argument-hint: "<screenshot|boot|shutdown|push|dark|light|location|log|launch|tap|type> [args]"
allowed-tools: [Bash, Read]
---

# iOS Simulator Control

The user invoked: `/sim $ARGUMENTS`

You have access to the iOS Simulator via MCP tools (ios-simulator server). Use the appropriate tool:

## Subcommands

### `/sim screenshot`
Use the `screenshot` MCP tool. Display the returned image and describe what you see.

### `/sim boot [device]`
Use `boot_device`. If a device name is given (e.g. "iPhone 16"), find its UDID first with `list_devices`.

### `/sim shutdown`
Use `shutdown_device`.

### `/sim push <bundle_id> <title> <body>`
Use `send_push`. Parse title and body from arguments.

### `/sim dark` / `/sim light`
Use `set_appearance` with the appropriate mode.

### `/sim location <lat> <lng>`
Use `set_location`.

### `/sim log [process] [time]`
Use `get_logs`. Default to last 30s if no time given.

### `/sim launch <bundle_id>`
Use `launch_app`.

### `/sim tap <x> <y>`
Use `tap`.

### `/sim type <text>`
Use `type_text`.

### `/sim apps`
Use `list_apps`.

### `/sim appstore`
Use `override_status_bar` with default clean values (9:41, 100% battery, full bars), then `screenshot`.

### No arguments
Show available subcommands.
