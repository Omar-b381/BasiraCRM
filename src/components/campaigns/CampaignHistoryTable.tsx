import React from 'react';
import { Calendar, Eye, Play, BarChart3, AlertCircle, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { RFM_SEGMENTS_CONFIG } from '../../types/rfm.types';
import type { Campaign } from '../../types/message.types';
import Badge from '../ui/Badge';

interface CampaignHistoryTableProps {
  campaigns: Campaign[];
  onViewDetails: (campaign: Campaign) => void;
  isLoading: boolean;
}

export default function CampaignHistoryTable({
  campaigns,
  onViewDetails,
  isLoading
}: CampaignHistoryTableProps) {
  if (isLoading) {
    return (
      <div className="py-20 text-center space-y-4">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto" />
        <p className="text-xs text-gray-400 font-semibold">جاري تحميل سجل الحملات السابقة...</p>
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="py-16 text-center space-y-4 border border-white/5 rounded-3xl bg-[#0a071e]/15">
        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto">
          <Sparkles className="w-6 h-6 text-gray-500" />
        </div>
        <div>
          <p className="text-sm font-bold text-white">لا توجد حملات تسويقية مسجلة</p>
          <p className="text-xs text-gray-400 font-semibold mt-1">ابدأ بإنشاء حملتك التسويقية الأولى واستهداف عملائك الآن.</p>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: Campaign['status']) => {
    switch (status) {
      case 'done':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            مكتملة
          </span>
        );
      case 'sending':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            قيد الإرسال
          </span>
        );
      case 'scheduled':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Calendar className="w-3.5 h-3.5" />
            مجدولة
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertCircle className="w-3.5 h-3.5" />
            فشلت
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-gray-500/10 text-gray-400 border border-gray-500/20">
            مسودة
          </span>
        );
    }
  };

  return (
    <div className="overflow-x-auto rounded-3xl border border-white/5 bg-[#0a071e]/20" dir="rtl">
      <table className="w-full text-right border-collapse">
        <thead>
          <tr className="border-b border-white/5 bg-white/[0.02]">
            <th className="px-6 py-4 text-xs font-bold text-gray-400">الحملة والتاريخ</th>
            <th className="px-6 py-4 text-xs font-bold text-gray-400">الشريحة المستهدفة</th>
            <th className="px-6 py-4 text-xs font-bold text-gray-400">حالة الإرسال</th>
            <th className="px-6 py-4 text-xs font-bold text-gray-400">إحصائيات النجاح</th>
            <th className="px-6 py-4 text-xs font-bold text-gray-400">معدل التسليم</th>
            <th className="px-6 py-4 text-xs font-bold text-gray-400 text-left">الخيارات</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {campaigns.map((camp) => {
            const segmentInfo = RFM_SEGMENTS_CONFIG[camp.target_segment];
            const totalCount = (camp.sent_count || 0) + (camp.failed_count || 0);
            const deliveryRate = totalCount > 0 
              ? Math.round(((camp.sent_count || 0) / totalCount) * 100) 
              : 0;

            return (
              <tr key={camp.id} className="hover:bg-white/[0.02] transition-colors group">
                <td className="px-6 py-4">
                  <div>
                    <p className="text-xs font-bold text-white">{camp.name}</p>
                    <span className="text-[10px] text-gray-500 font-semibold block mt-1">
                      {new Date(camp.created_at).toLocaleString('ar-EG', {
                        dateStyle: 'medium',
                        timeStyle: 'short'
                      })}
                    </span>
                  </div>
                </td>
                
                <td className="px-6 py-4">
                  {segmentInfo ? (
                    <span
                      className="px-2.5 py-1 rounded-full text-[10px] font-bold inline-block"
                      style={{
                        color: segmentInfo.color,
                        backgroundColor: `${segmentInfo.color}15`
                      }}
                    >
                      {segmentInfo.nameAr}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400 font-semibold">{camp.target_segment}</span>
                  )}
                </td>

                <td className="px-6 py-4">
                  {getStatusBadge(camp.status)}
                  {camp.status === 'scheduled' && camp.scheduled_at && (
                    <span className="text-[9px] text-indigo-400 block mt-1 font-semibold">
                      مجدولة لـ: {new Date(camp.scheduled_at).toLocaleString('ar-EG', {
                        dateStyle: 'short',
                        timeStyle: 'short'
                      })}
                    </span>
                  )}
                </td>

                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs text-emerald-400 font-bold">
                        {camp.sent_count || 0} <span className="text-[9px] text-gray-500 font-semibold">ناجحة</span>
                      </p>
                      <p className="text-xs text-rose-400 font-bold mt-0.5">
                        {camp.failed_count || 0} <span className="text-[9px] text-gray-500 font-semibold">فشلت</span>
                      </p>
                    </div>
                  </div>
                </td>

                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{deliveryRate}%</span>
                    <div className="w-16 bg-white/5 h-1.5 rounded-full overflow-hidden p-px">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${deliveryRate}%`,
                          backgroundColor: deliveryRate > 75 ? '#10B981' : deliveryRate > 40 ? '#F59E0B' : '#EF4444'
                        }}
                      />
                    </div>
                  </div>
                </td>

                <td className="px-6 py-4 text-left">
                  <button
                    onClick={() => onViewDetails(camp)}
                    className="p-2 bg-white/5 hover:bg-orange-500/10 text-gray-400 hover:text-orange-400 rounded-xl transition-all border border-white/5 flex items-center justify-center gap-1.5 text-[10px] font-bold group-hover:border-orange-500/20"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    عرض التفاصيل
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
