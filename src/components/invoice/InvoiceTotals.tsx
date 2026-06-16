import React from 'react';
import { useInvoiceStore } from '../../store/useInvoiceStore';
import { formatCurrency } from '../../lib/invoiceCalculations';

const STATUS_OPTIONS = [
  'قيد الانتظار',
  'مؤكدة',
  'تم الشحن',
  'تم التسليم',
  'ملغاة',
  'مرتجعة',
];

export default function InvoiceTotals() {
  const { draft, setDiscount, setShipping, setNotes, setStatus } = useInvoiceStore();

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
      <h3 className="text-white font-semibold">الإجماليات والحالة</h3>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-slate-400 mb-1.5">الخصم (ج.م)</label>
          <input
            type="number"
            min={0}
            value={draft.discount_amount === 0 ? '' : draft.discount_amount}
            onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
            placeholder="0.00"
            className="w-full bg-slate-950 text-white rounded-lg px-4 py-2.5 text-sm outline-none border border-slate-800 focus:border-indigo-500 font-mono"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1.5">تكلفة الشحن (ج.م)</label>
          <input
            type="number"
            min={0}
            value={draft.shipping_cost === 0 ? '' : draft.shipping_cost}
            onChange={(e) => setShipping(parseFloat(e.target.value) || 0)}
            placeholder="0.00"
            className="w-full bg-slate-950 text-white rounded-lg px-4 py-2.5 text-sm outline-none border border-slate-800 focus:border-indigo-500 font-mono"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm text-slate-400 mb-1.5">حالة الفاتورة</label>
        <select
          value={draft.status}
          onChange={(e) => setStatus(e.target.value as typeof draft.status)}
          className="w-full bg-slate-950 text-white rounded-lg px-4 py-2.5 text-sm outline-none border border-slate-800 focus:border-indigo-500 cursor-pointer"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s} className="bg-slate-900 text-white">
              {s}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm text-slate-400 mb-1.5">ملاحظات الفاتورة</label>
        <textarea
          value={draft.notes || ''}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="شروط التسليم، مواعيد الاستلام، أو تفاصيل شحن إضافية..."
          className="w-full bg-slate-950 text-white rounded-lg px-4 py-2.5 text-sm outline-none border border-slate-800 focus:border-indigo-500 resize-none"
        />
      </div>

      <div className="border-t border-slate-800 pt-4 space-y-3">
        <div className="flex justify-between text-slate-400 text-sm">
          <span>إجمالي المنتجات</span>
          <span className="font-mono">{formatCurrency(draft.sub_total)}</span>
        </div>
        {draft.discount_amount > 0 && (
          <div className="flex justify-between text-amber-400 text-sm">
            <span>الخصم المطبق</span>
            <span className="font-mono">- {formatCurrency(draft.discount_amount)}</span>
          </div>
        )}
        {draft.shipping_cost > 0 && (
          <div className="flex justify-between text-slate-400 text-sm">
            <span>تكلفة الشحن</span>
            <span className="font-mono">+ {formatCurrency(draft.shipping_cost)}</span>
          </div>
        )}
        <div className="flex justify-between text-white text-lg font-bold pt-2 border-t border-slate-800">
          <span>الإجمالي النهائي</span>
          <span className="text-xl text-indigo-400 font-mono">{formatCurrency(draft.final_total)}</span>
        </div>
      </div>
    </div>
  );
}
