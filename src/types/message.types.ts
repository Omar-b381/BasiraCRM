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
}

export interface Conversation {
  contactId: string;
  contactName: string;
  contactPhone: string;
  lastMessage?: WhatsAppMessage;
  unreadCount: number;
  messages: WhatsAppMessage[];
  lastActivity: string;
}

