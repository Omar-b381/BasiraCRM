import React from 'react';
import { Lock, RefreshCw } from 'lucide-react';
import { useInvoiceEditStore } from '../../store/useInvoiceEditStore';

export default function EditCustomerInfoPanel() {
  const { state, updateCustomerField, toggleSyncProfile } = useInvoiceEditStore();
  if (!state) return null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
      <h3 className="text-white font-semibold mb-4 text-sm">بيانات العميل</h3>

      <div className="mb-4">
        <label className="flex items-center gap-1.5 text-xs text-slate-400 mb-1.5">
          <Lock className="w-3.5 h-3.5 text-slate-500" />
          اسم العميل (غير قابل للتعديل من هنا)
        </label>
        <input
          value={state.customer_name}
          disabled
          className="w-full bg-slate-950 text-slate-550 rounded-xl px-4 py-2.5 text-sm border border-slate-850 cursor-not-allowed"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">رقم الهاتف الأساسي</label>
          <input
            value={state.customer_phone}
            onChange={(e) => updateCustomerField('customer_phone', e.target.value)}
            dir="ltr"
            className="w-full bg-slate-950 text-white rounded-xl px-4 py-2.5 text-sm outline-none border border-slate-800 focus:border-indigo-500 font-mono"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">رقم هاتف إضافي</label>
          <input
            value={state.customer_phone_2}
            onChange={(e) => updateCustomerField('customer_phone_2', e.target.value)}
            placeholder="إضافة رقم ثانٍ..."
            dir="ltr"
            className="w-full bg-slate-950 text-white rounded-xl px-4 py-2.5 text-sm outline-none border border-slate-800 focus:border-indigo-500 font-mono"
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-xs text-slate-400 mb-1.5">العنوان</label>
        <textarea
          value={state.customer_address}
          onChange={(e) => updateCustomerField('customer_address', e.target.value)}
          rows={2}
          className="w-full bg-slate-950 text-white rounded-xl px-4 py-2.5 text-sm outline-none border border-slate-800 focus:border-indigo-500 resize-none"
        />
      </div>

      {state.customer_id && (
        <label className="flex items-start gap-2.5 bg-blue-950/25 border border-blue-800/40 rounded-xl p-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={state.syncCustomerProfile}
            onChange={(e) => toggleSyncProfile(e.target.checked)}
            className="mt-0.5 accent-indigo-650"
          />
          <span className="text-blue-300 text-xs flex items-center gap-1.5 leading-relaxed">
            <RefreshCw className="w-3.5 h-3.5 shrink-0 text-blue-400" />
            تحديث ملف العميل الأصلي أيضاً (سيؤثر على فواتيره القادمة)
          </span>
        </label>
      )}
    </div>
  );
}
