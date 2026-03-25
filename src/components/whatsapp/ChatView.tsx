import { useState, useRef, useEffect, useMemo } from "react";
import { WhatsAppLog, WhatsAppMessageMeta, WhatsAppContact, WhatsAppReaction } from "@/types/whatsapp";
import { ScrollArea } from "@/components/ui/scroll-area";
import ChatBubble from "./ChatBubble";
import DateSeparator from "./DateSeparator";
import MessageLightbox from "./MessageLightbox";
import ContactDetailsPanel from "./ContactDetailsPanel";
import ConversationList from "./ConversationList";

interface ChatViewProps {
  logs: WhatsAppLog[];
  contacts: Map<string, WhatsAppContact>;
}

const ChatView = ({ logs, contacts }: ChatViewProps) => {
  const [autoScroll, setAutoScroll] = useState(true);
  const [lightbox, setLightbox] = useState<{ url: string; type: "image" | "video" } | null>(null);
  const [selectedContact, setSelectedContact] = useState<{ jid: string; profilePicUrl?: string; pushName?: string } | null>(null);
  const [selectedJid, setSelectedJid] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const allMessages = useMemo(
    () => logs.filter((l) => l.source === "baileys:message"),
    [logs]
  );

  const { displayMessages, reactionsByJid } = useMemo(() => {
    const reactions = new Map<string, WhatsAppReaction[]>();
    const display: WhatsAppLog[] = [];

    allMessages.forEach((msg) => {
      const meta = (msg.metadata || {}) as WhatsAppMessageMeta;
      if (meta.type === "reaction") {
        const jid = meta.remote_jid || "";
        const list = reactions.get(jid) || [];
        list.push({ emoji: meta.body || "", push_name: meta.push_name, from_jid: jid });
        reactions.set(jid, list);
      } else {
        display.push(msg);
      }
    });

    return { displayMessages: display, reactionsByJid: reactions };
  }, [allMessages]);

  const messages = useMemo(() => {
    if (!selectedJid) return displayMessages;
    return displayMessages.filter((msg) => {
      const meta = (msg.metadata || {}) as WhatsAppMessageMeta;
      return meta.remote_jid === selectedJid;
    });
  }, [displayMessages, selectedJid]);

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, autoScroll]);

  const renderMessages = () => {
    const elements: React.ReactNode[] = [];
    let lastDate = "";
    let lastSenderJid = "";

    messages.forEach((msg, i) => {
      const d = new Date(msg.created_at);
      const dateKey = d.toDateString();

      if (dateKey !== lastDate) {
        elements.push(<DateSeparator key={`date-${dateKey}`} date={d} />);
        lastDate = dateKey;
        lastSenderJid = "";
      }

      const meta = msg.metadata as any;
      const currentJid = meta?.remote_jid || "";
      const currentFromMe = meta?.from_me ?? false;
      const showSender = currentFromMe !== (messages[i - 1]?.metadata as any)?.from_me ||
        currentJid !== lastSenderJid ||
        dateKey !== new Date(messages[i - 1]?.created_at || 0).toDateString();

      lastSenderJid = currentJid;

      const metaForReactions = (msg.metadata || {}) as WhatsAppMessageMeta;
      const jidKey = metaForReactions.remote_jid || "";

      elements.push(
        <ChatBubble
          key={msg.id}
          log={msg}
          contacts={contacts}
          showSender={showSender}
          aggregatedReactions={reactionsByJid.get(jidKey) || []}
          onMediaClick={(url, type) => setLightbox({ url, type })}
          onContactClick={(jid, profilePicUrl, pushName) => setSelectedContact({ jid, profilePicUrl, pushName })}
        />
      );
    });

    return elements;
  };

  return (
    <div className="flex h-full">
      {/* Conversation list sidebar */}
      <div className="w-[240px] shrink-0">
        <ConversationList
          logs={logs}
          contacts={contacts}
          selectedJid={selectedJid}
          onSelect={setSelectedJid}
        />
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            {selectedJid ? "No messages in this conversation" : "No messages yet"}
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="py-2">
              {renderMessages()}
              <div ref={bottomRef} />
            </div>
          </ScrollArea>
        )}
      </div>

      {lightbox && (
        <MessageLightbox
          url={lightbox.url}
          type={lightbox.type}
          onClose={() => setLightbox(null)}
        />
      )}

      <ContactDetailsPanel
        open={!!selectedContact}
        jid={selectedContact?.jid || null}
        contact={selectedContact ? contacts.get(selectedContact.jid) || null : null}
        logs={logs}
        profilePicUrl={selectedContact?.profilePicUrl}
        pushName={selectedContact?.pushName}
        onClose={() => setSelectedContact(null)}
      />
    </div>
  );
};

export default ChatView;
