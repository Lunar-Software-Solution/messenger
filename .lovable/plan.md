

## Plan: Add `profile_pic_url` to contacts and auto-populate from log ingestion

### Problem
The `whatsapp_contacts` table has no `profile_pic_url` column, and log metadata `profile_pic_url` is never extracted to populate contacts. Avatars can't render.

### Changes

#### 1. Database migration — add `profile_pic_url` column
Add a nullable `text` column `profile_pic_url` to `whatsapp_contacts`.

```sql
ALTER TABLE public.whatsapp_contacts
  ADD COLUMN IF NOT EXISTS profile_pic_url text;
```

#### 2. Update edge function `api-proxy/index.ts`
After the API key validation and before forwarding to PostgREST, add a **side-effect hook** for `POST /whatsapp_logs`:

- Parse the request body (clone it since we still need to forward it)
- For each log entry where `source === "baileys:message"` and `metadata.remote_jid` exists:
  - If `metadata.profile_pic_url` is present, upsert into `whatsapp_contacts` setting the `profile_pic_url` (and `notify`/`name` from `push_name` if available)
- This runs fire-and-forget alongside the normal PostgREST forward

This means the Baileys worker only needs to include `profile_pic_url` in the log metadata — the proxy handles persisting it to contacts automatically.

#### 3. Update API spec (`src/lib/api-spec.ts`)
- Add `profile_pic_url` to the `ContactUpsert` schema
- Document `profile_pic_url` in the `LogEntry` metadata description

#### 4. Update TypeScript types
- Add `profile_pic_url?: string` to `WhatsAppContact` in `src/types/whatsapp.ts`
- Note: `src/integrations/supabase/types.ts` will auto-update after migration

#### 5. Update frontend components to use the new field
- `ConversationList.tsx`: Read `contact.profile_pic_url` as avatar source (in addition to existing `meta.profile_pic_url` from logs)
- `ChatBubble.tsx`: Same — prefer contact-level avatar when log-level is missing

### Files affected

| File | Change |
|------|--------|
| Migration SQL | Add `profile_pic_url` column |
| `supabase/functions/api-proxy/index.ts` | Add contact upsert side-effect on log insert |
| `src/lib/api-spec.ts` | Add `profile_pic_url` to ContactUpsert schema |
| `src/types/whatsapp.ts` | Add `profile_pic_url` to `WhatsAppContact` |
| `src/components/whatsapp/ConversationList.tsx` | Use `contact.profile_pic_url` for avatar |
| `src/components/whatsapp/ChatBubble.tsx` | Use contact avatar as fallback |

