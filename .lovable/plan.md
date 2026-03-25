

## Plan: Add Chat View Alongside Existing Log View

Keep the current LogStream exactly as-is. Add a tab toggle at the top of the left panel to switch between "Logs" (current) and "Chat" (new formatted message view).

### New Files

1. **`src/components/whatsapp/ChatView.tsx`** — Chat-style message viewer filtering logs to `source === "baileys:message"`. Renders bubbles aligned left/right based on `from_me`. Includes auto-scroll, date separators, and search.

2. **`src/components/whatsapp/ChatBubble.tsx`** — Message bubble supporting:
   - Text with URL detection, images (thumbnail + lightbox), video (`<video>`), audio (`<audio>`), documents (file card), stickers, location card, vCard contact card
   - Reactions (emoji pills from `metadata.reactions[]`)
   - Quoted/reply messages (preview bar from `metadata.quoted`)
   - Profile picture (avatar from `metadata.profile_pic_url` or initials)
   - Sender name (colored, for group chats)
   - Read receipts (checkmarks from `metadata.ack`: 0-3)
   - Forwarded, starred, deleted, edited indicators
   - Caption below media

3. **`src/components/whatsapp/DateSeparator.tsx`** — "Today", "Yesterday", or formatted date between message groups.

4. **`src/components/whatsapp/MessageLightbox.tsx`** — Full-screen image/video viewer with keyboard dismiss.

### Modified Files

1. **`src/components/whatsapp/LogStream.tsx`** — Add a `Tabs` component at the top with two tabs: "Logs" and "Chat". "Logs" tab renders the existing log list unchanged. "Chat" tab renders `<ChatView>`. Filter bar stays visible in both tabs.

2. **`src/types/whatsapp.ts`** — Add `WhatsAppMessageMeta` interface for typed metadata access (type, body, caption, media_url, from_me, remote_jid, push_name, profile_pic_url, quoted, reactions, ack, is_forwarded, is_starred, is_revoked, is_edited, latitude, longitude, vcard).

3. **`src/pages/Index.tsx`** — Pass `contactsMap` to `LogStream` so Chat view can resolve contact names/pictures.

### Design
- Dark theme: green outgoing bubbles, dark-gray incoming bubbles
- Bubbles left-aligned (incoming) / right-aligned (outgoing)
- Graceful fallback when metadata fields are missing
- No database changes needed

