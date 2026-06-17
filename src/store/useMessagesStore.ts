import { create } from 'zustand';
import type { Conversation, WhatsAppMessage } from '../types/message.types';

interface MessagesState {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  activeMessages: WhatsAppMessage[];
  isLoading: boolean;
  error: string | null;
  fetchConversations: () => Promise<void>;
  fetchMessages: (contactPhone: string) => Promise<void>;
  sendMessage: (to: string, body: string, mediaUrl?: string, messageType?: string, fileName?: string) => Promise<boolean>;
  receiveIncomingMessage: (msg: WhatsAppMessage) => void;
  setActiveConversation: (conv: Conversation | null) => void;
  deleteConversation: (conversationId: number) => Promise<boolean>;
}

export const useMessagesStore = create<MessagesState>((set, get) => ({
  conversations: [],
  activeConversation: null,
  activeMessages: [],
  isLoading: false,
  error: null,

  fetchConversations: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await window.electronAPI.whatsapp.getConversations();
      if (res.success) {
        set({ conversations: res.conversations, isLoading: false });
      } else {
        set({ error: res.error || 'فشل جلب المحادثات', isLoading: false });
      }
    } catch (err) {
      set({ error: 'خطأ في الاتصال بالـ Main Process', isLoading: false });
    }
  },

  fetchMessages: async (contactPhone) => {
    set({ isLoading: true, error: null });
    try {
      const res = await window.electronAPI.whatsapp.getMessages(contactPhone);
      if (res.success) {
        set({ activeMessages: res.messages, isLoading: false });
      } else {
        set({ error: res.error || 'فشل جلب الرسائل', isLoading: false });
      }
    } catch (err) {
      set({ error: 'خطأ في الاتصال بالـ Main Process', isLoading: false });
    }
  },

  sendMessage: async (to, body, mediaUrl, messageType, fileName) => {
    try {
      const res = await window.electronAPI.whatsapp.send(to, body, mediaUrl, messageType, fileName);
      if (res.success && res.message) {
        const sentMsg: WhatsAppMessage = res.message;
        
        // تحديث الرسائل النشطة حالياً
        set((state) => ({
          activeMessages: [...state.activeMessages, sentMsg]
        }));

        // تحديث قائمة المحادثات
        const currentConvs = [...get().conversations];
        const convIdx = currentConvs.findIndex(c => c.contactPhone === to || c.contactPhone === `whatsapp:${to}`);
        
        if (convIdx > -1) {
          currentConvs[convIdx] = {
            ...currentConvs[convIdx],
            lastMessage: sentMsg,
            lastActivity: sentMsg.timestamp,
          };
        } else {
          // محادثة جديدة غير مدرجة بالقائمة
          const newConv: Conversation = {
            contactId: sentMsg.contactId,
            contactName: to,
            contactPhone: to,
            unreadCount: 0,
            messages: [],
            lastActivity: sentMsg.timestamp,
            lastMessage: sentMsg
          };
          currentConvs.unshift(newConv);
        }

        // إعادة الترتيب تنازلياً حسب النشاط
        currentConvs.sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());
        set({ conversations: currentConvs });
        return true;
      }
      return false;
    } catch (err) {
      return false;
    }
  },

  receiveIncomingMessage: (msg) => {
    const active = get().activeConversation;
    const cleanActivePhone = active?.contactPhone?.replace('whatsapp:', '').trim();
    const cleanMsgPhone = msg.contactPhone?.replace('whatsapp:', '').trim();

    // إذا كانت الرسالة من العميل النشط حالياً
    if (active && cleanActivePhone === cleanMsgPhone) {
      set((state) => ({
        activeMessages: [...state.activeMessages, msg]
      }));
    }

    // تحديث المحادثات
    const currentConvs = [...get().conversations];
    const convIdx = currentConvs.findIndex(c => c.contactPhone.replace('whatsapp:', '').trim() === cleanMsgPhone);

    if (convIdx > -1) {
      const unreadIncrement = (active && cleanActivePhone === cleanMsgPhone) ? 0 : 1;
      currentConvs[convIdx] = {
        ...currentConvs[convIdx],
        lastMessage: msg,
        lastActivity: msg.timestamp,
        unreadCount: currentConvs[convIdx].unreadCount + unreadIncrement,
      };
    } else {
      // محادثة جديدة كلياً
      const newConv: Conversation = {
        contactId: msg.contactId,
        contactName: msg.contactPhone,
        contactPhone: msg.contactPhone,
        unreadCount: active ? 0 : 1,
        messages: [],
        lastActivity: msg.timestamp,
        lastMessage: msg
      };
      currentConvs.unshift(newConv);
    }

    currentConvs.sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());
    set({ conversations: currentConvs });
  },

  setActiveConversation: (conv) => {
    set({ activeConversation: conv, activeMessages: [] });
    if (conv) {
      // تصفير عدد الرسائل غير المقروءة عند فتح المحادثة
      const currentConvs = [...get().conversations];
      const convIdx = currentConvs.findIndex(c => c.contactId === conv.contactId);
      if (convIdx > -1) {
        currentConvs[convIdx] = { ...currentConvs[convIdx], unreadCount: 0 };
        set({ conversations: currentConvs });
      }
      
      get().fetchMessages(conv.contactPhone);
    }
  },

  deleteConversation: async (conversationId: number) => {
    try {
      const res = await window.electronAPI.whatsapp.deleteConversation(conversationId);
      if (res.success) {
        set((state) => {
          const conversations = state.conversations.filter(c => c.id !== conversationId);
          const activeConversation = state.activeConversation?.id === conversationId ? null : state.activeConversation;
          const activeMessages = activeConversation ? state.activeMessages : [];
          return { conversations, activeConversation, activeMessages };
        });
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error deleting conversation in store:', err);
      return false;
    }
  }
}));
