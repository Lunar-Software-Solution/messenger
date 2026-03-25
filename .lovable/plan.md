

## Rename WhatsApp Tables to Platform-Neutral Names + Add `platform` Column

### Overview
Rename the 4 existing tables to generic names and add a `platform` text column to logs, outbox, and contacts so all messengers share one set of tables. The session table keeps its single-row design but becomes platform-aware.

### 1. Database Migration

```sql
-- Rename tables
ALTER TABLE public.whatsapp_logs RENAME TO message_logs;
ALTER TABLE public.whatsapp_outbox RENAME TO message_outbox;
ALTER TABLE public.whatsapp_contacts RENAME TO message_contacts;
ALTER TABLE public.whatsapp_session RENAME TO message_session;

-- Add platform column with default 'whatsapp' (backfills existing rows)
ALTER TABLE public.message_logs ADD COLUMN platform text NOT NULL DEFAULT 'whatsapp';
ALTER TABLE public.message_outbox ADD COLUMN platform text NOT NULL DEFAULT 'whatsapp';
ALTER TABLE public.message_contacts ADD COLUMN platform text NOT NULL DEFAULT 'whatsapp';

-- Update message_session to support multiple platforms
-- Change from single-row (id=1) to one row per platform
ALTER TABLE public.message_session DROP CONSTRAINT whatsapp_session_pkey;
ALTER TABLE public.message_session ADD COLUMN platform text NOT NULL DEFAULT 'whatsapp';
ALTER TABLE public.message_session ADD PRIMARY KEY (id);
-- (Existing row gets platform='whatsapp' via default)

-- Update Realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE whatsapp_session, whatsapp_logs, whatsapp_outbox;
ALTER PUBLICATION supabase_realtime ADD TABLE message_session, message_logs, message_outbox;

-- RLS policies will auto-rename with the tables, no action needed
```

### 2. Files to Update (7 files)

**`supabase/functions/api-proxy/index.ts`**
- Replace all table name references: `whatsapp_logs` → `message_logs`, etc.
- Update `ALLOWED_TABLES` and `PLATFORM_TABLES` to use new names
- Contact extraction side-effect: write to `message_contacts`, include `platform` field derived from the log's `source` prefix

**`src/pages/Index.tsx`**
- Replace all `.from("whatsapp_*")` calls with `.from("message_*")`
- Replace Realtime channel table references
- Filter queries by `platform` when `activePlatform` is set (e.g., `.eq("platform", activePlatform)`)

**`src/components/whatsapp/SendPanel.tsx`**
- Replace `whatsapp_contacts` → `message_contacts` and `whatsapp_outbox` → `message_outbox`
- Include `platform` field when inserting into outbox

**`supabase/functions/mcp-server/index.ts`**
- Replace all 4 table name references with new names
- Add platform filtering where appropriate

**`src/lib/api-spec.ts`**
- Update all path keys: `/whatsapp_logs` → `/message_logs`, etc.
- Update descriptions to reflect new table names

**`src/lib/api-docs-markdown.ts`**
- Update curl example URLs to use new table names

**`src/types/whatsapp.ts`**
- No structural changes needed (types still describe the same shape), but optionally rename file to `messaging.ts` for consistency

### 3. What stays the same
- All TypeScript interfaces (WhatsAppLog, WhatsAppOutbox, etc.) keep working — the column shapes are unchanged
- RLS policies auto-rename with the tables
- Storage bucket `whatsapp-media` stays as-is (can rename separately later)
- The `source` field in logs continues to identify the bridge origin (e.g., `baileys:message`, `signal:message`)

### Technical Notes
- `ALTER TABLE ... RENAME TO` preserves all indexes, constraints, RLS policies, and Realtime subscriptions
- The `platform` column defaults to `'whatsapp'` so all existing data is automatically backfilled
- External API consumers will need to update their endpoint URLs from `/whatsapp_logs` to `/message_logs` — this is a breaking change to document

