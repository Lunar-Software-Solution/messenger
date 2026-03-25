export const apiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Messages Ingester API",
    version: "1.0.0",
    description:
      "API for ingesting WhatsApp logs, queuing outbound messages, and updating session status. Authenticate all requests with your API key in the `X-API-Key` header. No other credentials are needed.",
  },
  servers: [
    {
      url: "https://zqyzwgkzgxwfywizwnkw.supabase.co/functions/v1/api-proxy",
      description: "Messages Ingester API Proxy",
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
          source: { type: "string", default: "" },
          metadata: { type: "object", nullable: true, description: "Arbitrary JSON metadata. For message logs (source=baileys:message), may include `media_url` (a full public URL to the downloaded media file), `media_type`, `from_me`, `push_name`, `remote_jid`, etc." },
        },
      },
      OutboxMessage: {
        type: "object",
        required: ["to_jid"],
        properties: {
          to_jid: { type: "string", description: "Recipient JID, e.g. 5511999999999@s.whatsapp.net" },
          content: { type: "string", nullable: true },
          media_url: { type: "string", nullable: true, description: "Supabase Storage path within the `whatsapp-media` bucket (e.g. `outbox/1234_photo.jpg`). The ingester should download from the public URL derived from this path. Not a full URL — use `{SUPABASE_URL}/storage/v1/object/public/whatsapp-media/{media_url}` to resolve." },
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
          id: { type: "string", description: "WhatsApp JID (primary key), e.g. 5511999999999@s.whatsapp.net" },
          name: { type: "string", nullable: true, description: "Contact's address-book name" },
          notify: { type: "string", nullable: true, description: "Push/notify name set by the contact" },
          verified_name: { type: "string", nullable: true, description: "Business verified name, if any" },
        },
      },
    },
  },
  paths: {
    "/whatsapp_logs": {
      post: {
        summary: "Insert log entries",
        description: "Append one or more log entries to the WhatsApp logs table.",
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
        description: "Insert one or more messages into the outbox for sending.",
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
        description: "Update the WhatsApp session row with new status or QR data. Use the `id` query parameter to target a specific row (PostgREST filtering).",
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
        description: "Insert or update one or more WhatsApp contacts. Use the `Prefer: resolution=merge-duplicates` header for upsert behaviour. The `id` (JID) is the primary key.",
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
  },
};
