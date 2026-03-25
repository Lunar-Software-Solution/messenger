

## Plan: Add Conversation List to Chat View

Currently all messages from all contacts are mixed together in one stream. The fix is to add a **conversation list sidebar** on the left of the chat area, like WhatsApp's main screen — you pick a conversation, then only that conversation's messages show.

### Layout Change

The current 65% chat area splits into a conversation list (30%) + active chat (70%):

```text
┌──────────────────────────────────────────────────┐
│  Connection Bar               [Messages] [Logs]  │
├────────┬─────────────────────┬───────────────────┤
│ Convos │  Chat (filtered)    │  SendPanel        │
│        │                     │                   │
│ Alice  │  Alice: Hey!        │                   │
│ Group1 │  You: Hi there      │                   │
│ Bob    │  Alice: [image]     │                   │
│        │                     │                   │
└────────┴─────────────────────┴───────────────────┘
```

### New File

1. **`src/components/whatsapp/ConversationList.tsx`** — Left sidebar listing unique conversations derived from message logs:
   - Groups messages by `remote_jid`
   - Shows avatar, contact name (from contacts map or push_name), last message preview, timestamp, and unread-style count
   - Sorted by most recent message
   - Clicking selects the conversation; active conversation is highlighted
   - An "All" option at top to show all messages (current behavior)

### Modified Files

1. **`src/components/whatsapp/ChatView.tsx`** — Add `selectedJid` state. Render `ConversationList` on the left and filter messages to the selected JID. Pass contacts map to both components.

2. **`src/pages/Index.tsx`** — Give the chat panel more width (bump from 65% to 70%) since the conversation list needs space inside it.

### Key Details
- Conversations extracted from messages via `useMemo` — no new DB queries needed
- Group chats (`@g.us`) show group name if available, individual chats show contact name
- "All Messages" option preserves the current mixed view as a fallback
- Selected conversation pre-fills the `to_jid` in SendPanel (optional enhancement)

