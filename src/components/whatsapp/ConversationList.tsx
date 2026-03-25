import { useMemo } from "react";
import { WhatsAppLog, WhatsAppMessageMeta, WhatsAppContact } from "@/types/whatsapp";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare } from "lucide-react";

interface ConversationListProps {
  logs: WhatsAppLog[];
  contacts: Map<string, WhatsAppContact>;
  selectedJid: string | null;
  onSelect: (jid: string | null) => void;
}

interface ConversationSummary {
  jid: string;
  name: string;
  profilePic?: string;
  lastMessage: string;
  lastTimestamp: string;
  messageCount: number;
  isGroup: boolean;
}

const ConversationList = ({ logs, contacts, selectedJid, onSelect }: ConversationListProps) => {
  const conversations = useMemo(() => {
    const messages = logs.filter((l) => l.source === "baileys:message");
    const map = new Map<string, ConversationSummary>();

    messages.forEach((msg) => {
      const meta = (msg.metadata || {}) as WhatsAppMessageMeta;
      const jid = meta.remote_jid;
      if (!jid) return;

      const existing = map.get(jid);
      const contact = contacts.get(jid);
      const name = meta.push_name || contact?.notify || contact?.name || contact?.verified_name || jid.split("@")[0];
      const isGroup = jid.endsWith("@g.us");

      const preview = meta.is_revoked
        ? "🚫 Deleted"
        : meta.type === "image" ? "📷 Image"
        : meta.type === "video" ? "🎥 Video"
        : meta.type === "audio" ? "🎵 Audio"
        : meta.type === "document" ? "📄 Document"
        : meta.type === "sticker" ? "🏷️ Sticker"
        : meta.type === "location" ? "📍 Location"
        : meta.type === "contact" ? "👤 Contact"
        : (meta.body || meta.caption || msg.message || "").slice(0, 60);

      const fullPreview = meta.from_me ? `You: ${preview}` : preview;

      if (!existing || msg.created_at > existing.lastTimestamp) {
        map.set(jid, {
          jid,
          name: existing?.name || name,
          profilePic: meta.profile_pic_url || contact?.profile_pic_url || existing?.profilePic,
          lastMessage: fullPreview,
          lastTimestamp: msg.created_at,
          messageCount: (existing?.messageCount || 0) + 1,
          isGroup,
        });
      } else {
        existing.messageCount += 1;
        if (meta.profile_pic_url && !existing.profilePic) {
          existing.profilePic = meta.profile_pic_url;
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => b.lastTimestamp.localeCompare(a.lastTimestamp));
  }, [logs, contacts]);

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();

    if (isToday) return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    if (isYesterday) return "Yesterday";
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "2-digit" });
  };

  return (
    <div className="flex flex-col h-full border-r border-border">
      {/* All messages option */}
      <div
        className={`flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors border-b border-border ${
          selectedJid === null ? "bg-primary/10" : "hover:bg-secondary/50"
        }`}
        onClick={() => onSelect(null)}
      >
        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
          <MessageSquare className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold">All Messages</p>
          <p className="text-[10px] text-muted-foreground">{conversations.reduce((s, c) => s + c.messageCount, 0)} messages</p>
        </div>
      </div>

      {/* Conversation list */}
      <ScrollArea className="flex-1">
        {conversations.map((conv) => {
          const initials = (conv.name || "?").slice(0, 2).toUpperCase();
          const isActive = selectedJid === conv.jid;

          return (
            <div
              key={conv.jid}
              className={`flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors ${
                isActive ? "bg-primary/10" : "hover:bg-secondary/50"
              }`}
              onClick={() => onSelect(conv.jid)}
            >
              <Avatar className="h-8 w-8 shrink-0">
                {conv.profilePic ? <AvatarImage src={conv.profilePic} /> : null}
                <AvatarFallback className="text-[10px] bg-secondary">{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold truncate">{conv.name}</p>
                  <span className="text-[10px] text-muted-foreground shrink-0 ml-1">{formatTime(conv.lastTimestamp)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-muted-foreground truncate">{conv.lastMessage}</p>
                  <span className="text-[9px] bg-secondary rounded-full px-1.5 py-0.5 shrink-0 ml-1">{conv.messageCount}</span>
                </div>
              </div>
            </div>
          );
        })}
      </ScrollArea>
    </div>
  );
};

export default ConversationList;
