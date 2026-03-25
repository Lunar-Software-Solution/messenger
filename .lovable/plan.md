

## Plan: Fix API Spec — 4 Issues

All changes are in **`src/lib/api-spec.ts`** only. No database or migration changes needed — this is purely documentation.

### 1. Add `trace` to the level enum
Add `"trace"` to the `LogEntry.level` enum array (before `"debug"`).

### 2. Add `whatsapp_contacts` endpoint
Add a new `ContactUpsert` schema and a `POST /whatsapp_contacts` path for upserting contacts (id, name, notify, verified_name). This documents the endpoint the external ingester uses to sync contacts into Supabase, which the frontend autocomplete queries.

### 3. Fix session path
Change the path key from `"/whatsapp_session?id=eq.1"` to `"/whatsapp_session"`. Add a `parameters` array with `id=eq.1` as a required query parameter, which is the proper OpenAPI way to express PostgREST filtering.

### 4. Clarify `media_url` semantics
Update the `OutboxMessage.media_url` description to clarify:
- For **outbound** messages (inserted by the dashboard): this is a **Supabase Storage path** (e.g. `outbox/1234_photo.jpg`) within the `whatsapp-media` bucket.
- For **inbound** messages (logged in `whatsapp_logs.metadata.media_url`): this is typically a **full public URL** to the downloaded media.

Add a note in the `LogEntry.metadata` description as well to clarify that `media_url` in log metadata is a public URL.

### Files Changed
- `src/lib/api-spec.ts` — all 4 fixes above

