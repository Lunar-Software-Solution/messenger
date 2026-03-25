import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "x-api-key, content-type, prefer",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
};

const ALLOWED_TABLES = [
  "whatsapp_logs",
  "whatsapp_outbox",
  "whatsapp_session",
  "whatsapp_contacts",
];

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
  // Path format: /api-proxy/whatsapp_logs or /api-proxy/whatsapp_session?id=eq.1
  const pathParts = url.pathname.split("/api-proxy/");
  const tablePath = pathParts.length > 1 ? pathParts[1] : "";
  const tableName = tablePath.split("?")[0].split("/")[0];

  if (!tableName || !ALLOWED_TABLES.includes(tableName)) {
    return new Response(JSON.stringify({ error: `Invalid endpoint. Allowed: ${ALLOWED_TABLES.join(", ")}` }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Forward to PostgREST
  const postgrestUrl = `${supabaseUrl}/rest/v1/${tableName}${url.search}`;
  const body = ["GET", "HEAD"].includes(req.method) ? undefined : await req.text();

  const forwardHeaders: Record<string, string> = {
    "apikey": serviceRoleKey,
    "Authorization": `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
  };

  // Forward Prefer header if present (for upserts, return=representation, etc.)
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
