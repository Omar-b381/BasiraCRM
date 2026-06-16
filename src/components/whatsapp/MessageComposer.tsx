import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Paperclip, Languages, Brain, Lock, X, FileText } from 'lucide-react';
import Button from '../ui/Button';

interface MessageComposerProps {
  onSend: (body: string, isInternal?: boolean) => Promise<boolean>;
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
  const [attachment, setAttachment] = useState<string | null>(null);
  const [showAiToast, setShowAiToast] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

    if (attachment) {
      trimmed = `${trimmed}\n[مرفق: ${attachment}]`.trim();
    }

    setIsSending(true);
    const success = await onSend(trimmed, isInternal);
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

  // محاكاة إرفاق ملف
  const handleAttachFile = () => {
    const files = ['صورة_الفاتورة.png', 'تفاصيل_الشحن.pdf', 'صورة_المنتج.jpg'];
    const randomFile = files[Math.floor(Math.random() * files.length)];
    setAttachment(randomFile);
  };

  return (
    <div className="p-4 border-t border-gray-800 bg-gray-900/10 flex flex-col gap-3 backdrop-blur-md relative">
      
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

      {/* المرفق المحدد */}
      {attachment && (
        <div className="flex items-center gap-2 bg-emerald-950/20 border border-emerald-500/15 p-2 rounded-xl text-[10px] text-emerald-400 font-bold justify-between">
          <div className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            <span>{attachment}</span>
          </div>
          <button onClick={() => setAttachment(null)} className="hover:text-emerald-350">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* حقل الإدخال والإرسال */}
      <div className="flex items-end gap-3">
        <div className={`flex-1 bg-gray-950/40 border rounded-2xl overflow-hidden transition-all duration-200 ${
          isInternal 
            ? 'border-amber-500/50 bg-amber-950/5 focus-within:border-amber-500' 
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
          disabled={!message.trim() && !attachment}
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
