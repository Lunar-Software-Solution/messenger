export interface WhatsAppSession {
  id: number;
  status: 'disconnected' | 'qr_pending' | 'connected';
  qr_data: string | null;
  updated_at: string;
}

export interface WhatsAppLog {
  id: number;
  level: string;
  message: string;
  source: string;
  metadata: Record<string, any> | null;
  created_at: string;
}

export interface WhatsAppOutbox {
  id: number;
  to_jid: string;
  content: string | null;
  media_url: string | null;
  media_type: string | null;
  status: 'pending' | 'sent' | 'failed';
  error: string | null;
  created_at: string;
}

export interface WhatsAppContact {
  id: string;
  name: string | null;
  notify: string | null;
  verified_name: string | null;
  updated_at: string;
}
