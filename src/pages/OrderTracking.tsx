import React, { useState, useEffect, useCallback } from 'react';
import {
  ClipboardCheck, Search, Filter, RefreshCw, Upload, CheckCircle2, Loader2,
  Calendar, Check, X, AlertTriangle, AlertCircle, Package, ChevronLeft, ChevronRight
} from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

const ROWS_PER_PAGE = 25;
const ALL_STATUSES = [
  'قيد الانتظار',
  'مؤكدة',
  'تم الشحن',
  'تم التسليم',
  'ملغاة',
  'مرتجعة',
  'تسليم ناجح',
  'قيد التوصيل',
  'تم الاستلام في المخزن',
  'طلب بيك أب',
  'تم الارتجاع للراسل',
  'استبدال او استلام طرد'
];

const STATUS_BADGE_STYLES: Record<string, string> = {
  'قيد الانتظار': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'مؤكدة': 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  'تم الشحن': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'تم التسليم': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'ملغاة': 'bg-red-500/10 text-red-400 border-red-500/20',
  'مرتجعة': 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  'تسليم ناجح': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-bold',
  'قيد التوصيل': 'bg-blue-500/10 text-blue-400 border-blue-500/20 font-bold',
  'تم الاستلام في المخزن': 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 font-bold',
  'طلب بيك أب': 'bg-amber-500/10 text-amber-400 border-amber-500/20 font-bold',
  'تم الارتجاع للراسل': 'bg-red-500/10 text-red-450 border-red-500/20 font-bold',
  'استبدال او استلام طرد': 'bg-purple-500/10 text-purple-400 border-purple-500/20 font-bold',
};

interface ExcelMatchRow {
  orderId: number;
  trackingCode: string;
  excelStatus: string;
  crmStatus: string | null;
  customerName: string;
  proposedStatus: string;
  selected: boolean;
}

export default function OrderTracking() {
  // ── الفلاتر ──
  const [dateFrom, setDateFrom] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('الكل');

  // ── البيانات ──
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [updatingIds, setUpdatingIds] = useState<Record<number, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // ── إحصائيات قاعدة البيانات بأكملها (KPIs) ──
  const [dbStats, setDbStats] = useState<any>({
    total: 0,
    delivered: 0,
    shipping: 0,
    pending: 0,
    returned: 0
  });

  // ── Pagination ──
  const [page, setPage] = useState(1);

  // ── مطابقة Excel ──
  const [matchData, setMatchData] = useState<ExcelMatchRow[]>([]);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [isMatching, setIsMatching] = useState(false);

  // ─────────────────────────────────────────────────────────
  //  جلب إحصائيات قاعدة البيانات (KPIs)
  // ─────────────────────────────────────────────────────────
  const fetchDbStats = useCallback(async () => {
    try {
      const res = await window.electronAPI.shipping.getDbStats();
      if (res.success && res.stats) {
        setDbStats(res.stats);
      }
    } catch (err) {
      console.error('فشل جلب إحصائيات قاعدة البيانات:', err);
    }
  }, []);

  // ─────────────────────────────────────────────────────────
  //  جلب البيانات
  // ─────────────────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const filters = {
        dateFrom,
        dateTo,
        customerQuery: searchQuery.trim() !== '' ? searchQuery : undefined,
        status: selectedStatus !== 'الكل' ? [selectedStatus] : undefined,
      };

      const res = await window.electronAPI.shipping.getInvoicesForExport(filters);
      if (res.success) {
        setOrders(res.data);
      } else {
        setError(res.error || 'حدث خطأ أثناء تحميل الطلبات');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل الاتصال بالنظام');
    } finally {
      setIsLoading(false);
    }
  }, [dateFrom, dateTo, searchQuery, selectedStatus]);

  useEffect(() => {
    fetchOrders();
  }, [dateFrom, dateTo, selectedStatus]);

  useEffect(() => {
    fetchDbStats();
  }, [fetchDbStats]);

  // ─────────────────────────────────────────────────────────
  //  تحديث حالة طلب منفرد يدوياً
  // ─────────────────────────────────────────────────────────
  const handleUpdateSingleStatus = async (invoiceId: number, newStatus: string) => {
    setUpdatingIds(prev => ({ ...prev, [invoiceId]: true }));
    try {
      const res = await window.electronAPI.shipping.updateStatuses([
        { invoiceId, status: newStatus }
      ]);

      if (res.success) {
        setOrders(prev =>
          prev.map(ord => (ord.invoice_id === invoiceId ? { ...ord, status: newStatus } : ord))
        );
        showSuccess('تم تحديث حالة الطلب بنجاح');
        fetchDbStats(); // تحديث الـ KPIs لقاعدة البيانات بالكامل
      } else {
        setError(res.error || 'فشل تحديث الحالة');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء الحفظ');
    } finally {
      setUpdatingIds(prev => ({ ...prev, [invoiceId]: false }));
    }
  };

  // ─────────────────────────────────────────────────────────
  //  رفع ومطابقة ملف Excel
  // ─────────────────────────────────────────────────────────
  const handleUploadExcel = async () => {
    setError(null);
    setIsMatching(true);
    try {
      const res = await window.electronAPI.shipping.parseExcelForTracking();
      if (res.success && res.data) {
        const mapped: ExcelMatchRow[] = res.data.map((row: any) => ({
          ...row,
          selected: row.crmStatus !== null, // تحديد الفواتير الموجودة بالنظام تلقائياً
        }));
        setMatchData(mapped);
        setShowMatchModal(true);
      } else if (res.error) {
        setError(res.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل قراءة الملف');
    } finally {
      setIsMatching(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  //  حفظ مطابقة الـ Excel
  // ─────────────────────────────────────────────────────────
  const handleSaveMatch = async () => {
    const selectedUpdates = matchData
      .filter(row => row.selected)
      .map(row => ({
        invoiceId: row.orderId,
        status: row.proposedStatus,
      }));

    if (selectedUpdates.length === 0) {
      alert('الرجاء تحديد طلب واحد على الأقل للتحديث');
      return;
    }

    setIsMatching(true);
    try {
      const res = await window.electronAPI.shipping.updateStatuses(selectedUpdates);
      if (res.success) {
        setShowMatchModal(false);
        showSuccess(`تم تحديث حالات ${selectedUpdates.length} طلب بنجاح!`);
        fetchOrders();
        fetchDbStats(); // تحديث الـ KPIs لقاعدة البيانات بالكامل
      } else {
        alert(res.error || 'فشل حفظ التحديثات');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'حدث خطأ أثناء الحفظ');
    } finally {
      setIsMatching(false);
    }
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4500);
  };

  // ── الفلترة الموضعية للبحث السريع ──
  const filteredOrders = orders;

  // ── Pagination ──
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ROWS_PER_PAGE));
  const pagedOrders = filteredOrders.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  // ── إحصائيات سريعة للطلبات المعروضة ──
  const handleRefresh = useCallback(async () => {
    fetchOrders();
    fetchDbStats();
  }, [fetchOrders, fetchDbStats]);

  // ── إحصائيات سريعة للطلبات المعروضة ──
  const stats = {
    total: filteredOrders.length,
    delivered: filteredOrders.filter(o => o.status === 'تم التسليم' || o.status === 'تسليم ناجح').length,
    shipping: filteredOrders.filter(o => o.status === 'تم الشحن' || o.status === 'قيد التوصيل' || o.status === 'تم الاستلام في المخزن' || o.status === 'استبدال او استلام طرد').length,
    pending: filteredOrders.filter(o => o.status === 'قيد الانتظار' || o.status === 'مؤكدة' || o.status === 'طلب بيك أب').length,
    returned: filteredOrders.filter(o => o.status === 'مرتجعة' || o.status === 'تم الارتجاع للراسل').length,
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 pb-16" dir="rtl">
      
      {/* 1. الهيدر الرئيسي */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ClipboardCheck className="w-7 h-7 text-indigo-400" />
            شاشة متابعة حالة الطلبات
          </h1>
          <p className="text-gray-400 text-xs mt-1">
            تابع وتتبع حالات الشحن للأوردرات، وقم بمطابقة وتحديث الحالات دفعياً عن طريق رفع ملف شركة الشحن.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={handleUploadExcel}
            isLoading={isMatching}
            variant="outline"
            icon={<Upload className="w-4 h-4" />}
          >
            مطابقة ملف شركة الشحن (Excel)
          </Button>
          <Button
            onClick={handleRefresh}
            isLoading={isLoading}
            icon={<RefreshCw className="w-4 h-4" />}
          >
            تحديث القائمة
          </Button>
        </div>
      </div>

      {/* 2. رسائل النجاح والخطأ */}
      {successMsg && (
        <div className="bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 p-4 rounded-2xl flex items-center gap-3 animate-pulse">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="text-xs font-bold">{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="bg-red-950/40 border border-red-500/20 text-red-400 p-4 rounded-2xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-xs font-semibold">{error}</span>
        </div>
      )}

      {/* 3. بطاقات الإحصائيات */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="glass p-4 rounded-2xl border border-slate-800/40">
          <span className="text-[10px] text-gray-400 font-bold block">إجمالي الطلبات</span>
          <span className="text-xl font-black text-white mt-1 block">{dbStats.total}</span>
        </div>
        <div className="glass p-4 rounded-2xl border border-slate-800/40">
          <span className="text-[10px] text-emerald-400 font-bold block">تسليم ناجح / تم التسليم</span>
          <span className="text-xl font-black text-emerald-400 mt-1 block">{dbStats.delivered}</span>
        </div>
        <div className="glass p-4 rounded-2xl border border-slate-800/40">
          <span className="text-[10px] text-blue-400 font-bold block">تم الشحن / قيد التوصيل</span>
          <span className="text-xl font-black text-blue-400 mt-1 block">{dbStats.shipping}</span>
        </div>
        <div className="glass p-4 rounded-2xl border border-slate-800/40">
          <span className="text-[10px] text-indigo-400 font-bold block">انتظار وتأكيد</span>
          <span className="text-xl font-black text-indigo-400 mt-1 block">{dbStats.pending}</span>
        </div>
        <div className="glass p-4 rounded-2xl border border-slate-800/40 col-span-2 md:col-span-1">
          <span className="text-[10px] text-pink-400 font-bold block">مرتجعة / ارتجاع</span>
          <span className="text-xl font-black text-pink-400 mt-1 block">{dbStats.returned}</span>
        </div>
      </div>

      {/* 4. شريط البحث والفلترة */}
      <div className="glass rounded-3xl p-5 border border-slate-800/40 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-[10px] text-gray-400 font-bold block mb-1.5">بحث بالعميل أو الهاتف أو الطلب</label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="ابحث بالاسم، الهاتف، رقم الفاتورة..."
                className="w-full bg-slate-950/40 border border-slate-800 rounded-2xl pr-10 pl-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
                onKeyDown={e => e.key === 'Enter' && fetchOrders()}
              />
              <Search className="w-4 h-4 text-gray-500 absolute right-3.5 top-3" />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-gray-400 font-bold block mb-1.5">الحالة في النظام</label>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-950/40 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="الكل">كل الحالات</option>
              {ALL_STATUSES.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-gray-400 font-bold block mb-1.5">تاريخ البداية</label>
            <div className="relative">
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="w-full bg-slate-950/40 border border-slate-800 rounded-2xl pr-4 pl-10 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <Calendar className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-gray-400 font-bold block mb-1.5">تاريخ النهاية</label>
            <div className="relative">
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="w-full bg-slate-950/40 border border-slate-800 rounded-2xl pr-4 pl-10 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <Calendar className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
            </div>
          </div>
        </div>
        
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={fetchOrders}
            icon={<Filter className="w-3.5 h-3.5" />}
          >
            تطبيق الفلترة
          </Button>
        </div>
      </div>

      {/* 5. جدول الطلبات */}
      <div className="glass rounded-3xl border border-slate-800/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="border-b border-slate-800/60 bg-slate-950/20 text-xs text-gray-400 font-bold">
                <th className="py-4 px-6">رقم الطلب</th>
                <th className="py-4 px-4">اسم العميل</th>
                <th className="py-4 px-4">رقم الهاتف</th>
                <th className="py-4 px-4">العنوان</th>
                <th className="py-4 px-4">التاريخ</th>
                <th className="py-4 px-4">المبلغ الكلي</th>
                <th className="py-4 px-6 text-center">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30 text-xs text-slate-300">
              {pagedOrders.map(order => (
                <tr key={order.invoice_id} className="hover:bg-slate-900/10 transition-colors">
                  <td className="py-3.5 px-6 font-bold text-white">#{order.invoice_id}</td>
                  <td className="py-3.5 px-4 font-semibold">{order.customer_name}</td>
                  <td className="py-3.5 px-4 font-medium text-slate-400">{order.customer_phone}</td>
                  <td className="py-3.5 px-4 max-w-xs truncate" title={order.customer_address}>
                    {order.customer_address || '—'}
                  </td>
                  <td className="py-3.5 px-4 text-slate-400">
                    {new Date(order.invoice_date).toLocaleDateString('ar-EG', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-indigo-300">
                    {order.final_total} ج.م
                  </td>
                  <td className="py-3.5 px-6 text-center">
                    {updatingIds[order.invoice_id] ? (
                      <Loader2 className="w-4 h-4 animate-spin mx-auto text-indigo-400" />
                    ) : (
                      <select
                        value={order.status || 'قيد الانتظار'}
                        onChange={e => handleUpdateSingleStatus(order.invoice_id, e.target.value)}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full border focus:outline-none cursor-pointer transition-colors ${
                          STATUS_BADGE_STYLES[order.status] || 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {ALL_STATUSES.map(st => (
                          <option key={st} value={st} className="bg-slate-900 text-white">
                            {st}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                </tr>
              ))}
              {pagedOrders.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <Package className="w-8 h-8 text-gray-600" />
                      <span>لا توجد طلبات مطابقة للفلاتر المحددة</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* أزرار التنقل بين الصفحات */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-800/40 px-6 py-4 bg-slate-950/10">
            <span className="text-xs text-gray-500">
              الصفحة {page} من {totalPages} (إجمالي {filteredOrders.length} طلب)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-slate-800 text-gray-400 hover:text-white disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-slate-800 text-gray-400 hover:text-white disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 6. نافذة مطابقة ملف شركة الشحن (Match Excel Modal) */}
      {showMatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass rounded-3xl border border-slate-800/80 w-full max-w-5xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            {/* هيدر المودال */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800/60 bg-slate-950/40">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Upload className="w-5 h-5 text-indigo-400" />
                  مطابقة وتحديث الحالات من ملف شركة الشحن
                </h3>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  تم تحليل ملف الـ Excel بنجاح. راجع الاقتراحات والمطابقة مع السحابة وحدد الطلبات لتحديثها.
                </p>
              </div>
              <button
                onClick={() => setShowMatchModal(false)}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-slate-800/60 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* إحصائيات المطابقة */}
            <div className="px-6 py-3.5 bg-slate-900/30 border-b border-slate-800/40 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="text-xs">
                <span className="text-gray-500 font-semibold block">إجمالي أسطر الملف</span>
                <span className="text-sm font-bold text-white mt-0.5 block">{matchData.length}</span>
              </div>
              <div className="text-xs">
                <span className="text-emerald-500 font-semibold block">موجود في النظام</span>
                <span className="text-sm font-bold text-emerald-400 mt-0.5 block">
                  {matchData.filter(r => r.crmStatus !== null).length}
                </span>
              </div>
              <div className="text-xs">
                <span className="text-red-500 font-semibold block">غير موجود بالنظام</span>
                <span className="text-sm font-bold text-red-400 mt-0.5 block">
                  {matchData.filter(r => r.crmStatus === null).length}
                </span>
              </div>
              <div className="text-xs">
                <span className="text-indigo-500 font-semibold block">المحدد للتحديث</span>
                <span className="text-sm font-bold text-indigo-400 mt-0.5 block">
                  {matchData.filter(r => r.selected).length}
                </span>
              </div>
            </div>

            {/* جدول المراجعة */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="border border-slate-800/60 rounded-2xl overflow-hidden">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800/60 bg-slate-950/30 text-[10px] text-gray-400 font-bold">
                      <th className="py-3 px-4 text-center w-12">
                        <input
                          type="checkbox"
                          checked={matchData.length > 0 && matchData.every(r => r.selected)}
                          onChange={e => {
                            const val = e.target.checked;
                            setMatchData(prev => prev.map(r => ({ ...r, selected: val })));
                          }}
                          className="rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-0 cursor-pointer"
                        />
                      </th>
                      <th className="py-3 px-4">رقم الطلب (ID)</th>
                      <th className="py-3 px-4">اسم العميل</th>
                      <th className="py-3 px-4">رقم البوليصة</th>
                      <th className="py-3 px-4">الحالة في Excel</th>
                      <th className="py-3 px-4">الحالة الحالية في النظام</th>
                      <th className="py-3 px-6 text-center">الحالة الجديدة (مطابقة Excel)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/30 text-[11px] text-slate-300 bg-slate-900/10">
                    {matchData.map((row, index) => {
                      const exists = row.crmStatus !== null;
                      return (
                        <tr key={index} className={`hover:bg-slate-900/20 transition-colors ${!exists ? 'opacity-50 bg-red-950/5' : ''}`}>
                          <td className="py-3 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={row.selected}
                              disabled={!exists}
                              onChange={e => {
                                const val = e.target.checked;
                                setMatchData(prev =>
                                  prev.map((r, idx) => (idx === index ? { ...r, selected: val } : r))
                                );
                              }}
                              className="rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-0 cursor-pointer disabled:opacity-40"
                            />
                          </td>
                          <td className="py-3 px-4 font-bold text-white">#{row.orderId}</td>
                          <td className="py-3 px-4 font-semibold">{row.customerName}</td>
                          <td className="py-3 px-4 font-medium text-slate-400">{row.trackingCode || '—'}</td>
                          <td className="py-3 px-4 text-slate-400">{row.excelStatus}</td>
                          <td className="py-3 px-4">
                            {exists ? (
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${STATUS_BADGE_STYLES[row.crmStatus!]}`}>
                                {row.crmStatus}
                              </span>
                            ) : (
                              <span className="text-red-400 font-bold flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                غير موجود
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-6 text-center">
                            {exists ? (
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${STATUS_BADGE_STYLES[row.proposedStatus] || 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                                {row.proposedStatus}
                              </span>
                            ) : (
                              <span className="text-gray-500">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* فوتر المودال */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800/60 bg-slate-950/40">
              <span className="text-xs text-gray-400">
                سيتم تحديث عدد <strong className="text-indigo-400">{matchData.filter(r => r.selected).length}</strong> طلب في السحابة.
              </span>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowMatchModal(false)}
                >
                  إلغاء
                </Button>
                <Button
                  onClick={handleSaveMatch}
                  isLoading={isMatching}
                >
                  تأكيد وحفظ المطابقة
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
