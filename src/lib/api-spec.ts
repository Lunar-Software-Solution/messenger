export const apiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Messages Ingester API",
    version: "1.1.0",
    description:
      "Unified API for ingesting messages from WhatsApp, Signal, Telegram, and WeChat. Authenticate all requests with your API key in the `X-API-Key` header. All platforms share the same endpoints — use the `source` field in log entries to identify the originating platform.",
  },
  servers: [
    {
      url: "https://zqyzwgkzgxwfywizwnkw.supabase.co/functions/v1/api-proxy",
      description: "Messages Ingester API Proxy",
    },
    {
      url: "https://zqyzwgkzgxwfywizwnkw.supabase.co/functions/v1/media-upload",
      description: "Media Upload Endpoint",
    },
  ],
  security: [{ ApiKeyAuth: [] }],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: "apiKey",
        in: "header",
        name: "X-API-Key",
        description: "API key generated from the Messages Ingester dashboard. This is the only credential needed.",
      },
    },
    schemas: {
      LogEntry: {
        type: "object",
        required: ["message"],
        properties: {
          level: { type: "string", enum: ["trace", "debug", "info", "warn", "error", "fatal"], default: "info" },
          message: { type: "string" },
          source: {
            type: "string",
            default: "",
            description: "Identifies the platform and event type. Use platform-specific prefixes for message logs so the system can auto-extract contacts.",
            enum: [
              "baileys:message",
              "signal:message",
              "telegram:message",
              "wechat:message",
              "baileys:connection",
              "signal:connection",
              "telegram:connection",
              "wechat:connection",
            ],
          },
          metadata: {
            type: "object",
            nullable: true,
            description:
              "Arbitrary JSON metadata. For message logs, include: `remote_jid` (contact/group ID), `push_name`, `profile_pic_url`, `media_url`, `media_type`, `from_me`, `type` (text/image/video/audio/document/sticker/location/contact). Contact data is auto-extracted from message logs.",
          },
        },
      },
      OutboxMessage: {
        type: "object",
        required: ["to_jid"],
        properties: {
          to_jid: {
            type: "string",
            description: "Recipient identifier. Format varies by platform — e.g. `5511999999999@s.whatsapp.net` (WhatsApp), `+15551234567` (Signal), `123456789` (Telegram chat_id), `oXYZ...` (WeChat openid).",
          },
          content: { type: "string", nullable: true },
          media_url: {
            type: "string",
            nullable: true,
            description: "Supabase Storage path within the `whatsapp-media` bucket (e.g. `outbox/1234_photo.jpg`). Resolve via `{SUPABASE_URL}/storage/v1/object/public/whatsapp-media/{media_url}`.",
          },
          media_type: { type: "string", enum: ["image", "video", "audio", "document"], nullable: true },
        },
      },
      SessionUpdate: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["disconnected", "qr_pending", "connected"] },
          qr_data: { type: "string", nullable: true },
        },
      },
      ContactUpsert: {
        type: "object",
        required: ["id"],
        properties: {
          id: {
            type: "string",
            description: "Contact identifier (primary key). Platform-specific — e.g. JID for WhatsApp, phone number for Signal, chat_id for Telegram, openid for WeChat.",
          },
          name: { type: "string", nullable: true, description: "Contact's address-book name" },
          notify: { type: "string", nullable: true, description: "Push/notify/display name set by the contact" },
          verified_name: { type: "string", nullable: true, description: "Business verified name, if any" },
          profile_pic_url: { type: "string", nullable: true, description: "URL to the contact's profile picture" },
        },
      },
      MediaUploadResponse: {
        type: "object",
        properties: {
          media_url: { type: "string", description: "Public URL of the uploaded file" },
          storage_path: { type: "string", description: "Path within the whatsapp-media bucket" },
          mime_type: { type: "string", description: "Detected MIME type" },
          size: { type: "number", description: "File size in bytes" },
        },
      },
    },
  },
  paths: {
    "/whatsapp_logs": {
      post: {
        summary: "Insert log entries",
        description:
          "Append one or more log entries. Used by all platforms — set `source` to identify the platform (e.g. `baileys:message`, `signal:message`, `telegram:message`, `wechat:message`). When `source` is a message source, the proxy auto-extracts contact info from `metadata.remote_jid`, `metadata.push_name`, and `metadata.profile_pic_url`.",
        operationId: "insertLogs",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                oneOf: [
                  { $ref: "#/components/schemas/LogEntry" },
                  { type: "array", items: { $ref: "#/components/schemas/LogEntry" } },
                ],
              },
            },
          },
        },
        responses: {
          "201": { description: "Created" },
          "401": { description: "Unauthorized — invalid or missing API key" },
        },
      },
    },
    "/whatsapp_outbox": {
      post: {
        summary: "Queue outbound messages",
        description: "Insert one or more messages into the outbox for sending. Works for all platforms — the `to_jid` format identifies the target platform.",
        operationId: "insertOutbox",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                oneOf: [
                  { $ref: "#/components/schemas/OutboxMessage" },
                  { type: "array", items: { $ref: "#/components/schemas/OutboxMessage" } },
                ],
              },
            },
          },
        },
        responses: {
          "201": { description: "Created" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/whatsapp_session": {
      patch: {
        summary: "Update session status",
        description: "Update the session row with new status or QR data. Currently used by WhatsApp (Baileys). Other platforms may use this for connection state tracking.",
        operationId: "updateSession",
        parameters: [
          {
            name: "id",
            in: "query",
            required: true,
            description: "PostgREST filter, e.g. `eq.1` to target the single session row.",
            schema: { type: "string", example: "eq.1" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SessionUpdate" },
            },
          },
        },
        responses: {
          "204": { description: "Updated" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/whatsapp_contacts": {
      post: {
        summary: "Upsert contacts",
        description:
          "Insert or update contacts from any platform. Use the `Prefer: resolution=merge-duplicates` header for upsert behaviour. The `id` is the primary key — use platform-appropriate identifiers. Contacts are also auto-populated from message log metadata.",
        operationId: "upsertContacts",
        parameters: [
          {
            name: "Prefer",
            in: "header",
            description: "Set to `resolution=merge-duplicates` for upsert.",
            schema: { type: "string", example: "resolution=merge-duplicates" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                oneOf: [
                  { $ref: "#/components/schemas/ContactUpsert" },
                  { type: "array", items: { $ref: "#/components/schemas/ContactUpsert" } },
                ],
              },
            },
          },
        },
        responses: {
          "201": { description: "Created / Updated" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/media-upload": {
      post: {
        summary: "Upload media file",
        description:
          "Upload an image, video, audio, or document to Supabase Storage. Returns a public URL to include as `media_url` in log metadata. Supports multipart/form-data (field name `file`) or raw binary body with the MIME type as Content-Type. Max size: 20MB.",
        operationId: "uploadMedia",
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  file: { type: "string", format: "binary", description: "The media file to upload" },
                },
              },
            },
            "*/*": {
              schema: {
                type: "string",
                format: "binary",
                description: "Raw binary file. Set Content-Type to the file's MIME type (e.g. image/jpeg, video/mp4).",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Upload successful",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/MediaUploadResponse" },
              },
            },
          },
          "401": { description: "Unauthorized — invalid or missing API key" },
          "413": { description: "File too large (max 20MB)" },
        },
      },
    },
  },
};
