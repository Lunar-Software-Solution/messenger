import { WhatsAppLog, WhatsAppMessageMeta, WhatsAppContact, WhatsAppReaction } from "@/types/whatsapp";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Check, CheckCheck, Clock, Star, Forward, FileText, MapPin, User,
  Play, FileAudio,
} from "lucide-react";

interface ChatBubbleProps {
  log: WhatsAppLog;
  contacts: Map<string, WhatsAppContact>;
  showSender: boolean;
  aggregatedReactions?: WhatsAppReaction[];
  onMediaClick: (url: string, type: "image" | "video") => void;
  onContactClick: (jid: string, profilePicUrl?: string, pushName?: string) => void;
}

const senderColors = [
  "text-emerald-400", "text-sky-400", "text-amber-400", "text-rose-400",
  "text-violet-400", "text-teal-400", "text-orange-400", "text-pink-400",
];

function getSenderColor(jid: string): string {
  let hash = 0;
  for (let i = 0; i < jid.length; i++) hash = (hash * 31 + jid.charCodeAt(i)) | 0;
  return senderColors[Math.abs(hash) % senderColors.length];
}

function linkify(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) =>
    urlRegex.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer"
        className="underline text-sky-400 hover:text-sky-300 break-all">
        {part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

const ChatBubble = ({ log, contacts, showSender, aggregatedReactions = [], onMediaClick, onContactClick }: ChatBubbleProps) => {
  const meta = (log.metadata || {}) as WhatsAppMessageMeta;
  const rawMessage = log.message || "";
  const parsedRaw = rawMessage.match(/^\[(.*?)\]\s*[←→]\s*([^:]+):\s*([\s\S]*)$/);
  const rawType = parsedRaw?.[1]?.toLowerCase() || "";
  const rawSender = parsedRaw?.[2]?.trim() || "";
  const rawContent = parsedRaw?.[3] || rawMessage;
  const fromMe = meta.from_me ?? rawMessage.includes("→");
  const isGroup = meta.remote_jid?.endsWith("@g.us") ?? false;
  const senderJid = meta.remote_jid || "";
  const participantKey = isGroup ? (meta.push_name || rawSender || senderJid) : senderJid;
  const contact = contacts.get(senderJid);

  // In groups, try to find the individual participant's contact by name
  const participantContact = isGroup && !fromMe
    ? (() => {
        const name = meta.push_name || rawSender;
        if (!name) return null;
        for (const [, c] of contacts) {
          if (c.notify === name || c.name === name || c.verified_name === name) return c;
        }
        return null;
      })()
    : null;

  const senderName = meta.push_name || contact?.notify || contact?.name || contact?.verified_name || rawSender || senderJid.split("@")[0];
  const profilePic = meta.profile_pic_url || participantContact?.profile_pic_url || contact?.profile_pic_url;
  const initials = (senderName || "?").slice(0, 2).toUpperCase();
  const fallbackReactionMatch = rawContent.match(/^\[Reaction:\s*(.+?)\]$/i);
  const fallbackReactions = fallbackReactionMatch ? [{ emoji: fallbackReactionMatch[1] }] : [];

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  };

  if (meta.is_revoked) {
    return (
      <div className={`flex ${fromMe ? "justify-end" : "justify-start"} px-3 py-0.5`}>
        <div className="px-3 py-2 rounded-lg bg-secondary/50 italic text-muted-foreground text-xs">
          🚫 This message was deleted
        </div>
      </div>
    );
  }

  const renderAck = () => {
    if (!fromMe || meta.ack === undefined) return null;
    switch (meta.ack) {
      case 0: return <Clock className="h-3 w-3 text-muted-foreground" />;
      case 1: return <Check className="h-3 w-3 text-muted-foreground" />;
      case 2: return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
      case 3: return <CheckCheck className="h-3 w-3 text-sky-400" />;
      default: return null;
    }
  };

  const renderQuoted = () => {
    if (!meta.quoted) return null;
    return (
      <div className="mb-1 px-2 py-1.5 rounded bg-background/40 border-l-2 border-primary text-[11px]">
        <span className="font-semibold text-primary text-[10px]">
          {meta.quoted.from_me ? "You" : meta.quoted.push_name || ""}
        </span>
        <p className="text-muted-foreground truncate mt-0.5">{meta.quoted.body || `[${meta.quoted.type || "message"}]`}</p>
      </div>
    );
  };

  const renderMedia = () => {
    const type = meta.type;
    const url = meta.media_url;

    if (type === "image" && url) {
      return (
        <img src={url} alt="image" className="rounded max-w-[280px] cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => onMediaClick(url, "image")} />
      );
    }
    if (type === "sticker" && url) {
      return <img src={url} alt="sticker" className="max-w-[160px]" />;
    }
    if (type === "video" && url) {
      return (
        <div className="relative max-w-[280px] cursor-pointer group" onClick={() => onMediaClick(url, "video")}>
          <video src={url} className="rounded" preload="metadata" />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 rounded transition-colors">
            <Play className="h-10 w-10 text-white/90" />
          </div>
        </div>
      );
    }
    if (type === "audio" && url) {
      return (
        <div className="flex items-center gap-2 min-w-[200px]">
          <FileAudio className="h-5 w-5 text-muted-foreground shrink-0" />
          <audio src={url} controls className="w-full h-8" style={{ colorScheme: "dark" }} />
        </div>
      );
    }
    if (type === "document" && url) {
      return (
        <a href={url} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-2 rounded bg-background/40 hover:bg-background/60 transition-colors">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <div className="min-w-0">
            <p className="text-xs font-medium truncate">{meta.file_name || "Document"}</p>
            {meta.file_size && <p className="text-[10px] text-muted-foreground">{(meta.file_size / 1024).toFixed(1)} KB</p>}
          </div>
        </a>
      );
    }
    if (type === "location" && meta.latitude != null && meta.longitude != null) {
      const mapsUrl = `https://www.google.com/maps?q=${meta.latitude},${meta.longitude}`;
      return (
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-2 rounded bg-background/40 hover:bg-background/60 transition-colors">
          <MapPin className="h-5 w-5 text-primary" />
          <span className="text-xs">{meta.latitude.toFixed(4)}, {meta.longitude.toFixed(4)}</span>
        </a>
      );
    }
    if (type === "contact" && meta.vcard) {
      const nameMatch = meta.vcard.match(/FN:(.*)/);
      return (
        <div className="flex items-center gap-2 px-3 py-2 rounded bg-background/40">
          <User className="h-5 w-5 text-muted-foreground" />
          <span className="text-xs font-medium">{nameMatch?.[1] || "Contact"}</span>
        </div>
      );
    }
    return null;
  };

  const renderReactions = () => {
    const reactions = [
      ...(meta.reactions || []),
      ...aggregatedReactions,
      ...(!(meta.reactions?.length || aggregatedReactions.length) ? fallbackReactions : []),
    ];
    if (!reactions.length) return null;
    const grouped = reactions.reduce((acc, r) => {
      acc[r.emoji] = (acc[r.emoji] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return (
      <div className="flex gap-1 mt-1">
        {Object.entries(grouped).map(([emoji, count]) => (
          <span key={emoji} className="px-1.5 py-0.5 rounded-full bg-background/60 text-[11px] border border-border">
            {emoji} {(count as number) > 1 && (count as number)}
          </span>
        ))}
      </div>
    );
  };

  let body = meta.body || meta.caption || (meta.type && meta.type !== "text" ? "" : rawContent);
  if (body) {
    body = body
      .replace(/^\[[^\]]+\]\s*[←→]\s*[^:]+:\s*/, "")
      .replace(/^\{[^}]*\}\s*»?\s*/, "")
      .replace(/^\[[^\]]+\]\s*/, "")
      .trim();

    if (senderName && body.startsWith(`${senderName}: `)) {
      body = body.slice(senderName.length + 2);
    }
    if (fallbackReactionMatch || rawType === "reaction") {
      body = body.replace(/^\[Reaction:\s*(.+?)\]$/i, "$1").trim();
    }
  }

  return (
    <div className={`flex ${fromMe ? "justify-end" : "justify-start"} px-3 py-0.5 group`}>
      {!fromMe && (
        <div className="mr-2 mt-auto mb-1 shrink-0 cursor-pointer" onClick={() => onContactClick(senderJid, profilePic, senderName)}>
          <Avatar className="h-7 w-7 hover:ring-2 hover:ring-primary/50 transition-all">
            {profilePic ? <AvatarImage src={profilePic} /> : null}
            <AvatarFallback className={`text-[10px] ${isGroup ? getSenderColor(participantKey).replace('text-', 'bg-').replace('400', '400/20') : 'bg-secondary'}`}>
              <span className={isGroup ? getSenderColor(participantKey) : ''}>{initials}</span>
            </AvatarFallback>
          </Avatar>
        </div>
      )}

      <div className={`max-w-[75%] rounded-lg px-2.5 py-1.5 shadow-sm ${
        fromMe
          ? "bg-primary/20 rounded-br-none"
          : "bg-secondary rounded-bl-none"
      }`}>
        {meta.is_forwarded && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground italic mb-0.5">
            <Forward className="h-3 w-3" /> Forwarded
          </div>
        )}

        {!fromMe && showSender && isGroup && (
          <p className={`text-[11px] font-semibold mb-0.5 cursor-pointer hover:underline ${getSenderColor(senderJid)}`}
            onClick={() => onContactClick(senderJid, profilePic, senderName)}>{senderName}</p>
        )}
        {!fromMe && showSender && !isGroup && (
          <p className="text-[11px] font-semibold mb-0.5 text-primary cursor-pointer hover:underline"
            onClick={() => onContactClick(senderJid, profilePic, senderName)}>{senderName}</p>
        )}

        {renderQuoted()}
        {renderMedia()}
        {body && <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words">{linkify(body)}</p>}

        {/* Caption (if media + separate caption) */}
        {meta.caption && meta.body && meta.caption !== meta.body && (
          <p className="text-[12px] text-muted-foreground mt-1">{meta.caption}</p>
        )}

        {/* Footer: time + ack + starred + edited */}
        <div className="flex items-center justify-end gap-1 mt-0.5">
          {meta.is_edited && <span className="text-[9px] text-muted-foreground italic">edited</span>}
          {meta.is_starred && <Star className="h-2.5 w-2.5 text-amber-400 fill-amber-400" />}
          <span className="text-[10px] text-muted-foreground">{formatTime(log.created_at)}</span>
          {renderAck()}
        </div>

        {/* Reactions */}
        {renderReactions()}
      </div>
    </div>
  );
};

export default ChatBubble;
