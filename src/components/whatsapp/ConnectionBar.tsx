import { WhatsAppSession } from "@/types/whatsapp";

interface ConnectionBarProps {
  session: WhatsAppSession | null;
}

const ConnectionBar = ({ session }: ConnectionBarProps) => {
  const status = session?.status ?? 'disconnected';
  const isConnected = status === 'connected';

  return (
    <div className="flex items-center gap-3 px-5 py-3 bg-card border-b border-border">
      <div className="flex items-center gap-2">
        <span
          className={`h-3 w-3 rounded-full ${
            isConnected
              ? 'bg-green-500 animate-pulse'
              : 'bg-muted-foreground'
          }`}
        />
        <span className="text-sm font-medium text-foreground">
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
      <span className="ml-auto text-xs text-muted-foreground font-mono">
        WhatsApp Monitor
      </span>
    </div>
  );
};

export default ConnectionBar;
