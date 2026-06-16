import { useEffect, useCallback } from 'react';
import { useMessagesStore } from '../store/useMessagesStore';
import type { WhatsAppMessage } from '../types/message.types';

export function useWhatsApp() {
  const {
    conversations,
    activeConversation,
    activeMessages,
    isLoading,
    error,
    fetchConversations,
    fetchMessages,
    sendMessage,
    receiveIncomingMessage,
    setActiveConversation,
  } = useMessagesStore();

  // الاشتراك في بث الرسائل الواردة من Electron Main
  useEffect(() => {
    window.electronAPI.whatsapp.onMessage((msg: any) => {
      console.log('📬 رسالة واردة مستلمة في Hook:', msg);
      receiveIncomingMessage(msg as WhatsAppMessage);
    });
  }, [receiveIncomingMessage]);

  const send = useCallback(
    async (body: string) => {
      if (!activeConversation) return false;
      return sendMessage(activeConversation.contactPhone, body);
    },
    [activeConversation, sendMessage]
  );

  return {
    conversations,
    activeConversation,
    activeMessages,
    isLoading,
    error,
    fetchConversations,
    fetchMessages: (phone: string) => fetchMessages(phone),
    send,
    setActiveConversation,
  };
}
