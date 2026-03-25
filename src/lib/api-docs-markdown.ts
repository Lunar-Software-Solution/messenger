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
  lines.push("All requests require an `X-API-Key` header with a valid API key generated from the Messages Ingester dashboard.\n");
  lines.push("```");
  lines.push("X-API-Key: mi_your_api_key_here");
  lines.push("```\n");

  // Endpoints
  lines.push("## Endpoints\n");
  for (const [path, methods] of Object.entries(spec.paths)) {
    for (const [method, op] of Object.entries(methods as Record<string, any>)) {
      lines.push(`### ${method.toUpperCase()} \`${path}\`\n`);
      lines.push(`**${op.summary}**\n`);
      lines.push(op.description);
      lines.push("");

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
