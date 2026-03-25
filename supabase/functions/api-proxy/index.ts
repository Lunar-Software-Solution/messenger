import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "x-api-key, content-type, prefer",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
};

// Tables shared across all platforms
const SHARED_TABLES = ["whatsapp_contacts"];

// Platform-specific tables (keyed by platform prefix)
const PLATFORM_TABLES: Record<string, string[]> = {
  whatsapp: ["whatsapp_logs", "whatsapp_outbox", "whatsapp_session", "whatsapp_contacts"],
  signal: ["whatsapp_logs", "whatsapp_outbox", "whatsapp_contacts"],
  telegram: ["whatsapp_logs", "whatsapp_outbox", "whatsapp_contacts"],
  wechat: ["whatsapp_logs", "whatsapp_outbox", "whatsapp_contacts"],
};

// All allowed tables (union)
const ALLOWED_TABLES = [
  "whatsapp_logs",
  "whatsapp_outbox",
  "whatsapp_session",
  "whatsapp_contacts",
];

// Message sources that trigger contact extraction, keyed by platform
const MESSAGE_SOURCES: Record<string, string> = {
  whatsapp: "baileys:message",
  signal: "signal:message",
  telegram: "telegram:message",
  wechat: "wechat:message",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Server configuration error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Extract and validate X-API-Key
  const apiKey = req.headers.get("X-API-Key") || req.headers.get("x-api-key");
  if (!apiKey || !apiKey.startsWith("mi_")) {
    return new Response(JSON.stringify({ error: "Missing or invalid X-API-Key header" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Hash the provided key and look it up
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(apiKey));
  const keyHash = Array.from(new Uint8Array(hashBuffer), (b) => b.toString(16).padStart(2, "0")).join("");

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: keyRow, error: keyError } = await adminClient
    .from("api_keys")
    .select("id, user_id, revoked_at")
    .eq("key_hash", keyHash)
    .maybeSingle();

  if (keyError || !keyRow) {
    return new Response(JSON.stringify({ error: "Invalid API key" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (keyRow.revoked_at) {
    return new Response(JSON.stringify({ error: "API key has been revoked" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Update last_used_at (fire and forget)
  adminClient
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", keyRow.id)
    .then();

  // Parse the request path — the URL path after /api-proxy/ is the table + query
  const url = new URL(req.url);
  const pathParts = url.pathname.split("/api-proxy/");
  const tablePath = pathParts.length > 1 ? pathParts[1] : "";
  const tableName = tablePath.split("?")[0].split("/")[0];

  if (!tableName || !ALLOWED_TABLES.includes(tableName)) {
    return new Response(JSON.stringify({ error: `Invalid endpoint. Allowed: ${ALLOWED_TABLES.join(", ")}` }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Read body once, clone for side-effects
  const body = ["GET", "HEAD"].includes(req.method) ? undefined : await req.text();

  // Side-effect: extract contacts from log inserts for any platform (fire and forget)
  if (req.method === "POST" && tableName === "whatsapp_logs" && body) {
    try {
      const parsed = JSON.parse(body);
      const entries = Array.isArray(parsed) ? parsed : [parsed];
      const contactUpserts = new Map<string, Record<string, string>>();

      // Collect all valid message sources
      const validSources = new Set(Object.values(MESSAGE_SOURCES));

      for (const entry of entries) {
        if (!validSources.has(entry.source) || !entry.metadata?.remote_jid) continue;
        const m = entry.metadata;
        const jid: string = m.remote_jid;
        const existing = contactUpserts.get(jid) || { id: jid };

        if (m.profile_pic_url) existing.profile_pic_url = m.profile_pic_url;
        if (m.push_name) existing.notify = m.push_name;

        // Store group subject as contact name for group JIDs
        if (jid.endsWith("@g.us") && m.group_subject) {
          existing.name = m.group_subject;
        }

        contactUpserts.set(jid, existing);
      }

      if (contactUpserts.size > 0) {
        adminClient
          .from("whatsapp_contacts")
          .upsert(Array.from(contactUpserts.values()), { onConflict: "id", ignoreDuplicates: false })
          .then();
      }
    } catch {
      // Don't block the main request if parsing fails
    }
  }

  // Forward to PostgREST
  const postgrestUrl = `${supabaseUrl}/rest/v1/${tableName}${url.search}`;

  const forwardHeaders: Record<string, string> = {
    "apikey": serviceRoleKey,
    "Authorization": `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
  };

  const prefer = req.headers.get("Prefer");
  if (prefer) {
    forwardHeaders["Prefer"] = prefer;
  }

  const pgResponse = await fetch(postgrestUrl, {
    method: req.method,
    headers: forwardHeaders,
    body,
  });

  const responseBody = await pgResponse.text();

  return new Response(responseBody, {
    status: pgResponse.status,
    headers: {
      ...corsHeaders,
      "Content-Type": pgResponse.headers.get("Content-Type") || "application/json",
    },
  });
});
