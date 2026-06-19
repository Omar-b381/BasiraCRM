import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Wifi, WifiOff, Globe, Database, User, Bell } from 'lucide-react';
import { useSettingsStore } from '../../store/useSettingsStore';
import StatusIndicator from '../ui/StatusIndicator';
import { useTasksStore } from '../../store/useTasksStore';
import { useAuthStore } from '../../store/useAuthStore';

export default function TopBar() {
  const location = useLocation();
  const { settings, testSupabase, testWebhook } = useSettingsStore();
  const { tasks } = useTasksStore();
  const { currentEmployee } = useAuthStore();

  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [dbStatus, setDbStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [webhookStatus, setWebhookStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');

  // Filter urgent & overdue tasks for notifications
  const activeAlerts = React.useMemo(() => {
    const now = new Date();
    const myTasks = tasks.filter(t => t.assigned_to === currentEmployee?.id && t.status === 'معلقة');
    const urgent = myTasks.filter(t => t.priority === 'عاجلة');
    const overdue = myTasks.filter(t => t.due_date && new Date(t.due_date) < now);
    
    // Union of urgent and overdue
    const ids = new Set([...urgent.map(t => t.id), ...overdue.map(t => t.id)]);
    return myTasks.filter(t => ids.has(t.id));
  }, [tasks, currentEmployee]);

  // تعيين العنوان حسب مسار الصفحة
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/': return 'لوحة التحكم الرئيسية';
      case '/contacts': return 'إدارة جهات الاتصال والعملاء';
      case '/whatsapp': return 'محادثات واتساب والرسائل';
      case '/rfm': return 'تحليل سلوك العملاء RFM';
      case '/settings': return 'إعدادات الاتصال ومفاتيح API';
      case '/tasks': return 'المهام والمتابعة والتذكيرات السحابية';
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

        {/* زر التنبيهات وجرس الإشعارات */}
        <div className="relative">
          <button
            onClick={() => setShowNotifDropdown(!showNotifDropdown)}
            className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-gray-100/5 transition-all relative"
            style={{ backgroundColor: '#F7F8FC', border: '1px solid #E4E6EF' }}
          >
            <Bell className="w-5 h-5 text-gray-500" />
            {activeAlerts.length > 0 && (
              <span 
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center animate-pulse" 
                style={{ color: '#FFFFFF', backgroundColor: '#EF4444' }}
              >
                {activeAlerts.length}
              </span>
            )}
          </button>

          {/* Dropdown الإشعارات */}
          {showNotifDropdown && (
            <div className="absolute left-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50 animate-fadeIn" style={{ direction: 'rtl' }}>
              <div className="px-4 py-3 border-b border-gray-800/60 bg-gray-950/40 flex items-center justify-between">
                <span className="text-xs font-bold text-white">تذكيرات عاجلة ومتابعات ({activeAlerts.length})</span>
                {activeAlerts.length > 0 && (
                  <span className="text-[9px] font-semibold text-red-400 bg-red-950/30 px-2 py-0.5 rounded-full">تنبيه نشط</span>
                )}
              </div>

              <div className="max-h-60 overflow-y-auto divide-y divide-gray-850/30">
                {activeAlerts.length === 0 ? (
                  <div className="px-4 py-6 text-center text-gray-500 text-xs font-semibold">
                    لا توجد تنبيهات أو مهام عاجلة حالياً 🌸
                  </div>
                ) : (
                  activeAlerts.map(task => (
                    <div key={task.id} className="p-3.5 hover:bg-indigo-650/5 transition-all text-right flex flex-col gap-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                          task.priority === 'عاجلة' ? 'bg-red-950/40 text-red-400 border border-red-500/10' : 'bg-amber-950/40 text-amber-400 border border-amber-500/10'
                        }`}>
                          {task.priority === 'عاجلة' ? 'عاجلة' : 'متأخرة'}
                        </span>
                        {task.due_date && (
                          <span className="text-[9px] text-gray-500 font-medium">
                            {new Date(task.due_date).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-white line-clamp-1">{task.title}</p>
                      {task.customerName && (
                        <p className="text-[10px] text-gray-400 font-semibold">العميل: {task.customerName}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
              <div className="px-4 py-2 bg-gray-950/40 text-center border-t border-gray-800/60">
                <a href="#/tasks" onClick={() => setShowNotifDropdown(false)} className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-all block">
                  عرض كل المهام والجدول الزمني ←
                </a>
              </div>
            </div>
          )}
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
            {currentEmployee?.name || 'أدمن النظام'}
          </span>
        </div>
      </div>
    </header>
  );
}
