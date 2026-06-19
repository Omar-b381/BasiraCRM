import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Calendar, MessageSquare, Send, Users, ChevronRight, HelpCircle } from 'lucide-react';
import { RFM_SEGMENTS_CONFIG } from '../../types/rfm.types';
import type { RFMSegment } from '../../types/contact.types';
import CampaignPreview from './CampaignPreview';
import Button from '../ui/Button';
import Input from '../ui/Input';

interface CampaignBuilderProps {
  analyzedContacts: any[];
  providers: any[];
  initialSegment?: RFMSegment;
  initialTemplate?: string;
  onStartCampaign: (payload: {
    name: string;
    segment: string;
    template: string;
    providerId: number | null;
    scheduledAt: string | null;
    contacts: any[];
  }) => void;
  isLoading: boolean;
}

export default function CampaignBuilder({
  analyzedContacts,
  providers,
  initialSegment = 'champions',
  initialTemplate = '',
  onStartCampaign,
  isLoading
}: CampaignBuilderProps) {
  const [name, setName] = useState('');
  const [selectedSegment, setSelectedSegment] = useState<RFMSegment>(initialSegment);
  const [template, setTemplate] = useState(initialTemplate);
  const [selectedProviderId, setSelectedProviderId] = useState<number | null>(null);
  const [sendMode, setSendMode] = useState<'now' | 'schedule'>('now');
  const [scheduledAt, setScheduledAt] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync initial values
  useEffect(() => {
    if (initialSegment) {
      setSelectedSegment(initialSegment);
    }
  }, [initialSegment]);

  useEffect(() => {
    if (initialTemplate) {
      setTemplate(initialTemplate);
    } else {
      const defaultTemplate = RFM_SEGMENTS_CONFIG[selectedSegment]?.whatsappTemplate || '';
      setTemplate(defaultTemplate);
    }
  }, [selectedSegment, initialTemplate]);

  // Set default provider if available
  useEffect(() => {
    if (providers && providers.length > 0) {
      // Find default provider or take first
      const defaultProv = providers.find(p => p.is_default) || providers[0];
      setSelectedProviderId(defaultProv.id);
    }
  }, [providers]);

  // Set default campaign name
  useEffect(() => {
    const segmentName = RFM_SEGMENTS_CONFIG[selectedSegment]?.nameAr || selectedSegment;
    setName(`حملة استهداف: ${segmentName} - ${new Date().toLocaleDateString('ar-EG')}`);
  }, [selectedSegment]);

  // Filter contacts by selected segment
  const targetedContacts = analyzedContacts.filter(
    (c) => (c.rfmScore?.segment || 'lost') === selectedSegment
  );

  // Insert template variables
  const insertVariable = (variable: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const startPos = textarea.selectionStart;
    const endPos = textarea.selectionEnd;
    const text = textarea.value;

    const newText = text.substring(0, startPos) + variable + text.substring(endPos);
    setTemplate(newText);

    // Reset cursor position after React update
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = startPos + variable.length;
      textarea.selectionEnd = startPos + variable.length;
    }, 10);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (!template.trim()) return;
    if (targetedContacts.length === 0) return;

    onStartCampaign({
      name,
      segment: selectedSegment,
      template,
      providerId: selectedProviderId,
      scheduledAt: sendMode === 'schedule' ? new Date(scheduledAt).toISOString() : null,
      contacts: targetedContacts
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" dir="rtl">
      {/* Form Section */}
      <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-6">
        {/* Basic Campaign Info */}
        <section className="glass rounded-3xl p-6 space-y-5">
          <div className="border-b border-white/5 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-orange-500" />
              إعدادات الحملة الأساسية
            </h3>
            <p className="text-[10px] text-gray-400 mt-0.5">أدخل تفاصيل حملتك التسويقية والجمهور المستهدف</p>
          </div>

          <div className="space-y-4">
            <Input
              label="اسم الحملة التسويقية"
              placeholder="مثال: عروض نهاية العام لشريحة الأبطال"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">شريحة العملاء المستهدفة</label>
                <select
                  value={selectedSegment}
                  onChange={(e) => setSelectedSegment(e.target.value as RFMSegment)}
                  className="w-full bg-gray-900/50 border border-gray-800 text-xs text-gray-100 focus:outline-none focus:ring-1 focus:ring-orange-500 p-3.5 rounded-2xl font-bold"
                >
                  {Object.entries(RFM_SEGMENTS_CONFIG).map(([key, value]) => (
                    <option key={key} value={key} style={{ color: '#070033' }}>
                      {value.nameAr} ({value.description})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">قناة الإرسال (واتساب)</label>
                <select
                  value={selectedProviderId || ''}
                  onChange={(e) => setSelectedProviderId(Number(e.target.value) || null)}
                  className="w-full bg-gray-900/50 border border-gray-800 text-xs text-gray-100 focus:outline-none focus:ring-1 focus:ring-orange-500 p-3.5 rounded-2xl font-bold"
                >
                  {providers.map((p) => (
                    <option key={p.id} value={p.id} style={{ color: '#070033' }}>
                      {p.name} ({p.type === 'meta' ? 'Meta Cloud API' : 'Twilio API'}) {p.is_default ? '⭐' : ''}
                    </option>
                  ))}
                  {providers.length === 0 && (
                    <option value="" style={{ color: '#070033' }}>لا يوجد قنوات ربط نشطة</option>
                  )}
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* Message Formatting */}
        <section className="glass rounded-3xl p-6 space-y-4">
          <div className="border-b border-white/5 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-orange-500" />
              محتوى الرسالة والتخصيص
            </h3>
            <p className="text-[10px] text-gray-400 mt-0.5">قم بصياغة نص الرسالة واستعمال المتغيرات الديناميكية</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-gray-400 font-bold ml-1">إدراج متغير:</span>
              <button
                type="button"
                onClick={() => insertVariable('{name}')}
                className="bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 text-[10px] px-3 py-1.5 rounded-full border border-orange-500/20 font-bold transition-all"
              >
                اسم العميل {"{name}"}
              </button>
            </div>

            <div>
              <textarea
                ref={textareaRef}
                rows={6}
                placeholder="اكتب رسالتك التسويقية هنا..."
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                className="w-full bg-gray-900/50 border border-gray-800 text-xs text-gray-100 focus:outline-none focus:ring-1 focus:ring-orange-500 p-4 rounded-2xl leading-relaxed resize-none font-medium"
                required
              />
              <span className="text-[9px] text-gray-500 block mt-1 leading-relaxed">
                * سيتم تلقائياً تصفية رقم العميل وصيغته لإرسالها بالشكل الصحيح برمجياً.
              </span>
            </div>
          </div>
        </section>

        {/* Scheduling Options */}
        <section className="glass rounded-3xl p-6 space-y-5">
          <div className="border-b border-white/5 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-orange-500" />
              وقت الإطلاق والجدولة
            </h3>
            <p className="text-[10px] text-gray-400 mt-0.5">اختر ما إذا كنت ترغب في إطلاق الحملة الآن أو جدولتها لوقت لاحق</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2.5">
              <label className="flex items-center gap-2 text-xs font-bold text-gray-100 cursor-pointer bg-gray-900/5 p-3.5 rounded-2xl border border-gray-800 hover:border-orange-500/30 transition-all">
                <input
                  type="radio"
                  name="sendMode"
                  checked={sendMode === 'now'}
                  onChange={() => setSendMode('now')}
                  className="accent-orange-500"
                />
                <span>إطلاق الحملة فوراً الآن</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-bold text-gray-100 cursor-pointer bg-gray-900/5 p-3.5 rounded-2xl border border-gray-800 hover:border-orange-500/30 transition-all">
                <input
                  type="radio"
                  name="sendMode"
                  checked={sendMode === 'schedule'}
                  onChange={() => setSendMode('schedule')}
                  className="accent-orange-500"
                />
                <span>جدولة الحملة (وقت لاحق)</span>
              </label>
            </div>

            {sendMode === 'schedule' && (
              <div className="animate-fade-in">
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">تاريخ ووقت الإرسال المجدول</label>
                <input
                  type="datetime-local"
                  required
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full bg-gray-900/50 border border-gray-800 text-xs text-gray-100 focus:outline-none focus:ring-1 focus:ring-orange-500 p-3.5 rounded-2xl font-bold"
                  min={new Date().toISOString().substring(0, 16)}
                />
              </div>
            )}
          </div>
        </section>

        {/* Submit Section */}
        <div className="flex items-center justify-between bg-white/5 p-4 rounded-3xl border border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
              <Users className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">المستلمون في الشريحة</p>
              <p className="text-[10px] text-gray-400 font-semibold">{targetedContacts.length} عملاء سيصلهم العرض</p>
            </div>
          </div>

          <Button
            type="submit"
            isLoading={isLoading}
            disabled={targetedContacts.length === 0 || providers.length === 0}
            className="px-8 py-3 rounded-2xl text-white font-bold"
            style={{ background: '#FF6632', boxShadow: '0 4px 16px rgba(255,102,50,0.30)' }}
            icon={<Send className="w-4 h-4 rotate-180" />}
          >
            {sendMode === 'schedule' ? 'حفظ وجدولة الحملة' : 'بدء إطلاق الحملة الآن'}
          </Button>
        </div>
      </form>

      {/* Preview Section */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        <div className="h-[420px]">
          <CampaignPreview templateContent={template} />
        </div>

        {/* Selected Segment Info Summary */}
        <div className="bg-[#0b141a]/60 border border-white/5 rounded-3xl p-5 space-y-3 flex-1 dark-container">
          <h4 className="text-xs font-bold text-white border-b border-white/5 pb-2">تفاصيل الشريحة والعملاء</h4>
          
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-400 font-medium">اسم الشريحة:</span>
            <span 
              className="px-2.5 py-1 rounded-full text-[10px] font-bold" 
              style={{
                color: RFM_SEGMENTS_CONFIG[selectedSegment]?.color,
                backgroundColor: `${RFM_SEGMENTS_CONFIG[selectedSegment]?.color}15`
              }}
            >
              {RFM_SEGMENTS_CONFIG[selectedSegment]?.nameAr}
            </span>
          </div>

          <div className="flex justify-between items-start text-xs leading-relaxed">
            <span className="text-gray-400 font-medium shrink-0">التوصية التسويقية:</span>
            <span className="text-gray-300 font-semibold text-left max-w-[70%]">
              {RFM_SEGMENTS_CONFIG[selectedSegment]?.recommendedAction}
            </span>
          </div>

          {targetedContacts.length > 0 ? (
            <div className="pt-2 border-t border-white/5">
              <p className="text-[10px] text-gray-400 font-bold mb-2">عينة من العملاء في هذه الشريحة ({targetedContacts.length}):</p>
              <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                {targetedContacts.slice(0, 5).map((contact, idx) => (
                  <div key={contact.id || idx} className="flex justify-between items-center text-[10px] bg-white/5 p-2 rounded-xl border border-white/5">
                    <span className="text-white font-bold">{contact.name}</span>
                    <span className="text-gray-400 font-semibold">{contact.phone}</span>
                  </div>
                ))}
                {targetedContacts.length > 5 && (
                  <div className="text-center text-[9px] text-gray-500 font-medium pt-1">
                    + وآخرين ({targetedContacts.length - 5} عميل إضافي)
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-3 bg-orange-950/20 border border-orange-500/10 rounded-2xl text-[10px] text-orange-400 leading-relaxed font-semibold">
              ⚠️ لا يوجد أي عملاء مسجلين في هذه الشريحة حالياً. يرجى تحديث تحليل RFM أولاً.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
