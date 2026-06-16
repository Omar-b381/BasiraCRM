import React, { useEffect, useState, useCallback } from 'react';
import { MessageCircle, Sparkles, Loader2, BookOpen, UserCheck } from 'lucide-react';
import { useWhatsApp } from '../hooks/useWhatsApp';
import { useContactsStore } from '../store/useContactsStore';
import { RFM_SEGMENTS_CONFIG } from '../types/rfm.types';
import { supabase } from '../lib/supabase';
import ConversationList from '../components/whatsapp/ConversationList';
import ChatWindow from '../components/whatsapp/ChatWindow';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';

export default function WhatsApp() {
  const {
    conversations,
    activeConversation,
    activeMessages,
    isLoading,
    fetchConversations,
    send,
    setActiveConversation
  } = useWhatsApp();

  const { contacts, fetchContacts } = useContactsStore();

  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [dbTemplates, setDbTemplates] = useState<any[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [activeCustomerSegment, setActiveCustomerSegment] = useState<string | null>(null);
  
  // شريط الإدخال المؤقت في الحقل
  const [pendingText, setPendingText] = useState('');

  // تحميل المحادثات وجهات الاتصال عند تشغيل الصفحة
  useEffect(() => {
    fetchConversations();
    fetchContacts();
  }, []);

  // تحديد شريحة العميل السلوكية عند اختيار محادثة
  useEffect(() => {
    if (activeConversation && contacts.length > 0) {
      const customer = contacts.find(c => c.id === activeConversation.contactId);
      if (customer && customer.rfmScore?.segment) {
        setActiveCustomerSegment(customer.rfmScore.segment);
      } else {
        setActiveCustomerSegment(null);
      }
    }
  }, [activeConversation, contacts]);

  // جلب القوالب العامة من قاعدة البيانات
  const loadDbTemplates = async () => {
    setIsLoadingTemplates(true);
    try {
      const { data, error } = await supabase
        .from('message_templates')
        .select('*')
        .order('id', { ascending: true });
      if (!error && data) {
        setDbTemplates(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const handleOpenTemplates = () => {
    loadDbTemplates();
    setIsTemplatesOpen(true);
  };

  const handleSelectTemplate = (templateBody: string) => {
    // تعويض المتغيرات بالقيم الفعلية للعميل
    let filled = templateBody;
    if (activeConversation) {
      filled = filled
        .replace(/{name}/g, activeConversation.contactName || '')
        .replace(/{{name}}/g, activeConversation.contactName || '')
        .replace(/{days}/g, '30')
        .replace(/{{order_id}}/g, '1084')
        .replace(/{{total}}/g, '450');
    }
    
    // محاكاة إدخال النص في شريطcomposer
    const textareas = document.querySelectorAll('textarea');
    if (textareas.length > 0) {
      const textarea = textareas[0] as HTMLTextAreaElement;
      textarea.value = filled;
      // محاكاة حدث الإدخال لتنشيط الحجم التلقائي في المكون
      const event = new Event('input', { bubbles: true });
      textarea.dispatchEvent(event);
      // ضبط مؤشر الكتابة يدوياً
      textarea.focus();
    }

    setIsTemplatesOpen(false);
  };

  return (
    <div className="flex h-[calc(100vh-80px)] w-full overflow-hidden" dir="rtl">
      
      {/* عمود المحادثات الأيمن */}
      <ConversationList
        conversations={conversations}
        activeConversation={activeConversation}
        onSelect={setActiveConversation}
        isLoading={isLoading}
      />

      {/* نافذة المحادثة المفتوحة اليسرى */}
      {activeConversation ? (
        <ChatWindow
          activeConversation={activeConversation}
          messages={activeMessages}
          onSendMessage={send}
          onOpenTemplates={handleOpenTemplates}
          isLoading={isLoading}
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-500 space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-indigo-600/10 flex items-center justify-center border border-indigo-500/20 text-indigo-400">
            <MessageCircle className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white">منصة محادثات واتساب</h3>
            <p className="text-[10px] text-gray-500 font-semibold max-w-xs leading-relaxed">اختر أحد العملاء من القائمة الجانبية لبدء المحادثة ومتابعة الفواتير وحالة الإرسال</p>
          </div>
        </div>
      )}

      {/* مودال قوالب الرسائل الذكية والتسويقية */}
      <Modal
        isOpen={isTemplatesOpen}
        onClose={() => setIsTemplatesOpen(false)}
        title="قوالب الرسائل والتسويق الذكي"
        size="md"
      >
        <div className="space-y-6">
          
          {/* القسم 1: قالب بناءً على شريحة RFM */}
          {activeConversation && activeCustomerSegment && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                قالب سلوكي موصى به لشريحة: {RFM_SEGMENTS_CONFIG[activeCustomerSegment]?.nameAr}
              </h4>
              
              {RFM_SEGMENTS_CONFIG[activeCustomerSegment]?.whatsappTemplate ? (
                <div
                  onClick={() => handleSelectTemplate(RFM_SEGMENTS_CONFIG[activeCustomerSegment].whatsappTemplate!)}
                  className="p-4 bg-amber-950/20 border border-amber-500/10 hover:border-amber-400/30 rounded-2xl cursor-pointer hover:bg-amber-950/30 transition-all text-xs text-right leading-relaxed"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-amber-500 font-bold bg-amber-900/10 px-2 py-0.5 rounded-full">تنشيط تلقائي</span>
                  </div>
                  <p className="text-gray-200 font-semibold">{
                    RFM_SEGMENTS_CONFIG[activeCustomerSegment].whatsappTemplate!
                      .replace(/{name}/g, activeConversation.contactName || '')
                      .replace(/{days}/g, '30')
                  }</p>
                </div>
              ) : (
                <p className="text-[10px] text-gray-500">لا يتوفر قالب خاص بهذه الشريحة</p>
              )}
            </div>
          )}

          {/* القسم 2: القوالب العامة من قاعدة البيانات */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              القوالب العامة بقاعدة البيانات
            </h4>

            {isLoadingTemplates ? (
              <div className="py-8 flex justify-center">
                <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {dbTemplates.map((template) => (
                  <div
                    key={template.id}
                    onClick={() => handleSelectTemplate(template.content)}
                    className="p-4 bg-gray-900/30 border border-gray-800 hover:border-indigo-500/40 rounded-2xl cursor-pointer hover:bg-indigo-600/5 transition-all text-xs text-right leading-relaxed"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-white text-xs">{template.name}</span>
                      <span className="text-[9px] text-indigo-400 font-bold bg-indigo-950/40 px-2.5 py-0.5 rounded-full">
                        {template.category === 'order_confirm' ? 'تأكيد طلب' : 'متابعة'}
                      </span>
                    </div>
                    <p className="text-gray-300 font-semibold">{
                      template.content
                        .replace(/{{name}}/g, activeConversation?.contactName || 'العميل')
                        .replace(/{{order_id}}/g, '1084')
                        .replace(/{{total}}/g, '450')
                    }</p>
                  </div>
                ))}
                {dbTemplates.length === 0 && (
                  <p className="text-center text-gray-500 text-xs py-4">لا توجد قوالب مخزنة في قاعدة البيانات</p>
                )}
              </div>
            )}
          </div>

        </div>
      </Modal>

    </div>
  );
}
