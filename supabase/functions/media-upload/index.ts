import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "x-api-key, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BUCKET = "whatsapp-media";
const MAX_SIZE = 20 * 1024 * 1024; // 20 MB

const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/3gpp": "3gp",
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // ── Auth: same X-API-Key flow as api-proxy ──
  const apiKey = req.headers.get("X-API-Key") || req.headers.get("x-api-key");
  if (!apiKey || !apiKey.startsWith("mi_")) {
    return new Response(JSON.stringify({ error: "Missing or invalid X-API-Key header" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

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
  adminClient.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", keyRow.id).then();

  // ── Parse upload ──
  const contentType = req.headers.get("content-type") || "";

  let fileBytes: Uint8Array;
  let mimeType: string;
  let originalName: string | null = null;

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return new Response(JSON.stringify({ error: "No 'file' field in form data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    fileBytes = new Uint8Array(await file.arrayBuffer());
    mimeType = file.type || "application/octet-stream";
    originalName = file.name || null;
  } else {
    // Raw binary body — Content-Type IS the mime type
    fileBytes = new Uint8Array(await req.arrayBuffer());
    mimeType = contentType.split(";")[0].trim() || "application/octet-stream";
  }

  if (fileBytes.length === 0) {
    return new Response(JSON.stringify({ error: "Empty file" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (fileBytes.length > MAX_SIZE) {
    return new Response(JSON.stringify({ error: `File too large. Max ${MAX_SIZE / 1024 / 1024}MB` }), {
      status: 413,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── Determine path ──
  const ext = MIME_EXTENSIONS[mimeType] || originalName?.split(".").pop() || "bin";
  const category = mimeType.startsWith("image/") ? "images"
    : mimeType.startsWith("video/") ? "videos"
    : mimeType.startsWith("audio/") ? "audio"
    : "documents";

  const timestamp = Date.now();
  const randomId = crypto.randomUUID().slice(0, 8);
  const storagePath = `inbox/${category}/${timestamp}-${randomId}.${ext}`;

  // ── Upload to storage ──
  const { error: uploadError } = await adminClient.storage
    .from(BUCKET)
    .upload(storagePath, fileBytes, {
      contentType: mimeType,
      upsert: false,
    });

  if (uploadError) {
    return new Response(JSON.stringify({ error: "Upload failed", details: uploadError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── Build public URL ──
  const { data: urlData } = adminClient.storage.from(BUCKET).getPublicUrl(storagePath);

  return new Response(
    JSON.stringify({
      media_url: urlData.publicUrl,
      storage_path: storagePath,
      mime_type: mimeType,
      size: fileBytes.length,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});
