import React from 'react';
import { Send, CheckCheck } from 'lucide-react';

interface CampaignPreviewProps {
  templateContent: string;
  testCustomerName?: string;
}

export default function CampaignPreview({
  templateContent,
  testCustomerName = 'عبد الله أحمد'
}: CampaignPreviewProps) {
  // Replace {name} with a sample name or placeholder
  const formattedContent = templateContent
    ? templateContent.replace(/{name}/g, testCustomerName)
    : 'محتوى الرسالة سيظهر هنا...';

  // Format line breaks for HTML rendering
  const paragraphs = formattedContent.split('\n').map((line, index) => (
    <React.Fragment key={index}>
      {line}
      {index < formattedContent.split('\n').length - 1 && <br />}
    </React.Fragment>
  ));

  const timeString = new Date().toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  return (
    <div className="flex flex-col h-full bg-[#0a071e]/40 border border-white/5 rounded-3xl overflow-hidden shadow-2xl dark-container">
      {/* WhatsApp Header Mock */}
      <div className="bg-[#0b141a] px-4 py-3 flex items-center gap-3 border-b border-white/5">
        <div className="w-9 h-9 rounded-full bg-[#128c7e] flex items-center justify-center text-white text-xs font-bold shadow-md">
          WA
        </div>
        <div className="flex-1 text-right">
          <p className="text-white text-xs font-bold leading-tight">معاينة الحملة (واتساب)</p>
          <span className="text-[9px] text-emerald-400 font-semibold flex items-center justify-end gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            متصل الآن
          </span>
        </div>
      </div>

      {/* WhatsApp Chat Background Doodled */}
      <div 
        className="flex-1 p-4 overflow-y-auto space-y-3 min-h-[220px] flex flex-col justify-end relative"
        style={{
          backgroundColor: '#0b141a',
          backgroundImage: `radial-gradient(circle at 10% 20%, rgba(18, 140, 126, 0.05) 0%, transparent 90%), radial-gradient(circle at 90% 80%, rgba(255, 102, 50, 0.03) 0%, transparent 90%)`
        }}
      >
        <div className="self-center bg-[#182229] border border-white/5 text-gray-400 text-[9px] px-2.5 py-1 rounded-md mb-4 text-center font-medium max-w-[80%] shadow-sm">
          🔒 الرسائل مشفرة تماماً بين الطرفين.
        </div>

        {/* Message Bubble */}
        <div className="self-start max-w-[85%] bg-[#005c4b] text-white rounded-2xl rounded-tr-none px-3.5 py-2 relative shadow-md leading-relaxed text-xs text-right animate-fade-in border border-emerald-600/20">
          <div className="whitespace-pre-line text-white font-medium break-words">
            {paragraphs}
          </div>
          
          {/* Timestamp and Double Check */}
          <div className="flex items-center justify-end gap-1 mt-1 text-[8px] text-white/60">
            <span>{timeString}</span>
            <CheckCheck className="w-3 h-3 text-sky-400" />
          </div>

          {/* Bubble Tail */}
          <div 
            className="absolute top-0 right-0 w-2 h-3"
            style={{
              content: '""',
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderTop: '8px solid #005c4b',
              transform: 'translateX(50%)'
            }}
          />
        </div>
      </div>

      {/* Footer Mock */}
      <div className="bg-[#101d25] px-4 py-3 flex items-center gap-2 border-t border-white/5">
        <div className="flex-1 bg-[#2a3942] rounded-full px-4 py-1.5 text-[10px] text-gray-400 text-right font-medium">
          اكتب رسالة...
        </div>
        <div className="w-7 h-7 rounded-full bg-[#00a884] flex items-center justify-center shadow-lg text-white">
          <Send className="w-3.5 h-3.5 rotate-180" />
        </div>
      </div>
    </div>
  );
}
