import React, { useState, useCallback } from 'react';
import {
  Truck, RefreshCw, Search, Filter, AlertTriangle,
  CheckCircle2, Loader2, Edit3, Check, X, ChevronLeft, ChevronRight,
  Info, FileSpreadsheet, Calendar, Eye, Hash, Zap
} from 'lucide-react';
import { parseEgyptianAddress } from '../lib/addressParser';
import type { ShippingRow, ShippingExportFilters } from '../types/shipping.types';

// ─────────────────────────────────────────────────────────
//  ثوابت
// ─────────────────────────────────────────────────────────
const ROWS_PER_PAGE = 20;
const STATUS_OPTIONS = ['مؤكدة', 'تم الشحن', 'قيد الانتظار', 'تم التسليم'];

type ConfidenceBadge = 'high' | 'medium' | 'low';

function ConfidenceDot({ level }: { level: ConfidenceBadge }) {
  const colors: Record<ConfidenceBadge, string> = {
    high:   'bg-emerald-400',
    medium: 'bg-amber-400',
    low:    'bg-red-400',
  };
  const titles: Record<ConfidenceBadge, string> = {
    high:   'تحليل ناجح بثقة عالية',
    medium: 'تحليل جزئي — يُنصح بالمراجعة',
    low:    'لم يتم التعرف على المدينة/المنطقة',
  };
  return (
    <span
      className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${colors[level]}`}
      title={titles[level]}
    />
  );
}

// ─────────────────────────────────────────────────────────
//  خلية قابلة للتعديل inline
// ─────────────────────────────────────────────────────────
interface EditableCellProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  isHighlighted?: boolean;
}

function EditableCell({ value, onChange, placeholder, className = '', isHighlighted }: EditableCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const commit = () => {
    onChange(draft);
    setEditing(false);
  };
  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1 min-w-0">
        <input
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel(); }}
          className="flex-1 min-w-0 bg-slate-700 border border-indigo-500 text-white text-xs px-2 py-1 rounded-lg outline-none"
          placeholder={placeholder}
        />
        <button onClick={commit}  className="text-emerald-400 hover:text-emerald-300 shrink-0"><Check className="w-3.5 h-3.5" /></button>
        <button onClick={cancel}  className="text-red-400 hover:text-red-300 shrink-0"><X className="w-3.5 h-3.5" /></button>
      </div>
    );
  }

  return (
    <div
      onClick={() => { setDraft(value); setEditing(true); }}
      title="انقر للتعديل"
      className={`group flex items-center gap-1.5 cursor-pointer rounded px-1.5 py-0.5 transition-colors hover:bg-slate-700/60 min-w-0 ${isHighlighted && !value ? 'bg-amber-900/30 rounded' : ''} ${className}`}
    >
      <span className={`text-xs truncate flex-1 ${value ? 'text-slate-200' : 'text-slate-500 italic'}`}>
        {value || (placeholder || '—')}
      </span>
      <Edit3 className="w-2.5 h-2.5 text-slate-500 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  الصفحة الرئيسية
// ─────────────────────────────────────────────────────────
export default function ShippingExport() {
  // ── الفلاتر ──
  const [filters, setFilters] = useState<ShippingExportFilters>({
    dateFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
    status: ['مؤكدة'],
    customerQuery: '',
  });
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['مؤكدة']);

  // ── وضع البحث بأرقام الفواتير المباشرة ──
  const [invoiceIdsInput, setInvoiceIdsInput] = useState(''); // نص الإدخال الخام
  // تحليل النص إلى أرقام صحيحة
  const parsedIds = invoiceIdsInput
    .split(/[,،\s\n]+/)
    .map(s => s.trim())
    .filter(s => s !== '' && /^\d+$/.test(s))
    .map(Number);
  const isIdMode = invoiceIdsInput.trim() !== '' && parsedIds.length > 0;

  // ── البيانات ──
  const [rows, setRows] = useState<ShippingRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // ── Pagination ──
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(rows.length / ROWS_PER_PAGE));
  const pagedRows = rows.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  // ── إحصائيات ──
  const stats = {
    total: rows.length,
    highConf: rows.filter(r => r.addressConfidence === 'high').length,
    medConf:  rows.filter(r => r.addressConfidence === 'medium').length,
    lowConf:  rows.filter(r => r.addressConfidence === 'low').length,
    edited:   rows.filter(r => r.manuallyEdited).length,
  };

  // ─────────────────────────────────────────────────────────
  //  جلب الفواتير وتحليل العناوين
  // ─────────────────────────────────────────────────────────
  const handleFetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);
    setPage(1);

    try {
      const result = await window.electronAPI.shipping.getInvoicesForExport(
        isIdMode
          ? { invoiceIds: parsedIds }             // ← وضع الأرقام المباشرة
          : { ...filters, status: selectedStatuses.length > 0 ? selectedStatuses : undefined }
      );

      if (!result.success) {
        setError(result.error || 'فشل جلب الفواتير');
        return;
      }

      const rawData = result.data || [];

      // تطبيق خوارزمية تحليل العناوين على كل صف
      const mapped: ShippingRow[] = rawData.map((inv: any) => {
        const parsed = parseEgyptianAddress(inv.customer_address || '');
        return {
          invoiceId:       inv.invoice_id,
          customerId:      inv.customer_id,
          consigneeName:   inv.customer_name || '',
          city:            parsed.city,
          area:            parsed.area,
          address:         inv.customer_address || '',
          phone1:          inv.customer_phone || '',
          phone2:          inv.customer_phone_2 || '',
          email:           inv.email || '',
          orderId:         String(inv.invoice_id),
          clientId:        inv.customer_id || '',
          itemName:        '',   // يملأها المستخدم يدوياً
          quantity:        0,    // يملأها المستخدم يدوياً
          itemDescription: '',   // يملأها المستخدم يدوياً
          cod:             inv.final_total || 0,
          weight:          '',
          size:            '',
          serviceType:     'Normal COD',
          notes:           inv.notes || '',
          addressConfidence: parsed.confidence,
          manuallyEdited:  false,
        };
      });

      setRows(mapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
    } finally {
      setIsLoading(false);
    }
  }, [filters, selectedStatuses, isIdMode, parsedIds]);

  // ─────────────────────────────────────────────────────────
  //  إعادة تحليل جميع العناوين
  // ─────────────────────────────────────────────────────────
  const handleReparse = useCallback(() => {
    setRows(prev => prev.map(row => {
      if (row.manuallyEdited) return row; // لا تعيد تحليل ما عدّله المستخدم يدوياً
      const parsed = parseEgyptianAddress(row.address);
      return { ...row, city: parsed.city, area: parsed.area, addressConfidence: parsed.confidence };
    }));
  }, []);

  // ─────────────────────────────────────────────────────────
  //  تعديل صف
  // ─────────────────────────────────────────────────────────
  const updateRow = useCallback(<K extends keyof ShippingRow>(
    invoiceId: number,
    field: K,
    value: ShippingRow[K]
  ) => {
    setRows(prev => prev.map(row =>
      row.invoiceId === invoiceId
        ? { ...row, [field]: value, manuallyEdited: true }
        : row
    ));
  }, []);

  // ─────────────────────────────────────────────────────────
  //  تصدير Excel
  // ─────────────────────────────────────────────────────────
  const handleExport = useCallback(async () => {
    if (rows.length === 0) return;
    setIsExporting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const result = await window.electronAPI.shipping.exportExcel(rows);
      if (result.success) {
        setSuccessMsg(`✅ تم تصدير ${rows.length} صف بنجاح إلى: ${result.filePath}`);
      } else if (result.error !== 'تم إلغاء الحفظ') {
        setError(result.error || 'فشل التصدير');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل التصدير');
    } finally {
      setIsExporting(false);
    }
  }, [rows]);

  // ─────────────────────────────────────────────────────────
  //  Toggle حالة في الفلتر
  // ─────────────────────────────────────────────────────────
  const toggleStatus = (s: string) => {
    setSelectedStatuses(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    );
  };

  // ─────────────────────────────────────────────────────────
  //  Render
  // ─────────────────────────────────────────────────────────
  return (
    <div className="p-6 min-h-screen text-slate-100 space-y-5" style={{ backgroundColor: '#0B0F1A' }} dir="rtl">

      {/* ═══ Header ═══ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #FF6632, #FF8C5A)', boxShadow: '0 4px 16px rgba(255,102,50,0.35)' }}>
            <Truck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">تصدير بيانات الشحن</h1>
            <p className="text-slate-400 text-xs mt-0.5">استخراج وتدقيق بيانات الطلبات وتصديرها لشركة الشحن</p>
          </div>
        </div>

        {/* أزرار العمليات */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleReparse}
            disabled={rows.length === 0}
            title="إعادة تحليل العناوين تلقائياً"
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-xl text-xs font-medium border border-slate-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
            إعادة تحليل العناوين
          </button>
          <button
            onClick={handleExport}
            disabled={rows.length === 0 || isExporting}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
            style={{ background: rows.length > 0 ? 'linear-gradient(135deg, #10b981, #059669)' : '#334155', boxShadow: rows.length > 0 ? '0 4px 16px rgba(16,185,129,0.3)' : 'none' }}
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
            {isExporting ? 'جاري التصدير...' : `تصدير Excel (${rows.length})`}
          </button>
        </div>
      </div>

      {/* ═══ Feedback ═══ */}
      {error && (
        <div className="flex items-start gap-3 bg-red-950/30 border border-red-800/40 text-red-400 rounded-2xl p-4 animate-fadeIn">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}
      {successMsg && (
        <div className="flex items-center gap-3 bg-emerald-950/30 border border-emerald-800/40 text-emerald-400 rounded-2xl p-4 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">{successMsg}</p>
        </div>
      )}

      {/* ═══ Filters Panel ═══ */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Filter className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-semibold text-white">فلاتر الاستعلام</h3>
        </div>

        {/* ── حقل الأرقام المباشرة ── */}
        <div className={`rounded-xl border p-4 transition-all ${
          isIdMode
            ? 'border-orange-500/50 bg-orange-950/20'
            : 'border-slate-700 bg-slate-800/40'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <Hash className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-xs font-semibold text-orange-300">بحث مباشر بأرقام الفواتير</span>
            {isIdMode && (
              <span className="mr-auto text-[10px] bg-orange-500/20 text-orange-300 border border-orange-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Zap className="w-2.5 h-2.5" />
                نشط — تجاهل باقي الفلاتر
              </span>
            )}
          </div>
          <div className="flex items-start gap-3">
            <textarea
              value={invoiceIdsInput}
              onChange={e => setInvoiceIdsInput(e.target.value)}
              placeholder={'أدخل أرقام الفواتير مفصولة بفاصلة أو مسافة\nمثال: 1358, 1456, 1700'}
              rows={2}
              className="flex-1 bg-slate-800 border border-slate-700 text-slate-200 text-sm px-3 py-2 rounded-xl focus:outline-none focus:border-orange-500 transition-colors resize-none font-mono text-left placeholder-slate-500"
              dir="ltr"
            />
            {invoiceIdsInput.trim() !== '' && (
              <button
                onClick={() => setInvoiceIdsInput('')}
                className="mt-1 p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                title="مسح"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {/* معاينة الأرقام المحللة */}
          {invoiceIdsInput.trim() !== '' && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {parsedIds.length > 0 ? (
                <>
                  <span className="text-[10px] text-slate-400 self-center">سيتم جلب:</span>
                  {parsedIds.map(id => (
                    <span key={id} className="text-[10px] bg-orange-500/20 text-orange-300 border border-orange-500/30 px-2 py-0.5 rounded-full font-mono">
                      #{id}
                    </span>
                  ))}
                </>
              ) : (
                <span className="text-[10px] text-red-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> لم يتم التعرف على أرقام صحيحة
                </span>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* من تاريخ */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 flex items-center gap-1.5"><Calendar className="w-3 h-3" />من تاريخ</label>
            <input
              type="date"
              value={filters.dateFrom || ''}
              onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* إلى تاريخ */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 flex items-center gap-1.5"><Calendar className="w-3 h-3" />إلى تاريخ</label>
            <input
              type="date"
              value={filters.dateTo || ''}
              onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* بحث بالعميل */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 flex items-center gap-1.5"><Search className="w-3 h-3" />بحث بالعميل</label>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                value={filters.customerQuery || ''}
                onChange={e => setFilters(f => ({ ...f, customerQuery: e.target.value }))}
                placeholder="اسم أو رقم هاتف..."
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm pr-9 pl-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          {/* زر الجلب */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 opacity-0">جلب</label>
            <button
              onClick={handleFetch}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-2 px-4 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 shadow-lg shadow-indigo-600/20"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
              {isLoading ? 'جاري الجلب...' : 'جلب الفواتير'}
            </button>
          </div>
        </div>

        {/* فلتر الحالة */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs text-slate-500">حالة الفاتورة:</span>
          {STATUS_OPTIONS.map(s => (
            <button
              key={s}
              onClick={() => toggleStatus(s)}
              className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${
                selectedStatuses.includes(s)
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
              }`}
            >
              {s}
            </button>
          ))}
          {selectedStatuses.length === 0 && (
            <span className="text-xs text-amber-400 flex items-center gap-1">
              <Info className="w-3 h-3" /> لم تحدد حالة — ستجلب الكل
            </span>
          )}
        </div>
      </div>

      {/* ═══ Stats Bar ═══ */}
      {rows.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'إجمالي الصفوف', value: stats.total, color: 'text-slate-200', bg: 'bg-slate-800/60 border-slate-700' },
            { label: 'تحليل عالي الثقة', value: stats.highConf,  color: 'text-emerald-400', bg: 'bg-emerald-950/30 border-emerald-800/30' },
            { label: 'تحليل جزئي',      value: stats.medConf,   color: 'text-amber-400',   bg: 'bg-amber-950/30 border-amber-800/30' },
            { label: 'لم يتعرف عليه',  value: stats.lowConf,   color: 'text-red-400',     bg: 'bg-red-950/30 border-red-800/30' },
            { label: 'معدَّل يدوياً',    value: stats.edited,    color: 'text-indigo-400',  bg: 'bg-indigo-950/30 border-indigo-800/30' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} border rounded-xl px-4 py-3 text-center`}>
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-slate-400 text-[10px] mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ═══ Legend ═══ */}
      {rows.length > 0 && (
        <div className="flex items-center gap-4 text-xs text-slate-400 bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-2.5">
          <span className="font-medium text-slate-300">دليل الألوان:</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" /> تحليل ناجح</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> يحتاج مراجعة</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" /> لم يتم التعرف</span>
          <span className="text-slate-500 mr-auto">💡 انقر على أي خلية لتعديلها مباشرة</span>
        </div>
      )}

      {/* ═══ Empty State ═══ */}
      {rows.length === 0 && !isLoading && !error && (
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-slate-900 border border-slate-800">
            <Truck className="w-8 h-8 text-slate-600" />
          </div>
          <div>
            <p className="text-slate-300 font-semibold text-base">لا توجد بيانات بعد</p>
            <p className="text-slate-500 text-sm mt-1">اضبط الفلاتر ثم اضغط "جلب الفواتير" لعرض البيانات</p>
          </div>
        </div>
      )}

      {/* ═══ Table ═══ */}
      {rows.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ minWidth: '1800px' }}>
              <thead>
                <tr className="border-b border-slate-800" style={{ backgroundColor: '#0F1629' }}>
                  {[
                    '#', 'ثقة', 'Consignee Name', 'City', 'Area', 'Address',
                    'Phone_1', 'Phone_2', 'E-mail', 'Order ID', 'Client ID',
                    'Item Name', 'Qty', 'Item Description', 'COD',
                    'Weight', 'Size', 'Service Type', 'Notes'
                  ].map((h, i) => (
                    <th
                      key={i}
                      className="text-right text-[10px] font-semibold text-slate-400 px-3 py-3 whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagedRows.map((row, idx) => {
                  const globalIdx = (page - 1) * ROWS_PER_PAGE + idx + 1;
                  const rowBg = idx % 2 === 0 ? 'bg-slate-900' : 'bg-slate-950/50';
                  const needsReview = row.addressConfidence === 'low' || !row.city || !row.area;

                  return (
                    <tr
                      key={row.invoiceId}
                      className={`${rowBg} border-b border-slate-800/50 hover:bg-slate-800/40 transition-colors ${needsReview ? 'border-r-2 border-r-amber-500/40' : ''}`}
                    >
                      {/* رقم الصف */}
                      <td className="px-3 py-2 text-slate-500 font-mono text-[10px] whitespace-nowrap">{globalIdx}</td>

                      {/* مؤشر الثقة */}
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-center">
                          <ConfidenceDot level={row.addressConfidence} />
                        </div>
                      </td>

                      {/* Consignee Name */}
                      <td className="px-1 py-1.5 min-w-[140px]">
                        <EditableCell
                          value={row.consigneeName}
                          onChange={v => updateRow(row.invoiceId, 'consigneeName', v)}
                          placeholder="اسم المستلم"
                        />
                      </td>

                      {/* City */}
                      <td className="px-1 py-1.5 min-w-[110px]">
                        <EditableCell
                          value={row.city}
                          onChange={v => updateRow(row.invoiceId, 'city', v)}
                          placeholder="المدينة"
                          isHighlighted={true}
                        />
                      </td>

                      {/* Area */}
                      <td className="px-1 py-1.5 min-w-[120px]">
                        <EditableCell
                          value={row.area}
                          onChange={v => updateRow(row.invoiceId, 'area', v)}
                          placeholder="المنطقة"
                          isHighlighted={true}
                        />
                      </td>

                      {/* Address */}
                      <td className="px-1 py-1.5 min-w-[220px] max-w-[260px]">
                        <EditableCell
                          value={row.address}
                          onChange={v => updateRow(row.invoiceId, 'address', v)}
                          placeholder="العنوان كامل"
                        />
                      </td>

                      {/* Phone_1 */}
                      <td className="px-1 py-1.5 min-w-[120px]">
                        <EditableCell
                          value={row.phone1}
                          onChange={v => updateRow(row.invoiceId, 'phone1', v)}
                          placeholder="الهاتف الأول"
                        />
                      </td>

                      {/* Phone_2 */}
                      <td className="px-1 py-1.5 min-w-[120px]">
                        <EditableCell
                          value={row.phone2}
                          onChange={v => updateRow(row.invoiceId, 'phone2', v)}
                          placeholder="الهاتف الثاني"
                        />
                      </td>

                      {/* E-mail */}
                      <td className="px-1 py-1.5 min-w-[140px]">
                        <EditableCell
                          value={row.email}
                          onChange={v => updateRow(row.invoiceId, 'email', v)}
                          placeholder="البريد الإلكتروني"
                        />
                      </td>

                      {/* Order ID */}
                      <td className="px-3 py-2 text-slate-300 font-mono whitespace-nowrap">
                        #{row.orderId}
                      </td>

                      {/* Client ID */}
                      <td className="px-3 py-2 text-slate-400 font-mono text-[10px] whitespace-nowrap">
                        {row.clientId || '—'}
                      </td>

                      {/* Item Name */}
                      <td className="px-1 py-1.5 min-w-[130px]">
                        <EditableCell
                          value={row.itemName}
                          onChange={v => updateRow(row.invoiceId, 'itemName', v)}
                          placeholder="اسم المنتج"
                        />
                      </td>

                      {/* Quantity */}
                      <td className="px-1 py-1.5 min-w-[60px]">
                        <EditableCell
                          value={row.quantity === 0 ? '' : String(row.quantity)}
                          onChange={v => updateRow(row.invoiceId, 'quantity', Number(v) || 1)}
                          placeholder="الكمية"
                        />
                      </td>

                      {/* Item Description */}
                      <td className="px-1 py-1.5 min-w-[160px] max-w-[200px]">
                        <EditableCell
                          value={row.itemDescription}
                          onChange={v => updateRow(row.invoiceId, 'itemDescription', v)}
                          placeholder="الوصف"
                        />
                      </td>

                      {/* COD */}
                      <td className="px-1 py-1.5 min-w-[90px]">
                        <EditableCell
                          value={String(row.cod)}
                          onChange={v => updateRow(row.invoiceId, 'cod', Number(v) || 0)}
                          placeholder="المبلغ"
                        />
                      </td>

                      {/* Weight */}
                      <td className="px-1 py-1.5 min-w-[80px]">
                        <EditableCell
                          value={row.weight}
                          onChange={v => updateRow(row.invoiceId, 'weight', v)}
                          placeholder="الوزن"
                        />
                      </td>

                      {/* Size */}
                      <td className="px-1 py-1.5 min-w-[80px]">
                        <EditableCell
                          value={row.size}
                          onChange={v => updateRow(row.invoiceId, 'size', v)}
                          placeholder="الحجم"
                        />
                      </td>

                      {/* Service Type */}
                      <td className="px-1 py-1.5 min-w-[110px]">
                        <EditableCell
                          value={row.serviceType}
                          onChange={v => updateRow(row.invoiceId, 'serviceType', v)}
                          placeholder="نوع الخدمة"
                        />
                      </td>

                      {/* Notes */}
                      <td className="px-1 py-1.5 min-w-[140px] max-w-[180px]">
                        <EditableCell
                          value={row.notes}
                          onChange={v => updateRow(row.invoiceId, 'notes', v)}
                          placeholder="ملاحظات"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800">
              <p className="text-xs text-slate-400">
                عرض {(page - 1) * ROWS_PER_PAGE + 1}–{Math.min(page * ROWS_PER_PAGE, rows.length)} من {rows.length} صف
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <span className="text-xs text-slate-300 font-medium px-2">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
