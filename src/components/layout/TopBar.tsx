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
    <header
      className="h-20 flex items-center justify-between px-8 border-b"
      style={{
        backgroundColor: '#FFFFFF',
        borderColor: '#E4E6EF',
        boxShadow: '0 1px 8px rgba(7,0,51,0.06)'
      }}
    >
      {/* عنوان الصفحة */}
      <div>
        <h2 className="text-lg font-bold leading-none" style={{ color: '#070033' }}>
          {getPageTitle()}
        </h2>
      </div>

      {/* الحالة والمستخدم */}
      <div className="flex items-center gap-4">
        {/* حالة قاعدة البيانات */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
          style={{ backgroundColor: '#F7F8FC', border: '1px solid #E4E6EF' }}
        >
          <Database className="w-4 h-4" style={{ color: '#7E7C9E' }} />
          <span className="text-[11px] font-semibold" style={{ color: '#4A4870' }}>قاعدة البيانات:</span>
          <StatusIndicator status={dbStatus} text={dbStatus === 'success' ? 'متصل' : dbStatus === 'failed' ? 'غير متصل' : 'جارٍ الفحص'} size="sm" />
        </div>

        {/* حالة خادم الـ Webhook */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
          style={{ backgroundColor: '#F7F8FC', border: '1px solid #E4E6EF' }}
        >
          <Globe className="w-4 h-4" style={{ color: '#7E7C9E' }} />
          <span className="text-[11px] font-semibold" style={{ color: '#4A4870' }}>الـ Webhook:</span>
          <StatusIndicator status={webhookStatus} text={webhookStatus === 'success' ? 'نشط' : webhookStatus === 'failed' ? 'معطّل' : 'جارٍ الفحص'} size="sm" />
        </div>

        {/* معلومات المستخدم */}
        <div
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl"
          style={{
            background: 'linear-gradient(135deg, #FFF0EB, #FFF8EE)',
            border: '1px solid rgba(255,102,50,0.25)'
          }}
        >
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: '#FF6632', boxShadow: '0 2px 8px rgba(255,102,50,0.35)' }}
          >
            <User className="w-3.5 h-3.5" style={{ color: '#FFFFFF' }} />
          </div>
          <span className="text-xs font-bold" style={{ color: '#E5531A' }}>
            أدمن النظام
          </span>
        </div>
      </div>
    </header>
  );
}
