export const apiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Messages Ingester API",
    version: "1.0.0",
    description:
      "API for ingesting WhatsApp logs, queuing outbound messages, and updating session status. Authenticate all requests with an API key in the `X-API-Key` header.",
  },
  servers: [
    {
      url: "https://zqyzwgkzgxwfywizwnkw.supabase.co/rest/v1",
      description: "Supabase REST (PostgREST)",
    },
  ],
  security: [{ ApiKeyAuth: [] }],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: "apiKey",
        in: "header",
        name: "X-API-Key",
        description: "API key generated from the Messages Ingester dashboard.",
      },
    },
    schemas: {
      LogEntry: {
        type: "object",
        required: ["message"],
        properties: {
          level: { type: "string", enum: ["debug", "info", "warn", "error", "fatal"], default: "info" },
          message: { type: "string" },
          source: { type: "string", default: "" },
          metadata: { type: "object", nullable: true },
        },
      },
      OutboxMessage: {
        type: "object",
        required: ["to_jid"],
        properties: {
          to_jid: { type: "string", description: "Recipient JID, e.g. 5511999999999@s.whatsapp.net" },
          content: { type: "string", nullable: true },
          media_url: { type: "string", nullable: true, description: "Storage path in whatsapp-media bucket" },
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
    "/whatsapp_session?id=eq.1": {
      patch: {
        summary: "Update session status",
        description: "Update the WhatsApp session row (id=1) with new status or QR data.",
        operationId: "updateSession",
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
  },
};
