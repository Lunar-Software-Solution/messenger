import { WhatsAppSession, MessagingPlatform, PLATFORM_LABELS } from "@/types/whatsapp";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, MessageSquare, Shield, MessageCircle, Send } from "lucide-react";

const PLATFORM_ICONS: Record<MessagingPlatform, React.ElementType> = {
  whatsapp: MessageSquare,
  signal: Shield,
  wechat: MessageCircle,
  telegram: Send,
};

const PLATFORM_COLOR_CLASS: Record<MessagingPlatform, string> = {
  whatsapp: "text-platform-whatsapp",
  signal: "text-platform-signal",
  wechat: "text-platform-wechat",
  telegram: "text-platform-telegram",
};

interface ConnectionBarProps {
  session: WhatsAppSession | null;
  platform: MessagingPlatform;
}

const ConnectionBar = ({ session, platform }: ConnectionBarProps) => {
  const status = session?.status ?? 'disconnected';
  const isConnected = status === 'connected';
  const isQrPending = status === 'qr_pending';
  const { user, signOut } = useAuth();
  const PlatformIcon = PLATFORM_ICONS[platform];
  const platformColor = PLATFORM_COLOR_CLASS[platform];

  const statusLabel = isConnected ? 'Connected' : isQrPending ? 'Awaiting scan…' : 'Disconnected';

  return (
    <div className="flex items-center gap-3 px-5 py-3 bg-card border-b border-border">
      <PlatformIcon className={`h-4 w-4 ${platformColor}`} />
      <div className="flex items-center gap-2">
        <span
          className={`h-3 w-3 rounded-full ${
            isConnected
              ? 'bg-platform-whatsapp animate-pulse'
              : isQrPending
              ? 'bg-yellow-400 animate-pulse'
              : 'bg-muted-foreground'
          }`}
        />
        <span className="text-sm font-medium text-foreground">
          {PLATFORM_LABELS[platform]} — {statusLabel}
        </span>
      </div>
      <span className="text-xs text-muted-foreground font-mono mr-2">
        Messages Ingester — {user?.email}
      </span>
      <Button variant="ghost" size="icon" onClick={signOut} className="h-8 w-8 text-muted-foreground hover:text-foreground">
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default ConnectionBar;
