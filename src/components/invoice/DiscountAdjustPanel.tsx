import React, { useState, useEffect } from 'react';
import { useInvoiceEditStore } from '../../store/useInvoiceEditStore';
import { formatCurrency } from '../../lib/invoiceCalculations';

const STATUS_OPTIONS = [
  'قيد الانتظار',
  'مؤكدة',
  'تم الشحن',
  'تم التسليم',
  'ملغاة',
  'مرتجعة',
];

interface ShippingRate {
  id: number;
  region_name: string;
  rate: number;
}

export default function DiscountAdjustPanel() {
  const { state, setDiscount, setShipping, setNotes, setStatus } = useInvoiceEditStore();
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<string>('');

  useEffect(() => {
    const loadRates = async () => {
      try {
        const res = await window.electronAPI.invoice.getShippingRates();
        if (res.success) {
          setShippingRates(res.data || []);
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadRates();
  }, []);

  const handleRegionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedRegionId(val);
    if (val === '') {
      return;
    }
    const rateObj = shippingRates.find((r) => String(r.id) === val);
    if (rateObj) {
      setShipping(rateObj.rate);
    }
  };

  // Sync selectedRegionId if shipping_cost is changed manually
  useEffect(() => {
    if (!state || shippingRates.length === 0) return;
    const matched = shippingRates.find((r) => r.rate === state.shipping_cost);
    if (matched) {
      setSelectedRegionId(String(matched.id));
    } else {
      setSelectedRegionId('');
    }
  }, [state?.shipping_cost, shippingRates]);

  if (!state) return null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
      <h3 className="text-white font-semibold text-sm">الخصم والإجماليات</h3>

      {/* Shipping Region Dropdown */}
      <div>
        <label className="block text-xs text-slate-400 mb-1.5">تسعيرة شحن المنطقة</label>
        <select
          value={selectedRegionId}
          onChange={handleRegionChange}
          className="w-full bg-slate-950 text-white rounded-xl px-4 py-2.5 text-sm outline-none border border-slate-800 focus:border-indigo-500 cursor-pointer"
        >
          <option value="">-- شحن يدوي / مخصص --</option>
          {shippingRates.map((r) => (
            <option key={r.id} value={r.id} className="bg-slate-900 text-white">
              {r.region_name} ({r.rate} ج.م)
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">الخصم</label>
          <input
            type="number"
            min={0}
            value={state.discount_amount}
            onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
            className="w-full bg-slate-950 text-white rounded-xl px-4 py-2.5 text-sm outline-none border border-slate-800 focus:border-indigo-500 font-mono"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">تكلفة الشحن</label>
          <input
            type="number"
            min={0}
            value={state.shipping_cost}
            onChange={(e) => setShipping(parseFloat(e.target.value) || 0)}
            className="w-full bg-slate-950 text-white rounded-xl px-4 py-2.5 text-sm outline-none border border-slate-800 focus:border-indigo-500 font-mono"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-slate-400 mb-1.5">حالة الفاتورة</label>
        <select
          value={state.status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full bg-slate-950 text-white rounded-xl px-4 py-2.5 text-sm outline-none border border-slate-800 focus:border-indigo-500 cursor-pointer"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs text-slate-400 mb-1.5">ملاحظات الفاتورة</label>
        <textarea
          value={state.notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full bg-slate-950 text-white rounded-xl px-4 py-2.5 text-sm outline-none border border-slate-800 focus:border-indigo-500 resize-none"
        />
      </div>

      <div className="border-t border-slate-800 pt-4 space-y-2">
        <div className="flex justify-between text-slate-400 text-xs">
          <span>إجمالي المنتجات</span>
          <span className="font-mono">{formatCurrency(state.sub_total)}</span>
        </div>
        <div className="flex justify-between text-white text-base font-bold pt-3 border-t border-slate-850">
          <span>الإجمالي النهائي</span>
          <span className="text-emerald-400 font-mono">{formatCurrency(state.final_total)}</span>
        </div>
      </div>
    </div>
  );
}
