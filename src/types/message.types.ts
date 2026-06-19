export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
export type MessageDirection = 'inbound' | 'outbound';

export interface WhatsAppMessage {
  id: string;
  twilioSid?: string;
  contactId: string;
  contactPhone: string;
  direction: MessageDirection;
  body: string;
  status: MessageStatus;
  mediaUrl?: string;
  timestamp: string;
  readAt?: string;
  message_type?: string;
}

export interface Conversation {
  id?: number;
  contactId: string;
  contactName: string;
  contactPhone: string;
  lastMessage?: WhatsAppMessage;
  unreadCount: number;
  messages: WhatsAppMessage[];
  lastActivity: string;
  status?: string;
}

export interface Campaign {
  id: number;
  name: string;
  provider_id?: number | null;
  template_content?: string | null;
  target_segment: string;
  status: 'draft' | 'sending' | 'done' | 'failed' | 'scheduled';
  scheduled_at?: string | null;
  sent_count: number;
  delivered_count: number;
  read_count: number;
  failed_count: number;
  created_at: string;
}

export interface CampaignProgress {
  campaignId: number;
  current: number;
  total: number;
  lastContactName: string;
  status: 'sending' | 'done' | 'error';
}

