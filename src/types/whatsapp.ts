export type MessagingPlatform = 'whatsapp' | 'signal' | 'wechat' | 'telegram';

export const PLATFORM_LABELS: Record<MessagingPlatform, string> = {
  whatsapp: 'WhatsApp',
  signal: 'Signal',
  wechat: 'WeChat',
  telegram: 'Telegram',
};

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

export interface WhatsAppQuotedMessage {
  body?: string;
  from_me?: boolean;
  push_name?: string;
  type?: string;
  media_url?: string;
}

export interface WhatsAppReaction {
  emoji: string;
  from_jid?: string;
  push_name?: string;
}

export interface WhatsAppMessageMeta {
  type?: 'text' | 'image' | 'video' | 'audio' | 'document' | 'sticker' | 'location' | 'contact' | 'reaction';
  body?: string;
  caption?: string;
  media_url?: string;
  mimetype?: string;
  file_name?: string;
  file_size?: number;
  from_me?: boolean;
  remote_jid?: string;
  push_name?: string;
  profile_pic_url?: string;
  quoted?: WhatsAppQuotedMessage;
  reactions?: WhatsAppReaction[];
  ack?: 0 | 1 | 2 | 3;
  is_forwarded?: boolean;
  is_starred?: boolean;
  is_revoked?: boolean;
  is_edited?: boolean;
  latitude?: number;
  longitude?: number;
  vcard?: string;
}
