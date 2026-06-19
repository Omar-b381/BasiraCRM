import React, { useState } from 'react';
import { Eye, FileText, Printer, Calendar, CheckCircle2, AlertTriangle, Clock, XCircle, Tag, Truck } from 'lucide-react';
import type { SavedInvoice } from '../../types/invoice.types';

interface OrderHistoryTabProps {
  invoices: SavedInvoice[];
}

export default function OrderHistoryTab({ invoices }: OrderHistoryTabProps) {
  const [selectedInvoice, setSelectedInvoice] = useState<SavedInvoice | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
      maximumFractionDigits: 0
    }).format(val).replace('ج.م.', 'ج.م');
  };

  const getStatusBadge = (status: string | null) => {
    const s = status || 'قيد الانتظار';
    switch (s) {
      case 'تم التسليم':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            تم التسليم
          </span>
        );
      case 'تم الشحن':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Truck className="w-3 h-3" />
            تم الشحن
          </span>
        );
      case 'مؤكدة':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <CheckCircle2 className="w-3 h-3" />
            مؤكدة
          </span>
        );
      case 'قيد الانتظار':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3 animate-pulse" />
            قيد الانتظار
          </span>
        );
      case 'ملغاة':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="w-3 h-3" />
            ملغاة
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-500/10 text-gray-400 border border-gray-500/20">
            {s}
          </span>
        );
    }
  };

  // Filter invoices
  const filteredInvoices = invoices.filter(inv => {
    if (statusFilter === 'all') return true;
    return inv.status === statusFilter;
  });

  // Calculate stats for filtered list
  const filteredTotal = filteredInvoices.reduce((acc, curr) => acc + (curr.final_total || 0), 0);

  const handlePrint = async (inv: SavedInvoice) => {
    try {
      if (window.electronAPI.invoice && window.electronAPI.invoice.printDirect) {
        await window.electronAPI.invoice.printDirect(inv);
      }
    } catch (err) {
      console.error('Print error:', err);
    }
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Filter and Summary Strip */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#0a071e]/5 p-4 rounded-3xl border border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-400">تصفية الفواتير:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-gray-900/50 border border-gray-800 text-[11px] text-gray-100 p-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500 font-bold"
          >
            <option value="all" style={{ color: '#070033' }}>جميع الحالات ({invoices.length})</option>
            <option value="قيد الانتظار" style={{ color: '#070033' }}>قيد الانتظار</option>
            <option value="مؤكدة" style={{ color: '#070033' }}>مؤكدة</option>
            <option value="تم الشحن" style={{ color: '#070033' }}>تم الشحن</option>
            <option value="تم التسليم" style={{ color: '#070033' }}>تم التسليم</option>
            <option value="ملغاة" style={{ color: '#070033' }}>ملغاة</option>
          </select>
        </div>

        <div className="text-xs font-bold text-gray-400 flex items-center gap-1.5">
          <span>إجمالي القائمة المفلترة:</span>
          <span className="text-orange-400 text-sm font-extrabold">{formatCurrency(filteredTotal)}</span>
        </div>
      </div>

      {/* Invoices List Table */}
      {filteredInvoices.length === 0 ? (
        <p className="text-[11px] text-gray-400 text-center py-12 font-semibold">
          لا يوجد فواتير تطابق التصفية الحالية.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-white/5 bg-[#0a071e]/5">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.01]">
                <th className="px-6 py-4 text-xs font-bold text-gray-400">رقم الفاتورة</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400">التاريخ والوقت</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400">الحالة</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400">المبلغ الإجمالي</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 text-left">الخيارات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-semibold text-xs">
              {filteredInvoices.map((inv) => (
                <tr key={inv.invoice_id} className="hover:bg-white/[0.01] transition-colors group">
                  <td className="px-6 py-3.5 text-white font-bold">
                    #{inv.invoice_id}
                  </td>
                  <td className="px-6 py-3.5 text-gray-300">
                    {new Date(inv.invoice_date).toLocaleString('ar-EG', {
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    })}
                  </td>
                  <td className="px-6 py-3.5">
                    {getStatusBadge(inv.status)}
                  </td>
                  <td className="px-6 py-3.5 text-white font-extrabold">
                    {formatCurrency(inv.final_total)}
                  </td>
                  <td className="px-6 py-3.5 text-left">
                    <button
                      onClick={() => setSelectedInvoice(inv)}
                      className="p-1.5 bg-white/5 hover:bg-orange-500/10 text-gray-400 hover:text-orange-400 rounded-xl transition-all border border-white/5 inline-flex items-center justify-center gap-1 text-[10px] font-bold group-hover:border-orange-500/20"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      تفاصيل الفاتورة
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Invoice Details Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedInvoice(null)} />
          
          <div className="relative w-full max-w-2xl bg-[#070033] border border-white/10 rounded-3xl overflow-hidden shadow-2xl z-10 flex flex-col max-h-[90vh] dark-container text-right">
            {/* Modal Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-orange-500 animate-pulse" />
                <div>
                  <h3 className="text-sm font-bold text-white leading-none">تفاصيل الفاتورة #{selectedInvoice.invoice_id}</h3>
                  <span className="text-[10px] text-gray-400 mt-1 block font-semibold">
                    {new Date(selectedInvoice.invoice_date).toLocaleString('ar-EG')}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePrint(selectedInvoice)}
                  className="p-2 bg-white/5 hover:bg-orange-500/10 text-gray-400 hover:text-orange-400 rounded-xl transition-all border border-white/5 flex items-center gap-1.5 text-[10px] font-bold"
                >
                  <Printer className="w-3.5 h-3.5" />
                  طباعة
                </button>
                
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="p-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-all border border-white/5 text-xs font-bold"
                >
                  إغلاق
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Status and Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#0b072c] border border-white/5 p-4 rounded-2xl flex justify-between items-center">
                  <span className="text-[10px] font-bold text-gray-500">حالة الفاتورة:</span>
                  {getStatusBadge(selectedInvoice.status)}
                </div>

                <div className="bg-[#0b072c] border border-white/5 p-4 rounded-2xl flex flex-col justify-center text-xs">
                  <span className="text-[10px] font-bold text-gray-500 mb-1">العنوان:</span>
                  <span className="text-white truncate font-semibold">{selectedInvoice.customer_address || 'لم يتم تحديده'}</span>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-white border-b border-white/5 pb-2">البنود والمنتجات</h4>
                <div className="space-y-2">
                  {selectedInvoice.items && selectedInvoice.items.map((item, idx) => (
                    <div key={item.item_id || idx} className="bg-white/5 p-3 rounded-2xl border border-white/5 flex justify-between items-center text-xs font-bold">
                      <div className="space-y-0.5">
                        <p className="text-white text-xs">{item.product_name}</p>
                        {item.variant_name && (
                          <span className="text-[9px] text-gray-500 bg-white/5 px-2 py-0.5 rounded-full border border-white/5 font-semibold">
                            {item.variant_name}
                          </span>
                        )}
                      </div>
                      <div className="text-left">
                        <p className="text-white">{formatCurrency(item.sub_total)}</p>
                        <p className="text-[9px] text-gray-500 mt-0.5 font-semibold">الكمية: {item.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals Breakdown */}
              <div className="bg-white/5 border border-white/5 p-4 rounded-2xl space-y-2.5 text-xs font-semibold text-gray-400">
                <div className="flex justify-between">
                  <span>المجموع الفرعي:</span>
                  <span className="text-white font-bold">{formatCurrency(selectedInvoice.sub_total)}</span>
                </div>
                {selectedInvoice.discount_amount > 0 && (
                  <div className="flex justify-between text-rose-400">
                    <span className="flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5" />
                      قيمة الخصم:
                    </span>
                    <span className="font-bold">- {formatCurrency(selectedInvoice.discount_amount)}</span>
                  </div>
                )}
                {selectedInvoice.shipping_cost && selectedInvoice.shipping_cost > 0 ? (
                  <div className="flex justify-between">
                    <span>تكلفة الشحن:</span>
                    <span className="text-white font-bold">{formatCurrency(selectedInvoice.shipping_cost)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between pt-2 border-t border-white/5 text-sm font-bold">
                  <span className="text-white">الإجمالي النهائي:</span>
                  <span className="text-orange-400 text-base font-extrabold">{formatCurrency(selectedInvoice.final_total)}</span>
                </div>
              </div>

              {/* Notes */}
              {selectedInvoice.notes && (
                <div className="bg-white/5 border border-white/5 p-4 rounded-2xl text-xs leading-relaxed">
                  <span className="text-[10px] font-bold text-gray-500 block mb-1">ملاحظات:</span>
                  <p className="text-gray-300 font-semibold">{selectedInvoice.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
