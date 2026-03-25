import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { WhatsAppSession, WhatsAppLog, WhatsAppOutbox, WhatsAppContact } from "@/types/whatsapp";
import ConnectionBar from "@/components/whatsapp/ConnectionBar";
import QROverlay from "@/components/whatsapp/QROverlay";
import LogStream from "@/components/whatsapp/LogStream";
import SendPanel from "@/components/whatsapp/SendPanel";

const Index = () => {
  const [session, setSession] = useState<WhatsAppSession | null>(null);
  const [logs, setLogs] = useState<WhatsAppLog[]>([]);
  const [recentSent, setRecentSent] = useState<WhatsAppOutbox[]>([]);
  const [contactsMap, setContactsMap] = useState<Map<string, WhatsAppContact>>(new Map());

  // Fetch session
  useEffect(() => {
    supabase
      .from("whatsapp_session")
      .select("*")
      .eq("id", 1)
      .single()
      .then(({ data }) => { if (data) setSession(data as unknown as WhatsAppSession); });

    const channel = supabase
      .channel("session-changes")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "whatsapp_session" },
        (payload) => setSession(payload.new as unknown as WhatsAppSession))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Fetch logs
  useEffect(() => {
    supabase
      .from("whatsapp_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => { if (data) setLogs((data as unknown as WhatsAppLog[]).reverse()); });

    const channel = supabase
      .channel("log-inserts")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "whatsapp_logs" },
        (payload) => setLogs((prev) => [...prev, payload.new as unknown as WhatsAppLog]))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Fetch outbox
  useEffect(() => {
    supabase
      .from("whatsapp_outbox")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => { if (data) setRecentSent(data as unknown as WhatsAppOutbox[]); });

    const channel = supabase
      .channel("outbox-changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "whatsapp_outbox" },
        (payload) => setRecentSent((prev) => [payload.new as unknown as WhatsAppOutbox, ...prev].slice(0, 20)))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "whatsapp_outbox" },
        (payload) => setRecentSent((prev) =>
          prev.map((m) => (m.id === (payload.new as any).id ? payload.new as unknown as WhatsAppOutbox : m))))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Fetch contacts for name resolution
  useEffect(() => {
    supabase
      .from("whatsapp_contacts")
      .select("*")
      .then(({ data }) => {
        if (data) {
          const map = new Map<string, WhatsAppContact>();
          (data as unknown as WhatsAppContact[]).forEach((c) => map.set(c.id, c));
          setContactsMap(map);
        }
      });
  }, []);

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* QR Overlay */}
      {session?.status === "qr_pending" && session.qr_data && (
        <QROverlay qrData={session.qr_data} />
      )}

      {/* Top bar */}
      <ConnectionBar session={session} />

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
  );
};

export default Index;
