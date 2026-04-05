---
name: bear-notes
description: Use when the user references their notes, asks about something they've written down, wants to save conversation output to notes, or mentions Bear. Auto-triggers on "my notes", "Bear notes", "save this to a note", "check my notes", "what did I write about".
---

# Bear Notes Integration

You have access to the user's Bear notes via MCP tools from the `bear-notes` server. These tools let you search, read, create, and modify notes in Bear.

## Available MCP Tools

- `search_notes` - Search by title or content
- `get_note` - Read full note content by ID
- `list_recent_notes` - List recently modified notes
- `list_tags` - List all tags with note counts
- `get_notes_by_tag` - Get notes filtered by tag
- `create_note` - Create a new note in Bear
- `add_to_note` - Append or prepend text to existing note
- `open_note` - Open a note in the Bear app

## When to Use

- User asks "what did I write about X?" -> `search_notes`
- User says "save this to Bear" or "make a note of this" -> `create_note`
- User references their notes or past writing -> `search_notes` then `get_note`
- User asks to organize or tag notes -> `get_notes_by_tag`, `list_tags`
- User wants to add to existing notes -> `search_notes` to find, then `add_to_note`

## Guidelines

- Always search before creating to avoid duplicates
- When creating notes from conversation context, format cleanly with markdown
- Include relevant tags when creating notes
- Encrypted notes cannot be read — inform the user if encountered
- Note IDs are numeric (Z_PK from the database)
