import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default function ConfirmDeleteItemModal({
  itemName,
  onConfirm,
  onCancel,
}: {
  itemName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-6" dir="rtl">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-950/30 flex items-center justify-center shrink-0 border border-red-850">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <h3 className="text-white font-semibold text-sm">تأكيد حذف البند</h3>
        </div>
        <p className="text-slate-400 text-xs mb-6 leading-relaxed">
          هل أنت متأكد من حذف البند "<span className="text-slate-100 font-medium">{itemName}</span>"؟
          سيتم تطبيق الحذف فعلياً عند الضغط على "حفظ التعديلات".
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 bg-slate-850 hover:bg-slate-800 text-slate-300 py-2.5 rounded-xl text-xs font-semibold transition-all"
          >
            إلغاء
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-red-650 hover:bg-red-650/90 text-white py-2.5 rounded-xl text-xs font-semibold transition-all"
          >
            تأكيد الحذف
          </button>
        </div>
      </div>
    </div>
  );
}
