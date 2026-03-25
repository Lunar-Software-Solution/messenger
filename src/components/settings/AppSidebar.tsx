import { Key, FileText, MessageSquare, Shield, MessageCircle, Send, Users } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { MessagingPlatform, PLATFORM_LABELS } from "@/types/whatsapp";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

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

const platforms: MessagingPlatform[] = ['whatsapp', 'signal', 'wechat', 'telegram'];

interface AppSidebarProps {
  onOpenPanel: (panel: "api-keys" | "api-docs") => void;
  activePlatform: MessagingPlatform;
  onSelectPlatform: (platform: MessagingPlatform) => void;
}

export function AppSidebar({ onOpenPanel, activePlatform, onSelectPlatform }: AppSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Platforms</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {platforms.map((p) => {
                const Icon = PLATFORM_ICONS[p];
                const isActive = activePlatform === p;
                return (
                  <SidebarMenuItem key={p}>
                    <SidebarMenuButton
                      onClick={() => onSelectPlatform(p)}
                      className={`cursor-pointer ${isActive ? 'bg-accent text-accent-foreground' : ''}`}
                    >
                      <Icon className={`h-4 w-4 ${PLATFORM_COLOR_CLASS[p]}`} />
                      {!collapsed && <span>{PLATFORM_LABELS[p]}</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>CRM</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate("/contacts")}
                  className={`cursor-pointer ${location.pathname === "/contacts" ? "bg-accent text-accent-foreground" : ""}`}
                >
                  <Users className="h-4 w-4" />
                  {!collapsed && <span>Contacts</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Settings</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => onOpenPanel("api-keys")} className="cursor-pointer">
                  <Key className="h-4 w-4" />
                  {!collapsed && <span>API Keys</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => onOpenPanel("api-docs")} className="cursor-pointer">
                  <FileText className="h-4 w-4" />
                  {!collapsed && <span>API Docs</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
