

# Add MCP Server Section to API Docs UI Panel

## What
The API Docs dialog (`ApiDocsPanel.tsx`) currently only shows the REST API endpoints. The MCP Server documentation exists only in the downloadable `.md` file. We need to add a visual MCP Server section inside the dialog so users can see it without downloading.

## Changes

### `src/components/settings/ApiDocsPanel.tsx`
Add an "MCP Server" section below the existing Auth info and above the endpoints list. It will include:

1. **Section header** — "MCP Server (Model Context Protocol)" with a brief description
2. **Endpoint** — displayed in a code block, derived from `apiSpec.servers[0].url` replacing `/api-proxy` with `/mcp-server`
3. **Authentication** — shows `Authorization: Bearer mi_your_api_key_here`
4. **Transport** — "Streamable HTTP"
5. **Available Tools table** — 6 tools with descriptions, rendered as a simple grid/list
6. **Connection configs** — Collapsible sections for Claude Desktop, Cursor, and MCP Inspector, each showing the JSON config in a `<pre>` code block (same content as the markdown generator)

All content will use the same styling patterns already in the panel (text-xs, bg-secondary code blocks, Collapsible components, Badge elements). The MCP section will be wrapped in a bordered card to visually separate it from the REST endpoints below.

No new files needed — just expanding the existing `ApiDocsPanel.tsx`.

