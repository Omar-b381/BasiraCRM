import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, Shield, ShoppingBag, Clock, Smile, Meh, Frown,
  AlertTriangle, MessageSquare, History, CheckCircle, 
  ArrowRightLeft, AlertCircle, Sparkles, Send
} from 'lucide-react';
import type { Conversation } from '../../types/message.types';
import type { Contact } from '../../types/contact.types';
import { RFM_SEGMENTS_CONFIG } from '../../types/rfm.types';
import type { Employee } from '../../types/settings.types';
import Button from '../ui/Button';

interface CustomerDataPanelProps {
  activeConversation: Conversation;
  contact: Contact | null;
  invoices: any[];
  onUpdateStatus: (status: 'active' | 'pending' | 'closed') => Promise<void>;
  onAddProfileNote: (note: string) => Promise<void>;
  onEscalate: () => Promise<void>;
  employees?: Employee[];
  activeEmployeeId?: string;
}

export default function CustomerDataPanel({
  activeConversation,
  contact,
  invoices,
  onUpdateStatus,
  onAddProfileNote,
  onEscalate,
  employees = [],
  activeEmployeeId = ''
}: CustomerDataPanelProps) {
  const navigate = useNavigate();
  // Find current active employee name
  const activeEmp = employees.find(e => e.id === activeEmployeeId);

  // حالات تفاعلية محاكاة لتحليل المشاعر والإلحاح
  const [sentiment, setSentiment] = useState<'positive' | 'neutral' | 'negative'>('neutral');
  const [urgency, setUrgency] = useState<'low' | 'medium' | 'high'>('medium');
  const [newNote, setNewNote] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [assignedEmployee, setAssignedEmployee] = useState(activeEmp ? activeEmp.name : 'عمر البشير');
  const [showTransferMenu, setShowTransferMenu] = useState(false);

  // Update assigned employee when activeEmployeeId or employees list changes
  useEffect(() => {
    const activeEmp = employees.find(e => e.id === activeEmployeeId);
    if (activeEmp) {
      setAssignedEmployee(activeEmp.name);
    }
  }, [activeEmployeeId, employees]);

  // حساب مؤشر SLA للالتزام بالرد
  const [slaTime, setSlaTime] = useState<{ status: 'fulfilled' | 'pending' | 'overdue'; text: string }>({
    status: 'fulfilled',
    text: 'مستوفى ✓'
  });

  const lastMessage = activeConversation.lastMessage;

  useEffect(() => {
    // كشف تلقائي للمشاعر بناءً على محتوى الرسالة الأخيرة
    if (lastMessage) {
      const body = lastMessage.body.toLowerCase();
      if (body.includes('شكرا') || body.includes('جميل') || body.includes('ممتاز') || body.includes('يسلمو')) {
        setSentiment('positive');
      } else if (body.includes('تاخر') || body.includes('سيء') || body.includes('غاضب') || body.includes('شكوى') || body.includes('مشكلة')) {
        setSentiment('negative');
        setUrgency('high');
      }
    }

    // حساب الـ SLA
    const calculateSLA = () => {
      if (!lastMessage) return;

      if (lastMessage.direction === 'outbound') {
        setSlaTime({
          status: 'fulfilled',
          text: 'مستوفى ✓ (تم الرد)'
        });
      } else {
        // العميل ينتظر رد
        const sentTime = new Date(lastMessage.timestamp).getTime();
        const now = Date.now();
        const elapsedMinutes = Math.floor((now - sentTime) / (60 * 1000));
        const limitMinutes = 30; // الالتزام بالرد خلال 30 دقيقة
        const remaining = limitMinutes - elapsedMinutes;

        if (remaining > 0) {
          setSlaTime({
            status: 'pending',
            text: `متبقي للرد: ${remaining} دقيقة`
          });
        } else {
          setSlaTime({
            status: 'overdue',
            text: `متأخر ⚠️ (${Math.abs(remaining)} دقيقة)`
          });
        }
      }
    };

    calculateSLA();
    const interval = setInterval(calculateSLA, 30000); // تحديث كل 30 ثانية
    return () => clearInterval(interval);
  }, [lastMessage]);

  const handleSaveNote = async () => {
    if (!newNote.trim()) return;
    setIsSavingNote(true);
    await onAddProfileNote(newNote.trim());
    setNewNote('');
    setIsSavingNote(false);
  };

  const handleTransfer = (employee: string) => {
    setAssignedEmployee(employee);
    setShowTransferMenu(false);
  };

  // معلومات شريحة RFM
  const segmentKey = contact?.rfmScore?.segment || 'hibernating';
  const segmentInfo = RFM_SEGMENTS_CONFIG[segmentKey] || { nameAr: 'غير مصنف', color: '#6b7280' };

  // الطلب الأخير
  const latestOrder = invoices && invoices.length > 0 ? invoices[0] : null;

  return (
    <div className="w-80 bg-gray-900/40 border-r border-gray-800 flex flex-col h-full shrink-0 overflow-y-auto" dir="rtl">
      
      {/* 1. الملف الشخصي السريع وتصنيف العميل */}
      <div className="p-5 border-b border-gray-800/60 bg-gray-900/10 text-center space-y-3">
        <div className="w-16 h-16 rounded-3xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto shadow-md relative">
          <User className="w-8 h-8" />
          <span 
            className="absolute -bottom-1 -left-1 w-5 h-5 rounded-xl border border-gray-955 flex items-center justify-center text-[8px] font-extrabold"
            style={{ backgroundColor: `${segmentInfo.color}20`, borderColor: segmentInfo.color, color: segmentInfo.color }}
            title={`تصنيف: ${segmentInfo.nameAr}`}
          >
            ★
          </span>
        </div>
        
        <div>
          <h3 className="text-xs font-bold text-white leading-none">{activeConversation.contactName}</h3>
          <p className="text-[10px] text-gray-500 mt-2 font-semibold">{activeConversation.contactPhone}</p>
        </div>

        {/* تصنيف RFM السلوكي كشارة ملونة */}
        <div 
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold border"
          style={{ backgroundColor: `${segmentInfo.color}15`, borderColor: `${segmentInfo.color}30`, color: segmentInfo.color }}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>شريحة العميل: {segmentInfo.nameAr}</span>
        </div>

        {/* زر الانتقال للملف التعريفي الكامل */}
        <button
          onClick={() => {
            const targetId = contact?.id || activeConversation.contactId;
            if (targetId) navigate(`/customers/${targetId}`);
          }}
          className="w-full mt-2 py-2 bg-indigo-600/10 hover:bg-indigo-500 text-indigo-400 hover:text-white border border-indigo-500/15 hover:border-transparent rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95"
        >
          <User className="w-3.5 h-3.5" />
          <span>الملف الكامل 360°</span>
        </button>
      </div>

      <div className="p-5 space-y-6 flex-1">
        
        {/* 2. مؤشر SLA للالتزام بالرد */}
        <section className="space-y-2.5">
          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wide flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-gray-505" />
            <span>مؤشر الالتزام بالرد (SLA)</span>
          </h4>
          
          <div className={`p-3 rounded-2xl border flex items-center justify-between text-xs font-bold ${
            slaTime.status === 'fulfilled' ? 'bg-emerald-950/20 text-emerald-400 border-emerald-500/10' :
            slaTime.status === 'pending' ? 'bg-amber-950/20 text-amber-400 border-amber-500/10' :
            'bg-red-950/20 text-red-400 border-red-500/15'
          }`}>
            <span>زمن الاستجابة المحدد (30 د)</span>
            <span className="text-[11px] tracking-wide">{slaTime.text}</span>
          </div>
        </section>

        {/* 3. تحليل المشاعر ومستوى الإلحاح */}
        <section className="space-y-3">
          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wide flex items-center gap-2">
            <Smile className="w-3.5 h-3.5 text-gray-505" />
            <span>نبض العميل وتحليل المشاعر</span>
          </h4>
          
          {/* وجوه المشاعر */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setSentiment('positive')}
              className={`py-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                sentiment === 'positive'
                  ? 'bg-emerald-600/15 border-emerald-500/40 text-emerald-400'
                  : 'bg-gray-955/20 border-gray-850 text-gray-500 hover:text-gray-400'
              }`}
            >
              <Smile className="w-4 h-4" />
              <span className="text-[9px] font-bold">سعيد 😊</span>
            </button>
            <button
              onClick={() => setSentiment('neutral')}
              className={`py-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                sentiment === 'neutral'
                  ? 'bg-indigo-600/15 border-indigo-500/40 text-indigo-400'
                  : 'bg-gray-955/20 border-gray-850 text-gray-500 hover:text-gray-400'
              }`}
            >
              <Meh className="w-4 h-4" />
              <span className="text-[9px] font-bold">محايد 😐</span>
            </button>
            <button
              onClick={() => setSentiment('negative')}
              className={`py-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                sentiment === 'negative'
                  ? 'bg-red-600/15 border-red-500/40 text-red-400'
                  : 'bg-gray-955/20 border-gray-850 text-gray-500 hover:text-gray-400'
              }`}
            >
              <Frown className="w-4 h-4" />
              <span className="text-[9px] font-bold">غاضب 😡</span>
            </button>
          </div>

          {/* مستوى الإلحاح */}
          <div className="flex items-center justify-between bg-gray-955/30 border border-gray-850 p-2 rounded-xl mt-2">
            <span className="text-[10px] text-gray-400 font-bold">مستوى إلحاح الطلب:</span>
            <div className="flex gap-1">
              {(['low', 'medium', 'high'] as const).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setUrgency(lvl)}
                  className={`text-[8px] font-extrabold px-2 py-0.5 rounded-md border uppercase transition-all ${
                    urgency === lvl
                      ? lvl === 'high' ? 'bg-red-955/40 text-red-400 border-red-500/30' :
                        lvl === 'medium' ? 'bg-amber-955/40 text-amber-400 border-amber-500/30' :
                        'bg-emerald-955/40 text-emerald-400 border-emerald-500/30'
                      : 'bg-gray-900/20 border-gray-850 text-gray-600'
                  }`}
                >
                  {lvl === 'high' ? 'عاجل 🔴' : lvl === 'medium' ? 'متوسط 🟡' : 'منخفض 🟢'}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* 4. الطلب الحالي والنشط */}
        <section className="space-y-2.5">
          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wide flex items-center gap-2">
            <ShoppingBag className="w-3.5 h-3.5 text-gray-505" />
            <span>الطلب والنشاط المالي الحالي</span>
          </h4>
          
          {latestOrder ? (
            <div className="p-3.5 bg-gray-955/30 border border-gray-850 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-gray-200">
                <span>فاتورة طلب رقم: #{latestOrder.invoice_id}</span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] ${
                  latestOrder.status === 'تسليم ناجح' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/10' : 'bg-amber-950/40 text-amber-400 border border-amber-500/10'
                }`}>
                  {latestOrder.status || 'معلق'}
                </span>
              </div>
              <div className="flex justify-between text-[10px] text-gray-405 font-semibold border-t border-gray-850/50 pt-2">
                <span>القيمة الكلية:</span>
                <span className="text-indigo-300 font-bold">{latestOrder.final_total.toLocaleString()} ج.م</span>
              </div>
            </div>
          ) : (
            <p className="text-[10px] text-gray-500 italic font-semibold">لا تتوفر فواتير مبيعات مسجلة لهذا العميل</p>
          )}
        </section>

        {/* 5. ملاحظات داخلية وتاريخ التواصل */}
        <section className="space-y-3">
          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wide flex items-center gap-2">
            <MessageSquare className="w-3.5 h-3.5 text-gray-505" />
            <span>ملاحظات ملف العميل السحابية</span>
          </h4>

          {contact?.notes ? (
            <div className="p-3 bg-indigo-950/15 border border-indigo-500/10 rounded-2xl text-[10px] text-gray-300 font-semibold leading-relaxed leading-loose">
              {contact.notes}
            </div>
          ) : (
            <p className="text-[10px] text-gray-500 italic">لا توجد ملاحظات عامة في ملف العميل</p>
          )}

          <div className="flex gap-2 mt-2">
            <textarea
              rows={1}
              placeholder="إضافة ملاحظة لملف العميل..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="flex-1 bg-gray-955/40 border border-gray-850 focus:border-indigo-500/50 rounded-xl px-2.5 py-1.5 text-[10px] text-gray-200 placeholder-gray-600 resize-none leading-relaxed outline-none"
            />
            <button
              onClick={handleSaveNote}
              disabled={isSavingNote || !newNote.trim()}
              className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-850 disabled:text-gray-600 text-white rounded-xl transition-all shrink-0 active:scale-95 flex items-center justify-center"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>

        {/* 6. سجل التواصل وتاريخ المشتريات */}
        <section className="space-y-2.5">
          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wide flex items-center gap-2">
            <History className="w-3.5 h-3.5 text-gray-505" />
            <span>سجل التواصل والمبيعات السابقة</span>
          </h4>
          
          <div className="space-y-2.5 text-[9px] font-bold text-gray-400 pl-1 border-r border-gray-800/80 mr-2 pr-3">
            <div className="relative">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 absolute top-1.5 -right-[16.5px]" />
              <p className="text-gray-200">إجمالي المشتريات: {contact?.purchaseCount || 0} طلبات</p>
              <span className="text-[8px] text-gray-500 block mt-0.5">بإجمالي إنفاق: {contact?.totalSpend?.toLocaleString() || 0} ج.م</span>
            </div>
            <div className="relative">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 absolute top-1.5 -right-[16.5px]" />
              <p className="text-gray-300">تم تسجيله في النظام</p>
              <span className="text-[8px] text-gray-500 block mt-0.5">{contact?.createdAt ? new Date(contact.createdAt).toLocaleDateString('ar-EG') : 'غير متوفر'}</span>
            </div>
          </div>
        </section>

        {/* 7. أزرار الإجراءات و تحويل الموظف */}
        <section className="space-y-3 border-t border-gray-800/40 pt-4">
          
          {/* تحويل المحادثة لموظف آخر */}
          <div className="relative">
            <button
              onClick={() => setShowTransferMenu(!showTransferMenu)}
              className="w-full py-2 bg-gray-955/30 hover:bg-gray-900 border border-gray-850 hover:border-gray-700 rounded-xl text-[10px] font-bold text-gray-400 flex items-center justify-center gap-1.5 transition-all"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>تحويل المسؤولية ({assignedEmployee})</span>
            </button>

            {showTransferMenu && (
              <div className="absolute bottom-full mb-1 left-0 right-0 bg-gray-950 border border-gray-850 rounded-2xl shadow-xl z-50 p-2 space-y-1">
                {(employees.length > 0 ? employees.map(e => e.name) : ['عمر البشير', 'أحمد محمود', 'مريم علي', 'خالد مصطفى']).map((emp) => (
                  <button
                    key={emp}
                    onClick={() => handleTransfer(emp)}
                    className="w-full text-right py-1.5 px-3 hover:bg-indigo-600/10 hover:text-indigo-400 rounded-xl text-[10px] font-bold text-gray-400 transition-all block"
                  >
                    {emp}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onUpdateStatus('closed')}
              className="py-2.5 bg-emerald-650/15 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/15 hover:border-transparent rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm shadow-emerald-900/5"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>إغلاق المحادثة</span>
            </button>
            
            <button
              onClick={() => onUpdateStatus('pending')}
              className="py-2.5 bg-amber-655/15 hover:bg-amber-600 text-amber-400 hover:text-white border border-amber-500/15 hover:border-transparent rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm shadow-amber-900/5"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>انتظار / معلق</span>
            </button>
          </div>

          <button
            onClick={onEscalate}
            className="w-full py-2.5 bg-red-655/15 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/15 hover:border-transparent rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm shadow-red-900/5"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>تصعيد الطلب للإدارة ⚠️</span>
          </button>
        </section>

      </div>
    </div>
  );
}
