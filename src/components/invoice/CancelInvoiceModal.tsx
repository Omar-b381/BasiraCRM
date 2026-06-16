import React, { useState } from 'react';
import { Ban, Loader2 } from 'lucide-react';

export default function CancelInvoiceModal({
  invoiceId,
  onClose,
  onCancelled,
}: {
  invoiceId: number;
  onClose: () => void;
  onCancelled: () => void;
}) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const confirmCancel = async () => {
    setLoading(true);
    setError('');
    const result = await window.electronAPI.invoice.cancel(invoiceId, reason.trim() || undefined);
    if (result.success) {
      onCancelled();
    } else {
      setError(result.error || 'فشل إلغاء الفاتورة');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-6" dir="rtl">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-950/30 flex items-center justify-center shrink-0 border border-red-850">
            <Ban className="w-5 h-5 text-red-400" />
          </div>
          <h3 className="text-white font-semibold text-sm">إلغاء الفاتورة رقم #{invoiceId}</h3>
        </div>

        <p className="text-slate-400 text-xs mb-4 leading-relaxed">
          سيتم تغيير حالة الفاتورة إلى "ملغاة". لن يتم حذفها نهائياً وستظل في السجل المالي لأغراض التتبع والتدقيق المحاسبي.
        </p>

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="سبب الإلغاء (اختياري)..."
          rows={2}
          className="w-full bg-slate-950 text-white rounded-xl px-4 py-2.5 text-sm outline-none border border-slate-800 focus:border-indigo-500 resize-none mb-4"
        />

        {error && <p className="text-red-400 text-xs mb-3 font-semibold">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 bg-slate-850 hover:bg-slate-800 text-slate-350 py-2.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
          >
            تراجع
          </button>
          <button
            onClick={confirmCancel}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-550 text-white py-2.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Ban className="w-4 h-4" />
            )}
            تأكيد الإلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
