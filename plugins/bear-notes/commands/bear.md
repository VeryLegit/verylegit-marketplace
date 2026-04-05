---
description: "Search, read, or create Bear notes. Usage: /bear search <query>, /bear recent, /bear tags, /bear create <title>"
argument-hint: "<search|recent|tags|create|read> [args]"
allowed-tools: [Bash, Read, Write]
---

# Bear Notes

The user invoked: `/bear $ARGUMENTS`

You have access to Bear notes via MCP tools (bear-notes server). Use the appropriate MCP tool based on the subcommand:

## Subcommands

### `/bear search <query>`
Use the `search_notes` MCP tool to search Bear notes by title or content. Display results as a clean table with ID, title, and modified date.

### `/bear recent [count]`
Use the `list_recent_notes` MCP tool. Default to 10 notes. Display as a table.

### `/bear tags`
Use the `list_tags` MCP tool. Display tags sorted by note count.

### `/bear read <id>`
Use the `get_note` MCP tool to read the full content of a note by its ID.

### `/bear create <title>`
Use the `create_note` MCP tool. If only a title is given, ask the user what content to include. If context from the conversation makes the content obvious, include it automatically.

### `/bear add <id> <text>`
Use the `add_to_note` MCP tool to append text to an existing note.

### `/bear open <id>`
Use the `open_note` MCP tool to open a note in the Bear app.

## No arguments
If `$ARGUMENTS` is empty, show a brief help message listing available subcommands.

## Display Guidelines
- Use markdown tables for lists
- Show note IDs so users can reference them in follow-up commands
- Truncate long content to first 200 chars in list views
- For full note reads, display the complete content in a code block or markdown
