import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Paperclip, Languages, Brain, Lock, X, FileText } from 'lucide-react';
import Button from '../ui/Button';
import { supabase } from '../../lib/supabase';

interface AttachmentFile {
  name: string;
  url: string;
  type: 'image' | 'document';
}

interface MessageComposerProps {
  onSend: (body: string, isInternal?: boolean, mediaUrl?: string, messageType?: string, fileName?: string) => Promise<boolean>;
  onOpenTemplates: () => void;
  hasTemplates?: boolean;
  lastMessageText?: string;
  quickReplies?: string[];
}

const DEFAULT_QUICK_REPLIES = [
  "أهلاً بك يا فندم، كيف يمكنني مساعدتك اليوم؟",
  "تم استلام طلبك وجاري التجهيز للشحن.",
  "يرجى تزويدنا بالعنوان التفصيلي ورقم الهاتف للتوصيل.",
  "شكراً لتعاملك معنا، يسعدنا دائماً خدمتك."
];

export default function MessageComposer({
  onSend,
  onOpenTemplates,
  hasTemplates = true,
  lastMessageText = '',
  quickReplies = []
}: MessageComposerProps) {
  const repliesToUse = quickReplies.length > 0 ? quickReplies : DEFAULT_QUICK_REPLIES;
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isInternal, setIsInternal] = useState(false);
  const [attachment, setAttachment] = useState<AttachmentFile | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showAiToast, setShowAiToast] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // زيادة الارتفاع تلقائياً عند الطباعة
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  const handleSend = async () => {
    let trimmed = message.trim();
    if (!trimmed && !attachment) return;

    setIsSending(true);

    let success = false;
    if (attachment) {
      // إرسال المرفق أولاً
      success = await onSend('', isInternal, attachment.url, attachment.type, attachment.name);
      
      // إذا كان هناك نص مكتوب كشرح، نرسله بعد المرفق كرسالة منفصلة
      if (success && trimmed) {
        await onSend(trimmed, isInternal);
      }
    } else {
      success = await onSend(trimmed, isInternal);
    }

    if (success) {
      setMessage('');
      setAttachment(null);
      setIsInternal(false);
      textareaRef.current?.focus();
    }
    setIsSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // اقتراح ذكي بالرد يعتمد على الكلمات المفتاحية للرسالة الأخيرة
  const handleSmartReply = () => {
    const text = lastMessageText.toLowerCase();
    let reply = "أهلاً بك يا فندم، تم استلام رسالتك وجاري مراجعة طلبكم للتنسيق الفوري.";

    if (text.includes('سعر') || text.includes('بكم') || text.includes('حساب')) {
      reply = "أهلاً بك يا فندم، تتوفر أسعار المنتجات والخيارات في القائمة المنسدلة للفواتير، وتتراوح الأسعار حسب الصنف والكمية المحددة.";
    } else if (text.includes('شحن') || text.includes('توصيل') || text.includes('شاحن') || text.includes('متى')) {
      reply = "أهلاً بك يا فندم، يتم شحن طلبكم وتجهيزه للتسليم خلال 24 إلى 48 ساعة عمل كحد أقصى وسيتم التواصل معكم للتسليم.";
    } else if (text.includes('سلام') || text.includes('مرحبا') || text.includes('أهلا') || text.includes('مساء') || text.includes('صباح')) {
      reply = "وعليكم السلام ورحمة الله وبركاته، أهلاً ومرحباً بك في بصيرة CRM! كيف يمكنني مساعدتك اليوم يا فندم؟";
    }

    setMessage(reply);
    setShowAiToast(true);
    setTimeout(() => setShowAiToast(false), 3000);
  };

  // ترجمة النص المكتوب
  const handleTranslate = () => {
    if (!message.trim()) return;
    
    // محاكاة الترجمة للعبارات الشائعة
    const text = message.trim();
    let translation = text;

    if (text.startsWith('أهلاً')) {
      translation = "Hello! How can I help you today?";
    } else if (text.startsWith('شكراً')) {
      translation = "Thank you for choosing us!";
    } else if (text.startsWith('تم استلام')) {
      translation = "Your order has been received and is being prepared.";
    } else {
      translation = `${text} (Translated)`;
    }

    setMessage(translation);
  };

  // إرفاق ملف حقيقي ورفعه إلى Supabase
  const handleAttachFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      let publicUrl = '';
      let uploadedToSupabase = false;

      // 1. محاولة الرفع أولاً على Supabase Storage
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
        const filePath = `uploads/${fileName}`;

        const { data, error } = await supabase.storage
          .from('whatsapp-media')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true
          });

        if (!error) {
          const { data: urlData } = supabase.storage.from('whatsapp-media').getPublicUrl(filePath);
          publicUrl = urlData.publicUrl;
          uploadedToSupabase = true;
          console.log('Uploaded successfully to Supabase Storage:', publicUrl);
        } else {
          console.warn('Supabase storage upload failed, falling back to tmpfiles.org:', error.message);
        }
      } catch (sbErr) {
        console.warn('Supabase storage exception, falling back to tmpfiles.org:', sbErr);
      }

      // 2. إذا لم يتم الرفع على Supabase (بسبب عدم تهيئة الحاوية أو RLS)، نستخدم tmpfiles.org كبديل تلقائي وسريع
      if (!uploadedToSupabase) {
        console.log('Uploading to tmpfiles.org fallback...');
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('https://tmpfiles.org/api/v1/upload', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          throw new Error(`فشل الرفع البديل: ${response.statusText}`);
        }

        const resData = await response.json();
        if (resData.status === 'success' && resData.data?.url) {
          const rawUrl = resData.data.url;
          // تحويل الرابط إلى رابط مباشر قابل للتحميل من قبل Twilio/Meta
          publicUrl = rawUrl.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
          console.log('Uploaded successfully to tmpfiles.org (fallback):', publicUrl);
        } else {
          throw new Error('فشل الرفع البديل: رد غير متوقع من الخادم');
        }
      }

      // 3. تحديد نوع الملف
      const isImg = file.type.startsWith('image/');
      
      setAttachment({
        name: file.name,
        url: publicUrl,
        type: isImg ? 'image' : 'document'
      });
    } catch (err) {
      console.error('File upload exception:', err);
      alert(err instanceof Error ? err.message : 'حدث خطأ أثناء رفع الملف.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="p-4 border-t border-gray-800 bg-gray-900/10 flex flex-col gap-3 backdrop-blur-md relative">
      
      {/* مدخل ملف مخفي */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />

      {/* توست الذكاء الاصطناعي */}
      {showAiToast && (
        <div className="absolute top-[-45px] right-4 bg-indigo-650/90 text-white text-[10px] font-bold px-3 py-1.5 rounded-xl border border-indigo-500/30 flex items-center gap-1.5 animate-bounce shadow-lg">
          <Brain className="w-3.5 h-3.5 text-amber-400" />
          <span>تم توليد الرد الذكي المقترح بنجاح!</span>
        </div>
      )}

      {/* الردود السريعة */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {repliesToUse.map((reply, idx) => (
          <button
            key={idx}
            onClick={() => setMessage(reply)}
            className="text-[10px] font-bold bg-gray-955/40 hover:bg-indigo-600/10 border border-gray-850 hover:border-indigo-500/20 text-gray-400 hover:text-white px-2.5 py-1.5 rounded-xl transition-all shrink-0 active:scale-95"
          >
            {reply.length > 30 ? reply.substring(0, 30) + '...' : reply}
          </button>
        ))}
      </div>

      {/* شريط أدوات الكتابة */}
      <div className="flex items-center justify-between border-t border-gray-800/40 pt-2 pb-0.5">
        <div className="flex items-center gap-2">
          {/* القوالب الجاهزة */}
          {hasTemplates && (
            <button
              onClick={onOpenTemplates}
              title="قوالب واتساب الذكية"
              className="p-2 bg-gray-950/40 hover:bg-indigo-600/10 text-indigo-400 border border-gray-850 hover:border-indigo-500/20 rounded-xl transition-all active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
            </button>
          )}

          {/* المرفقات */}
          <button
            onClick={handleAttachFile}
            disabled={isUploading}
            title="إرفاق ملف أو صورة"
            className={`p-2 border rounded-xl transition-all active:scale-95 ${
              attachment 
                ? 'bg-emerald-600/10 text-emerald-400 border-emerald-500/30' 
                : 'bg-gray-950/40 hover:bg-gray-900 text-gray-500 border-gray-850'
            }`}
          >
            <Paperclip className="w-3.5 h-3.5" />
          </button>

          {/* اقتراح ذكي بالرد */}
          <button
            onClick={handleSmartReply}
            title="اقتراح ذكي بالرد (AI)"
            className="p-2 bg-gray-950/40 hover:bg-indigo-600/10 text-amber-400 border border-gray-850 hover:border-amber-500/20 rounded-xl transition-all active:scale-95"
          >
            <Brain className="w-3.5 h-3.5" />
          </button>

          {/* ترجمة */}
          <button
            onClick={handleTranslate}
            title="ترجمة النص المكتوب"
            className="p-2 bg-gray-950/40 hover:bg-indigo-600/10 text-cyan-400 border border-gray-850 hover:border-cyan-500/20 rounded-xl transition-all active:scale-95"
          >
            <Languages className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* زر ملاحظة داخلية */}
        <button
          onClick={() => setIsInternal(!isInternal)}
          className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-xl text-[10px] font-bold transition-all active:scale-95 ${
            isInternal
              ? 'bg-amber-600/10 text-amber-400 border-amber-500/30 shadow-inner'
              : 'bg-gray-950/40 hover:bg-gray-900 text-gray-500 border-gray-850'
          }`}
        >
          <Lock className="w-3 h-3" />
          <span>كتابة ملاحظة داخلية للموظفين</span>
        </button>
      </div>

      {/* المرفق المحدد أو جاري الرفع */}
      {isUploading && (
        <div className="flex items-center gap-2 bg-gray-950/40 border border-gray-800 p-2 rounded-xl text-[10px] text-indigo-400 font-bold">
          <svg className="animate-spin h-3.5 w-3.5 text-indigo-500 shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>جاري رفع المرفق...</span>
        </div>
      )}

      {attachment && (
        <div className="flex items-center gap-2 bg-emerald-950/20 border border-emerald-500/15 p-2 rounded-xl text-[10px] text-emerald-400 font-bold justify-between font-sans">
          <div className="flex items-center gap-1.5 min-w-0">
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{attachment.name}</span>
          </div>
          <button onClick={() => setAttachment(null)} className="hover:text-emerald-300 shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* حقل الإدخال والإرسال */}
      <div className="flex items-end gap-3">
        <div className={`flex-1 bg-gray-950/40 border rounded-2xl overflow-hidden transition-all duration-200 ${
          isInternal 
            ? 'border-amber-500/50 bg-amber-955/5 focus-within:border-amber-500' 
            : 'border-gray-800/80 focus-within:border-indigo-500/50'
        }`}>
          <textarea
            ref={textareaRef}
            rows={1}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isInternal ? "اكتب ملاحظة داخلية للفريق..." : "اكتب رسالتك هنا..."}
            className="w-full bg-transparent border-0 px-4 py-3 text-xs text-gray-200 focus:outline-none resize-none font-semibold leading-relaxed placeholder-gray-500"
            style={{ minHeight: '40px', maxHeight: '120px' }}
          />
        </div>

        <Button
          onClick={handleSend}
          disabled={(!message.trim() && !attachment) || isUploading}
          isLoading={isSending}
          className={`h-[40px] px-5 rounded-2xl ${isInternal ? 'bg-amber-600 hover:bg-amber-500 text-white' : ''}`}
          icon={<Send className="w-4 h-4 rotate-180" />}
        >
          {isInternal ? 'حفظ الملاحظة' : 'إرسال'}
        </Button>
      </div>
    </div>
  );
}
