import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Sparkles, RefreshCw, Send, Loader2, Users, ShoppingBag, AlertCircle, CheckCircle, Megaphone } from 'lucide-react';
import { useRFM } from '../hooks/useRFM';
import { RFM_SEGMENTS_CONFIG } from '../types/rfm.types';
import type { RFMSegment } from '../types/contact.types';
import { supabase } from '../lib/supabase';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';

export default function RFMAnalysis() {
  const {
    analyzedContacts,
    segmentAffinities,
    isAnalyzing,
    error: rfmError,
    runAnalysis
  } = useRFM();

  const [selectedSegment, setSelectedSegment] = useState<RFMSegment>('champions');
  const navigate = useNavigate();

  useEffect(() => {
    runAnalysis();
  }, []);

  // حساب أعداد العملاء في كل شريحة
  const getSegmentCounts = () => {
    const counts: Record<string, number> = {};
    analyzedContacts.forEach(c => {
      const seg = c.rfmScore?.segment || 'lost';
      counts[seg] = (counts[seg] || 0) + 1;
    });
    return counts;
  };

  const segmentCounts = getSegmentCounts();

  // الحصول على العملاء التابعين للشريحة المحددة
  const getCustomersInSegment = () => {
    return analyzedContacts.filter(c => (c.rfmScore?.segment || 'lost') === selectedSegment);
  };

  const segmentCustomers = getCustomersInSegment();

  // الحصول على المنتجات الأكثر شراءً للشريحة المحددة (Product Affinities)
  const getProductAffinities = () => {
    if (!segmentAffinities) return [];
    return segmentAffinities.get(selectedSegment) || [];
  };

  const affinities = getProductAffinities();

  // Selected segment affinities and details are handled below

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 pb-16" dir="rtl">
      
      {/* الهيدر */}
      <div className="flex items-center justify-between border-b border-gray-800/60 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white">تحليل سلوك العملاء والشرائح (RFM)</h1>
            <Sparkles className="w-5 h-5 text-indigo-400" />
          </div>
          <p className="text-gray-400 mt-1 text-xs font-semibold">تحليل حداثة الشراء وتكراره وحجم الإنفاق لتقسيم عملائك إلى فئات سلوكية وتوجيههم تسويقياً</p>
        </div>

        <Button
          onClick={() => runAnalysis()}
          isLoading={isAnalyzing}
          icon={<RefreshCw className="w-4 h-4" />}
        >
          تحديث التحليل السلوكي
        </Button>
      </div>

      {isAnalyzing ? (
        <div className="py-20 text-center space-y-3">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
          <p className="text-gray-400 text-xs font-semibold">جارٍ معالجة مبيعات الفواتير وحساب الشرائح وتفضيل المنتجات...</p>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* شبكة تصنيفات RFM */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {Object.entries(RFM_SEGMENTS_CONFIG).map(([key, info]) => {
              const count = segmentCounts[key] || 0;
              const isSelected = selectedSegment === key;

              return (
                <div
                  key={key}
                  onClick={() => setSelectedSegment(key as RFMSegment)}
                  className={`p-5 rounded-3xl border text-right cursor-pointer transition-all duration-200 relative ${
                    isSelected
                      ? 'bg-indigo-600/10 border-indigo-500/40 text-white shadow-lg shadow-indigo-600/5'
                      : 'bg-gray-900/30 border-gray-800/80 hover:border-gray-700 text-gray-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full" style={{ backgroundColor: info.bgColor + '20', color: info.color }}>
                      {info.nameAr}
                    </span>
                    <span className="text-base font-extrabold text-white">{count} عميل</span>
                  </div>
                  <p className="text-[10px] text-gray-500 font-semibold leading-relaxed mt-2">{info.description}</p>
                </div>
              );
            })}
          </div>

          {/* لوحة تفاصيل الشريحة المحددة والمنتجات والحملات */}
          {selectedSegment && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              
              {/* تفاصيل التوصية وتكرار المنتجات والعملاء */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* التوصية التسويقية */}
                <div className="glass rounded-3xl p-6 space-y-3">
                  <h3 className="text-sm font-bold text-white">التوجيه التسويقي المقترح لشريحة {RFM_SEGMENTS_CONFIG[selectedSegment]?.nameAr}</h3>
                  <div className="p-4 bg-indigo-950/20 border border-indigo-500/10 rounded-2xl flex gap-3 text-xs text-indigo-400">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <p className="leading-relaxed font-semibold">
                      {RFM_SEGMENTS_CONFIG[selectedSegment]?.recommendedAction}
                    </p>
                  </div>
                </div>

                {/* تحليل تفضيل المنتجات (Product Affinities) */}
                <div className="glass rounded-3xl p-6 space-y-4">
                  <div className="border-b border-gray-800/60 pb-3 flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-sm font-bold text-white">المنتجات الأكثر طلباً وتفضيلاً لهذه الشريحة</h3>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                      <thead>
                        <tr className="border-b border-gray-800/60 text-xs text-gray-400 font-semibold">
                          <th className="pb-3 pr-2">المنتج</th>
                          <th className="pb-3 text-center">الكمية المشتراة</th>
                          <th className="pb-3 text-center pl-2">عدد مرات الشراء</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800/40 text-xs text-gray-300">
                        {affinities.slice(0, 5).map((aff: any, idx: number) => (
                          <tr key={idx} className="hover:bg-gray-900/10 transition-all">
                            <td className="py-4 pr-2 font-bold text-white">{aff.productName}</td>
                            <td className="py-4 text-center font-semibold text-gray-200">{aff.quantity} قطعة</td>
                            <td className="py-4 text-center text-gray-400 pl-2">{aff.purchaseCount} مرة</td>
                          </tr>
                        ))}
                        {affinities.length === 0 && (
                          <tr>
                            <td colSpan={3} className="py-6 text-center text-gray-500">لا تتوفر مبيعات منتجات كافية لهذه الشريحة بعد</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* قائمة عملاء الشريحة */}
                <div className="glass rounded-3xl p-6 space-y-4">
                  <div className="border-b border-gray-800/60 pb-3 flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-sm font-bold text-white">عملاء الشريحة المحددة ({segmentCustomers.length})</h3>
                  </div>

                  <div className="overflow-x-auto max-h-80">
                    <table className="w-full text-right border-collapse">
                      <thead>
                        <tr className="border-b border-gray-800/60 text-xs text-gray-400 font-semibold">
                          <th className="pb-3 pr-2">الاسم</th>
                          <th className="pb-3">رقم الهاتف</th>
                          <th className="pb-3 pl-2">إجمالي الشراء</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800/40 text-xs text-gray-300">
                        {segmentCustomers.map((cust) => (
                          <tr key={cust.id} className="hover:bg-gray-900/10 transition-all">
                            <td className="py-3.5 pr-2 font-bold text-white">{cust.name}</td>
                            <td className="py-3.5 text-gray-400 font-semibold">{cust.phone}</td>
                            <td className="py-3.5 text-indigo-400 font-bold pl-2">{(cust.totalSpend || 0).toLocaleString()} ج.م</td>
                          </tr>
                        ))}
                        {segmentCustomers.length === 0 && (
                          <tr>
                            <td colSpan={3} className="py-6 text-center text-gray-500">لا يوجد عملاء حالياً في هذه الشريحة</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

              {/* إطلاق حملة تسويقية جماعية للشريحة */}
              <div className="space-y-6">
                <section className="glass rounded-3xl p-6 space-y-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-2xl pointer-events-none"></div>
                  
                  <div className="border-b border-gray-800/60 pb-3">
                    <h3 className="text-xs font-bold text-white flex items-center gap-2">
                      <Megaphone className="w-4 h-4 text-orange-500" />
                      إطلاق حملة تسويقية ذكية
                    </h3>
                    <p className="text-[10px] text-gray-500 mt-1 font-semibold">استهدف كافة العملاء المنتمين لهذه الشريحة عبر قنوات واتساب</p>
                  </div>

                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5 space-y-3">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-gray-400">عدد العملاء المستهدفين:</span>
                      <span className="text-white">{segmentCustomers.length} عميل</span>
                    </div>
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-gray-400">القالب المقترح للرسالة:</span>
                      <span className="text-orange-400 truncate max-w-[60%]">{RFM_SEGMENTS_CONFIG[selectedSegment]?.whatsappTemplate || 'بدون قالب'}</span>
                    </div>
                  </div>

                  <Button
                    onClick={() => {
                      navigate('/campaigns', {
                        state: {
                          segment: selectedSegment,
                          template: RFM_SEGMENTS_CONFIG[selectedSegment]?.whatsappTemplate || ''
                        }
                      });
                    }}
                    disabled={segmentCustomers.length === 0}
                    className="w-full py-3 rounded-2xl text-white font-bold"
                    style={{ background: '#FF6632', boxShadow: '0 4px 16px rgba(255,102,50,0.20)' }}
                    icon={<Send className="w-4 h-4 rotate-180" />}
                  >
                    تجهيز وإطلاق الحملة التسويقية
                  </Button>
                </section>
              </div>

            </div>
          )}

        </div>
      )}

    </div>
  );
}
