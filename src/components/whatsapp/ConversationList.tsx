import React, { useState } from 'react';
import { Search, MessageCircle, User } from 'lucide-react';
import type { Conversation } from '../../types/message.types';
import Input from '../ui/Input';

interface ConversationListProps {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  onSelect: (conv: Conversation) => void;
  isLoading?: boolean;
}

export default function ConversationList({
  conversations,
  activeConversation,
  onSelect,
  isLoading = false
}: ConversationListProps) {
  const [search, setSearch] = useState('');

  // تصفية المحادثات حسب الاسم أو الرقم
  const filtered = conversations.filter(
    (c) =>
      c.contactName?.toLowerCase().includes(search.toLowerCase()) ||
      c.contactPhone?.includes(search)
  );

  const formatLastActivity = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="w-80 bg-gray-900/40 border-l border-gray-800 flex flex-col h-full shrink-0">
      {/* البحث في الدردشات */}
      <div className="p-4 border-b border-gray-800/60 bg-gray-900/10">
        <div className="relative">
          <Input
            placeholder="ابحث عن محادثة..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-9 py-2 text-xs"
          />
          <Search className="w-3.5 h-3.5 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* قائمة الجلسات */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-850/30">
        {isLoading && conversations.length === 0 ? (
          <div className="p-8 text-center text-gray-600 text-xs">جارٍ تحميل المحادثات...</div>
        ) : filtered.map((conv) => {
          const isActive = activeConversation?.contactId === conv.contactId;
          return (
            <div
              key={conv.contactId}
              onClick={() => onSelect(conv)}
              className={`p-4 flex items-start gap-3.5 cursor-pointer transition-all duration-200 ${
                isActive
                  ? 'bg-indigo-600/10 border-r-2 border-indigo-500 text-white'
                  : 'hover:bg-gray-900/20 text-gray-400'
              }`}
            >
              {/* أيقونة المستخدم */}
              <div className="w-10 h-10 rounded-2xl bg-gray-800 flex items-center justify-center border border-gray-700/50 text-gray-300">
                <User className="w-4 h-4" />
              </div>

              {/* تفاصيل الجلسة */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-100 truncate">{conv.contactName}</h4>
                  <span className="text-[9px] text-gray-500 font-medium">{formatLastActivity(conv.lastActivity)}</span>
                </div>
                <p className="text-[10px] text-gray-500 truncate font-semibold leading-relaxed">
                  {conv.lastMessage ? conv.lastMessage.body : 'لا توجد رسائل بعد'}
                </p>
              </div>

              {/* شارة غير مقروءة */}
              {conv.unreadCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-[10px] font-bold text-white flex items-center justify-center shrink-0">
                  {conv.unreadCount}
                </span>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && !isLoading && (
          <div className="p-8 text-center text-gray-600 text-xs">لا توجد محادثات مطابقة للبحث</div>
        )}
      </div>
    </div>
  );
}
