import { MessagingPlatform, PLATFORM_LABELS } from "@/types/whatsapp";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Shield, MessageCircle, Send, FileText, ExternalLink, Copy, CheckCircle2 } from "lucide-react";
import { useState } from "react";

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

const PLATFORM_BG_CLASS: Record<MessagingPlatform, string> = {
  whatsapp: "bg-platform-whatsapp/10 border-platform-whatsapp/20",
  signal: "bg-platform-signal/10 border-platform-signal/20",
  wechat: "bg-platform-wechat/10 border-platform-wechat/20",
  telegram: "bg-platform-telegram/10 border-platform-telegram/20",
};

interface PlatformConfig {
  description: string;
  steps: string[];
  docsUrl?: string;
  apiEndpoint: string;
}

const PLATFORM_CONFIG: Record<Exclude<MessagingPlatform, 'whatsapp'>, PlatformConfig> = {
  signal: {
    description: "Connect your Signal account via the signal-cli REST API to ingest messages into the dashboard.",
    steps: [
      "Deploy signal-cli-rest-api (Docker recommended)",
      "Register or link your Signal number",
      "Configure the webhook to POST messages to your API endpoint",
      "Messages will appear in this dashboard automatically",
    ],
    docsUrl: "https://github.com/bbernhard/signal-cli-rest-api",
    apiEndpoint: "/rest/v1/whatsapp_logs",
  },
  telegram: {
    description: "Create a Telegram Bot and configure it to forward messages to the ingestion API.",
    steps: [
      "Create a bot via @BotFather on Telegram",
      "Copy the bot token provided by BotFather",
      "Set up a webhook pointing to your API endpoint",
      "Add the bot to groups or start private chats to ingest messages",
    ],
    docsUrl: "https://core.telegram.org/bots/api",
    apiEndpoint: "/rest/v1/whatsapp_logs",
  },
  wechat: {
    description: "Integrate with the WeChat Official Account Platform to receive and ingest messages.",
    steps: [
      "Register a WeChat Official Account or Mini Program",
      "Enable developer mode in the WeChat admin console",
      "Configure the server URL to point to your API endpoint",
      "Verify the token and start receiving messages",
    ],
    docsUrl: "https://developers.weixin.qq.com/doc/",
    apiEndpoint: "/rest/v1/whatsapp_logs",
  },
};

interface PlatformSetupProps {
  platform: MessagingPlatform;
  onOpenDocs: () => void;
}

const PlatformSetup = ({ platform, onOpenDocs }: PlatformSetupProps) => {
  const [copied, setCopied] = useState(false);

  if (platform === "whatsapp") return null;

  const config = PLATFORM_CONFIG[platform];
  const Icon = PLATFORM_ICONS[platform];
  const colorClass = PLATFORM_COLOR_CLASS[platform];
  const bgClass = PLATFORM_BG_CLASS[platform];

  const handleCopy = () => {
    navigator.clipboard.writeText(config.apiEndpoint);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-lg w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className={`inline-flex items-center justify-center h-14 w-14 rounded-2xl border ${bgClass}`}>
            <Icon className={`h-7 w-7 ${colorClass}`} />
          </div>
          <h2 className="text-xl font-semibold text-foreground">
            Connect {PLATFORM_LABELS[platform]}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {config.description}
          </p>
        </div>

        {/* Steps */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Setup Steps</CardTitle>
            <CardDescription className="text-xs">Follow these steps to start ingesting messages</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {config.steps.map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className={`flex-shrink-0 h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${bgClass} ${colorClass}`}>
                  {i + 1}
                </span>
                <span className="text-sm text-muted-foreground leading-snug">{step}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* API Endpoint */}
        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground mb-2">API Endpoint</p>
            <div className="flex items-center gap-2 bg-secondary rounded-md px-3 py-2">
              <code className="text-xs text-foreground font-mono flex-1 truncate">
                POST {config.apiEndpoint}
              </code>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={handleCopy}>
                {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-platform-whatsapp" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center gap-3 justify-center">
          <Button variant="outline" size="sm" onClick={onOpenDocs} className="gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            API Docs
          </Button>
          {config.docsUrl && (
            <Button variant="outline" size="sm" asChild className="gap-1.5">
              <a href={config.docsUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
                {PLATFORM_LABELS[platform]} Docs
              </a>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlatformSetup;
