import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { WhatsAppSession, WhatsAppLog, WhatsAppOutbox, WhatsAppContact } from "@/types/whatsapp";
import ConnectionBar from "@/components/whatsapp/ConnectionBar";
import QROverlay from "@/components/whatsapp/QROverlay";
import LogStream from "@/components/whatsapp/LogStream";
import SendPanel from "@/components/whatsapp/SendPanel";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/settings/AppSidebar";
import { ApiKeysPanel } from "@/components/settings/ApiKeysPanel";
import { ApiDocsPanel } from "@/components/settings/ApiDocsPanel";

const Index = () => {
  const [session, setSession] = useState<WhatsAppSession | null>(null);
  const [logs, setLogs] = useState<WhatsAppLog[]>([]);
  const [recentSent, setRecentSent] = useState<WhatsAppOutbox[]>([]);
  const [contactsMap, setContactsMap] = useState<Map<string, WhatsAppContact>>(new Map());
  const [activePanel, setActivePanel] = useState<"api-keys" | "api-docs" | null>(null);

  const db = supabase as any;

  // Fetch session
  useEffect(() => {
    db.from("whatsapp_session").select("*").eq("id", 1).single()
      .then(({ data }: any) => { if (data) setSession(data as WhatsAppSession); });

    const channel = supabase
      .channel("session-changes")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "whatsapp_session" },
        (payload: any) => setSession(payload.new as WhatsAppSession))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Fetch logs
  useEffect(() => {
    db.from("whatsapp_logs").select("*").order("created_at", { ascending: false }).limit(100)
      .then(({ data }: any) => { if (data) setLogs((data as WhatsAppLog[]).reverse()); });

    const channel = supabase
      .channel("log-inserts")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "whatsapp_logs" },
        (payload: any) => setLogs((prev) => [...prev, payload.new as WhatsAppLog]))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Fetch outbox
  useEffect(() => {
    db.from("whatsapp_outbox").select("*").order("created_at", { ascending: false }).limit(20)
      .then(({ data }: any) => { if (data) setRecentSent(data as WhatsAppOutbox[]); });

    const channel = supabase
      .channel("outbox-changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "whatsapp_outbox" },
        (payload: any) => setRecentSent((prev) => [payload.new as WhatsAppOutbox, ...prev].slice(0, 20)))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "whatsapp_outbox" },
        (payload: any) => setRecentSent((prev) =>
          prev.map((m) => (m.id === (payload.new as any).id ? payload.new as WhatsAppOutbox : m))))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Fetch contacts
  useEffect(() => {
    db.from("whatsapp_contacts").select("*")
      .then(({ data }: any) => {
        if (data) {
          const map = new Map<string, WhatsAppContact>();
          (data as WhatsAppContact[]).forEach((c) => map.set(c.id, c));
          setContactsMap(map);
        }
      });
  }, []);

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="flex min-h-screen w-full">
        <AppSidebar onOpenPanel={setActivePanel} />

        <div className="flex-1 flex flex-col h-screen overflow-hidden">
          {/* QR Overlay */}
          {session?.status === "qr_pending" && session.qr_data && (
            <QROverlay qrData={session.qr_data} />
          )}

          {/* Top bar */}
          <div className="flex items-center border-b border-border">
            <SidebarTrigger className="ml-2" />
            <div className="flex-1">
              <ConnectionBar session={session} />
            </div>
          </div>

          {/* Main content */}
          <div className="flex flex-1 min-h-0">
            {/* Log stream — 65% */}
            <div className="w-[65%] border-r border-border flex flex-col min-h-0">
              <LogStream logs={logs} />
            </div>

            {/* Send panel — 35% */}
            <div className="w-[35%] flex flex-col min-h-0">
              <SendPanel recentSent={recentSent} contacts={contactsMap} />
            </div>
          </div>
        </div>
      </div>

      {/* Settings panels */}
      <ApiKeysPanel open={activePanel === "api-keys"} onClose={() => setActivePanel(null)} />
      <ApiDocsPanel open={activePanel === "api-docs"} onClose={() => setActivePanel(null)} />
    </SidebarProvider>
  );
};

export default Index;
