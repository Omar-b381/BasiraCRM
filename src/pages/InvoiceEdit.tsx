import React, { useEffect, useState } from 'react';
import { Save, Ban, ArrowRight, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { useInvoiceEditStore } from '../store/useInvoiceEditStore';
import { buildUpdatePayload, hasPendingChanges } from '../lib/invoiceCalculations';
import EditCustomerInfoPanel from '../components/invoice/EditCustomerInfoPanel';
import EditableItemsTable from '../components/invoice/EditableItemsTable';
import DiscountAdjustPanel from '../components/invoice/DiscountAdjustPanel';
import CancelInvoiceModal from '../components/invoice/CancelInvoiceModal';
import PendingChangesSummary from '../components/invoice/PendingChangesSummary';

export default function InvoiceEdit({
  invoiceId,
  onBack,
}: {
  invoiceId: number;
  onBack: () => void;
}) {
  const { state, originalSnapshot, isLoading, isSaving, loadInvoice, setSaving, reset } = useInvoiceEditStore();
  const [errors, setErrors] = useState<string[]>([]);
  const [successMsg, setSuccessMsg] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);

  const load = async () => {
    try {
      const result = await window.electronAPI.invoice.getById(invoiceId);
      if (result.success) {
        loadInvoice(result.data);
      } else {
        setErrors([result.error || 'فشل تحميل الفاتورة']);
      }
    } catch (err) {
      setErrors([err instanceof Error ? err.message : 'حدث خطأ أثناء تحميل الفاتورة']);
    }
  };

  useEffect(() => {
    load();
    return () => reset();
  }, [invoiceId]);

  const handleSave = async () => {
    if (!state) return;

    // التحقق من وجود بنود نشطة
    const activeItems = state.items.filter((i) => i._action !== 'deleted');
    if (activeItems.length === 0) {
      setErrors(['لا يمكن حفظ فاتورة بدون أصناف — أضف صنفاً واحداً على الأقل أو ألغِ الفاتورة بالكامل']);
      return;
    }

    // التحقق من صحة البنود النشطة
    const invalidItem = activeItems.find((i) => !i.product_name.trim() || i.quantity <= 0);
    if (invalidItem) {
      setErrors(['كل الأصناف النشطة يجب أن تحتوي على اسم منتج وكمية أكبر من صفر']);
      return;
    }

    setErrors([]);
    setSaving(true);

    try {
      const payload = buildUpdatePayload(state);
      const result = await window.electronAPI.invoice.update(payload);

      if (result.success) {
        if (result.warning) {
          setSuccessMsg(`تم تحديث الفاتورة بنجاح. تنبيه: ${result.warning}`);
        } else {
          setSuccessMsg('تم حفظ التعديلات على الفاتورة والبنود بنجاح');
        }
        // العودة بعد ثانيتين لرؤية الفاتورة المحدثة
        setTimeout(() => {
          onBack();
        }, 1800);
      } else {
        setErrors([result.error || 'فشل حفظ التعديلات']);
      }
    } catch (err) {
      setErrors([err instanceof Error ? err.message : 'حدث خطأ في الاتصال أثناء الحفظ']);
    } finally {
      setSaving(false);
    }
  };

  if (errors.length > 0 && !state) {
    return (
      <div className="p-8 bg-slate-950 min-h-screen text-slate-100 flex flex-col items-center justify-center gap-4" dir="rtl">
        <div className="bg-red-950/20 border border-red-900/50 text-red-400 p-6 rounded-2xl max-w-md text-center">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-3 animate-pulse" />
          <h3 className="font-bold mb-2">تعذر فتح شاشة التعديل</h3>
          {errors.map((err, idx) => (
            <p key={idx} className="text-sm">{err}</p>
          ))}
        </div>
        <button
          onClick={onBack}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-850 text-white px-5 py-2.5 rounded-xl text-sm border border-slate-800 transition-all"
        >
          <ArrowRight className="w-4 h-4" />
          العودة
        </button>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="p-8 bg-slate-950 min-h-screen text-slate-100 flex items-center justify-center" dir="rtl">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto" />
          <p className="text-sm text-slate-400">جاري تحميل بيانات الفاتورة رقم #{invoiceId}...</p>
        </div>
      </div>
    );
  }

  const payloadForDiff = buildUpdatePayload(state);
  const isChanged = originalSnapshot ? hasPendingChanges(payloadForDiff, originalSnapshot) : false;
  const isInvoiceCancelled = state.status === 'ملغاة';

  return (
    <div className="p-8 bg-slate-950 min-h-screen text-slate-100 space-y-6" dir="rtl">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
              title="رجوع"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              تعديل الفاتورة المحفوظة
              <span className="font-mono text-indigo-400">#{state.invoice_id}</span>
            </h2>
          </div>
          <p className="text-xs text-slate-450 pr-8">
            تاريخ الفاتورة الأصلي: {new Date(state.invoice_date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Top Control Buttons */}
        <div className="flex items-center gap-3">
          {!isInvoiceCancelled && (
            <button
              onClick={() => setShowCancelModal(true)}
              className="flex items-center gap-1.5 bg-red-950/20 hover:bg-red-950/45 text-red-400 border border-red-900/30 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all"
            >
              <Ban className="w-4 h-4" />
              إلغاء الفاتورة بالكامل
            </button>
          )}

          <button
            onClick={onBack}
            className="bg-slate-850 hover:bg-slate-800 text-slate-300 px-5 py-2.5 rounded-xl text-xs font-semibold border border-slate-800 transition-all"
          >
            إلغاء التغييرات والعودة
          </button>

          <button
            disabled={!isChanged || isSaving || isInvoiceCancelled}
            onClick={handleSave}
            className="flex items-center gap-2 bg-indigo-650 hover:bg-indigo-600 disabled:bg-slate-800 disabled:text-slate-500 disabled:border-slate-850 text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-lg shadow-indigo-650/10 transition-all border border-indigo-500/10"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                حفظ التعديلات
              </>
            )}
          </button>
        </div>
      </div>

      {/* Notifications / Errors */}
      {successMsg && (
        <div className="bg-emerald-950/30 border border-emerald-900/60 text-emerald-400 rounded-xl p-4 text-xs font-medium flex items-center gap-2.5 animate-pulse shadow-md">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
          <p>{successMsg}</p>
        </div>
      )}

      {errors.length > 0 && (
        <div className="bg-red-950/20 border border-red-900/40 text-red-400 rounded-xl p-4 text-xs font-medium space-y-1 shadow-md">
          {errors.map((err, idx) => (
            <p key={idx} className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
              {err}
            </p>
          ))}
        </div>
      )}

      {isInvoiceCancelled && (
        <div className="bg-red-950/25 border border-red-900/40 text-red-400 rounded-xl p-4 text-xs font-semibold flex items-center gap-2 shadow-md">
          <Ban className="w-4 h-4 shrink-0" />
          <span>هذه الفاتورة ملغاة ولا يمكن إجراء أي تعديلات عليها.</span>
        </div>
      )}

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Customer details & Items Table */}
        <div className="lg:col-span-2 space-y-6">
          <div className={isInvoiceCancelled ? 'opacity-65 pointer-events-none' : ''}>
            <EditCustomerInfoPanel />
          </div>
          <div className={isInvoiceCancelled ? 'opacity-65 pointer-events-none' : ''}>
            <EditableItemsTable />
          </div>
        </div>

        {/* Right Column: Pricing details, notes, status, changes summary */}
        <div className="space-y-6">
          <div className={isInvoiceCancelled ? 'opacity-65 pointer-events-none' : ''}>
            <DiscountAdjustPanel />
          </div>
          <PendingChangesSummary />
        </div>
      </div>

      {/* Cancel Invoice Modal */}
      {showCancelModal && (
        <CancelInvoiceModal
          invoiceId={state.invoice_id}
          onClose={() => setShowCancelModal(false)}
          onCancelled={() => {
            setShowCancelModal(false);
            setSuccessMsg('تم إلغاء الفاتورة وتحديث حالتها بنجاح');
            // إعادة التحميل بعد ثانية
            setTimeout(() => {
              load();
            }, 1000);
          }}
        />
      )}
    </div>
  );
}
