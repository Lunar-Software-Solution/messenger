import { useState, useRef, useEffect, useMemo } from "react";
import { WhatsAppLog } from "@/types/whatsapp";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ArrowDownLeft, ArrowUpRight, FileAudio, FileVideo, FileText, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface LogStreamProps {
  logs: WhatsAppLog[];
}

const levelColors: Record<string, string> = {
  debug: "bg-zinc-500",
  info: "bg-blue-400",
  warn: "bg-yellow-400 text-black",
  error: "bg-red-400",
  fatal: "bg-red-600 font-bold",
};

const LogStream = ({ logs }: LogStreamProps) => {
  const [levelFilter, setLevelFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("");
  const [messagesOnly, setMessagesOnly] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (levelFilter !== "all" && l.level !== levelFilter) return false;
      if (sourceFilter && !l.source?.toLowerCase().includes(sourceFilter.toLowerCase())) return false;
      if (messagesOnly && l.source !== "baileys:message") return false;
      return true;
    });
  }, [logs, levelFilter, sourceFilter, messagesOnly]);

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [filtered.length, autoScroll]);

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  const isMessageRow = (log: WhatsAppLog) => log.source === "baileys:message";

  const renderMediaIndicator = (meta: Record<string, any> | null) => {
    if (!meta) return null;
    const type = meta.type as string | undefined;
    const mediaUrl = meta.media_url as string | undefined;

    if (type === "image" && mediaUrl) {
      return (
        <img
          src={mediaUrl}
          alt="media"
          className="h-12 w-12 rounded object-cover cursor-pointer border border-border"
          onClick={(e) => { e.stopPropagation(); setLightboxUrl(mediaUrl); }}
        />
      );
    }
    if (type === "audio") return <FileAudio className="h-5 w-5 text-muted-foreground" />;
    if (type === "video") return <FileVideo className="h-5 w-5 text-muted-foreground" />;
    if (type === "document") return <FileText className="h-5 w-5 text-muted-foreground" />;
    return null;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Filter bar */}
      <div className="flex items-center gap-3 p-3 border-b border-border flex-wrap sticky top-0 bg-card z-10">
        <Select value={levelFilter} onValueChange={setLevelFilter}>
          <SelectTrigger className="w-28 h-8 text-xs bg-secondary border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="debug">debug</SelectItem>
            <SelectItem value="info">info</SelectItem>
            <SelectItem value="warn">warn</SelectItem>
            <SelectItem value="error">error</SelectItem>
            <SelectItem value="fatal">fatal</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="Filter source…"
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="w-36 h-8 text-xs bg-secondary border-border"
        />
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Switch checked={messagesOnly} onCheckedChange={setMessagesOnly} className="scale-75" />
          Messages only
        </label>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground ml-auto">
          <Switch checked={autoScroll} onCheckedChange={setAutoScroll} className="scale-75" />
          Auto-scroll
        </label>
      </div>

      {/* Log list */}
      <ScrollArea className="flex-1">
        <div className="divide-y divide-border">
          {filtered.map((log) => {
            const isMsgRow = isMessageRow(log);
            const expanded = expandedId === log.id;
            const meta = log.metadata;
            const fromMe = meta?.from_me;
            const senderName = meta?.push_name || meta?.remote_jid || "";

            return (
              <div
                key={log.id}
                className={`px-3 py-2 cursor-pointer hover:bg-secondary/50 transition-colors ${
                  isMsgRow ? "border-l-4 border-primary bg-primary/5" : ""
                }`}
                onClick={() => setExpandedId(expanded ? null : log.id)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-[11px] text-muted-foreground shrink-0">
                    {formatTime(log.created_at)}
                  </span>
                  <Badge className={`text-[10px] px-1.5 py-0 ${levelColors[log.level] || "bg-zinc-500"}`}>
                    {log.level}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border text-muted-foreground">
                    {log.source}
                  </Badge>
                  {isMsgRow && (
                    <>
                      {fromMe ? (
                        <ArrowUpRight className="h-3.5 w-3.5 text-primary shrink-0" />
                      ) : (
                        <ArrowDownLeft className="h-3.5 w-3.5 text-primary shrink-0" />
                      )}
                      <span className="text-xs font-bold text-foreground truncate">{senderName}</span>
                    </>
                  )}
                  <span className={`text-xs truncate flex-1 ${isMsgRow ? "text-foreground" : "text-muted-foreground"}`}>
                    {isMsgRow ? (meta?.body || log.message) : log.message}
                  </span>
                  {isMsgRow && renderMediaIndicator(meta)}
                </div>
                {expanded && (
                  <pre className="mt-2 text-[11px] text-muted-foreground whitespace-pre-wrap break-all bg-background p-2 rounded">
                    {log.message}
                    {meta && "\n\n" + JSON.stringify(meta, null, 2)}
                  </pre>
                )}
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 cursor-pointer"
          onClick={() => setLightboxUrl(null)}
        >
          <img src={lightboxUrl} alt="full" className="max-h-[90vh] max-w-[90vw] rounded-lg shadow-2xl" />
        </div>
      )}
    </div>
  );
};

export default LogStream;
