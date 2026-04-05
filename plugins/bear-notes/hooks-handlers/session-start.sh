#!/usr/bin/env bash

PLUGIN_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MCP_DIR="$PLUGIN_ROOT/mcp"

# Check if Bear database exists
BEAR_DB="$HOME/Library/Group Containers/9K33E3U3T4.net.shinyfrog.bear/Application Data/database.sqlite"

if [ ! -f "$BEAR_DB" ]; then
  cat << 'EOF'
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "Bear notes MCP: Bear app not found on this machine. Install Bear from the App Store to use this plugin."
  }
}
EOF
  exit 0
fi

# Install dependencies if needed
if [ ! -d "$MCP_DIR/node_modules" ]; then
  cd "$MCP_DIR" && npm install --silent 2>/dev/null
fi

# Count active notes for context
NOTE_COUNT=$(sqlite3 "$BEAR_DB" "SELECT COUNT(*) FROM ZSFNOTE WHERE ZTRASHED = 0 AND ZPERMANENTLYDELETED = 0;" 2>/dev/null || echo "unknown")

cat << EOF
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "Bear notes MCP server available. ${NOTE_COUNT} active notes accessible. Use /bear command or bear-notes MCP tools to search, read, create, and manage notes."
  }
}
EOF
