import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, ArrowLeft, Loader2, CheckCheck, HelpCircle } from 'lucide-react';
import type { WhatsAppMessage } from '../../types/message.types';

interface ConversationsTabProps {
  phone: string;
  customerId: string;
  customerName: string;
}

export default function ConversationsTab({ phone, customerId, customerName }: ConversationsTabProps) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchChatMessages = async () => {
    if (!phone) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await window.electronAPI.whatsapp.getMessages(phone);
      if (res.success) {
        // Sort and take last 15 messages
        const sorted = (res.messages || []).sort(
          (a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        setMessages(sorted.slice(-15));
      } else {
        setError(res.error || 'فشل تحميل الرسائل');
      }
    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء تحميل الرسائل');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchChatMessages();
  }, [phone]);

  const handleOpenChat = () => {
    navigate('/whatsapp', {
      state: {
        selectPhone: phone,
        selectContactId: customerId,
        selectContactName: customerName
      }
    });
  };

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header Bar */}
      <div className="flex items-center justify-between bg-[#0a071e]/5 p-4 rounded-3xl border border-white/5">
        <div>
          <h4 className="text-xs font-bold text-white">آخر 15 رسالة متبادلة</h4>
          <p className="text-[9px] text-gray-500 font-semibold mt-0.5">معاينة سريعة لسجل رسائل الواتساب مع العميل</p>
        </div>

        <button
          onClick={handleOpenChat}
          className="py-2 px-4 bg-orange-500 hover:bg-[#FF6632] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-md"
          style={{ background: '#FF6632', boxShadow: '0 4px 12px rgba(255,102,50,0.2)' }}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          متابعة المحادثة الكاملة
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
        </button>
      </div>

      {/* Messages Window */}
      <div 
        className="rounded-3xl border border-white/10 overflow-hidden flex flex-col h-[400px] bg-[#0b141a] dark-container shadow-md"
        style={{
          backgroundImage: `radial-gradient(circle at 10% 20%, rgba(18, 140, 126, 0.04) 0%, transparent 80%), radial-gradient(circle at 90% 80%, rgba(255, 102, 50, 0.02) 0%, transparent 80%)`
        }}
      >
        {/* Chat header */}
        <div className="bg-[#101d25] px-5 py-3 border-b border-white/5 flex items-center justify-between text-right">
          <div>
            <p className="text-xs font-bold text-gray-900 leading-tight">{customerName}</p>
            <span className="text-[9px] text-emerald-400 font-bold block mt-0.5">{phone}</span>
          </div>
        </div>

        {/* Chat Bubbles */}
        <div className="flex-1 p-5 overflow-y-auto space-y-3.5 flex flex-col justify-end">
          {isLoading ? (
            <div className="my-auto text-center space-y-2">
              <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto" />
              <p className="text-[10px] text-gray-400 font-bold">جاري تحميل الرسائل...</p>
            </div>
          ) : error ? (
            <p className="my-auto text-[10px] text-rose-400 text-center font-bold">⚠️ {error}</p>
          ) : messages.length === 0 ? (
            <div className="my-auto text-center space-y-2">
              <MessageSquare className="w-8 h-8 text-gray-600 mx-auto" />
              <p className="text-[10px] text-gray-400 font-bold">لا يوجد رسائل تواصل مسجلة مع هذا العميل.</p>
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto pr-1">
              {messages.map((msg, idx) => {
                const isOutbound = msg.direction === 'outbound';
                const timeStr = new Date(msg.timestamp).toLocaleTimeString('ar-EG', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                });

                return (
                  <div 
                    key={msg.id || idx} 
                    className={`flex flex-col max-w-[80%] p-3 rounded-2xl relative shadow-md leading-relaxed text-xs text-right animate-fade-in border ${
                      isOutbound 
                        ? 'self-start bg-[#005c4b] text-gray-900 rounded-tr-none border-emerald-600/20' 
                        : 'self-end bg-[#202c33] text-gray-900 rounded-tl-none border-white/5'
                    }`}
                  >
                    {/* Bubble Tail */}
                    <div 
                      className="absolute top-0 w-2 h-3"
                      style={{
                        content: '""',
                        borderLeft: '8px solid transparent',
                        borderRight: '8px solid transparent',
                        borderTop: isOutbound ? '8px solid #005c4b' : '8px solid #202c33',
                        right: isOutbound ? 0 : 'auto',
                        left: !isOutbound ? 0 : 'auto',
                        transform: isOutbound ? 'translateX(50%)' : 'translateX(-50%)'
                      }}
                    />

                    {/* Content */}
                    <div className="whitespace-pre-line text-gray-900 font-medium break-words">
                      {msg.body}
                    </div>

                    {/* Timestamp */}
                    <div className="flex items-center justify-end gap-1 mt-1 text-[8px] text-gray-700/60 font-bold">
                      <span>{timeStr}</span>
                      {isOutbound && <CheckCheck className="w-3 h-3 text-sky-400" />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
