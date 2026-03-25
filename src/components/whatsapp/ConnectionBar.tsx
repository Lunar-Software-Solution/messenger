import { WhatsAppSession } from "@/types/whatsapp";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

interface ConnectionBarProps {
  session: WhatsAppSession | null;
}

const ConnectionBar = ({ session }: ConnectionBarProps) => {
  const status = session?.status ?? 'disconnected';
  const isConnected = status === 'connected';
  const { user, signOut } = useAuth();

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
        {user?.email}
      </span>
      <Button variant="ghost" size="icon" onClick={signOut} className="h-8 w-8 text-muted-foreground hover:text-foreground">
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default ConnectionBar;
