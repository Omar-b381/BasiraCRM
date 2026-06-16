import React, { useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Contacts from './pages/Contacts';
import WhatsApp from './pages/WhatsApp';
import RFMAnalysis from './pages/RFMAnalysis';
import InvoiceCreate from './pages/InvoiceCreate';
import Settings from './pages/Settings';
import ShippingExport from './pages/ShippingExport';
import { useSettingsStore } from './store/useSettingsStore';

export default function App() {
  const { fetchSettings } = useSettingsStore();

  // تحميل الإعدادات المسجلة للاتصال بالـ APIs عند تشغيل التطبيق
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return (
    <HashRouter>
      <Routes>
        {/* التوجيه الرئيسي الذى يلتف حوله الـ Layout */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="contacts" element={<Contacts />} />
          <Route path="whatsapp" element={<WhatsApp />} />
          <Route path="rfm" element={<RFMAnalysis />} />
          <Route path="invoices" element={<InvoiceCreate />} />
          <Route path="shipping-export" element={<ShippingExport />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
