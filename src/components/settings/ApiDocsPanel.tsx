import React, { useState } from "react";
import { apiSpec } from "@/lib/api-spec";
import { generateMarkdown } from "@/lib/api-docs-markdown";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Download, ChevronRight } from "lucide-react";

interface ApiDocsPanelProps {
  open: boolean;
  onClose: () => void;
}

const methodColors: Record<string, string> = {
  post: "bg-green-600",
  patch: "bg-yellow-600",
  put: "bg-blue-600",
  get: "bg-blue-500",
  delete: "bg-red-600",
};

const mcpUrl = apiSpec.servers[0].url.replace("/api-proxy", "/mcp-server");

const mcpTools = [
  { name: "query_logs", desc: "Search/filter message logs by source, level, date range, contact" },
  { name: "query_contacts", desc: "List or search contacts across all platforms" },
  { name: "query_outbox", desc: "Check outbound message delivery status" },
  { name: "send_message", desc: "Queue an outbound message for delivery" },
  { name: "get_session", desc: "Check the current connection session status" },
  { name: "get_conversation", desc: "Get full chat history with a specific contact" },
];

const claudeConfig = {
  mcpServers: {
    "messages-ingester": {
      command: "npx",
      args: ["-y", "mcp-remote@latest", mcpUrl, "--header", "Authorization: Bearer ${MCP_API_KEY}"],
      env: { MCP_API_KEY: "mi_your_api_key_here" },
    },
  },
};

const cursorConfig = {
  "messages-ingester": {
    command: "npx",
    args: ["-y", "mcp-remote@latest", mcpUrl, "--header", "Authorization: Bearer ${MCP_API_KEY}"],
    env: { MCP_API_KEY: "mi_your_api_key_here" },
  },
};

export function ApiDocsPanel({ open, onClose }: ApiDocsPanelProps) {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  const togglePath = (key: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(apiSpec, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "messages-ingester-api.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadMd = () => {
    const md = generateMarkdown();
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "messages-ingester-api.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>API Documentation</DialogTitle>
          <DialogDescription>
            {apiSpec.info.description}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 mb-2">
          <Button variant="outline" size="sm" onClick={downloadJson}>
            <Download className="h-3.5 w-3.5 mr-1" />
            OpenAPI .json
          </Button>
          <Button variant="outline" size="sm" onClick={downloadMd}>
            <Download className="h-3.5 w-3.5 mr-1" />
            Docs .md
          </Button>
        </div>

        <div className="text-xs text-muted-foreground mb-2">
          <strong>Base URL:</strong>{" "}
          <code className="bg-secondary px-1 rounded">{apiSpec.servers[0].url}</code>
        </div>

        <div className="text-xs text-muted-foreground mb-3">
          <strong>Auth:</strong> <code className="bg-secondary px-1 rounded">X-API-Key: mi_your_key</code>
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-2 pr-2">

            {/* MCP Server Section */}
            <div className="border border-border rounded-lg p-3 mb-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">MCP Server (Model Context Protocol)</h3>
              <p className="text-xs text-muted-foreground">
                An MCP server is available for AI agents and tools to query logs, contacts, and send messages programmatically.
              </p>

              <div className="text-xs text-muted-foreground">
                <strong>Endpoint:</strong>{" "}
                <code className="bg-secondary px-1 rounded">{mcpUrl}</code>
              </div>

              <div className="text-xs text-muted-foreground">
                <strong>Auth:</strong>{" "}
                <code className="bg-secondary px-1 rounded">Authorization: Bearer mi_your_api_key_here</code>
              </div>

              <div className="text-xs text-muted-foreground">
                <strong>Transport:</strong> Streamable HTTP
              </div>

              <div>
                <p className="text-xs font-semibold text-foreground mb-1">Available Tools</p>
                <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                  {mcpTools.map((t) => (
                    <React.Fragment key={t.name}>
                      <code className="text-foreground font-mono">{t.name}</code>
                      <span className="text-muted-foreground">{t.desc}</span>
                    </React.Fragment>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-semibold text-foreground mb-1">Connection Configs</p>

                <Collapsible open={expandedPaths.has("mcp-claude")} onOpenChange={() => togglePath("mcp-claude")}>
                  <CollapsibleTrigger className="w-full flex items-center gap-2 p-2 rounded-md bg-secondary hover:bg-accent transition-colors cursor-pointer text-xs">
                    <ChevronRight className={`h-3.5 w-3.5 transition-transform ${expandedPaths.has("mcp-claude") ? "rotate-90" : ""}`} />
                    Claude Desktop
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <pre className="bg-secondary p-2 rounded overflow-x-auto text-[11px] font-mono text-foreground mt-1">
                      {JSON.stringify(claudeConfig, null, 2)}
                    </pre>
                  </CollapsibleContent>
                </Collapsible>

                <Collapsible open={expandedPaths.has("mcp-cursor")} onOpenChange={() => togglePath("mcp-cursor")}>
                  <CollapsibleTrigger className="w-full flex items-center gap-2 p-2 rounded-md bg-secondary hover:bg-accent transition-colors cursor-pointer text-xs">
                    <ChevronRight className={`h-3.5 w-3.5 transition-transform ${expandedPaths.has("mcp-cursor") ? "rotate-90" : ""}`} />
                    Cursor / Other MCP Clients
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <pre className="bg-secondary p-2 rounded overflow-x-auto text-[11px] font-mono text-foreground mt-1">
                      {JSON.stringify(cursorConfig, null, 2)}
                    </pre>
                  </CollapsibleContent>
                </Collapsible>

                <Collapsible open={expandedPaths.has("mcp-inspector")} onOpenChange={() => togglePath("mcp-inspector")}>
                  <CollapsibleTrigger className="w-full flex items-center gap-2 p-2 rounded-md bg-secondary hover:bg-accent transition-colors cursor-pointer text-xs">
                    <ChevronRight className={`h-3.5 w-3.5 transition-transform ${expandedPaths.has("mcp-inspector") ? "rotate-90" : ""}`} />
                    MCP Inspector
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="bg-secondary p-2 rounded text-[11px] font-mono text-foreground mt-1 space-y-1">
                      <p className="text-muted-foreground font-sans">Run the inspector, select <strong>Streamable HTTP</strong>, enter the URL, and add the auth header:</p>
                      <pre className="overflow-x-auto">npx @modelcontextprotocol/inspector</pre>
                      <pre className="overflow-x-auto">Authorization: Bearer mi_your_api_key_here</pre>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </div>

            {/* REST Endpoints */}
            {Object.entries(apiSpec.paths).map(([path, methods]) =>
              Object.entries(methods as Record<string, any>).map(([method, op]) => {
                const key = `${method}-${path}`;
                const isOpen = expandedPaths.has(key);
                return (
                  <Collapsible key={key} open={isOpen} onOpenChange={() => togglePath(key)}>
                    <CollapsibleTrigger className="w-full flex items-center gap-2 p-2 rounded-md bg-secondary hover:bg-accent transition-colors cursor-pointer">
                      <ChevronRight className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                      <Badge className={`${methodColors[method] || "bg-muted"} text-[10px] px-1.5 uppercase font-mono`}>
                        {method}
                      </Badge>
                      <code className="text-xs font-mono text-foreground">{path}</code>
                      <span className="text-xs text-muted-foreground ml-auto">{op.summary}</span>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="ml-6 mt-1 p-3 rounded-md bg-background border border-border space-y-3 text-xs">
                        <p className="text-muted-foreground">{op.description}</p>

                        {op.requestBody && (
                          <div>
                            <p className="font-semibold text-foreground mb-1">Request Body</p>
                            <pre className="bg-secondary p-2 rounded overflow-x-auto text-[11px] font-mono text-foreground">
                              {JSON.stringify(
                                op.requestBody.content["application/json"]?.schema || {},
                                null,
                                2
                              )}
                            </pre>
                          </div>
                        )}

                        <div>
                          <p className="font-semibold text-foreground mb-1">Responses</p>
                          {Object.entries(op.responses as Record<string, any>).map(([code, resp]) => (
                            <div key={code} className="flex gap-2 items-center">
                              <Badge variant="outline" className="text-[10px] font-mono">{code}</Badge>
                              <span className="text-muted-foreground">{resp.description}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
