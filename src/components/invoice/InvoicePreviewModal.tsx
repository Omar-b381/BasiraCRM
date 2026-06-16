import React from 'react';
import { X, Printer, FileDown, Eye } from 'lucide-react';
import { formatCurrency } from '../../lib/invoiceCalculations';
import type { InvoiceDraft, SavedInvoice } from '../../types/invoice.types';

interface InvoicePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceData: InvoiceDraft | SavedInvoice;
  invoiceId?: number | string | null;
  onPrint: () => void;
  onSavePdf: () => void;
  isGeneratingPdf?: boolean;
}

export default function InvoicePreviewModal({
  isOpen,
  onClose,
  invoiceData,
  invoiceId,
  onPrint,
  onSavePdf,
  isGeneratingPdf = false,
}: InvoicePreviewModalProps) {
  if (!isOpen) return null;

  const displayId = invoiceId || ('invoice_id' in invoiceData ? invoiceData.invoice_id : 'مسودة');
  const items = (invoiceData.items || []).filter(item => item.product_name && item.product_name.trim() !== '');
  const shippingCost = invoiceData.shipping_cost || 0;
  const discountAmount = invoiceData.discount_amount || 0;
  
  const formatDate = (isoDate?: string) => {
    if (!isoDate) return '';
    return new Date(isoDate).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm" dir="rtl">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-semibold text-white">معاينة قبل الطباعة والتصدير</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-850 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Preview Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-950 flex justify-center">
          
          {/* Virtual A4 Sheet Container */}
          <div 
            className="w-full max-w-[760px] bg-white text-slate-900 p-8 shadow-xl rounded-lg font-sans text-xs border border-slate-200"
            style={{ fontFamily: "'Cairo', Tahoma, Arial, sans-serif" }}
          >
            {/* Tear-off Label */}
            <div className="border-2 border-dashed border-slate-400 bg-slate-50 p-4 mb-6 rounded-lg page-break-inside-avoid">
              <h3 className="text-center font-bold text-sm text-slate-950 mb-2.5 border-b border-slate-200 pb-1.5">
                ملصق بيانات الشحن (للقص)
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <p><strong>فاتورة رقم:</strong> <span className="font-mono font-bold text-slate-950">#{displayId}</span></p>
                <p><strong>إلى:</strong> <span className="font-semibold">{invoiceData.customer_name}</span></p>
                <p><strong>الهاتف:</strong> <span className="font-mono">{invoiceData.customer_phone || '—'}</span></p>
                {invoiceData.customer_phone_2 && (
                  <p><strong>هاتف إضافي:</strong> <span className="font-mono">{invoiceData.customer_phone_2}</span></p>
                )}
                <p className="col-span-2"><strong>العنوان:</strong> {invoiceData.customer_address || '—'}</p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-350 flex justify-between items-center">
                <span className="font-bold text-slate-950 text-sm">الإجمالي المطلوب للدفع:</span>
                <span className="font-bold text-indigo-700 text-sm font-mono">
                  {formatCurrency(invoiceData.final_total)}
                </span>
              </div>
            </div>

            {/* Main Invoice Sheet */}
            <div className="border border-slate-250 p-6 rounded-lg bg-white">
              
              {/* Logo & Info Header */}
              <div className="flex justify-between items-start mb-6">
                <div className="space-y-1">
                  <h1 className="text-xl font-bold text-slate-950">فاتورة بيع</h1>
                  <p className="text-slate-500">رقم الفاتورة: <span className="font-mono font-bold text-slate-950">#{displayId}</span></p>
                  <p className="text-slate-500">التاريخ: {formatDate(invoiceData.invoice_date)}</p>
                  <p className="text-slate-500">الحالة: <span className="font-semibold text-slate-800">{invoiceData.status || 'قيد الانتظار'}</span></p>
                </div>
                
                {/* Fallback Logo text */}
                <div className="text-left">
                  <div className="w-16 h-16 bg-slate-100 border border-slate-200 rounded flex items-center justify-center font-bold text-indigo-600 text-sm shadow-inner">
                    بصيرة
                  </div>
                </div>
              </div>

              {/* Customer Info */}
              <div className="border-t border-slate-150 py-4 mb-4 text-xs space-y-1">
                <p className="text-slate-500 font-semibold text-[11px] uppercase tracking-wider">فاتورة إلى:</p>
                <h4 className="text-slate-950 font-bold text-sm">{invoiceData.customer_name}</h4>
                <p className="text-slate-700">📞 <span className="font-mono">{invoiceData.customer_phone}</span></p>
                {invoiceData.customer_address && <p className="text-slate-700">📍 {invoiceData.customer_address}</p>}
              </div>

              {/* Notes Section */}
              {invoiceData.notes && (
                <div className="p-3 bg-amber-50/75 border border-amber-200 rounded-md text-amber-900 mb-4">
                  <p className="font-bold text-[11px] mb-0.5">ملاحظات الفاتورة:</p>
                  <p className="text-[11px] leading-relaxed">{invoiceData.notes}</p>
                </div>
              )}

              {/* Items Table */}
              <table className="w-full text-xs text-right border-collapse mb-6">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border border-slate-250">
                    <th className="p-2 border border-slate-250">الصنف</th>
                    <th className="p-2 border border-slate-250 w-24 text-center">الكمية</th>
                    <th className="p-2 border border-slate-250 w-32 text-left">الإجمالي الفرعي</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-4 text-center text-slate-400 border border-slate-200">
                        لا توجد أصناف في الفاتورة
                      </td>
                    </tr>
                  ) : (
                    items.map((item, idx) => {
                      const variantLabel = item.variant_name ? ` (${item.variant_name})` : '';
                      return (
                        <tr key={idx} className="border border-slate-200">
                          <td className="p-2 border border-slate-200 font-medium text-slate-900">
                            {item.product_name}
                            {variantLabel && <span className="text-slate-500 text-[11px]">{variantLabel}</span>}
                          </td>
                          <td className="p-2 border border-slate-200 text-center font-mono">
                            {item.quantity}
                          </td>
                          <td className="p-2 border border-slate-200 text-left font-mono">
                            {formatCurrency(item.sub_total)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

              {/* Totals Section */}
              <div className="flex justify-end">
                <table className="w-64 text-xs border-collapse">
                  <tbody>
                    <tr className="border-b border-slate-100">
                      <td className="py-2 text-slate-500 font-medium">إجمالي المنتجات:</td>
                      <td className="py-2 text-left font-mono">{formatCurrency(invoiceData.sub_total)}</td>
                    </tr>
                    {discountAmount > 0 && (
                      <tr className="border-b border-slate-100 text-amber-600">
                        <td className="py-2 font-medium">الخصم المطبق:</td>
                        <td className="py-2 text-left font-mono">- {formatCurrency(discountAmount)}</td>
                      </tr>
                    )}
                    {shippingCost > 0 && (
                      <tr className="border-b border-slate-100">
                        <td className="py-2 text-slate-500 font-medium">تكلفة الشحن:</td>
                        <td className="py-2 text-left font-mono">+ {formatCurrency(shippingCost)}</td>
                      </tr>
                    )}
                    <tr className="bg-slate-50 font-bold text-slate-950 border-t border-slate-350">
                      <td className="p-2 text-sm">الإجمالي النهائي:</td>
                      <td className="p-2 text-left text-sm text-indigo-700 font-mono">
                        {formatCurrency(invoiceData.final_total)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="mt-8 text-center text-slate-400 text-[11px] border-t border-slate-100 pt-4">
                نشكركم لثقتكم في منتجاتنا 🌸
              </div>
            </div>

          </div>

        </div>

        {/* Action Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-900/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-400 hover:text-white bg-slate-850 hover:bg-slate-800 rounded-lg text-sm transition-colors"
          >
            إغلاق
          </button>
          <button
            onClick={onPrint}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Printer className="w-4 h-4" />
            طباعة مباشرة
          </button>
          <button
            disabled={isGeneratingPdf}
            onClick={onSavePdf}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGeneratingPdf ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <FileDown className="w-4 h-4" />
            )}
            تصدير كـ PDF
          </button>
        </div>

      </div>
    </div>
  );
}
