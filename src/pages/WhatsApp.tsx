import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MessageCircle, Sparkles, Loader2, BookOpen } from 'lucide-react';
import { useWhatsApp } from '../hooks/useWhatsApp';
import { useContactsStore } from '../store/useContactsStore';
import { useMessagesStore } from '../store/useMessagesStore';
import { RFM_SEGMENTS_CONFIG } from '../types/rfm.types';
import { supabase } from '../lib/supabase';
import ConversationList from '../components/whatsapp/ConversationList';
import ChatWindow from '../components/whatsapp/ChatWindow';
import CustomerDataPanel from '../components/whatsapp/CustomerDataPanel';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import type { Conversation } from '../types/message.types';
import { useSettingsStore } from '../store/useSettingsStore';

export default function WhatsApp() {
  const location = useLocation();
  const navigate = useNavigate();
  const { settings } = useSettingsStore();
  const {
    conversations,
    activeConversation,
    activeMessages,
    isLoading,
    fetchConversations,
    send,
    setActiveConversation,
    deleteConversation
  } = useWhatsApp();

  const employees = settings.employees || [];
  const quickReplies = settings.quickReplies || [];
  const activeEmployeeId = settings.activeEmployeeId || '';

  const activeEmployee = employees.find(e => e.id === activeEmployeeId);
  const responsibleEmployee = activeEmployee ? activeEmployee.name : 'عمر البشير';

  const { contacts, fetchContacts } = useContactsStore();

  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [dbTemplates, setDbTemplates] = useState<any[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [activeCustomerSegment, setActiveCustomerSegment] = useState<string | null>(null);
  const [activeInvoices, setActiveInvoices] = useState<any[]>([]);

  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [newChatPhone, setNewChatPhone] = useState('');
  const [newChatName, setNewChatName] = useState('');
  const [newChatError, setNewChatError] = useState('');

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<Conversation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteConversationClick = (conv: Conversation) => {
    setConversationToDelete(conv);
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!conversationToDelete || !conversationToDelete.id) return;
    setIsDeleting(true);
    try {
      const success = await deleteConversation(conversationToDelete.id);
      if (success) {
        setIsDeleteConfirmOpen(false);
        setConversationToDelete(null);
      } else {
        alert('فشل حذف المحادثة. يرجى المحاولة مرة أخرى.');
      }
    } catch (err) {
      console.error('Error deleting conversation:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateNewChat = (e: React.FormEvent) => {
    e.preventDefault();
    setNewChatError('');

    const cleanedPhone = newChatPhone.replace(/[+\s()-]/g, '').trim();
    if (!cleanedPhone || cleanedPhone.length < 7) {
      setNewChatError('يرجى إدخال رقم هاتف صحيح مع رمز الدولة (مثال: 201200000000)');
      return;
    }

    const phoneWithPrefix = `whatsapp:${cleanedPhone}`;

    const existing = conversations.find(
      (c) => c.contactPhone.replace('whatsapp:', '').replace('+', '').trim() === cleanedPhone
    );

    if (existing) {
      setActiveConversation(existing);
    } else {
      const nameVal = newChatName.trim() || `عميل واتساب ${cleanedPhone.substring(cleanedPhone.length - 4)}`;
      const tempConv: Conversation = {
        contactId: 'TEMP_' + Date.now(),
        contactName: nameVal,
        contactPhone: phoneWithPrefix,
        unreadCount: 0,
        messages: [],
        lastActivity: new Date().toISOString(),
        lastMessage: undefined
      };
      setActiveConversation(tempConv);
    }

    setNewChatPhone('');
    setNewChatName('');
    setIsNewChatOpen(false);
  };

  // تحميل المحادثات وجهات الاتصال عند تشغيل الصفحة
  useEffect(() => {
    fetchConversations();
    fetchContacts();
  }, []);

  // التعامل مع تحديد المحادثة القادمة من صفحة تفاصيل العميل (بروفايل العميل الموحد)
  useEffect(() => {
    const state = location.state as { selectPhone?: string; selectContactId?: string; selectContactName?: string } | null;
    if (state?.selectPhone && !isLoading) {
      const targetPhone = state.selectPhone.replace(/[+\s()-]/g, '').trim();
      
      // نبحث عن محادثة قائمة تطابق الرقم أو معرف جهة الاتصال
      const existing = conversations.find(c => {
        const cPhone = c.contactPhone.replace('whatsapp:', '').replace('+', '').replace(/[+\s()-]/g, '').trim();
        return cPhone === targetPhone || c.contactId === state.selectContactId;
      });

      if (existing) {
        setActiveConversation(existing);
      } else {
        // إذا لم تكن المحادثة قائمة، نقوم بإنشاء محادثة مؤقتة في الواجهة
        const phoneWithPrefix = state.selectPhone.startsWith('whatsapp:') ? state.selectPhone : `whatsapp:${targetPhone}`;
        const tempConv: Conversation = {
          contactId: state.selectContactId || 'TEMP_' + Date.now(),
          contactName: state.selectContactName || `عميل واتساب ${targetPhone.substring(targetPhone.length - 4)}`,
          contactPhone: phoneWithPrefix,
          unreadCount: 0,
          messages: [],
          lastActivity: new Date().toISOString(),
          lastMessage: undefined
        };
        setActiveConversation(tempConv);
      }

      // مسح الـ state لتجنب إعادة تحديد المحادثة عند إعادة تحميل المكون أو التنقل
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, conversations, isLoading, navigate, location.pathname, setActiveConversation]);

  // جلب فواتير العميل وتصنيفه السلوكي عند اختيار محادثة
  useEffect(() => {
    if (activeConversation) {
      // 1. تحديد شريحة العميل السلوكية
      const customer = contacts.find(c => c.id === activeConversation.contactId);
      if (customer && customer.rfmScore?.segment) {
        setActiveCustomerSegment(customer.rfmScore.segment);
      } else {
        setActiveCustomerSegment(null);
      }

      // 2. جلب الفواتير السابقة للعميل
      supabase
        .from('invoices')
        .select('*')
        .eq('customer_id', activeConversation.contactId)
        .order('invoice_date', { ascending: false })
        .then(({ data }) => {
          if (data) setActiveInvoices(data);
        });
    } else {
      setActiveCustomerSegment(null);
      setActiveInvoices([]);
    }
  }, [activeConversation, contacts]);

  // تحديث حالة المحادثة (نشطة / انتظار / مغلقة)
  const handleUpdateStatus = async (status: 'active' | 'pending' | 'closed') => {
    if (!activeConversation) return;
    try {
      const { error } = await supabase
        .from('conversations')
        .update({ status })
        .eq('id', activeConversation.id);
      
      if (error) throw error;
      
      // تحديث الحالة في Zustand store
      useMessagesStore.setState((state) => {
        const updatedConvs = state.conversations.map(c => 
          c.id === activeConversation.id ? { ...c, status } : c
        );
        const updatedActive = state.activeConversation && state.activeConversation.id === activeConversation.id
          ? { ...state.activeConversation, status } as Conversation
          : state.activeConversation;
        return { conversations: updatedConvs, activeConversation: updatedActive };
      });
    } catch (err) {
      console.error('Error updating conversation status:', err);
    }
  };

  // إضافة ملاحظة لملف العميل
  const handleAddProfileNote = async (note: string) => {
    if (!activeConversation) return;
    try {
      const currentCustomer = contacts.find(c => c.id === activeConversation.contactId);
      const currentNotes = currentCustomer?.notes || '';
      const updatedNotes = currentNotes ? `${currentNotes}\n${note}` : note;

      const { error } = await supabase
        .from('customers')
        .update({ notes: updatedNotes })
        .eq('customer_id', activeConversation.contactId);
      
      if (error) throw error;

      // إعادة تحميل العملاء لتحديث شاشة البيانات
      await fetchContacts();
    } catch (err) {
      console.error('Error saving customer note:', err);
    }
  };

  // تصعيد المحادثة للإدارة
  const handleEscalate = async () => {
    if (!activeConversation) return;
    await handleUpdateStatus('pending');
    await handleAddProfileNote('⚠️ تم تصعيد هذه المحادثة للإدارة للمتابعة الفورية وعمل اللازم.');
  };

  // إرسال رسالة أو ملاحظة داخلية
  const handleSendMessage = async (
    body: string,
    isInternal?: boolean,
    mediaUrl?: string,
    messageType?: string,
    fileName?: string
  ) => {
    if (!activeConversation) return false;
    
    if (isInternal) {
      // إدراج ملاحظة داخلية في قاعدة البيانات دون إرسال للعميل
      try {
        const conversationId = activeConversation.id;
        const { data: insertedMsg, error: insertError } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            direction: 'outbound',
            content: mediaUrl || body,
            message_type: 'internal',
            status: 'delivered',
            sent_at: new Date().toISOString()
          })
          .select('*')
          .single();

        if (insertError) throw insertError;

        // تحديث رسائل المحادثة النشطة في Zustand store
        useMessagesStore.setState((state) => ({
          activeMessages: [...state.activeMessages, {
            id: String(insertedMsg.id),
            contactId: activeConversation.contactId,
            contactPhone: activeConversation.contactPhone,
            direction: 'outbound',
            body: insertedMsg.content,
            status: 'delivered',
            timestamp: insertedMsg.sent_at,
            message_type: 'internal'
          }]
        }));

        // تحديث توقيت آخر رسالة للمحادثة
        await supabase
          .from('conversations')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', conversationId);

        return true;
      } catch (err) {
        console.error('Error creating internal note message:', err);
        return false;
      }
    } else {
      // إرسال رسالة حقيقية عبر Twilio/Meta
      return send(body, mediaUrl, messageType, fileName);
    }
  };

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
    let filled = templateBody;
    if (activeConversation) {
      filled = filled
        .replace(/{name}/g, activeConversation.contactName || '')
        .replace(/{{name}}/g, activeConversation.contactName || '')
        .replace(/{days}/g, '30')
        .replace(/{{order_id}}/g, activeInvoices.length > 0 ? String(activeInvoices[0].invoice_id) : '1084')
        .replace(/{{total}}/g, activeInvoices.length > 0 ? String(activeInvoices[0].final_total) : '450');
    }
    
    const textareas = document.querySelectorAll('textarea');
    if (textareas.length > 0) {
      const textarea = textareas[0] as HTMLTextAreaElement;
      textarea.value = filled;
      const event = new Event('input', { bubbles: true });
      textarea.dispatchEvent(event);
      textarea.focus();
    }

    setIsTemplatesOpen(false);
  };

  return (
    <div className="flex h-[calc(100vh-80px)] w-full overflow-hidden" dir="rtl">
      
      {/* 1. الجزء الأيمن — بيانات العميل (يظهر عند اختيار محادثة) */}
      {activeConversation && (
        <CustomerDataPanel
          activeConversation={activeConversation}
          contact={contacts.find(c => c.id === activeConversation.contactId) || null}
          invoices={activeInvoices}
          onUpdateStatus={handleUpdateStatus}
          onAddProfileNote={handleAddProfileNote}
          onEscalate={handleEscalate}
          employees={employees}
          activeEmployeeId={activeEmployeeId}
        />
      )}

      {/* 2. الجزء الأوسط — شاشة الشات */}
      {activeConversation ? (
        <ChatWindow
          activeConversation={activeConversation}
          messages={activeMessages}
          onSendMessage={handleSendMessage}
          onOpenTemplates={handleOpenTemplates}
          isLoading={isLoading}
          activeOrderNumber={activeInvoices.length > 0 ? `#${activeInvoices[0].invoice_id}` : 'لا يوجد طلب نشط'}
          responsibleEmployee={responsibleEmployee}
          quickReplies={quickReplies}
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

      {/* 3. الجزء الأيسر — قائمة المحادثات */}
      <ConversationList
        conversations={conversations}
        activeConversation={activeConversation}
        onSelect={setActiveConversation}
        onNewChat={() => setIsNewChatOpen(true)}
        onDeleteConversation={handleDeleteConversationClick}
        isLoading={isLoading}
      />

      {/* مودال بدء محادثة جديدة */}
      <Modal
        isOpen={isNewChatOpen}
        onClose={() => setIsNewChatOpen(false)}
        title="بدء محادثة واتساب جديدة"
        size="sm"
      >
        <form onSubmit={handleCreateNewChat} className="space-y-4">
          <Input
            label="رقم الهاتف (مع رمز الدولة بدون +)"
            placeholder="مثال: 201200000000"
            value={newChatPhone}
            onChange={(e) => setNewChatPhone(e.target.value)}
            required
          />
          <Input
            label="اسم العميل (اختياري)"
            placeholder="مثال: محمد أحمد"
            value={newChatName}
            onChange={(e) => setNewChatName(e.target.value)}
          />
          {newChatError && (
            <p className="text-red-400 text-xs font-semibold">{newChatError}</p>
          )}
          <div className="flex gap-3 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsNewChatOpen(false)}
            >
              إلغاء
            </Button>
            <Button
              type="submit"
            >
              بدء المحادثة
            </Button>
          </div>
        </form>
      </Modal>

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

      {/* مودال تأكيد حذف المحادثة */}
      <Modal
        isOpen={isDeleteConfirmOpen}
        onClose={() => {
          if (!isDeleting) {
            setIsDeleteConfirmOpen(false);
            setConversationToDelete(null);
          }
        }}
        title="تأكيد حذف المحادثة"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-gray-300 leading-relaxed text-right">
            هل أنت متأكد من رغبتك في حذف المحادثة مع <span className="text-white font-bold">"{conversationToDelete?.contactName}"</span>؟
            <br />
            <span className="text-red-400 font-semibold text-[10px] mt-2 block">
              ⚠️ تحذير: سيتم حذف كافة الرسائل والبيانات المرتبطة بهذه المحادثة نهائياً من قاعدة البيانات ولا يمكن التراجع عن هذا الإجراء.
            </span>
          </p>
          <div className="flex gap-3 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={isDeleting}
              onClick={() => {
                setIsDeleteConfirmOpen(false);
                setConversationToDelete(null);
              }}
            >
              إلغاء
            </Button>
            <Button
              type="button"
              variant="danger"
              isLoading={isDeleting}
              onClick={handleConfirmDelete}
            >
              حذف نهائي
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
