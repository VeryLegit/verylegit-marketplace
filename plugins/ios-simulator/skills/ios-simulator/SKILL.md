---
name: ios-simulator
description: Use when the user is working on an iOS app, wants to see the simulator, test the app, debug visual issues, take screenshots, test push notifications, test deep links, or interact with the iOS Simulator in any way. Auto-triggers on "check the simulator", "what does it look like", "take a screenshot", "test the push notification", "open in simulator", "try the deep link".
---

# iOS Simulator Integration

You have access to the iOS Simulator via MCP tools from the `ios-simulator` server.

## Available MCP Tools

### Device Management
- `list_devices` - List available simulators with state
- `boot_device` - Boot a simulator
- `shutdown_device` - Shut down a simulator

### Visual
- `screenshot` - **Take a screenshot and see the app** (returns image)
- `override_status_bar` - Clean status bar for App Store screenshots
- `clear_status_bar` - Restore real status bar
- `set_appearance` - Toggle dark/light mode
- `set_content_size` - Change Dynamic Type text size

### App Lifecycle
- `install_app` - Install a .app bundle
- `launch_app` - Launch by bundle ID
- `terminate_app` - Kill a running app
- `list_apps` - List installed apps
- `app_info` - Get app details
- `get_app_container` - Get path to app's sandbox

### Interaction
- `tap` - Tap at screen coordinates
- `swipe` - Swipe gesture
- `type_text` - Type text into focused field
- `press_button` - Press home, lock, shake, screenshot
- `set_pasteboard` / `get_pasteboard` - Clipboard sync

### Testing
- `send_push` - Send push notification with custom payload
- `open_url` - Open deep links / universal links
- `set_location` / `clear_location` - Simulate GPS location
- `set_permission` - Grant/revoke permissions without dialogs

### Debug
- `get_logs` - Read console logs, filter by process
- `add_media` - Add photos/videos to library
- `reset_keychain` - Reset keychain
- `erase_device` - Factory reset (destructive)

## Common Workflows

### "Does this look right?"
1. `screenshot` to see current state
2. Analyze the image and describe what you see
3. If issues found, fix code and screenshot again

### "Test the push notification"
1. `send_push` with bundle ID and desired content
2. `screenshot` to verify notification appeared

### "App Store screenshots"
1. `override_status_bar` (9:41, 100% battery, full signal)
2. Navigate to desired screen
3. `screenshot`
4. `clear_status_bar` when done

### "Test deep link"
1. `open_url` with the deep link
2. `screenshot` to verify correct screen loaded

### "Debug this crash"
1. `get_logs` filtered by app process name
2. Analyze crash log
3. Fix code

## Coordinate System
- iPhone coordinates are in points (e.g. iPhone 16 Pro is 393x852)
- (0,0) is top-left
- Common taps: center = (197, 426), back button ≈ (30, 60), tab bar ≈ (x, 820)
