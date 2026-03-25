
-- Enable RLS on all tables
ALTER TABLE public.whatsapp_session ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_contacts ENABLE ROW LEVEL SECURITY;

-- Public read/write policies (no auth required — internal monitoring tool)
CREATE POLICY "Allow all access on whatsapp_session" ON public.whatsapp_session FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access on whatsapp_logs" ON public.whatsapp_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access on whatsapp_outbox" ON public.whatsapp_outbox FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access on whatsapp_contacts" ON public.whatsapp_contacts FOR ALL USING (true) WITH CHECK (true);
