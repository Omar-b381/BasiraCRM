import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Contacts from './pages/Contacts';
import WhatsApp from './pages/WhatsApp';
import RFMAnalysis from './pages/RFMAnalysis';
import InvoiceCreate from './pages/InvoiceCreate';
import Settings from './pages/Settings';
import ShippingExport from './pages/ShippingExport';
import OrderTracking from './pages/OrderTracking';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import Tasks from './pages/Tasks';
import { useSettingsStore } from './store/useSettingsStore';
import { useAuthStore } from './store/useAuthStore';
import { useTasksStore } from './store/useTasksStore';

const IndexRedirect = () => {
  const { currentEmployee } = useAuthStore();
  if (!currentEmployee) return <div className="p-8 text-white text-center">جاري التحميل...</div>;
  if (currentEmployee.role === 'admin' || currentEmployee.permissions?.includes('view_reports')) {
    return <Dashboard />;
  }
  if (currentEmployee.permissions?.includes('send_messages')) {
    return <WhatsApp />;
  }
  if (currentEmployee.permissions?.includes('edit_invoices')) {
    return <InvoiceCreate />;
  }
  if (currentEmployee.permissions?.includes('manage_tasks')) {
    return <Navigate to="/tasks" replace />;
  }
  return <div className="p-8 text-white font-bold text-center">عذراً، لا تمتلك صلاحيات كافية لتصفح النظام.</div>;
};

export default function App() {
  const { fetchSettings, settings } = useSettingsStore();
  const { isLoggedIn, currentEmployee } = useAuthStore();
  const [initialLoading, setInitialLoading] = React.useState(true);

  // تحميل الإعدادات المسجلة للاتصال بالـ APIs عند تشغيل التطبيق
  useEffect(() => {
    fetchSettings().finally(() => {
      setInitialLoading(false);
    });
  }, [fetchSettings]);

  // مزامنة حالة الموظف النشط وجلسة تسجيل الدخول مع خادم الديسكتوب IPC
  useEffect(() => {
    if (isLoggedIn && currentEmployee) {
      window.electronAPI.auth.sessionLogin(currentEmployee);
    } else {
      window.electronAPI.auth.sessionLogout();
    }
  }, [isLoggedIn, currentEmployee]);

  // الاشتراك في تذكيرات المهام وتحديث المتجر تلقائياً
  useEffect(() => {
    if (isLoggedIn && window.electronAPI.tasks) {
      window.electronAPI.tasks.onTaskReminder((task: any) => {
        // تحديث متجر المهام محلياً عند انطلاق التنبيه
        useTasksStore.getState().fetchTasks();
      });
    }
  }, [isLoggedIn]);

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white" style={{ backgroundColor: '#070033' }}>
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500 mx-auto"></div>
          <p className="text-sm font-semibold">جاري تحميل الإعدادات والاتصال بالسحابة...</p>
        </div>
      </div>
    );
  }

  const isConfigured = settings.supabase?.url && settings.supabase?.anonKey && settings.supabase.url.trim() !== '' && settings.supabase.anonKey.trim() !== '';

  if (!isConfigured) {
    return <Onboarding />;
  }

  if (!isLoggedIn) {
    return <Login />;
  }

  const hasPermission = (permission: string) => {
    if (!currentEmployee) return false;
    if (currentEmployee.role === 'admin') return true;
    return currentEmployee.permissions?.includes(permission);
  };

  return (
    <HashRouter>
      <Routes>
        {/* التوجيه الرئيسي الذى يلتف حوله الـ Layout */}
        <Route path="/" element={<Layout />}>
          <Route index element={<IndexRedirect />} />
          {hasPermission('send_messages') && <Route path="contacts" element={<Contacts />} />}
          {hasPermission('send_messages') && <Route path="whatsapp" element={<WhatsApp />} />}
          {hasPermission('view_reports') && <Route path="rfm" element={<RFMAnalysis />} />}
          {hasPermission('edit_invoices') && <Route path="invoices" element={<InvoiceCreate />} />}
          {hasPermission('edit_invoices') && <Route path="shipping-export" element={<ShippingExport />} />}
          {hasPermission('edit_invoices') && <Route path="order-tracking" element={<OrderTracking />} />}
          {hasPermission('manage_tasks') && <Route path="tasks" element={<Tasks />} />}
          {hasPermission('manage_settings') && <Route path="settings" element={<Settings />} />}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
