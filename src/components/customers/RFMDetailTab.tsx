import React from 'react';
import { Sparkles, Award, ArrowUpRight, TrendingUp } from 'lucide-react';
import { RFM_SEGMENTS_CONFIG } from '../../types/rfm.types';
import type { RFMScore } from '../../types/contact.types';

interface RFMDetailTabProps {
  rfmScore?: RFMScore;
}

export default function RFMDetailTab({ rfmScore }: RFMDetailTabProps) {
  if (!rfmScore) {
    return (
      <div className="py-12 text-center text-gray-500 text-xs font-semibold" dir="rtl">
        ⚠️ لا يوجد تحليل RFM متوفر حالياً لهذا العميل. يرجى تفعيل التحليل السلوكي للعملاء.
      </div>
    );
  }

  const segmentInfo = RFM_SEGMENTS_CONFIG[rfmScore.segment];

  const getScoreDescription = (dimension: 'r' | 'f' | 'm', score: number) => {
    if (dimension === 'r') {
      if (score === 5) return 'ممتاز - شراء حديث جداً';
      if (score === 4) return 'جيد جداً - تفاعل وشراء مؤخراً';
      if (score === 3) return 'متوسط - غائب منذ فترة وجيزة';
      if (score === 2) return 'منخفض - غائب منذ مدة طويلة';
      return 'خامل - لم يتفاعل منذ وقت طويل جداً';
    }
    if (dimension === 'f') {
      if (score === 5) return 'ممتاز - يشتري بانتظام وتكرار هائل';
      if (score === 4) return 'جيد جداً - تكرار شراء مرتفع';
      if (score === 3) return 'متوسط - يشتري بمعدل اعتيادي';
      if (score === 2) return 'منخفض - نادراً ما يكرر الشراء';
      return 'ضئيل - اشترى مرة واحدة أو مرتين فقط';
    }
    // Monetary
    if (score === 5) return 'ممتاز - قيمة إنفاق هائلة (VIP)';
    if (score === 4) return 'جيد جداً - حجم إنفاق مرتفع جداً';
    if (score === 3) return 'متوسط - قيمة مشتريات متوسطة';
    if (score === 2) return 'منخفض - حجم إنفاق منخفض';
    return 'ضئيل - إنفاق محدود جداً';
  };

  const getScoreColorClass = (score: number) => {
    if (score >= 4) return 'bg-emerald-500';
    if (score === 3) return 'bg-orange-500';
    return 'bg-rose-500';
  };

  const dimensions = [
    {
      label: 'الحداثة (Recency)',
      score: rfmScore.recency,
      desc: getScoreDescription('r', rfmScore.recency),
      color: getScoreColorClass(rfmScore.recency)
    },
    {
      label: 'التكرار (Frequency)',
      score: rfmScore.frequency,
      desc: getScoreDescription('f', rfmScore.frequency),
      color: getScoreColorClass(rfmScore.frequency)
    },
    {
      label: 'الإنفاق (Monetary)',
      score: rfmScore.monetary,
      desc: getScoreDescription('m', rfmScore.monetary),
      color: getScoreColorClass(rfmScore.monetary)
    }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" dir="rtl">
      {/* Visual Progress Scores */}
      <div className="lg:col-span-7 space-y-6">
        <section className="rounded-3xl p-6 space-y-6 bg-[#0b082c] border border-white/5 shadow-lg">
          <div className="border-b border-white/5 pb-3">
            <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-orange-500" />
              مؤشرات سلوك الشراء (درجة 1-5)
            </h4>
            <p className="text-[10px] text-gray-700 mt-0.5 font-semibold">درجة العميل النسبية مقارنة بكافة العملاء المسجلين في النظام</p>
          </div>

          <div className="space-y-6">
            {dimensions.map((dim, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-gray-900">{dim.label}</span>
                  <span className="text-orange-400">{dim.score} / 5</span>
                </div>
                
                {/* 5-bar indicators */}
                <div className="grid grid-cols-5 gap-2 h-2.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div 
                      key={i} 
                      className={`h-full rounded-full transition-all duration-300 ${
                        i <= dim.score ? dim.color : 'bg-white/5 border border-white/5'
                      }`}
                    />
                  ))}
                </div>
                
                <p className="text-[10px] text-gray-700 font-semibold">{dim.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Segment Recommendation Card */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        {segmentInfo && (
          <section className="rounded-3xl p-6 space-y-4 relative overflow-hidden bg-[#0b082c] border border-white/5 shadow-lg">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-2xl pointer-events-none"></div>

            <div className="border-b border-white/5 pb-3">
              <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-orange-500" />
                تصنيف الفئة التسويقية
              </h4>
            </div>

            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-700">الفئة الحالية:</span>
                <span 
                  className="px-3 py-1 rounded-full text-xs font-bold"
                  style={{
                    color: segmentInfo.color,
                    backgroundColor: `${segmentInfo.color}15`
                  }}
                >
                  {segmentInfo.nameAr}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-gray-700 font-bold block">الوصف السلوكي:</span>
                <p className="text-xs text-gray-800 font-semibold leading-relaxed">
                  {segmentInfo.description}
                </p>
              </div>

              <div className="space-y-1 bg-white/5 p-3 rounded-2xl border border-white/5">
                <span className="text-[10px] text-orange-400 font-bold flex items-center gap-1">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  التوصية التسويقية المقترحة:
                </span>
                <p className="text-xs text-gray-800 font-bold leading-relaxed mt-0.5">
                  {segmentInfo.recommendedAction}
                </p>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
