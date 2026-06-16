import React, { useRef, useEffect } from 'react';
import { Phone, User, MessageCircle, Shield } from 'lucide-react';
import type { Conversation, WhatsAppMessage } from '../../types/message.types';
import MessageBubble from './MessageBubble';
import MessageComposer from './MessageComposer';

interface ChatWindowProps {
  activeConversation: Conversation;
  messages: WhatsAppMessage[];
  onSendMessage: (body: string) => Promise<boolean>;
  onOpenTemplates: () => void;
  isLoading?: boolean;
}

export default function ChatWindow({
  activeConversation,
  messages,
  onSendMessage,
  onOpenTemplates,
  isLoading = false
}: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // التمرير التلقائي لأسفل المحادثة عند ورود رسائل جديدة
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-950/20 overflow-hidden">
      {/* هيدر المحادثة */}
      <div className="h-20 border-b border-gray-800 px-6 flex items-center justify-between bg-gray-900/10 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600/10 flex items-center justify-center border border-indigo-500/20 text-indigo-400">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white leading-none">{activeConversation.contactName}</h3>
            <span className="text-[10px] text-gray-500 font-semibold mt-1.5 flex items-center gap-1">
              <Phone className="w-3 h-3 text-gray-600" />
              {activeConversation.contactPhone}
            </span>
          </div>
        </div>

        {/* حالة الخدمة والمزوّد */}
        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 bg-gray-900/30 border border-gray-800 px-3 py-1.5 rounded-xl">
          <Shield className="w-3.5 h-3.5 text-gray-600" />
          <span>المزود: Twilio WhatsApp Business</span>
        </div>
      </div>

      {/* منطقة الرسائل */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {isLoading && messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500 text-xs">جارٍ تحميل أرشيف المحادثة...</div>
        ) : messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        
        {messages.length === 0 && !isLoading && (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 space-y-3">
            <MessageCircle className="w-12 h-12 text-gray-800" />
            <p className="text-xs font-semibold">لا توجد رسائل سابقة. ابدأ المحادثة الآن!</p>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* حقل composer الإدخال */}
      <MessageComposer
        onSend={onSendMessage}
        onOpenTemplates={onOpenTemplates}
      />
    </div>
  );
}
