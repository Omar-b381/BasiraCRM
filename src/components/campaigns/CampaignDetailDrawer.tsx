import React from 'react';
import { X, Calendar, MessageSquare, AlertCircle, CheckCircle2, XCircle, Search, RefreshCw, Smartphone } from 'lucide-react';
import type { Campaign } from '../../types/message.types';
import { RFM_SEGMENTS_CONFIG } from '../../types/rfm.types';

interface CampaignDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: Campaign | null;
  logs: any[];
  isLoadingLogs: boolean;
}

export default function CampaignDetailDrawer({
  isOpen,
  onClose,
  campaign,
  logs,
  isLoadingLogs
}: CampaignDetailDrawerProps) {
  const [searchTerm, setSearchTerm] = React.useState('');

  if (!isOpen || !campaign) return null;

  const segmentInfo = RFM_SEGMENTS_CONFIG[campaign.target_segment];
  
  // Filter logs by search term (contact name or phone)
  const filteredLogs = logs.filter(log => {
    const contactName = log.customers?.name || '';
    const contactPhone = log.customers?.phone || '';
    return contactName.toLowerCase().includes(searchTerm.toLowerCase()) || 
           contactPhone.includes(searchTerm);
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end" dir="rtl">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Drawer Body */}
      <div className="relative w-full max-w-xl h-full bg-[#070033] shadow-2xl border-r border-white/5 flex flex-col z-10 animate-slide-left text-right dark-container">
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
          <div>
            <span className="text-[10px] font-bold text-orange-400 bg-orange-500/10 px-2.5 py-1 rounded-full border border-orange-500/20">
              تفاصيل الحملة
            </span>
            <h3 className="text-sm font-bold text-white mt-2 leading-tight">{campaign.name}</h3>
            <p className="text-[10px] text-gray-400 font-semibold mt-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              أُطلقت في: {new Date(campaign.created_at).toLocaleString('ar-EG')}
            </p>
          </div>
          
          <button 
            onClick={onClose}
            className="p-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-all border border-white/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Metadata Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#0b072c] border border-white/5 p-4 rounded-2xl">
              <p className="text-[10px] font-bold text-gray-500">الشريحة المستهدفة</p>
              {segmentInfo ? (
                <p className="text-xs font-bold mt-1" style={{ color: segmentInfo.color }}>
                  {segmentInfo.nameAr}
                </p>
              ) : (
                <p className="text-xs font-bold text-white mt-1">{campaign.target_segment}</p>
              )}
            </div>

            <div className="bg-[#0b072c] border border-white/5 p-4 rounded-2xl">
              <p className="text-[10px] font-bold text-gray-500">النجاح الإجمالي</p>
              <p className="text-xs font-bold text-emerald-400 mt-1">
                {campaign.sent_count || 0} / {(campaign.sent_count || 0) + (campaign.failed_count || 0)} ناجح
              </p>
            </div>
          </div>

          {/* Template Content Preview */}
          <div className="bg-[#0b141a] border border-white/5 rounded-2xl p-4 space-y-2 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>
            <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold border-b border-white/5 pb-2">
              <MessageSquare className="w-4 h-4 text-emerald-500" />
              محتوى الرسالة المرسلة
            </div>
            <p className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed font-semibold pt-1">
              {campaign.template_content || 'لا يوجد محتوى رسالة'}
            </p>
          </div>

          {/* Recipients List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <h4 className="text-xs font-bold text-white">تفاصيل تسليم المستلمين ({logs.length})</h4>
              
              {/* Search Bar */}
              <div className="relative w-48">
                <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-gray-500" />
                <input
                  type="text"
                  placeholder="ابحث بالاسم أو الهاتف..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#0d0a27] border border-white/10 text-[10px] text-white focus:outline-none focus:ring-1 focus:ring-orange-500 pr-8 pl-3 py-1.5 rounded-xl font-bold"
                />
              </div>
            </div>

            {isLoadingLogs ? (
              <div className="py-10 text-center space-y-2">
                <RefreshCw className="w-6 h-6 text-orange-500 animate-spin mx-auto" />
                <p className="text-[10px] text-gray-400 font-semibold">جاري تحميل سجلات الإرسال التفصيلية...</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <p className="text-[10px] text-gray-400 text-center py-8 font-semibold">
                {searchTerm ? 'لم يتم العثور على نتائج تطابق البحث' : 'لا يوجد سجلات تسليم لهذه الحملة (قد تكون أرسلت قبل ترقية الجدول)'}
              </p>
            ) : (
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                {filteredLogs.map((log) => {
                  const customer = log.customers || {};
                  const isSent = log.status === 'sent' || log.status === 'delivered' || log.status === 'read';
                  
                  return (
                    <div 
                      key={log.id} 
                      className="bg-white/5 border border-white/5 rounded-2xl p-3 flex flex-col gap-1 hover:border-white/10 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-white">{customer.name || 'عميل غير معروف'}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1 font-semibold">
                            <Smartphone className="w-3 h-3 text-gray-500" />
                            {customer.phone || 'بدون هاتف'}
                          </p>
                        </div>

                        <div>
                          {isSent ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3" />
                              تم الإرسال
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              <XCircle className="w-3 h-3" />
                              فشل الإرسال
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Error or delivery meta info */}
                      {!isSent && log.error_message && (
                        <p className="text-[9px] text-rose-400 bg-rose-950/20 px-2 py-1 rounded-lg border border-rose-500/5 mt-1 font-semibold">
                          ⚠️ السبب: {log.error_message}
                        </p>
                      )}

                      <div className="flex justify-between items-center text-[9px] text-gray-500 font-semibold mt-1 pt-1 border-t border-white/5">
                        <span>قناة الإرسال: {log.whatsapp_providers?.name || 'الافتراضية'}</span>
                        <span>{new Date(log.sent_at).toLocaleTimeString('ar-EG')}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
