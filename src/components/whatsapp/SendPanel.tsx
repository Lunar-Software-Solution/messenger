import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { WhatsAppContact, WhatsAppOutbox } from "@/types/whatsapp";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Send, Paperclip, X, FileText, Image as ImageIcon, FileAudio, FileVideo } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SendPanelProps {
  recentSent: WhatsAppOutbox[];
  contacts: Map<string, WhatsAppContact>;
}

const SendPanel = ({ recentSent, contacts }: SendPanelProps) => {
  const [to, setTo] = useState("");
  const [selectedJid, setSelectedJid] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [suggestions, setSuggestions] = useState<WhatsAppContact[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Autocomplete
  useEffect(() => {
    if (to.length < 1) { setSuggestions([]); return; }
    const timeout = setTimeout(async () => {
      const db = supabase as any;
      const { data } = await db
        .from("whatsapp_contacts")
        .select("*")
        .or(`name.ilike.%${to}%,notify.ilike.%${to}%,id.ilike.%${to}%`)
        .limit(8);
      setSuggestions((data as WhatsAppContact[]) || []);
      setShowSuggestions(true);
    }, 200);
    return () => clearTimeout(timeout);
  }, [to]);

  const selectContact = (c: WhatsAppContact) => {
    setTo(c.name || c.notify || c.id);
    setSelectedJid(c.id);
    setShowSuggestions(false);
  };

  const resolveJid = (): string => {
    if (selectedJid) return selectedJid;
    if (to.includes("@")) return to;
    if (/^\d+$/.test(to)) return `${to}@s.whatsapp.net`;
    return to;
  };

  const deriveMediaType = (mime: string): string => {
    if (mime.startsWith("image/")) return "image";
    if (mime.startsWith("video/")) return "video";
    if (mime.startsWith("audio/")) return "audio";
    return "document";
  };

  const canSend = resolveJid().length > 0 && (content.trim().length > 0 || file !== null);

  const handleSend = async () => {
    if (!canSend) return;
    setSending(true);
    try {
      const jid = resolveJid();
      let mediaUrl: string | null = null;
      let mediaType: string | null = null;

      if (file) {
        const path = `outbox/${Date.now()}_${file.name}`;
        const { error: uploadErr } = await supabase.storage
          .from("whatsapp-media")
          .upload(path, file);
        if (uploadErr) throw uploadErr;
        mediaUrl = path;
        mediaType = deriveMediaType(file.type);
      }

      const db = supabase as any;
      const { error: insertErr } = await db.from("whatsapp_outbox").insert({
        to_jid: jid,
        content: content.trim() || null,
        media_url: mediaUrl,
        media_type: mediaType,
        status: "pending",
      });
      if (insertErr) throw insertErr;

      setTo("");
      setSelectedJid("");
      setContent("");
      setFile(null);
    } catch (err) {
      console.error("Send error:", err);
    } finally {
      setSending(false);
    }
  };

  const contactName = (jid: string) => {
    const c = contacts.get(jid);
    return c?.name || c?.notify || jid;
  };

  const statusColor: Record<string, string> = {
    pending: "bg-zinc-500",
    sent: "bg-green-500",
    failed: "bg-red-500",
  };

  const mediaIcon = (type: string | null) => {
    if (type === "image") return <ImageIcon className="h-3.5 w-3.5" />;
    if (type === "audio") return <FileAudio className="h-3.5 w-3.5" />;
    if (type === "video") return <FileVideo className="h-3.5 w-3.5" />;
    if (type === "document") return <FileText className="h-3.5 w-3.5" />;
    return null;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 space-y-3 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">Send Message</h2>

        {/* To field */}
        <div className="relative">
          <Input
            placeholder="To (name, number, or JID)"
            value={to}
            onChange={(e) => { setTo(e.target.value); setSelectedJid(""); }}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            className="bg-secondary border-border text-sm"
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-20 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
              {suggestions.map((c) => (
                <button
                  key={c.id}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-secondary transition-colors"
                  onMouseDown={() => selectContact(c)}
                >
                  <span className="font-medium text-foreground">{c.name || c.notify || c.id}</span>
                  <span className="ml-2 text-muted-foreground">{c.id}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <Textarea
          placeholder="Message (optional if file attached)"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          className="bg-secondary border-border text-sm resize-none"
        />

        {/* File */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
            className="text-xs"
          >
            <Paperclip className="h-3.5 w-3.5 mr-1" />
            Attach media
          </Button>
          {file && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground bg-secondary px-2 py-1 rounded">
              {file.name}
              <X className="h-3 w-3 cursor-pointer hover:text-foreground" onClick={() => setFile(null)} />
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </div>

        <Button
          onClick={handleSend}
          disabled={!canSend || sending}
          className="w-full bg-primary hover:bg-primary/90"
        >
          <Send className="h-4 w-4 mr-1" />
          {sending ? "Sending…" : "Send"}
        </Button>
      </div>

      {/* Recent sent */}
      <div className="flex-1 flex flex-col min-h-0">
        <h3 className="text-xs font-semibold text-muted-foreground px-4 py-2">Recent Sent</h3>
        <ScrollArea className="flex-1">
          <div className="divide-y divide-border">
            {recentSent.map((msg) => (
              <div key={msg.id} className="px-4 py-2 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">
                    {contactName(msg.to_jid)}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                    {msg.media_type && mediaIcon(msg.media_type)}
                    {msg.content || (msg.media_type ? `[${msg.media_type}]` : "—")}
                  </p>
                </div>
                {msg.status === "failed" && msg.error ? (
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge className={`text-[10px] px-1.5 py-0 ${statusColor[msg.status]}`}>
                        {msg.status}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-xs text-xs">
                      {msg.error}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Badge className={`text-[10px] px-1.5 py-0 ${statusColor[msg.status] || "bg-zinc-500"}`}>
                    {msg.status}
                  </Badge>
                )}
              </div>
            ))}
            {recentSent.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6">No messages sent yet</p>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default SendPanel;
