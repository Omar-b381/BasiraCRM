import React from 'react';
import { Loader2, CheckCircle2, AlertTriangle, Users } from 'lucide-react';
import Button from '../ui/Button';

interface CampaignProgressBarProps {
  current: number;
  total: number;
  lastContactName: string;
  status: 'sending' | 'done' | 'error' | 'idle';
  onClose: () => void;
}

export default function CampaignProgressBar({
  current,
  total,
  lastContactName,
  status,
  onClose
}: CampaignProgressBarProps) {
  if (status === 'idle') return null;

  const percentage = total > 0 ? Math.min(Math.round((current / total) * 100), 100) : 0;
  const isDone = status === 'done' || (current === total && total > 0);

  return (
    <div className="rounded-3xl p-6 border border-white/10 shadow-2xl relative overflow-hidden bg-[#070033] dark-container">
      {/* Decorative gradient overlay */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF6632]/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

      <div className="relative space-y-5" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-2.5">
            {isDone ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : status === 'error' ? (
              <AlertTriangle className="w-5 h-5 text-rose-400" />
            ) : (
              <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
            )}
            <h3 className="text-sm font-bold text-white">
              {isDone ? 'اكتمل إرسال الحملة التسويقية' : 'جاري إرسال الحملة حالياً'}
            </h3>
          </div>
          <span className="text-[10px] text-gray-400 font-semibold bg-white/5 px-2.5 py-1 rounded-full">
            {current} / {total} رسائل
          </span>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs font-semibold">
            <span className="text-orange-400">{percentage}% مكتمل</span>
            <span className="text-gray-400 flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              العدد الإجمالي: {total}
            </span>
          </div>

          <div className="w-full bg-white/5 h-3.5 rounded-full overflow-hidden p-0.5 border border-white/5">
            <div
              className="h-full rounded-full bg-gradient-to-l from-orange-500 to-[#FF6632] shadow-[0_0_12px_rgba(255,102,50,0.5)] transition-all duration-500 ease-out"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* Current / Last processed client */}
        {!isDone && lastContactName && (
          <div className="bg-white/5 rounded-2xl p-3 border border-white/5 flex items-center justify-between">
            <span className="text-[10px] text-gray-400 font-bold">آخر مستلم تم مراسلته:</span>
            <span className="text-xs text-white font-bold">{lastContactName}</span>
          </div>
        )}

        {isDone && (
          <div className="bg-emerald-950/20 border border-emerald-500/10 rounded-2xl p-4 text-center space-y-1">
            <p className="text-emerald-400 text-xs font-bold">تم إنهاء إرسال جميع الرسائل بنجاح!</p>
            <p className="text-[10px] text-gray-400 font-semibold">تم مراعاة فترة التأخير الزمني لحماية رقم الواتساب من الحظر.</p>
          </div>
        )}

        {/* Actions */}
        {isDone && (
          <div className="flex justify-end pt-2">
            <Button
              onClick={onClose}
              className="px-6 py-2 rounded-xl text-white font-bold"
              style={{ background: '#FF6632', boxShadow: '0 4px 16px rgba(255,102,50,0.30)' }}
            >
              إغلاق
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
