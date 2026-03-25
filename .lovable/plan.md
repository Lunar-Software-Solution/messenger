

## Aggregate Reactions onto Original Messages

### Changes

**`src/components/whatsapp/ChatView.tsx`**
- In the `messages` memo (or a new memo), separate reaction-type logs from regular messages:
  - Build a `reactionsByJid` map: `Map<string, WhatsAppReaction[]>` keyed by `remote_jid`, collecting `{ emoji, push_name }` from logs where `meta.type === "reaction"`
  - Filter reaction logs OUT of the rendered message list
- Pass `aggregatedReactions={reactionsByJid.get(meta.remote_jid) || []}` to each `ChatBubble`

**`src/components/whatsapp/ChatBubble.tsx`**
- Add `aggregatedReactions?: WhatsAppReaction[]` to `ChatBubbleProps`
- In `renderReactions()`, merge `meta.reactions`, the new `aggregatedReactions` prop, and the existing fallback text into one combined list before grouping by emoji

Two files changed total. No new files.

