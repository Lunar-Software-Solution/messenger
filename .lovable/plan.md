

## Plan: Multi-Platform Support via Sidebar Selector

### Concept

Add platform entries (WhatsApp, Signal, WeChat, Telegram) to the existing `AppSidebar`. Clicking one loads that platform's dashboard in the main area. The current WhatsApp UI becomes one "instance" of a generic messaging layout.

### Layout

```text
┌─────┬──────────────────────────────────────────┐
│ WA  │  ConnectionBar (platform-aware)          │
│ SIG ├────────┬──────────────────┬───────────────┤
│ WC  │ Convos │  Chat            │  SendPanel    │
│ TG  │        │                  │               │
│─────│        │                  │               │
│ Keys│        │                  │               │
│ Docs│        │                  │               │
└─────┴────────┴──────────────────┴───────────────┘
```

### Changes

#### 1. New type: `MessagingPlatform`

**File**: `src/types/whatsapp.ts` (rename consideration below)

Add a union type:
```ts
export type MessagingPlatform = 'whatsapp' | 'signal' | 'wechat' | 'telegram';
```

#### 2. Update `AppSidebar`

**File**: `src/components/settings/AppSidebar.tsx`

- Add a "Platforms" group above "Settings" with four entries, each with a platform icon (use lucide `MessageSquare` variants or simple SVG/emoji placeholders for now)
- New prop: `activePlatform` + `onSelectPlatform`
- Highlight the active platform entry
- WhatsApp selected by default

#### 3. Update `Index.tsx` — platform state

**File**: `src/pages/Index.tsx`

- Add `activePlatform` state (default: `'whatsapp'`)
- Pass it to `AppSidebar` and `ConnectionBar`
- For now, only WhatsApp has real data hooks. Signal/WeChat/Telegram show a placeholder: "Signal integration coming soon"
- The existing WhatsApp data fetching stays as-is, only rendered when `activePlatform === 'whatsapp'`

#### 4. Update `ConnectionBar`

**File**: `src/components/whatsapp/ConnectionBar.tsx`

- Accept `platform` prop
- Show platform name + icon in the bar (e.g., "WhatsApp — Connected" or "Signal — Not configured")

### What this does NOT do yet

- No new DB tables for Signal/WeChat/Telegram (those come when each integration is built)
- No new edge functions
- No refactoring of component folder names (keep `whatsapp/` for now, refactor later when a second platform gets real data)

### Summary of files

| File | Action |
|------|--------|
| `src/types/whatsapp.ts` | Add `MessagingPlatform` type |
| `src/components/settings/AppSidebar.tsx` | Add platform selector group |
| `src/pages/Index.tsx` | Add `activePlatform` state, conditional rendering |
| `src/components/whatsapp/ConnectionBar.tsx` | Accept and display platform prop |

