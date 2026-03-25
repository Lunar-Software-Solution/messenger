import { apiSpec } from "./api-spec";

export function generateMarkdown(): string {
  const spec = apiSpec;
  const lines: string[] = [];

  lines.push(`# ${spec.info.title}`);
  lines.push(`\n**Version:** ${spec.info.version}\n`);
  lines.push(spec.info.description);
  lines.push("");

  // Server
  lines.push("## Base URL\n");
  for (const s of spec.servers) {
    lines.push(`- \`${s.url}\` — ${s.description}`);
  }
  lines.push("");

  // Auth
  lines.push("## Authentication\n");
  lines.push("All requests require a single `X-API-Key` header with a valid API key generated from the Messages Ingester dashboard. **No other credentials are needed.**\n");
  lines.push("```");
  lines.push("X-API-Key: mi_your_api_key_here");
  lines.push("```\n");

  // Platform sources
  lines.push("## Supported Platforms\n");
  lines.push("All platforms share the same endpoints. Use the `source` field in log entries to identify the originating platform:\n");
  lines.push("| Platform | Message Source | Connection Source |");
  lines.push("|----------|---------------|-------------------|");
  lines.push("| WhatsApp | `baileys:message` | `baileys:connection` |");
  lines.push("| Signal | `signal:message` | `signal:connection` |");
  lines.push("| Telegram | `telegram:message` | `telegram:connection` |");
  lines.push("| WeChat | `wechat:message` | `wechat:connection` |");
  lines.push("");
  lines.push("When a log entry with a message source is inserted, the proxy **automatically extracts** contact information (`remote_jid`, `push_name`, `profile_pic_url`) from the metadata and upserts it into the contacts table.\n");

  // MCP Server
  lines.push("## MCP Server (Model Context Protocol)\n");
  lines.push("An MCP server is available for AI agents and tools to query logs, contacts, and send messages programmatically using the [Model Context Protocol](https://modelcontextprotocol.io).\n");
  lines.push("### Endpoint\n");
  lines.push("```");
  lines.push(`${spec.servers[0].url.replace('/api-proxy', '/mcp-server')}`);
  lines.push("```\n");
  lines.push("### Authentication\n");
  lines.push("The MCP server requires a valid API key passed via the `Authorization: Bearer` header. Use the same API keys generated from the dashboard.\n");
  lines.push("```");
  lines.push("Authorization: Bearer mi_your_api_key_here");
  lines.push("```\n");
  lines.push("### Transport\n");
  lines.push("The server uses the **Streamable HTTP** transport. Connect using any MCP-compatible client.\n");
  lines.push("### Available Tools\n");
  lines.push("| Tool | Description |");
  lines.push("|------|-------------|");
  lines.push("| `query_logs` | Search/filter message logs by source, level, date range, contact |");
  lines.push("| `query_contacts` | List or search contacts across all platforms |");
  lines.push("| `query_outbox` | Check outbound message delivery status |");
  lines.push("| `send_message` | Queue an outbound message for delivery |");
  lines.push("| `get_session` | Check the current connection session status |");
  lines.push("| `get_conversation` | Get full chat history with a specific contact |");
  lines.push("");
  const mcpUrl = spec.servers[0].url.replace('/api-proxy', '/mcp-server');
  lines.push("### Connecting with Claude Desktop\n");
  lines.push("Add this to your `claude_desktop_config.json`:\n");
  lines.push("```json");
  lines.push(JSON.stringify({
    mcpServers: {
      "messages-ingester": {
        command: "npx",
        args: [
          "-y", "mcp-remote@latest",
          mcpUrl,
          "--header",
          "Authorization: Bearer ${MCP_API_KEY}"
        ],
        env: {
          MCP_API_KEY: "mi_your_api_key_here"
        }
      }
    }
  }, null, 2));
  lines.push("```\n");
  lines.push("### Connecting with Cursor / other MCP clients\n");
  lines.push("Use `mcp-remote` to bridge stdio-based clients to the Streamable HTTP transport:\n");
  lines.push("```json");
  lines.push(JSON.stringify({
    "messages-ingester": {
      command: "npx",
      args: [
        "-y", "mcp-remote@latest",
        mcpUrl,
        "--header",
        "Authorization: Bearer ${MCP_API_KEY}"
      ],
      env: {
        MCP_API_KEY: "mi_your_api_key_here"
      }
    }
  }, null, 2));
  lines.push("```\n");
  lines.push("For clients that support Streamable HTTP natively, use the URL and add the `Authorization` header directly.\n");
  lines.push("### Example: Using via MCP Inspector\n");
  lines.push("```bash");
  lines.push("npx @modelcontextprotocol/inspector");
  lines.push("```\n");
  lines.push("Enter the MCP server URL, select **Streamable HTTP** as the transport, and add the header `Authorization: Bearer mi_your_api_key_here`.\n");

  // Media Upload
  lines.push("## Media Upload\n");
  lines.push("Upload media files (images, videos, audio, documents) to get a public URL for use in log metadata.\n");
  lines.push("### Endpoint\n");
  lines.push("```");
  lines.push(`POST ${spec.servers[1].url}`);
  lines.push("```\n");
  lines.push("**Auth:** Same `X-API-Key` header as the REST API.\n");
  lines.push("**Max size:** 20MB\n");
  lines.push("**Supports:**");
  lines.push("- `multipart/form-data` with a `file` field");
  lines.push("- Raw binary body with MIME type as `Content-Type`\n");
  lines.push("**Response:**");
  lines.push("```json");
  lines.push(JSON.stringify({ media_url: "https://...public-url...", storage_path: "inbox/images/1234-abcd.jpg", mime_type: "image/jpeg", size: 102400 }, null, 2));
  lines.push("```\n");
  lines.push("### Example: Upload an image\n");
  lines.push("```bash");
  lines.push(`curl -X POST "${spec.servers[1].url}" \\`);
  lines.push(`  -H "X-API-Key: mi_your_api_key_here" \\`);
  lines.push(`  -H "Content-Type: image/jpeg" \\`);
  lines.push(`  --data-binary @photo.jpg`);
  lines.push("```\n");
  lines.push("### Example: Upload via form data\n");
  lines.push("```bash");
  lines.push(`curl -X POST "${spec.servers[1].url}" \\`);
  lines.push(`  -H "X-API-Key: mi_your_api_key_here" \\`);
  lines.push(`  -F "file=@photo.jpg"`);
  lines.push("```\n");

  // Quick examples per platform
  lines.push("## Quick Examples\n");

  lines.push("### WhatsApp (Baileys)\n");
  lines.push("```bash");
  lines.push(`curl -X POST "${spec.servers[0].url}/message_logs" \\`);
  lines.push(`  -H "X-API-Key: mi_your_api_key_here" \\`);
  lines.push(`  -H "Content-Type: application/json" \\`);
  lines.push(`  -d '{"level":"info","message":"New message","source":"baileys:message","metadata":{"remote_jid":"5511999999999@s.whatsapp.net","push_name":"Alice","body":"Hello!"}}'`);
  lines.push("```\n");

  lines.push("### Signal\n");
  lines.push("```bash");
  lines.push(`curl -X POST "${spec.servers[0].url}/message_logs" \\`);
  lines.push(`  -H "X-API-Key: mi_your_api_key_here" \\`);
  lines.push(`  -H "Content-Type: application/json" \\`);
  lines.push(`  -d '{"level":"info","message":"New message","source":"signal:message","metadata":{"remote_jid":"+15551234567","push_name":"Bob","body":"Hey there!"}}'`);
  lines.push("```\n");

  lines.push("### Telegram\n");
  lines.push("```bash");
  lines.push(`curl -X POST "${spec.servers[0].url}/message_logs" \\`);
  lines.push(`  -H "X-API-Key: mi_your_api_key_here" \\`);
  lines.push(`  -H "Content-Type: application/json" \\`);
  lines.push(`  -d '{"level":"info","message":"New message","source":"telegram:message","metadata":{"remote_jid":"123456789","push_name":"Charlie","body":"Привет!"}}'`);
  lines.push("```\n");

  lines.push("### WeChat\n");
  lines.push("```bash");
  lines.push(`curl -X POST "${spec.servers[0].url}/message_logs" \\`);
  lines.push(`  -H "X-API-Key: mi_your_api_key_here" \\`);
  lines.push(`  -H "Content-Type: application/json" \\`);
  lines.push(`  -d '{"level":"info","message":"New message","source":"wechat:message","metadata":{"remote_jid":"oXYZ123abc","push_name":"David","body":"你好!"}}'`);
  lines.push("```\n");

  // Endpoints
  lines.push("## Endpoints\n");
  for (const [path, methods] of Object.entries(spec.paths)) {
    for (const [method, op] of Object.entries(methods as Record<string, any>)) {
      lines.push(`### ${method.toUpperCase()} \`${path}\`\n`);
      lines.push(`**${op.summary}**\n`);
      lines.push(op.description);
      lines.push("");

      if (op.parameters) {
        lines.push("**Parameters:**\n");
        for (const p of op.parameters) {
          lines.push(`- \`${p.name}\` (${p.in}): ${p.description}`);
        }
        lines.push("");
      }

      if (op.requestBody) {
        const schema = op.requestBody.content["application/json"]?.schema;
        if (schema) {
          lines.push("**Request Body:** `application/json`\n");
          lines.push("```json");
          lines.push(JSON.stringify(resolveSchema(schema), null, 2));
          lines.push("```\n");
        }
      }

      lines.push("**Responses:**\n");
      for (const [code, resp] of Object.entries(op.responses as Record<string, any>)) {
        lines.push(`- \`${code}\`: ${resp.description}`);
      }
      lines.push("");
      lines.push("---\n");
    }
  }

  // Schemas
  lines.push("## Schemas\n");
  for (const [name, schema] of Object.entries(spec.components.schemas)) {
    lines.push(`### ${name}\n`);
    lines.push("```json");
    lines.push(JSON.stringify(schema, null, 2));
    lines.push("```\n");
  }

  return lines.join("\n");
}

function resolveSchema(schema: any): any {
  if (schema.$ref) {
    const name = schema.$ref.split("/").pop();
    return { $ref: `#/components/schemas/${name}` };
  }
  if (schema.oneOf) {
    return { oneOf: schema.oneOf.map(resolveSchema) };
  }
  return schema;
}
