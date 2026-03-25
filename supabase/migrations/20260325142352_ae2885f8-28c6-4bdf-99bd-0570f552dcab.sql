
-- Rename tables
ALTER TABLE public.whatsapp_logs RENAME TO message_logs;
ALTER TABLE public.whatsapp_outbox RENAME TO message_outbox;
ALTER TABLE public.whatsapp_contacts RENAME TO message_contacts;
ALTER TABLE public.whatsapp_session RENAME TO message_session;

-- Add platform column with default 'whatsapp' (backfills existing rows)
ALTER TABLE public.message_logs ADD COLUMN platform text NOT NULL DEFAULT 'whatsapp';
ALTER TABLE public.message_outbox ADD COLUMN platform text NOT NULL DEFAULT 'whatsapp';
ALTER TABLE public.message_contacts ADD COLUMN platform text NOT NULL DEFAULT 'whatsapp';

-- Update message_session to support multiple platforms
ALTER TABLE public.message_session ADD COLUMN platform text NOT NULL DEFAULT 'whatsapp';

-- Update Realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE message_session, message_logs, message_outbox;
ALTER PUBLICATION supabase_realtime ADD TABLE message_session, message_logs, message_outbox;
