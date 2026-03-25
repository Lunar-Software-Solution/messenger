import { useMemo } from "react";
import { WhatsAppLog, WhatsAppContact, WhatsAppMessageMeta } from "@/types/whatsapp";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { X, MessageSquare, Image as ImageIcon, FileText, FileAudio, FileVideo, MapPin } from "lucide-react";

interface ContactDetailsPanelProps {
  open: boolean;
  jid: string | null;
  contact: WhatsAppContact | null;
  logs: WhatsAppLog[];
  profilePicUrl?: string;
  pushName?: string;
  onClose: () => void;
}

const ContactDetailsPanel = ({ open, jid, contact, logs, profilePicUrl, pushName, onClose }: ContactDetailsPanelProps) => {
  const displayName = pushName || contact?.notify || contact?.name || contact?.verified_name || jid?.split("@")[0] || "Unknown";
  const initials = displayName.slice(0, 2).toUpperCase();
  const phone = jid?.split("@")[0] || "";
  const isGroup = jid?.endsWith("@g.us") ?? false;

  const stats = useMemo(() => {
    if (!jid) return { total: 0, sent: 0, received: 0, images: 0, videos: 0, audio: 0, documents: 0, firstSeen: "", lastSeen: "" };

    const contactMessages = logs.filter((l) => {
      if (l.source !== "baileys:message") return false;
      const meta = l.metadata as WhatsAppMessageMeta | null;
      return meta?.remote_jid === jid;
    });

    let sent = 0, received = 0, images = 0, videos = 0, audio = 0, documents = 0;
    contactMessages.forEach((l) => {
      const meta = l.metadata as WhatsAppMessageMeta;
      if (meta?.from_me) sent++; else received++;
      if (meta?.type === "image") images++;
      if (meta?.type === "video") videos++;
      if (meta?.type === "audio") audio++;
      if (meta?.type === "document") documents++;
    });

    return {
      total: contactMessages.length,
      sent,
      received,
      images,
      videos,
      audio,
      documents,
      firstSeen: contactMessages[0]?.created_at || "",
      lastSeen: contactMessages[contactMessages.length - 1]?.created_at || "",
    };
  }, [jid, logs]);

  const formatDate = (ts: string) => {
    if (!ts) return "—";
    return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-[360px] sm:w-[400px] bg-card border-border p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>Contact Details</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="relative bg-primary/10 px-6 pt-10 pb-6 flex flex-col items-center">
            <button onClick={onClose} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-5 w-5" />
            </button>
            <Avatar className="h-20 w-20 mb-3 border-2 border-primary/30">
              {profilePicUrl ? <AvatarImage src={profilePicUrl} /> : null}
              <AvatarFallback className="text-xl bg-secondary">{initials}</AvatarFallback>
            </Avatar>
            <h2 className="text-lg font-semibold text-foreground">{displayName}</h2>
            {phone && !isGroup && (
              <p className="text-sm text-muted-foreground mt-0.5">+{phone}</p>
            )}
            {isGroup && (
              <Badge variant="outline" className="mt-1 text-[10px] border-primary/30 text-primary">Group</Badge>
            )}
          </div>

          <ScrollArea className="flex-1">
            <div className="px-6 py-4 space-y-5">
              {/* Contact info */}
              {contact && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact Info</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {contact.name && (
                      <>
                        <span className="text-muted-foreground">Name</span>
                        <span className="text-foreground">{contact.name}</span>
                      </>
                    )}
                    {contact.notify && (
                      <>
                        <span className="text-muted-foreground">Notify</span>
                        <span className="text-foreground">{contact.notify}</span>
                      </>
                    )}
                    {contact.verified_name && (
                      <>
                        <span className="text-muted-foreground">Business</span>
                        <span className="text-foreground">{contact.verified_name}</span>
                      </>
                    )}
                    {contact.updated_at && (
                      <>
                        <span className="text-muted-foreground">Updated</span>
                        <span className="text-foreground text-xs">{formatDate(contact.updated_at)}</span>
                      </>
                    )}
                  </div>
                </div>
              )}

              <Separator className="bg-border" />

              {/* Message stats */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Message Stats</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-secondary rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-foreground">{stats.total}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Total</p>
                  </div>
                  <div className="bg-secondary rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-primary">{stats.sent}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Sent</p>
                  </div>
                  <div className="bg-secondary rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-foreground">{stats.received}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Received</p>
                  </div>
                </div>
              </div>

              {/* Media breakdown */}
              {(stats.images > 0 || stats.videos > 0 || stats.audio > 0 || stats.documents > 0) && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Media Shared</h3>
                  <div className="flex flex-wrap gap-2">
                    {stats.images > 0 && (
                      <Badge variant="secondary" className="gap-1.5 text-xs">
                        <ImageIcon className="h-3 w-3" /> {stats.images} Photos
                      </Badge>
                    )}
                    {stats.videos > 0 && (
                      <Badge variant="secondary" className="gap-1.5 text-xs">
                        <FileVideo className="h-3 w-3" /> {stats.videos} Videos
                      </Badge>
                    )}
                    {stats.audio > 0 && (
                      <Badge variant="secondary" className="gap-1.5 text-xs">
                        <FileAudio className="h-3 w-3" /> {stats.audio} Audio
                      </Badge>
                    )}
                    {stats.documents > 0 && (
                      <Badge variant="secondary" className="gap-1.5 text-xs">
                        <FileText className="h-3 w-3" /> {stats.documents} Files
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              <Separator className="bg-border" />

              {/* Activity timeline */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Activity</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">First message</span>
                  <span className="text-foreground text-xs">{formatDate(stats.firstSeen)}</span>
                  <span className="text-muted-foreground">Last message</span>
                  <span className="text-foreground text-xs">{formatDate(stats.lastSeen)}</span>
                </div>
              </div>

              {/* JID */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">JID</h3>
                <p className="text-xs text-muted-foreground font-mono bg-secondary rounded px-2 py-1.5 break-all select-all">
                  {jid}
                </p>
              </div>
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ContactDetailsPanel;
