import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MessagingPlatform, PLATFORM_LABELS } from "@/types/whatsapp";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/settings/AppSidebar";
import { ApiKeysPanel } from "@/components/settings/ApiKeysPanel";
import { ApiDocsPanel } from "@/components/settings/ApiDocsPanel";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Users,
  Search,
  RefreshCw,
  CheckSquare,
  Square,
  ArrowUpDown,
  MessageSquare,
  Shield,
  MessageCircle,
  Send,
} from "lucide-react";

interface Contact {
  id: string;
  name: string | null;
  notify: string | null;
  verified_name: string | null;
  profile_pic_url: string | null;
  platform: string;
  sync_enabled: boolean;
  updated_at: string;
}

const PLATFORM_ICON: Record<MessagingPlatform, React.ElementType> = {
  whatsapp: MessageSquare,
  signal: Shield,
  wechat: MessageCircle,
  telegram: Send,
};

const PLATFORM_COLOR: Record<string, string> = {
  whatsapp: "text-platform-whatsapp",
  signal: "text-platform-signal",
  wechat: "text-platform-wechat",
  telegram: "text-platform-telegram",
};

const displayName = (c: Contact) =>
  c.name || c.notify || c.verified_name || c.id.split("@")[0];

const isGroup = (c: Contact) => c.id.endsWith("@g.us");

const Contacts = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filterPlatform, setFilterPlatform] = useState<string | null>(null);
  const [filterSync, setFilterSync] = useState<"all" | "synced" | "unsynced">("all");
  const [activePanel, setActivePanel] = useState<"api-keys" | "api-docs" | null>(null);
  const [activePlatform, setActivePlatform] = useState<MessagingPlatform>("whatsapp");
  const [sortBy, setSortBy] = useState<"name" | "platform" | "updated">("name");

  const db = supabase as any;

  const fetchContacts = async () => {
    setLoading(true);
    const { data, error } = await db
      .from("message_contacts")
      .select("*")
      .order("updated_at", { ascending: false });
    if (data) setContacts(data as Contact[]);
    if (error) toast.error("Failed to load contacts");
    setLoading(false);
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const filtered = useMemo(() => {
    let list = contacts;
    if (filterPlatform) list = list.filter((c) => c.platform === filterPlatform);
    if (filterSync === "synced") list = list.filter((c) => c.sync_enabled);
    if (filterSync === "unsynced") list = list.filter((c) => !c.sync_enabled);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          (c.name || "").toLowerCase().includes(q) ||
          (c.notify || "").toLowerCase().includes(q) ||
          (c.verified_name || "").toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q)
      );
    }
    list = [...list].sort((a, b) => {
      if (sortBy === "name") return (displayName(a)).localeCompare(displayName(b));
      if (sortBy === "platform") return a.platform.localeCompare(b.platform);
      return b.updated_at.localeCompare(a.updated_at);
    });
    return list;
  }, [contacts, filterPlatform, filterSync, search, sortBy]);


  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((c) => c.id)));
    }
  };

  const bulkSetSync = async (enabled: boolean) => {
    const ids = Array.from(selected);
    if (!ids.length) return;

    const { error } = await db
      .from("message_contacts")
      .update({ sync_enabled: enabled })
      .in("id", ids);

    if (error) {
      toast.error("Failed to update sync status");
      return;
    }

    setContacts((prev) =>
      prev.map((c) => (ids.includes(c.id) ? { ...c, sync_enabled: enabled } : c))
    );
    setSelected(new Set());
    toast.success(`${ids.length} contact(s) ${enabled ? "enabled" : "disabled"} for sync`);
  };

  const allPlatforms: MessagingPlatform[] = ["whatsapp", "signal", "telegram", "wechat"];
  const syncedCount = contacts.filter((c) => c.sync_enabled).length;

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="flex min-h-screen w-full">
        <AppSidebar
          onOpenPanel={setActivePanel}
          activePlatform={activePlatform}
          onSelectPlatform={setActivePlatform}
        />

        <div className="flex-1 flex flex-col h-screen overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <SidebarTrigger />
            <Users className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Contacts</h1>
            <Badge variant="secondary" className="text-xs">
              {contacts.length} total
            </Badge>
            <Badge variant="outline" className="text-xs">
              {syncedCount} synced
            </Badge>
            <div className="flex-1" />
            <Button variant="ghost" size="sm" onClick={fetchContacts} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search contacts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>

            {/* Platform filter */}
            <div className="flex items-center gap-1">
              <Button
                variant={filterPlatform === null ? "default" : "ghost"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setFilterPlatform(null)}
              >
                All
              </Button>
              {allPlatforms.map((p) => {
                const Icon = PLATFORM_ICON[p];
                return (
                  <Button
                    key={p}
                    variant={filterPlatform === p ? "default" : "ghost"}
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => setFilterPlatform(filterPlatform === p ? null : p)}
                  >
                    <Icon className={`h-3 w-3 ${filterPlatform !== p ? PLATFORM_COLOR[p] : ""}`} />
                    {PLATFORM_LABELS[p]}
                  </Button>
                );
              })}
            </div>

            {/* Sync filter */}
            <div className="flex items-center gap-1 border-l border-border pl-2">
              {(["all", "synced", "unsynced"] as const).map((f) => (
                <Button
                  key={f}
                  variant={filterSync === f ? "default" : "ghost"}
                  size="sm"
                  className="h-7 text-xs capitalize"
                  onClick={() => setFilterSync(f)}
                >
                  {f}
                </Button>
              ))}
            </div>

            {/* Sort */}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1 border-l border-border ml-1 pl-3"
              onClick={() => setSortBy(sortBy === "name" ? "platform" : sortBy === "platform" ? "updated" : "name")}
            >
              <ArrowUpDown className="h-3 w-3" />
              {sortBy === "name" ? "Name" : sortBy === "platform" ? "Platform" : "Recent"}
            </Button>
          </div>

          {/* Bulk actions bar */}
          {selected.size > 0 && (
            <div className="flex items-center gap-3 border-b border-border bg-primary/5 px-4 py-2">
              <span className="text-sm font-medium">{selected.size} selected</span>
              <Button size="sm" className="h-7 text-xs gap-1" onClick={() => bulkSetSync(true)}>
                Enable Sync
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => bulkSetSync(false)}>
                Disable Sync
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSelected(new Set())}>
                Clear
              </Button>
            </div>
          )}

          {/* Table */}
          <ScrollArea className="flex-1">
            {/* Table header */}
            <div className="grid grid-cols-[40px_1fr_120px_100px_100px] items-center gap-2 px-4 py-2 border-b border-border text-xs font-medium text-muted-foreground sticky top-0 bg-background z-10">
              <div className="flex items-center justify-center">
                <Checkbox
                  checked={filtered.length > 0 && selected.size === filtered.length}
                  onCheckedChange={selectAll}
                />
              </div>
              <div>Contact</div>
              <div>Platform</div>
              <div>Type</div>
              <div>CRM Sync</div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                Loading contacts...
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                No contacts found
              </div>
            ) : (
              filtered.map((contact) => {
                const name = displayName(contact);
                const initials = name.slice(0, 2).toUpperCase();
                const group = isGroup(contact);
                const Icon = PLATFORM_ICON[contact.platform as MessagingPlatform] || MessageSquare;
                const isSelected = selected.has(contact.id);

                return (
                  <div
                    key={contact.id}
                    className={`grid grid-cols-[40px_1fr_120px_100px_100px] items-center gap-2 px-4 py-2.5 border-b border-border/50 transition-colors cursor-pointer ${
                      isSelected ? "bg-primary/5" : "hover:bg-secondary/30"
                    }`}
                    onClick={() => toggleSelect(contact.id)}
                  >
                    <div className="flex items-center justify-center">
                      <Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(contact.id)} />
                    </div>

                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar className="h-8 w-8 shrink-0">
                        {contact.profile_pic_url ? (
                          <AvatarImage src={contact.profile_pic_url} />
                        ) : null}
                        <AvatarFallback className="text-[10px] bg-secondary">
                          {group ? <Users className="h-3.5 w-3.5 text-muted-foreground" /> : initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{contact.id}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Icon className={`h-3.5 w-3.5 ${PLATFORM_COLOR[contact.platform] || ""}`} />
                      <span className="text-xs">{PLATFORM_LABELS[contact.platform as MessagingPlatform] || contact.platform}</span>
                    </div>

                    <div>
                      <Badge variant="secondary" className="text-[10px]">
                        {group ? "Group" : "Contact"}
                      </Badge>
                    </div>

                    <div onClick={(e) => e.stopPropagation()}>
                      <Badge
                        variant={contact.sync_enabled ? "default" : "outline"}
                        className={`text-[10px] cursor-pointer ${
                          contact.sync_enabled ? "bg-primary/20 text-primary border-primary/30" : ""
                        }`}
                        onClick={async () => {
                          const newVal = !contact.sync_enabled;
                          const { error } = await db
                            .from("message_contacts")
                            .update({ sync_enabled: newVal })
                            .eq("id", contact.id);
                          if (error) {
                            toast.error("Failed to update");
                            return;
                          }
                          setContacts((prev) =>
                            prev.map((c) => (c.id === contact.id ? { ...c, sync_enabled: newVal } : c))
                          );
                        }}
                      >
                        {contact.sync_enabled ? "Synced" : "Not synced"}
                      </Badge>
                    </div>
                  </div>
                );
              })
            )}
          </ScrollArea>
        </div>
      </div>

      <ApiKeysPanel open={activePanel === "api-keys"} onClose={() => setActivePanel(null)} />
      <ApiDocsPanel open={activePanel === "api-docs"} onClose={() => setActivePanel(null)} />
    </SidebarProvider>
  );
};

export default Contacts;
