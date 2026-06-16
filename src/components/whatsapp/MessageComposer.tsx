import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles } from 'lucide-react';
import Button from '../ui/Button';

interface MessageComposerProps {
  onSend: (body: string) => Promise<boolean>;
  onOpenTemplates: () => void;
  hasTemplates?: boolean;
}

export default function MessageComposer({
  onSend,
  onOpenTemplates,
  hasTemplates = true
}: MessageComposerProps) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // زيادة الارتفاع تلقائياً عند الطباعة
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  const handleSend = async () => {
    const trimmed = message.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    const success = await onSend(trimmed);
    if (success) {
      setMessage('');
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

  return (
    <div className="p-4 border-t border-gray-800 bg-gray-900/10 flex items-end gap-3 backdrop-blur-md">
      {/* زر المبيعات الذكية والقوالب */}
      {hasTemplates && (
        <button
          onClick={onOpenTemplates}
          title="قوالب واتساب الذكية المخصصة للعميل"
          className="p-3 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded-xl transition-all border border-indigo-500/15 shrink-0 active:scale-95 flex items-center justify-center"
        >
          <Sparkles className="w-5 h-5 animate-pulse" />
        </button>
      )}

      {/* حقل الإدخال */}
      <div className="flex-1 bg-gray-950/40 border border-gray-800/80 rounded-2xl overflow-hidden focus-within:border-indigo-500/50 transition-all duration-200">
        <textarea
          ref={textareaRef}
          rows={1}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="اكتب رسالتك هنا..."
          className="w-full bg-transparent border-0 px-4 py-3.5 text-xs text-gray-200 focus:outline-none resize-none font-semibold leading-relaxed placeholder-gray-500"
          style={{ minHeight: '44px', maxHeight: '120px' }}
        />
      </div>

      {/* زر الإرسال */}
      <Button
        onClick={handleSend}
        disabled={!message.trim()}
        isLoading={isSending}
        className="h-[44px] px-5 rounded-2xl"
        icon={<Send className="w-4 h-4 rotate-180" />}
      >
        إرسال
      </Button>
    </div>
  );
}
