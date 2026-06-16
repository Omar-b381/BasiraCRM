import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, Shield, Wifi, CheckCircle, XCircle, Loader2, Database, MessageSquare, Key, Laptop } from 'lucide-react';
import { useSettingsStore } from '../store/useSettingsStore';
import { useConnectionTest } from '../hooks/useConnectionTest';
import type { AppSettings } from '../types/settings.types';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

export default function Settings() {
  const { settings, saveSettings, fetchSettings } = useSettingsStore();
  const { tests, runTest } = useConnectionTest();
  
  const [localSettings, setLocalSettings] = useState<AppSettings>({
    supabase: { url: '', anonKey: '', serviceRoleKey: '' },
    twilio: { accountSid: '', authToken: '', whatsappNumber: '' },
    webhook: { port: 3001, secret: '', enabled: false }
  });

  const [dbProviders, setDbProviders] = useState<any[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<any | null>(null);
  const [isLoadingProviders, setIsLoadingProviders] = useState(false);
  const [isSavingProvider, setIsSavingProvider] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // تحميل الإعدادات ومزودي الخدمة عند التشغيل
  useEffect(() => {
    fetchSettings().then(() => {
      // مزامنة الإعدادات المحلية
      const s = useSettingsStore.getState().settings;
      if (s) setLocalSettings(s);
    });
    loadProviders();
  }, [fetchSettings]);

  const loadProviders = async () => {
    setIsLoadingProviders(true);
    try {
      const res = await window.electronAPI.db.getProviders();
      if (res.success) {
        setDbProviders(res.data || []);
        const active = res.data?.find((p: any) => p.is_active);
        if (active) setSelectedProvider(active);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingProviders(false);
    }
  };

  const handleSaveSettings = async () => {
    const success = await saveSettings(localSettings);
    if (success) {
      showTemporarySuccess('تم حفظ إعدادات النظام بنجاح');
    }
  };

  const showTemporarySuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleToggleProviderActive = async (provId: number) => {
    const providerToUpdate = dbProviders.find(p => p.id === provId);
    if (!providerToUpdate) return;

    try {
      const res = await window.electronAPI.db.saveProvider({
        id: provId,
        is_active: !providerToUpdate.is_active
      });
      if (res.success) {
        showTemporarySuccess('تم تحديث حالة مزوّد الخدمة');
        await loadProviders();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveProviderDetails = async () => {
    if (!selectedProvider) return;
    setIsSavingProvider(true);
    try {
      const res = await window.electronAPI.db.saveProvider(selectedProvider);
      if (res.success) {
        showTemporarySuccess('تم حفظ تفاصيل مزود الخدمة سحابياً');
        await loadProviders();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingProvider(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 pb-16" dir="rtl">
      {/* الهيدر */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">إعدادات النظام</h1>
          <p className="text-gray-400 mt-1 text-xs font-semibold">ربط خوادم الـ APIs وقاعدة البيانات السحابية وإدارة مزودي رسائل WhatsApp</p>
        </div>
        <div className="flex items-center gap-4">
          {successMsg && (
            <span className="text-emerald-400 text-xs font-semibold bg-emerald-950/40 border border-emerald-500/20 px-3.5 py-2 rounded-xl animate-pulse">
              {successMsg}
            </span>
          )}
          <Button
            onClick={handleSaveSettings}
            icon={<Save className="w-4 h-4" />}
          >
            حفظ إعدادات النظام
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* عمود إعدادات الخوادم */}
        <div className="md:col-span-2 space-y-6">
          
          {/* إعدادات Supabase */}
          <section className="glass rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-800/60 pb-3">
              <div className="flex items-center gap-2.5">
                <Database className="w-5 h-5 text-indigo-400" />
                <h2 className="text-sm font-bold text-white">اتصال قاعدة البيانات — Supabase</h2>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => runTest('supabase', localSettings.supabase)}
                isLoading={tests.supabase?.status === 'testing'}
                icon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                فحص الاتصال
              </Button>
            </div>

            {tests.supabase && (
              <div className={`p-3 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
                tests.supabase.status === 'success' ? 'bg-emerald-950/20 text-emerald-400 border border-emerald-500/10' : 'bg-red-950/20 text-red-400 border border-red-500/10'
              }`}>
                {tests.supabase.status === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                <span>{tests.supabase.message}</span>
                {tests.supabase.latency !== undefined && <span className="text-gray-500">({tests.supabase.latency}ms)</span>}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4">
              <Input
                label="رابط المشروع (Project URL)"
                placeholder="https://xxxx.supabase.co"
                value={localSettings.supabase.url}
                onChange={(e) => setLocalSettings(s => ({ ...s, supabase: { ...s.supabase, url: e.target.value } }))}
              />
              <Input
                label="المفتاح العام (Anon Key)"
                type="password"
                placeholder="eyJhbGciOiJIUzI1NiIs..."
                value={localSettings.supabase.anonKey}
                onChange={(e) => setLocalSettings(s => ({ ...s, supabase: { ...s.supabase, anonKey: e.target.value } }))}
              />
              <div className="bg-amber-900/10 border border-amber-700/20 rounded-2xl p-4 flex gap-3">
                <Shield className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-400 leading-relaxed">
                  <strong>تنبيه أمان:</strong> مفتاح الـ Service Role Key المشفر مخزن محلياً فقط في بيئة Electron الرئيسية لضمان عدم تسريبه للواجهة الأمامية تحت أي ظرف.
                </p>
              </div>
            </div>
          </section>

          {/* إعدادات Twilio */}
          <section className="glass rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-800/60 pb-3">
              <div className="flex items-center gap-2.5">
                <MessageSquare className="w-5 h-5 text-emerald-400" />
                <h2 className="text-sm font-bold text-white">إعدادات Twilio API</h2>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => runTest('twilio', localSettings.twilio)}
                isLoading={tests.twilio?.status === 'testing'}
                icon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                فحص الاتصال
              </Button>
            </div>

            {tests.twilio && (
              <div className={`p-3 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
                tests.twilio.status === 'success' ? 'bg-emerald-950/20 text-emerald-400 border border-emerald-500/10' : 'bg-red-950/20 text-red-400 border border-red-500/10'
              }`}>
                {tests.twilio.status === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                <span>{tests.twilio.message}</span>
                {tests.twilio.latency !== undefined && <span className="text-gray-500">({tests.twilio.latency}ms)</span>}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Account SID"
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={localSettings.twilio.accountSid}
                onChange={(e) => setLocalSettings(s => ({ ...s, twilio: { ...s.twilio, accountSid: e.target.value } }))}
              />
              <Input
                label="Auth Token"
                type="password"
                placeholder="••••••••••••••••••••••••••••••••"
                value={localSettings.twilio.authToken}
                onChange={(e) => setLocalSettings(s => ({ ...s, twilio: { ...s.twilio, authToken: e.target.value } }))}
              />
              <div className="md:col-span-2">
                <Input
                  label="رقم واتساب المرسل (WhatsApp Sender Number)"
                  placeholder="whatsapp:+14155238886"
                  value={localSettings.twilio.whatsappNumber}
                  onChange={(e) => setLocalSettings(s => ({ ...s, twilio: { ...s.twilio, whatsappNumber: e.target.value } }))}
                  helperText="يجب كتابة الرقم بالصيغة الدولية مسبوقاً بـ whatsapp:"
                />
              </div>
            </div>
          </section>

          {/* إعدادات خادم الـ Webhook */}
          <section className="glass rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-800/60 pb-3">
              <div className="flex items-center gap-2.5">
                <Laptop className="w-5 h-5 text-indigo-400" />
                <h2 className="text-sm font-bold text-white">خادم استقبال الويب هوك المحلي (Local Webhook)</h2>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => runTest('webhook')}
                isLoading={tests.webhook?.status === 'testing'}
                icon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                فحص الخادم
              </Button>
            </div>

            {tests.webhook && (
              <div className={`p-3 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
                tests.webhook.status === 'success' ? 'bg-emerald-950/20 text-emerald-400 border border-emerald-500/10' : 'bg-red-950/20 text-red-400 border border-red-500/10'
              }`}>
                {tests.webhook.status === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                <span>{tests.webhook.message}</span>
                {tests.webhook.latency !== undefined && <span className="text-gray-500">({tests.webhook.latency}ms)</span>}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="المنفذ المحلى (Local Port)"
                placeholder="3001"
                value={String(localSettings.webhook.port)}
                onChange={(e) => setLocalSettings(s => ({ ...s, webhook: { ...s.webhook, port: parseInt(e.target.value) || 3001 } }))}
              />
              <Input
                label="مفتاح التحقق المشترك (Webhook Secret)"
                type="password"
                placeholder="التوثيق والتأكيد المتبادل مع Twilio"
                value={localSettings.webhook.secret}
                onChange={(e) => setLocalSettings(s => ({ ...s, webhook: { ...s.webhook, secret: e.target.value } }))}
              />
            </div>
            <div className="p-4 bg-gray-900/30 border border-gray-800 rounded-2xl text-[11px] text-gray-400 leading-relaxed">
              🔗 قم بإعداد رابط الـ Webhook التالي في صفحة التحكم بـ Twilio:
              <code className="block mt-2 bg-gray-950 px-4 py-2 rounded-xl text-emerald-400 text-xs font-semibold tracking-wide">
                https://YOUR_TUNNEL_OR_SERVER.ngrok-free.app/webhook/whatsapp
              </code>
            </div>
          </section>

        </div>

        {/* عمود مزودي الخدمة النشطين */}
        <div className="space-y-6">
          <section className="glass rounded-3xl p-6 space-y-4">
            <div className="border-b border-gray-800/60 pb-3 flex items-center gap-2.5">
              <Key className="w-5 h-5 text-indigo-400" />
              <h2 className="text-sm font-bold text-white">مزودو الواتساب السحابيون</h2>
            </div>

            {isLoadingProviders ? (
              <div className="py-6 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
              </div>
            ) : (
              <div className="space-y-3.5">
                {dbProviders.map((prov) => (
                  <div
                    key={prov.id}
                    onClick={() => setSelectedProvider(prov)}
                    className={`p-4 rounded-2xl border text-right cursor-pointer transition-all duration-200 ${
                      selectedProvider?.id === prov.id
                        ? 'bg-indigo-600/10 border-indigo-500/40 text-white shadow-lg shadow-indigo-600/5'
                        : 'bg-gray-900/30 border-gray-800 hover:border-gray-700 text-gray-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-xs text-white">{prov.name}</h3>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleProviderActive(prov.id);
                        }}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          prov.is_active
                            ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/20'
                            : 'bg-gray-800 text-gray-500 border-gray-700'
                        }`}
                      >
                        {prov.is_active ? 'نشط ومفعل' : 'غير نشط'}
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-500">النوع: {prov.type} | الرقم: {prov.phone_number || 'غير متوفر'}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* تفاصيل المزوّد المحدد للتعديل */}
          {selectedProvider && (
            <section className="glass rounded-3xl p-6 space-y-4">
              <div className="border-b border-gray-800/60 pb-3">
                <h3 className="text-xs font-bold text-white">تعديل مزود: {selectedProvider.name}</h3>
              </div>
              
              <div className="space-y-3">
                <Input
                  label="عنوان API (API URL)"
                  value={selectedProvider.api_url || ''}
                  onChange={(e) => setSelectedProvider((p: any) => ({ ...p, api_url: e.target.value }))}
                />
                <Input
                  label="مفتاح API (API Key)"
                  type="password"
                  value={selectedProvider.api_key || ''}
                  onChange={(e) => setSelectedProvider((p: any) => ({ ...p, api_key: e.target.value }))}
                />
                <Input
                  label="رقم الهاتف (Phone Number)"
                  placeholder="20122xxxxxxx"
                  value={selectedProvider.phone_number || ''}
                  onChange={(e) => setSelectedProvider((p: any) => ({ ...p, phone_number: e.target.value }))}
                />
                
                <Button
                  className="w-full mt-2"
                  onClick={handleSaveProviderDetails}
                  isLoading={isSavingProvider}
                  size="sm"
                >
                  تحديث البيانات سحابياً
                </Button>
              </div>
            </section>
          )}
        </div>

      </div>
    </div>
  );
}
