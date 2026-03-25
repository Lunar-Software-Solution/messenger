

## Plan: Collapsible Settings Sidebar with API Key Management & API Documentation

### Overview
Add a collapsible left sidebar to the dashboard with a "Settings" section. The first setting is an **API Key Manager** that lets users generate/revoke API keys for the ingestion function. The sidebar also includes an **API Documentation** viewer with OpenAPI spec display, plus downloadable `.json` and `.md` exports.

### Architecture

```text
┌─────────────────────────────────────────────────┐
│ ConnectionBar (top)                             │
├──────┬──────────────────────────────────────────┤
│ Side │  Main content (log stream + send panel)  │
│ bar  │                                          │
│      │  65%          │  35%                     │
│ ≡    │  LogStream    │  SendPanel               │
│ API  │               │                          │
│ Keys │               │                          │
│ Docs │               │                          │
└──────┴──────────────────────────────────────────┘
```

### Database Changes (1 migration)

1. **`api_keys` table** — stores generated API keys per user:
   - `id uuid PK default gen_random_uuid()`
   - `user_id uuid references auth.users(id) on delete cascade`
   - `key_hash text not null` (SHA-256 hash of the key)
   - `key_prefix text not null` (first 8 chars for display, e.g. `mi_abc123...`)
   - `label text` (user-given name)
   - `created_at timestamptz default now()`
   - `last_used_at timestamptz`
   - `revoked_at timestamptz`
   - RLS: authenticated users can only see/manage their own keys
2. **Edge function `generate-api-key`** — generates a cryptographically secure key, stores the hash, returns the raw key once.

### New Files

1. **`src/components/settings/AppSidebar.tsx`** — Collapsible sidebar using shadcn `Sidebar` with `collapsible="icon"`. Menu items: "API Keys", "API Docs".
2. **`src/components/settings/ApiKeysPanel.tsx`** — Slide-out or inline panel:
   - "Generate New Key" button with optional label input
   - Calls edge function, displays the raw key once with copy button + warning
   - List of existing keys showing prefix, label, created date, last used
   - Revoke button per key
3. **`src/components/settings/ApiDocsPanel.tsx`** — Displays the OpenAPI documentation:
   - Rendered spec viewer (collapsible endpoint sections)
   - Download buttons for `.json` and `.md` formats
4. **`src/lib/api-spec.ts`** — The OpenAPI 3.0 spec object defining the ingestion API (endpoints for `whatsapp_logs` insert, `whatsapp_outbox` insert, `whatsapp_session` update, etc.) with auth via API key header.
5. **`src/lib/api-docs-markdown.ts`** — Function to convert the OpenAPI spec to Markdown format.
6. **`supabase/functions/generate-api-key/index.ts`** — Edge function that generates a secure API key, hashes it, stores in `api_keys`, returns the raw key.
7. **Migration file** — Creates `api_keys` table with RLS policies.

### Modified Files

1. **`src/App.tsx`** — Wrap the Index route content with `SidebarProvider`. Add routes/state for settings panels.
2. **`src/pages/Index.tsx`** — Wrap layout with sidebar. Add `AppSidebar` to the left, main content shifts right. Add state for which settings panel is open (API Keys or API Docs) shown as a dialog/sheet.

### API Documentation Content

The OpenAPI spec will document the ingestion endpoints:
- `POST /ingest/logs` — Insert log entries
- `POST /ingest/outbox` — Queue outbound messages  
- `PUT /ingest/session` — Update session status
- Authentication: `X-API-Key` header

Downloads generate files client-side:
- `.json` — `JSON.stringify` of the OpenAPI spec object
- `.md` — Markdown rendering with endpoint details, request/response examples

### Key Details
- API keys use `crypto.randomUUID()` + `crypto.getRandomValues()` for generation in the edge function
- Raw key shown only once after generation; only the hash is stored
- Key prefix (`mi_` + first 8 chars) displayed in the list for identification
- Sidebar uses shadcn's `Sidebar` component with `collapsible="icon"` so it collapses to icons on toggle
- Settings panels open as dialogs/sheets over the main content to avoid disrupting the two-column layout

