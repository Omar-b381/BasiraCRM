import React, { useState, useEffect } from 'react';
import { Save, FileText, Printer, Search, Loader2, PlusCircle, CheckCircle2, AlertTriangle, FileDown, RefreshCw, Pencil } from 'lucide-react';
import { useInvoiceStore } from '../store/useInvoiceStore';
import { validateInvoice, formatCurrency } from '../lib/invoiceCalculations';
import CustomerSelector from '../components/invoice/CustomerSelector';
import InvoiceItemsTable from '../components/invoice/InvoiceItemsTable';
import InvoiceTotals from '../components/invoice/InvoiceTotals';
import InvoiceSearchModal from '../components/invoice/InvoiceSearchModal';
import InvoicePreviewModal from '../components/invoice/InvoicePreviewModal';
import InvoiceEdit from './InvoiceEdit';

export default function InvoiceCreate() {
  const { 
    draft, 
    isSaving, 
    isGeneratingPdf, 
    setSaving, 
    setGeneratingPdf, 
    resetDraft,
    loadSavedInvoice
  } = useInvoiceStore();

  const [errors, setErrors] = useState<string[]>([]);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [savedInvoiceId, setSavedInvoiceId] = useState<number | null>(null);
  const [nextInvoiceId, setNextInvoiceId] = useState<number | null>(null);
  const [editingInvoiceId, setEditingInvoiceId] = useState<number | null>(null);
  
  // Modals state
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const fetchNextInvoiceId = async () => {
    try {
      const res = await window.electronAPI.invoice.getNextId();
      if (res.success) {
        setNextInvoiceId(res.nextId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchNextInvoiceId();
  }, []);
  
  const isExistingInvoice = savedInvoiceId !== null;

  const handleSave = async () => {
    // تصفية البنود الفارغة قبل التحقق والحفظ
    const cleanedItems = draft.items.filter(item => item.product_name && item.product_name.trim() !== '');
    const cleanedDraft = { ...draft, items: cleanedItems };

    const validation = validateInvoice(cleanedDraft);
    if (!validation.valid) {
      setErrors(validation.errors);
      setSuccessMsg(null);
      return;
    }
    setErrors([]);
    setSaving(true);
    setSuccessMsg(null);

    try {
      const result = await window.electronAPI.invoice.create(cleanedDraft);
      if (result.success) {
        setSavedInvoiceId(result.invoiceId);
        setSuccessMsg(`تم حفظ الفاتورة بنجاح برقم #${result.invoiceId}`);
      } else {
        setErrors([result.error || 'فشل حفظ الفاتورة']);
      }
    } catch (err) {
      setErrors([err instanceof Error ? err.message : 'حدث خطأ غير متوقع']);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatusNotes = async () => {
    if (!savedInvoiceId) return;
    setSaving(true);
    setSuccessMsg(null);
    setErrors([]);

    try {
      const result = await window.electronAPI.invoice.update({
        invoiceId: savedInvoiceId,
        status: draft.status,
        notes: draft.notes
      });

      if (result.success) {
        setSuccessMsg(`تم تحديث حالة وملاحظات الفاتورة #${savedInvoiceId} بنجاح`);
      } else {
        setErrors([result.error || 'فشل تحديث الفاتورة']);
      }
    } catch (err) {
      setErrors([err instanceof Error ? err.message : 'حدث خطأ في تحديث البيانات']);
    } finally {
      setSaving(false);
    }
  };

  const handleGeneratePdf = async () => {
    if (!savedInvoiceId) return;
    setGeneratingPdf(true);
    setSuccessMsg(null);
    setErrors([]);

    try {
      const fullInvoice = await window.electronAPI.invoice.getById(savedInvoiceId);
      if (fullInvoice.success) {
        const pdfResult = await window.electronAPI.invoice.generatePdf(fullInvoice.data);
        if (pdfResult.success) {
          setSuccessMsg(`تم تصدير الفاتورة كـ PDF بنجاح في: ${pdfResult.filePath}`);
        } else if (pdfResult.error !== 'تم إلغاء الحفظ') {
          setErrors([pdfResult.error || 'فشل توليد PDF']);
        }
      } else {
        setErrors([fullInvoice.error || 'فشل جلب بيانات الفاتورة المحدثة']);
      }
    } catch (err) {
      setErrors([err instanceof Error ? err.message : 'فشل تصدير ملف الـ PDF']);
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handlePrintDirect = async () => {
    if (!savedInvoiceId) return;
    setSuccessMsg(null);
    setErrors([]);

    try {
      const fullInvoice = await window.electronAPI.invoice.getById(savedInvoiceId);
      if (fullInvoice.success) {
        const printResult = await window.electronAPI.invoice.printDirect(fullInvoice.data);
        if (printResult.success) {
          setSuccessMsg('تم إرسال الفاتورة إلى الطابعة بنجاح');
        } else {
          setErrors([printResult.error || 'فشل تشغيل أمر الطباعة المباشر']);
        }
      } else {
        setErrors([fullInvoice.error || 'فشل جلب بيانات الفاتورة للطباعة']);
      }
    } catch (err) {
      setErrors([err instanceof Error ? err.message : 'فشل الطباعة المباشرة']);
    }
  };

  const handleSelectInvoiceSearch = async (invoiceId: number) => {
    setSaving(true);
    setErrors([]);
    setSuccessMsg(null);

    try {
      const res = await window.electronAPI.invoice.getById(invoiceId);
      if (res.success) {
        loadSavedInvoice(res.data);
        setSavedInvoiceId(invoiceId);
        setSuccessMsg(`تم تحميل الفاتورة رقم #${invoiceId} بنجاح من الأرشيف`);
      } else {
        setErrors([res.error || 'تعذر تحميل الفاتورة المحددة']);
      }
    } catch (err) {
      setErrors([err instanceof Error ? err.message : 'خطأ في جلب بيانات الفاتورة']);
    } finally {
      setSaving(false);
    }
  };

  const handleNewInvoice = () => {
    resetDraft();
    setSavedInvoiceId(null);
    setErrors([]);
    setSuccessMsg(null);
    fetchNextInvoiceId();
  };

  if (editingInvoiceId !== null) {
    return (
      <InvoiceEdit
        invoiceId={editingInvoiceId}
        onBack={() => {
          setEditingInvoiceId(null);
          handleSelectInvoiceSearch(editingInvoiceId);
        }}
      />
    );
  }

  return (
    <div className="p-8 bg-slate-950 min-h-screen text-slate-100 space-y-6" dir="rtl">
      
      {/* Top Bar Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-900 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-7 h-7 text-indigo-500" />
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              {isExistingInvoice ? `عرض الفاتورة #${savedInvoiceId}` : 'إنشاء فاتورة جديدة'}
              {!isExistingInvoice && nextInvoiceId && (
                <span className="bg-indigo-600/10 text-indigo-400 text-xs font-mono font-bold px-3 py-1.5 rounded-xl border border-indigo-500/20 shadow-md">
                  رقم الفاتورة القادم المتوقع: #{nextInvoiceId}
                </span>
              )}
            </h1>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            {isExistingInvoice 
              ? 'مستند محفوظ مسبقاً في قاعدة البيانات — يمكنك تعديل الحالة والملاحظات وإعادة الطباعة' 
              : 'قم بإضافة بنود الفاتورة واختيار العميل ثم احفظ المستند لتوليد ملف الـ PDF والطباعة'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSearchModal(true)}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-slate-350 px-4 py-2.5 rounded-xl text-sm font-medium border border-slate-800 hover:border-slate-700 transition-all shadow-md"
          >
            <Search className="w-4 h-4 text-indigo-400" />
            أرشيف الفواتير السابقة
          </button>

          {isExistingInvoice && (
            <button
              onClick={handleNewInvoice}
              className="flex items-center gap-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 px-4 py-2.5 rounded-xl text-sm font-medium border border-indigo-500/20 transition-all shadow-md"
            >
              <PlusCircle className="w-4 h-4" />
              فاتورة جديدة
            </button>
          )}
        </div>
      </div>

      {/* Feedback Messages */}
      {errors.length > 0 && (
        <div className="bg-red-950/30 border border-red-800/40 text-red-400 rounded-2xl p-4 flex gap-3 items-start animate-fadeIn">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h5 className="font-semibold text-sm">يرجى تصحيح الأخطاء التالية:</h5>
            <ul className="list-disc list-inside text-xs space-y-0.5 opacity-90">
              {errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-950/30 border border-emerald-800/40 text-emerald-400 rounded-2xl p-4 flex items-center gap-3 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{successMsg}</p>
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Columns: Client Selector & Items Table */}
        <div className="lg:col-span-2 space-y-6">
          <div className={isExistingInvoice ? 'pointer-events-none opacity-80' : ''}>
            <CustomerSelector />
          </div>
          
          <div className={isExistingInvoice ? 'pointer-events-none opacity-80' : ''}>
            <InvoiceItemsTable />
          </div>
        </div>

        {/* Right Column: Totals card & Actions */}
        <div className="space-y-6">
          <InvoiceTotals />

          {/* Action Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
            <h4 className="text-white font-semibold text-sm mb-2">إجراءات الفاتورة</h4>
            
            {/* Primary Save / Update Button */}
            {!isExistingInvoice ? (
              <button
                disabled={isSaving}
                onClick={handleSave}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-3 px-4 rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/10 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    جاري حفظ الفاتورة...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    حفظ الفاتورة الحالية
                  </>
                )}
              </button>
            ) : (
              <button
                disabled={isSaving}
                onClick={handleUpdateStatusNotes}
                className="w-full flex items-center justify-center gap-2 bg-slate-850 hover:bg-slate-800 text-indigo-400 border border-indigo-500/20 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-150 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    جاري تحديث البيانات...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    تحديث الحالة والملاحظات
                  </>
                )}
              </button>
            )}

            {/* Print Options — Enabled only after saving */}
            <div className="pt-2 border-t border-slate-800/80 space-y-2.5">
              <button
                disabled={!isExistingInvoice}
                onClick={() => setShowPreviewModal(true)}
                className="w-full flex items-center justify-center gap-2 bg-slate-950 hover:bg-slate-850 text-slate-300 py-2.5 px-4 rounded-xl text-sm font-medium border border-slate-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <FileText className="w-4 h-4 text-slate-500" />
                معاينة صفحة A4
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  disabled={!isExistingInvoice}
                  onClick={handlePrintDirect}
                  className="flex items-center justify-center gap-1.5 bg-slate-950 hover:bg-slate-850 text-slate-350 py-2.5 px-3 rounded-xl text-xs font-medium border border-slate-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-500" />
                  طباعة مباشرة
                </button>
                
                <button
                  disabled={!isExistingInvoice || isGeneratingPdf}
                  onClick={handleGeneratePdf}
                  className="flex items-center justify-center gap-1.5 bg-slate-950 hover:bg-slate-850 text-slate-350 py-2.5 px-3 rounded-xl text-xs font-medium border border-slate-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isGeneratingPdf ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FileDown className="w-3.5 h-3.5 text-slate-500" />
                  )}
                  تصدير PDF
                </button>
              </div>

              <button
                disabled={!isExistingInvoice}
                onClick={() => setEditingInvoiceId(savedInvoiceId)}
                className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-550 text-white py-2.5 px-4 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-amber-600/5 mt-2"
              >
                <Pencil className="w-4 h-4" />
                تعديل الفاتورة المحفوظة
              </button>
            </div>

            {/* Hint for saving */}
            {!isExistingInvoice && (
              <p className="text-[10px] text-slate-500 text-center mt-2.5 leading-relaxed">
                * أزرار المعاينة والتصدير والطباعة ستصبح متاحة بمجرد حفظ الفاتورة بنجاح.
              </p>
            )}
          </div>
        </div>

      </div>

      {/* Archive / Search Modal */}
      <InvoiceSearchModal 
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onSelect={handleSelectInvoiceSearch}
      />

      {/* Print Preview Modal */}
      <InvoicePreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        invoiceData={draft}
        invoiceId={savedInvoiceId}
        onPrint={handlePrintDirect}
        onSavePdf={handleGeneratePdf}
        isGeneratingPdf={isGeneratingPdf}
      />

    </div>
  );
}
