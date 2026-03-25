

# Add API Key Authentication to MCP Server

## Overview
Add the same API key authentication used by `api-proxy` to the MCP server, validating `Authorization: Bearer <api_key>` headers against the `api_keys` table. Update the docs to reflect the auth requirement.

## Changes

### 1. `supabase/functions/mcp-server/index.ts`
- Add an auth middleware in the Hono app that runs before the MCP handler
- Extract the `Authorization: Bearer <key>` header
- SHA-256 hash the key and look it up in `api_keys` table (same logic as `api-proxy`)
- Check the key starts with `mi_`, is not revoked
- Update `last_used_at` (fire-and-forget)
- Return 401 JSON response if auth fails
- Pass through to MCP transport if valid

### 2. `src/lib/api-docs-markdown.ts`
- Add an **Authentication** subsection under MCP Server explaining that requests require a valid API key via `Authorization: Bearer <your-api-key>`
- Update the Claude Desktop config example to use `mcp-remote` with the `--header "Authorization: Bearer ${API_KEY}"` pattern (matching what the user shared earlier)
- Update the Cursor/other clients example to include the auth header
- Update the MCP Inspector example to mention passing the auth header

### 3. Deploy
- Deploy the updated `mcp-server` edge function

## Technical Detail

The auth check reuses the exact same pattern from `api-proxy`: hash with SHA-256, query `api_keys` table by `key_hash`, reject if missing or revoked. The only difference is the header format — `Authorization: Bearer <key>` instead of `X-API-Key: <key>` — to match standard MCP client conventions.

