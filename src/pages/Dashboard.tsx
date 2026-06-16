import React, { useEffect, useState } from 'react';
import { Users, DollarSign, ShoppingBag, MessageSquare, ArrowUpRight, TrendingUp, Sparkles, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { useContactsStore } from '../store/useContactsStore';
import { useMessagesStore } from '../store/useMessagesStore';
import { runRFMAnalysis, InvoiceRecord } from '../lib/rfm';
import { RFM_SEGMENTS_CONFIG } from '../types/rfm.types';
import Button from '../components/ui/Button';
import { NavLink } from 'react-router-dom';

export default function Dashboard() {
  const { contacts, fetchContacts } = useContactsStore();
  const { conversations, fetchConversations } = useMessagesStore();

  const [isLoading, setIsLoading] = useState(true);
  const [kpis, setKpis] = useState({
    totalCustomers: 0,
    totalSales: 0,
    totalOrders: 0,
    avgOrderValue: 0
  });

  const [segmentData, setSegmentData] = useState<any[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // 1. جلب جهات الاتصال والمحادثات
      await Promise.all([fetchContacts(), fetchConversations()]);
      const currentContacts = useContactsStore.getState().contacts;
      const currentConvs = useMessagesStore.getState().conversations;

      // 2. جلب بيانات الفواتير للتحليل
      const rfmRes = await window.electronAPI.db.getRFMData();
      if (rfmRes.success) {
        const invoices: InvoiceRecord[] = rfmRes.data || [];

        // حساب KPIs
        const totalSales = invoices.reduce((sum, inv) => sum + (inv.final_total || 0), 0);
        const totalOrders = invoices.length;
        const avgOrderValue = totalOrders > 0 ? Math.round(totalSales / totalOrders) : 0;

        setKpis({
          totalCustomers: currentContacts.length,
          totalSales,
          totalOrders,
          avgOrderValue
        });

        // تشغيل تحليل RFM
        const { contactsWithScores } = runRFMAnalysis(invoices, currentContacts);

        // تجميع العملاء حسب الشريحة لعرض المخطط البياني
        const segmentCounts: Record<string, number> = {};
        contactsWithScores.forEach(c => {
          const seg = c.rfmScore?.segment || 'hibernating';
          segmentCounts[seg] = (segmentCounts[seg] || 0) + 1;
        });

        const chartData = Object.entries(RFM_SEGMENTS_CONFIG).map(([key, config]) => ({
          name: config.nameAr,
          count: segmentCounts[key] || 0,
          color: config.color
        })).filter(item => item.count > 0);

        setSegmentData(chartData);

        // فواتير المبيعات الأخيرة
        setRecentInvoices(invoices.slice(0, 5));
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
          <p className="text-gray-400 text-xs font-semibold">جارٍ تحميل إحصائيات لوحة التحكم...</p>
        </div>
      </div>
    );
  }

  // إجمالي المحادثات النشطة حالياً
  const activeChatsCount = conversations.length;

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto pb-16">
      
      {/* الترحيب */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">لوحة التحليلات والمبيعات</h1>
            <Sparkles className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-gray-400 mt-1 text-xs font-semibold">إلقاء نظرة شاملة على أداء المبيعات، تصنيفات العملاء ونشاط الرسائل اليومية</p>
        </div>
        <div className="flex gap-3">
          <NavLink to="/rfm">
            <Button variant="outline" size="sm" icon={<TrendingUp className="w-4 h-4" />}>
              إجراء تحليل سلوكي للعملاء
            </Button>
          </NavLink>
        </div>
      </div>

      {/* بطاقات المؤشرات الرقمية (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <div className="glass rounded-3xl p-6 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] text-gray-400 font-bold">إجمالي العملاء</span>
            <h3 className="text-2xl font-extrabold text-white">{kpis.totalCustomers}</h3>
            <span className="text-[10px] text-emerald-400 font-semibold flex items-center">نشطون في النظام</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 text-indigo-400">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="glass rounded-3xl p-6 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] text-gray-400 font-bold">إجمالي المبيعات</span>
            <h3 className="text-2xl font-extrabold text-white">{kpis.totalSales.toLocaleString()} ج.م</h3>
            <span className="text-[10px] text-indigo-400 font-semibold">تاريخياً</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="glass rounded-3xl p-6 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] text-gray-400 font-bold">عدد فواتير الطلبات</span>
            <h3 className="text-2xl font-extrabold text-white">{kpis.totalOrders}</h3>
            <span className="text-[10px] text-purple-400 font-semibold">فاتورة مبيعات</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 text-purple-400">
            <ShoppingBag className="w-6 h-6" />
          </div>
        </div>

        <div className="glass rounded-3xl p-6 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] text-gray-400 font-bold">محادثات الواتساب</span>
            <h3 className="text-2xl font-extrabold text-white">{activeChatsCount}</h3>
            <span className="text-[10px] text-cyan-400 font-semibold">جلسة محادثة نشطة</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 text-cyan-400">
            <MessageSquare className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* المخططات والنشاط الأخير */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* مخطط توزيع الشرائح السلوكية */}
        <div className="lg:col-span-2 glass rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-800/60 pb-3">
            <h2 className="text-sm font-bold text-white">توزيع العملاء حسب شريحة RFM</h2>
            <span className="text-[10px] text-indigo-400 font-semibold bg-indigo-950/40 px-3 py-1 rounded-xl">تقسيم سلوكي تلقائي</span>
          </div>
          
          {segmentData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-gray-500 text-xs">لا تتوفر مبيعات كافية لإنشاء المخطط السلوكي للعملاء حالياً</div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={segmentData} margin={{ top: 20, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-tertiary)" fontSize={11} tickLine={false} />
                  <YAxis stroke="var(--text-tertiary)" fontSize={11} allowDecimals={false} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', borderRadius: '12px' }}
                    labelStyle={{ color: 'var(--text-primary)', fontFamily: 'Cairo' }}
                    itemStyle={{ color: 'var(--text-secondary)', fontFamily: 'Cairo' }}
                  />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                    {segmentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* توزيع المبيعات كنسبة دائرية أو مؤشر أخر */}
        <div className="glass rounded-3xl p-6 space-y-4 flex flex-col justify-between">
          <div className="border-b border-gray-800/60 pb-3">
            <h2 className="text-sm font-bold text-white">مؤشر العملاء الكبار (VIPs)</h2>
          </div>
          
          <div className="flex-1 flex flex-col justify-center items-center py-6">
            {segmentData.length === 0 ? (
              <p className="text-gray-500 text-xs">لا تتوفر بيانات</p>
            ) : (
              <div className="w-full h-48 flex items-center justify-center relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={segmentData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="count"
                    >
                      {segmentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                {/* المركز */}
                <div className="absolute text-center">
                  <span className="text-[10px] text-gray-500 font-bold block">متوسط الفاتورة</span>
                  <span className="text-base font-extrabold text-white mt-1 block">{kpis.avgOrderValue.toLocaleString()} ج.م</span>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-2 text-[10px] w-full px-2 mt-4">
              {segmentData.slice(0, 4).map((entry, idx) => (
                <div key={idx} className="flex items-center gap-1.5 text-gray-400">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="truncate">{entry.name}: {entry.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* المبيعات الأخيرة */}
      <div className="glass rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-800/60 pb-3">
          <h2 className="text-sm font-bold text-white">آخر فواتير المبيعات الصادرة</h2>
          <NavLink to="/contacts" className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1">
            مشاهدة التفاصيل
            <ArrowUpRight className="w-4 h-4" />
          </NavLink>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="border-b border-gray-800/60 text-xs text-gray-400 font-semibold">
                <th className="pb-3 pr-2">الرقم التعريفى</th>
                <th className="pb-3">العميل</th>
                <th className="pb-3">التاريخ</th>
                <th className="pb-3">قيمة الفاتورة</th>
                <th className="pb-3 pl-2">حالة التسليم</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/40 text-xs text-gray-300">
              {recentInvoices.map((inv, index) => (
                <tr key={inv.invoice_id || index} className="hover:bg-gray-900/10 transition-all">
                  <td className="py-4 pr-2 font-bold text-gray-500">#{inv.invoice_id}</td>
                  <td className="py-4 font-bold text-white">{inv.customers?.name || inv.customer_name}</td>
                  <td className="py-4 text-gray-400">{new Date(inv.invoice_date).toLocaleDateString('ar-EG')}</td>
                  <td className="py-4 font-bold text-indigo-300">{inv.final_total.toLocaleString()} ج.م</td>
                  <td className="py-4 pl-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      inv.status === 'تسليم ناجح' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/10' : 'bg-amber-950/40 text-amber-400 border border-amber-500/10'
                    }`}>
                      {inv.status || 'معلق'}
                    </span>
                  </td>
                </tr>
              ))}
              {recentInvoices.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">لا توجد فواتير مبيعات مسجلة بعد</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
