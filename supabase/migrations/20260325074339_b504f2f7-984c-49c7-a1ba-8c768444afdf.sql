
-- Session table (single row, id always = 1)
CREATE TABLE public.whatsapp_session (
  id integer PRIMARY KEY DEFAULT 1,
  status text NOT NULL DEFAULT 'disconnected',
  qr_data text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- Seed the single row
INSERT INTO public.whatsapp_session (id, status) VALUES (1, 'disconnected');

-- Logs table
CREATE TABLE public.whatsapp_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  level text NOT NULL DEFAULT 'info',
  message text NOT NULL DEFAULT '',
  source text NOT NULL DEFAULT '',
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Outbox table
CREATE TABLE public.whatsapp_outbox (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  to_jid text NOT NULL,
  content text,
  media_url text,
  media_type text,
  status text NOT NULL DEFAULT 'pending',
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Contacts table
CREATE TABLE public.whatsapp_contacts (
  id text PRIMARY KEY,
  name text,
  notify text,
  verified_name text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_session, whatsapp_logs, whatsapp_outbox;
