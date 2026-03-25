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

interface ConnectionBarProps {
  session: WhatsAppSession | null;
  platform: MessagingPlatform;
}

const ConnectionBar = ({ session, platform }: ConnectionBarProps) => {
  const isWhatsApp = platform === 'whatsapp';
  const status = isWhatsApp ? (session?.status ?? 'disconnected') : 'disconnected';
  const isConnected = status === 'connected';
  const { user, signOut } = useAuth();
  const PlatformIcon = PLATFORM_ICONS[platform];

  return (
    <div className="flex items-center gap-3 px-5 py-3 bg-card border-b border-border">
      <PlatformIcon className="h-4 w-4 text-muted-foreground" />
      <div className="flex items-center gap-2">
        <span
          className={`h-3 w-3 rounded-full ${
            isConnected
              ? 'bg-green-500 animate-pulse'
              : 'bg-muted-foreground'
          }`}
        />
        <span className="text-sm font-medium text-foreground">
          {PLATFORM_LABELS[platform]} — {isWhatsApp ? (isConnected ? 'Connected' : 'Disconnected') : 'Not configured'}
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
