import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import Database from "better-sqlite3";
import { z } from "zod";
import { execSync } from "child_process";
import path from "path";
import os from "os";

const DB_PATH = path.join(
  os.homedir(),
  "Library/Group Containers/9K33E3U3T4.net.shinyfrog.bear/Application Data/database.sqlite"
);

// Core Foundation epoch offset (2001-01-01 vs 1970-01-01)
const CF_EPOCH_OFFSET = 978307200;

function cfToISO(timestamp) {
  if (!timestamp) return null;
  return new Date((timestamp + CF_EPOCH_OFFSET) * 1000).toISOString();
}

function getDb() {
  return new Database(DB_PATH, { readonly: true });
}

const server = new McpServer({
  name: "bear-notes",
  version: "1.0.0",
});

// Search notes by text query
server.tool(
  "search_notes",
  "Search Bear notes by title or content. Returns matching notes with titles and snippets.",
  {
    query: z.string().describe("Search query to find in note titles or content"),
    limit: z.number().optional().default(20).describe("Max results to return (default 20)"),
  },
  async ({ query, limit }) => {
    const db = getDb();
    try {
      const rows = db
        .prepare(
          `SELECT Z_PK, ZTITLE, SUBSTR(ZTEXT, 1, 300) as snippet,
                  ZMODIFICATIONDATE, ZCREATIONDATE, ZPINNED, ZARCHIVED
           FROM ZSFNOTE
           WHERE ZTRASHED = 0 AND ZPERMANENTLYDELETED = 0
             AND (ZTITLE LIKE ? OR ZTEXT LIKE ?)
           ORDER BY ZMODIFICATIONDATE DESC
           LIMIT ?`
        )
        .all(`%${query}%`, `%${query}%`, limit);

      const results = rows.map((r) => ({
        id: r.Z_PK,
        title: r.ZTITLE,
        snippet: r.snippet,
        modified: cfToISO(r.ZMODIFICATIONDATE),
        created: cfToISO(r.ZCREATIONDATE),
        pinned: !!r.ZPINNED,
        archived: !!r.ZARCHIVED,
      }));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(results, null, 2),
          },
        ],
      };
    } finally {
      db.close();
    }
  }
);

// Get full note content by ID
server.tool(
  "get_note",
  "Get the full content of a Bear note by its ID.",
  {
    id: z.number().describe("Note ID (Z_PK from search results)"),
  },
  async ({ id }) => {
    const db = getDb();
    try {
      const row = db
        .prepare(
          `SELECT n.Z_PK, n.ZTITLE, n.ZTEXT, n.ZMODIFICATIONDATE, n.ZCREATIONDATE,
                  n.ZPINNED, n.ZARCHIVED, n.ZENCRYPTED, n.ZLOCKED,
                  GROUP_CONCAT(t.ZTITLE, ', ') as tags
           FROM ZSFNOTE n
           LEFT JOIN Z_5TAGS zt ON zt.Z_5NOTES = n.Z_PK
           LEFT JOIN ZSFNOTETAG t ON t.Z_PK = zt.Z_13TAGS
           WHERE n.Z_PK = ?
           GROUP BY n.Z_PK`
        )
        .get(id);

      if (!row) {
        return {
          content: [{ type: "text", text: `Note with ID ${id} not found.` }],
          isError: true,
        };
      }

      if (row.ZENCRYPTED) {
        return {
          content: [
            { type: "text", text: `Note "${row.ZTITLE}" is encrypted. Cannot read content.` },
          ],
        };
      }

      const note = {
        id: row.Z_PK,
        title: row.ZTITLE,
        content: row.ZTEXT,
        tags: row.tags || "",
        modified: cfToISO(row.ZMODIFICATIONDATE),
        created: cfToISO(row.ZCREATIONDATE),
        pinned: !!row.ZPINNED,
        archived: !!row.ZARCHIVED,
      };

      return {
        content: [{ type: "text", text: JSON.stringify(note, null, 2) }],
      };
    } finally {
      db.close();
    }
  }
);

// List recent notes
server.tool(
  "list_recent_notes",
  "List recently modified Bear notes.",
  {
    limit: z.number().optional().default(20).describe("Max results (default 20)"),
    include_archived: z.boolean().optional().default(false).describe("Include archived notes"),
  },
  async ({ limit, include_archived }) => {
    const db = getDb();
    try {
      const archiveClause = include_archived ? "" : "AND ZARCHIVED = 0";
      const rows = db
        .prepare(
          `SELECT Z_PK, ZTITLE, ZMODIFICATIONDATE, ZCREATIONDATE, ZPINNED, ZARCHIVED
           FROM ZSFNOTE
           WHERE ZTRASHED = 0 AND ZPERMANENTLYDELETED = 0 ${archiveClause}
           ORDER BY ZMODIFICATIONDATE DESC
           LIMIT ?`
        )
        .all(limit);

      const results = rows.map((r) => ({
        id: r.Z_PK,
        title: r.ZTITLE,
        modified: cfToISO(r.ZMODIFICATIONDATE),
        created: cfToISO(r.ZCREATIONDATE),
        pinned: !!r.ZPINNED,
        archived: !!r.ZARCHIVED,
      }));

      return {
        content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
      };
    } finally {
      db.close();
    }
  }
);

// List all tags
server.tool(
  "list_tags",
  "List all tags used in Bear notes with note counts.",
  {},
  async () => {
    const db = getDb();
    try {
      const rows = db
        .prepare(
          `SELECT t.ZTITLE as tag, COUNT(zt.Z_5NOTES) as note_count
           FROM ZSFNOTETAG t
           LEFT JOIN Z_5TAGS zt ON zt.Z_13TAGS = t.Z_PK
           LEFT JOIN ZSFNOTE n ON n.Z_PK = zt.Z_5NOTES AND n.ZTRASHED = 0 AND n.ZPERMANENTLYDELETED = 0
           GROUP BY t.Z_PK
           HAVING note_count > 0
           ORDER BY note_count DESC`
        )
        .all();

      return {
        content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
      };
    } finally {
      db.close();
    }
  }
);

// Get notes by tag
server.tool(
  "get_notes_by_tag",
  "Get all Bear notes with a specific tag.",
  {
    tag: z.string().describe("Tag name to filter by (without #)"),
    limit: z.number().optional().default(50).describe("Max results (default 50)"),
  },
  async ({ tag, limit }) => {
    const db = getDb();
    try {
      const rows = db
        .prepare(
          `SELECT n.Z_PK, n.ZTITLE, n.ZMODIFICATIONDATE, n.ZCREATIONDATE, n.ZPINNED
           FROM ZSFNOTE n
           JOIN Z_5TAGS zt ON zt.Z_5NOTES = n.Z_PK
           JOIN ZSFNOTETAG t ON t.Z_PK = zt.Z_13TAGS
           WHERE t.ZTITLE = ? AND n.ZTRASHED = 0 AND n.ZPERMANENTLYDELETED = 0
           ORDER BY n.ZMODIFICATIONDATE DESC
           LIMIT ?`
        )
        .all(tag, limit);

      const results = rows.map((r) => ({
        id: r.Z_PK,
        title: r.ZTITLE,
        modified: cfToISO(r.ZMODIFICATIONDATE),
        created: cfToISO(r.ZCREATIONDATE),
        pinned: !!r.ZPINNED,
      }));

      return {
        content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
      };
    } finally {
      db.close();
    }
  }
);

// Create a new note via x-callback-url
server.tool(
  "create_note",
  "Create a new note in Bear. Opens Bear app to create the note.",
  {
    title: z.string().describe("Note title"),
    body: z.string().optional().describe("Note body text (markdown supported)"),
    tags: z.string().optional().describe("Comma-separated tags to add"),
  },
  async ({ title, body, tags }) => {
    const params = new URLSearchParams();
    params.set("title", title);
    if (body) params.set("text", body);
    if (tags) params.set("tags", tags);
    params.set("show_window", "no");

    const url = `bear://x-callback-url/create?${params.toString()}`;
    try {
      execSync(`open "${url}"`);
      return {
        content: [{ type: "text", text: `Note "${title}" created in Bear.` }],
      };
    } catch (e) {
      return {
        content: [{ type: "text", text: `Failed to create note: ${e.message}` }],
        isError: true,
      };
    }
  }
);

// Add text to an existing note
server.tool(
  "add_to_note",
  "Append or prepend text to an existing Bear note.",
  {
    id: z.number().describe("Note ID to add text to"),
    text: z.string().describe("Text to add to the note"),
    mode: z.enum(["append", "prepend"]).optional().default("append").describe("Where to add text"),
  },
  async ({ id, text, mode }) => {
    const db = getDb();
    try {
      const row = db
        .prepare("SELECT ZUNIQUEIDENTIFIER, ZTITLE FROM ZSFNOTE WHERE Z_PK = ?")
        .get(id);
      if (!row) {
        return {
          content: [{ type: "text", text: `Note with ID ${id} not found.` }],
          isError: true,
        };
      }

      const params = new URLSearchParams();
      params.set("id", row.ZUNIQUEIDENTIFIER);
      params.set("text", text);
      params.set("mode", mode);
      params.set("show_window", "no");

      const url = `bear://x-callback-url/add-text?${params.toString()}`;
      execSync(`open "${url}"`);

      return {
        content: [
          {
            type: "text",
            text: `Text ${mode}ed to note "${row.ZTITLE}".`,
          },
        ],
      };
    } finally {
      db.close();
    }
  }
);

// Open a note in Bear
server.tool(
  "open_note",
  "Open a specific note in the Bear app.",
  {
    id: z.number().describe("Note ID to open"),
  },
  async ({ id }) => {
    const db = getDb();
    try {
      const row = db
        .prepare("SELECT ZUNIQUEIDENTIFIER, ZTITLE FROM ZSFNOTE WHERE Z_PK = ?")
        .get(id);
      if (!row) {
        return {
          content: [{ type: "text", text: `Note with ID ${id} not found.` }],
          isError: true,
        };
      }

      const url = `bear://x-callback-url/open-note?id=${row.ZUNIQUEIDENTIFIER}`;
      execSync(`open "${url}"`);

      return {
        content: [{ type: "text", text: `Opened note "${row.ZTITLE}" in Bear.` }],
      };
    } finally {
      db.close();
    }
  }
);

// Start the server
const transport = new StdioServerTransport();
await server.connect(transport);
