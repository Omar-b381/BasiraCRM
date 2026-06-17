import React, { useState } from 'react';
import { Search, User, Plus, Trash2 } from 'lucide-react';
import type { Conversation } from '../../types/message.types';
import Input from '../ui/Input';

interface ConversationListProps {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  onSelect: (conv: Conversation) => void;
  onNewChat: () => void;
  onDeleteConversation?: (conv: Conversation) => void;
  isLoading?: boolean;
}

export default function ConversationList({
  conversations,
  activeConversation,
  onSelect,
  onNewChat,
  onDeleteConversation,
  isLoading = false
}: ConversationListProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'pending' | 'closed'>('active');

  // تصفية المحادثات حسب البحث وحالة الجلسة
  const filtered = conversations.filter((c) => {
    const matchesSearch =
      c.contactName?.toLowerCase().includes(search.toLowerCase()) ||
      c.contactPhone?.includes(search);

    const statusVal = c.status || 'active';
    const normalizedStatus =
      (statusVal === 'open' || statusVal === 'active') ? 'active' :
      (statusVal === 'pending' || statusVal === 'waiting') ? 'pending' : 'closed';

    return matchesSearch && normalizedStatus === statusFilter;
  });

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
      {/* رأس القائمة مع زر بدء محادثة */}
      <div className="p-4 border-b border-gray-800/60 bg-gray-900/10 flex items-center justify-between">
        <h3 className="text-xs font-bold text-white">المحادثات</h3>
        <button
          type="button"
          onClick={onNewChat}
          className="px-2.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600 border border-indigo-500/20 text-indigo-400 hover:text-white rounded-xl text-[10px] font-bold transition-all flex items-center gap-1 active:scale-95 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          محادثة جديدة
        </button>
      </div>

      {/* البحث في الدردشات */}
      <div className="p-4 border-b border-gray-800/30 bg-gray-900/10">
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

      {/* الفلاتر السريعة */}
      <div className="px-4 pb-3 pt-1 border-b border-gray-800/60 bg-gray-900/10 flex gap-2">
        <button
          onClick={() => setStatusFilter('active')}
          className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
            statusFilter === 'active'
              ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-sm'
              : 'bg-gray-850/40 text-gray-500 hover:text-gray-400 border border-transparent'
          }`}
        >
          مفتوح
        </button>
        <button
          onClick={() => setStatusFilter('pending')}
          className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
            statusFilter === 'pending'
              ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30 shadow-sm'
              : 'bg-gray-850/40 text-gray-500 hover:text-gray-400 border border-transparent'
          }`}
        >
          انتظار
        </button>
        <button
          onClick={() => setStatusFilter('closed')}
          className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
            statusFilter === 'closed'
              ? 'bg-gray-800/50 text-gray-400 border border-gray-700/30 shadow-sm'
              : 'bg-gray-850/40 text-gray-500 hover:text-gray-400 border border-transparent'
          }`}
        >
          مغلق
        </button>
      </div>

      {/* قائمة الجلسات */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-850/30">
        {isLoading && conversations.length === 0 ? (
          <div className="p-8 text-center text-gray-600 text-xs">جارٍ تحميل المحادثات...</div>
        ) : filtered.map((conv, idx) => {
          const isActive = activeConversation?.contactId === conv.contactId;
          const uniqueKey = conv.id ? `${conv.id}_${idx}` : `${conv.contactId}_${idx}`;
          return (
            <div
              key={uniqueKey}
              onClick={() => onSelect(conv)}
              className={`p-4 flex items-start gap-3.5 cursor-pointer transition-all duration-200 group relative ${
                isActive
                  ? 'bg-indigo-600/10 border-r-2 border-indigo-500 text-white'
                  : 'hover:bg-gray-900/20 text-gray-400'
              }`}
            >
              {/* أيقونة المستخدم مع نقطة الحالة الملونة */}
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-2xl bg-gray-800 flex items-center justify-center border border-gray-700/50 text-gray-300">
                  <User className="w-4 h-4" />
                </div>
                {/* نقطة ملونة لحالة العميل */}
                <span className={`w-2.5 h-2.5 rounded-full border border-gray-950 absolute -bottom-0.5 -left-0.5 ${
                  statusFilter === 'active' ? 'bg-emerald-500 animate-pulse' :
                  statusFilter === 'pending' ? 'bg-amber-500' : 'bg-gray-500'
                }`} />
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

              {/* زر حذف المحادثة يظهر عند التحويم */}
              {onDeleteConversation && conv.id && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteConversation(conv);
                  }}
                  className="absolute left-2.5 bottom-2.5 p-1.5 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg hover:bg-gray-800/80 z-10"
                  title="حذف المحادثة"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && !isLoading && (
          <div className="p-8 text-center text-gray-650 text-[10px] font-semibold">لا توجد محادثات في هذا التبويب حالياً</div>
        )}
      </div>
    </div>
  );
}
