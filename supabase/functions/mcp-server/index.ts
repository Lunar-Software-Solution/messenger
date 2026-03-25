import { Hono } from "https://deno.land/x/hono@v4.3.11/mod.ts";
import { McpServer, StreamableHttpTransport } from "npm:mcp-lite@^0.10.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, serviceRoleKey);

const app = new Hono();

const mcpServer = new McpServer({
  name: "messages-ingester",
  version: "1.0.0",
});

// ── Tool: query_logs ──────────────────────────────────────────────────
mcpServer.tool({
  name: "query_logs",
  description:
    "Query message logs from all platforms (WhatsApp, Signal, Telegram, WeChat). Supports filtering by source, level, date range, and free-text search. Returns newest first.",
  inputSchema: {
    type: "object",
    properties: {
      source: {
        type: "string",
        description:
          "Filter by source field, e.g. 'baileys:message', 'signal:message', 'telegram:message', 'wechat:message', 'baileys:connection'.",
      },
      level: {
        type: "string",
        enum: ["trace", "debug", "info", "warn", "error", "fatal"],
        description: "Filter by log level.",
      },
      search: {
        type: "string",
        description: "Free-text search in the message field (case-insensitive ilike).",
      },
      remote_jid: {
        type: "string",
        description: "Filter by metadata->remote_jid to find logs for a specific contact/chat.",
      },
      since: {
        type: "string",
        description: "ISO 8601 timestamp. Only return logs created after this time.",
      },
      until: {
        type: "string",
        description: "ISO 8601 timestamp. Only return logs created before this time.",
      },
      limit: {
        type: "number",
        description: "Max rows to return (default 50, max 500).",
      },
      offset: {
        type: "number",
        description: "Number of rows to skip for pagination.",
      },
    },
  },
  handler: async (params: Record<string, unknown>) => {
    let query = supabase
      .from("whatsapp_logs")
      .select("*")
      .order("created_at", { ascending: false });

    if (params.source) query = query.eq("source", params.source as string);
    if (params.level) query = query.eq("level", params.level as string);
    if (params.search) query = query.ilike("message", `%${params.search}%`);
    if (params.remote_jid)
      query = query.eq("metadata->>remote_jid", params.remote_jid as string);
    if (params.since) query = query.gte("created_at", params.since as string);
    if (params.until) query = query.lte("created_at", params.until as string);

    const limit = Math.min(Math.max((params.limit as number) || 50, 1), 500);
    const offset = (params.offset as number) || 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  },
});

// ── Tool: query_contacts ──────────────────────────────────────────────
mcpServer.tool({
  name: "query_contacts",
  description:
    "List or search contacts across all messaging platforms. Contacts are auto-populated from ingested message logs.",
  inputSchema: {
    type: "object",
    properties: {
      search: {
        type: "string",
        description: "Search by name, notify (display name), or contact ID.",
      },
      id: {
        type: "string",
        description: "Get a specific contact by exact ID (JID, phone, chat_id, openid).",
      },
      limit: { type: "number", description: "Max rows (default 50, max 500)." },
      offset: { type: "number", description: "Pagination offset." },
    },
  },
  handler: async (params: Record<string, unknown>) => {
    let query = supabase
      .from("whatsapp_contacts")
      .select("*")
      .order("updated_at", { ascending: false });

    if (params.id) {
      query = query.eq("id", params.id as string);
    } else if (params.search) {
      const s = params.search as string;
      query = query.or(`id.ilike.%${s}%,name.ilike.%${s}%,notify.ilike.%${s}%`);
    }

    const limit = Math.min(Math.max((params.limit as number) || 50, 1), 500);
    const offset = (params.offset as number) || 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
});

// ── Tool: query_outbox ────────────────────────────────────────────────
mcpServer.tool({
  name: "query_outbox",
  description:
    "Query outbound messages from the outbox. Filter by status (pending/sent/failed) or recipient.",
  inputSchema: {
    type: "object",
    properties: {
      status: {
        type: "string",
        enum: ["pending", "sent", "failed"],
        description: "Filter by delivery status.",
      },
      to_jid: {
        type: "string",
        description: "Filter by recipient identifier.",
      },
      limit: { type: "number", description: "Max rows (default 50, max 500)." },
      offset: { type: "number", description: "Pagination offset." },
    },
  },
  handler: async (params: Record<string, unknown>) => {
    let query = supabase
      .from("whatsapp_outbox")
      .select("*")
      .order("created_at", { ascending: false });

    if (params.status) query = query.eq("status", params.status as string);
    if (params.to_jid) query = query.eq("to_jid", params.to_jid as string);

    const limit = Math.min(Math.max((params.limit as number) || 50, 1), 500);
    const offset = (params.offset as number) || 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
});

// ── Tool: send_message ────────────────────────────────────────────────
mcpServer.tool({
  name: "send_message",
  description:
    "Queue an outbound message for sending. Insert into the outbox with status 'pending'. The bridge/connector picks it up and delivers it.",
  inputSchema: {
    type: "object",
    properties: {
      to_jid: {
        type: "string",
        description:
          "Recipient ID. Format varies by platform: WhatsApp JID, Signal phone, Telegram chat_id, WeChat openid.",
      },
      content: { type: "string", description: "Text message content." },
      media_url: {
        type: "string",
        description:
          "Optional Supabase Storage path in whatsapp-media bucket (e.g. 'outbox/photo.jpg').",
      },
      media_type: {
        type: "string",
        enum: ["image", "video", "audio", "document"],
        description: "Type of media attachment.",
      },
    },
    required: ["to_jid"],
  },
  handler: async (params: Record<string, unknown>) => {
    const row: Record<string, unknown> = {
      to_jid: params.to_jid,
      content: params.content || null,
      media_url: params.media_url || null,
      media_type: params.media_type || null,
    };

    const { data, error } = await supabase
      .from("whatsapp_outbox")
      .insert(row)
      .select()
      .single();

    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    return {
      content: [{ type: "text", text: `Message queued:\n${JSON.stringify(data, null, 2)}` }],
    };
  },
});

// ── Tool: get_session ─────────────────────────────────────────────────
mcpServer.tool({
  name: "get_session",
  description:
    "Get the current connection session status (connected/disconnected/qr_pending). Primarily used for WhatsApp but available for all platforms.",
  inputSchema: {
    type: "object",
    properties: {},
  },
  handler: async () => {
    const { data, error } = await supabase
      .from("whatsapp_session")
      .select("*")
      .eq("id", 1)
      .single();

    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
});

// ── Tool: get_conversation ────────────────────────────────────────────
mcpServer.tool({
  name: "get_conversation",
  description:
    "Get the full conversation history with a specific contact. Returns messages in chronological order with contact info.",
  inputSchema: {
    type: "object",
    properties: {
      remote_jid: {
        type: "string",
        description: "The contact/chat ID to retrieve conversation for.",
      },
      limit: { type: "number", description: "Max messages (default 100, max 500)." },
      since: { type: "string", description: "ISO 8601 timestamp. Only messages after this time." },
    },
    required: ["remote_jid"],
  },
  handler: async (params: Record<string, unknown>) => {
    // Get contact info
    const { data: contact } = await supabase
      .from("whatsapp_contacts")
      .select("*")
      .eq("id", params.remote_jid as string)
      .maybeSingle();

    // Get messages
    let query = supabase
      .from("whatsapp_logs")
      .select("*")
      .eq("metadata->>remote_jid", params.remote_jid as string)
      .order("created_at", { ascending: true });

    if (params.since) query = query.gte("created_at", params.since as string);

    const limit = Math.min(Math.max((params.limit as number) || 100, 1), 500);
    query = query.limit(limit);

    const { data: messages, error } = await query;
    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };

    const result = { contact: contact || null, messages };
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },
});

const transport = new StreamableHttpTransport();

app.all("/*", async (c) => {
  return await transport.handleRequest(c.req.raw, mcpServer);
});

Deno.serve(app.fetch);
