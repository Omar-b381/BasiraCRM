import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Wifi, WifiOff, Globe, Database, User } from 'lucide-react';
import { useSettingsStore } from '../../store/useSettingsStore';
import StatusIndicator from '../ui/StatusIndicator';

export default function TopBar() {
  const location = useLocation();
  const { settings, testSupabase, testWebhook } = useSettingsStore();

  const [dbStatus, setDbStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [webhookStatus, setWebhookStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');

  // تعيين العنوان حسب مسار الصفحة
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/': return 'لوحة التحكم الرئيسية';
      case '/contacts': return 'إدارة جهات الاتصال والعملاء';
      case '/whatsapp': return 'محادثات واتساب والرسائل';
      case '/rfm': return 'تحليل سلوك العملاء RFM';
      case '/settings': return 'إعدادات الاتصال ومفاتيح API';
      default: return 'بصيرة CRM';
    }
  };

  // فحص حيوية الاتصالات بشكل دوري
  useEffect(() => {
    let active = true;

    const checkConnections = async () => {
      if (!settings.supabase.url) {
        if (active) {
          setDbStatus('idle');
          setWebhookStatus('idle');
        }
        return;
      }

      if (active) setDbStatus('testing');
      const dbRes = await testSupabase(settings.supabase);
      if (active) setDbStatus(dbRes.status);

      if (active) setWebhookStatus('testing');
      const webhookRes = await testWebhook();
      if (active) setWebhookStatus(webhookRes.status);
    };

    checkConnections();
    
    // فحص كل 60 ثانية
    const interval = setInterval(checkConnections, 60000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [settings, testSupabase, testWebhook]);

  return (
    <header className="h-20 bg-gray-900/40 border-b border-gray-800 flex items-center justify-between px-8 backdrop-blur-md">
      {/* عنوان الصفحة الحالي */}
      <div>
        <h2 className="text-lg font-bold text-white leading-none">{getPageTitle()}</h2>
      </div>

      {/* الحالة والمستحدم */}
      <div className="flex items-center gap-6">
        {/* حالة قاعدة البيانات */}
        <div className="flex items-center gap-2 bg-gray-950/40 border border-gray-800/80 px-3 py-1.5 rounded-xl">
          <Database className="w-4 h-4 text-gray-500" />
          <span className="text-[11px] font-semibold text-gray-400">قاعدة البيانات:</span>
          <StatusIndicator status={dbStatus} text={dbStatus === 'success' ? 'متصل' : dbStatus === 'failed' ? 'غير متصل' : 'جارٍ الفحص'} size="sm" />
        </div>

        {/* حالة خادم الـ Webhook */}
        <div className="flex items-center gap-2 bg-gray-950/40 border border-gray-800/80 px-3 py-1.5 rounded-xl">
          <Globe className="w-4 h-4 text-gray-500" />
          <span className="text-[11px] font-semibold text-gray-400">الـ Webhook:</span>
          <StatusIndicator status={webhookStatus} text={webhookStatus === 'success' ? 'نشط' : webhookStatus === 'failed' ? 'معطّل' : 'جارٍ الفحص'} size="sm" />
        </div>

        {/* معلومات المستخدم الحالي */}
        <div className="flex items-center gap-2.5 bg-indigo-600/5 border border-indigo-500/10 px-3 py-1.5 rounded-xl">
          <div className="w-6 h-6 rounded-lg bg-indigo-600/15 flex items-center justify-center border border-indigo-500/20">
            <User className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <span className="text-xs font-semibold text-indigo-300">أدمن النظام</span>
        </div>
      </div>
    </header>
  );
}
