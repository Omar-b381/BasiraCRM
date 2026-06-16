import React, { useState, useEffect } from 'react';
import { 
  Save, RefreshCw, Shield, Wifi, CheckCircle, XCircle, Loader2, 
  Database, MessageSquare, Key, Laptop, Plus, Trash2, Users, FileText, Check
} from 'lucide-react';
import { useSettingsStore } from '../store/useSettingsStore';
import { useConnectionTest } from '../hooks/useConnectionTest';
import type { AppSettings, Employee } from '../types/settings.types';
import { supabase } from '../lib/supabase';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

const DEFAULT_EMPLOYEES: Employee[] = [
  { id: '1', name: 'عمر البشير', role: 'admin', permissions: ['manage_settings', 'send_messages', 'view_reports', 'edit_invoices'] },
  { id: '2', name: 'أحمد محمود', role: 'supervisor', permissions: ['send_messages', 'view_reports', 'edit_invoices'] },
  { id: '3', name: 'مريم علي', role: 'agent', permissions: ['send_messages'] },
  { id: '4', name: 'خالد مصطفى', role: 'agent', permissions: ['send_messages'] }
];

const DEFAULT_QUICK_REPLIES = [
  "أهلاً بك يا فندم، كيف يمكنني مساعدتك اليوم؟",
  "تم استلام طلبك وجاري التجهيز للشحن.",
  "يرجى تزويدنا بالعنوان التفصيلي ورقم الهاتف للتوصيل.",
  "شكراً لتعاملك معنا، يسعدنا دائماً خدمتك."
];

export default function Settings() {
  const { settings, saveSettings, fetchSettings, saveStatus } = useSettingsStore();
  const { tests, runTest } = useConnectionTest();
  
  const [activeTab, setActiveTab] = useState<'api' | 'employees' | 'replies'>('api');

  // إعدادات الخوادم والـ APIs
  const [localSettings, setLocalSettings] = useState<AppSettings>({
    supabase: { url: '', anonKey: '', serviceRoleKey: '' },
    twilio: { accountSid: '', authToken: '', whatsappNumber: '' },
    webhook: { port: 3001, secret: '', enabled: false },
    employees: [],
    quickReplies: [],
    activeEmployeeId: ''
  });

  const [dbProviders, setDbProviders] = useState<any[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<any | null>(null);
  const [isLoadingProviders, setIsLoadingProviders] = useState(false);
  const [isSavingProvider, setIsSavingProvider] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // إعدادات الموظفين
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [activeEmpId, setActiveEmpId] = useState('');
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpRole, setNewEmpRole] = useState<'admin' | 'supervisor' | 'agent'>('agent');
  const [newEmpPerms, setNewEmpPerms] = useState<string[]>(['send_messages']);

  // إعدادات الردود السريعة والقوالب
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [newQuickReply, setNewQuickReply] = useState('');
  const [dbTemplates, setDbTemplates] = useState<any[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  
  // حقول إضافة قالب جديد
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateContent, setNewTemplateContent] = useState('');
  const [newTemplateCategory, setNewTemplateCategory] = useState('order_confirm');
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  // تحميل الإعدادات ومزودي الخدمة عند التشغيل
  useEffect(() => {
    fetchSettings().then(() => {
      const s = useSettingsStore.getState().settings;
      if (s) {
        setLocalSettings(s);
        
        // بذر الموظفين الافتراضيين إذا لم يكونوا موجودين
        const seededEmps = s.employees && s.employees.length > 0 ? s.employees : DEFAULT_EMPLOYEES;
        setEmployees(seededEmps);
        setActiveEmpId(s.activeEmployeeId || seededEmps[0].id);

        // بذر الردود السريعة الافتراضية
        const seededReplies = s.quickReplies && s.quickReplies.length > 0 ? s.quickReplies : DEFAULT_QUICK_REPLIES;
        setQuickReplies(seededReplies);
      }
      setIsLoaded(true);
    });
    loadProviders();
    loadDbTemplates();
  }, [fetchSettings]);

  // حفظ الإعدادات تلقائياً عند التعديل (بعد التوقف عن الكتابة بـ 1200 مللي ثانية للتعديلات الكبيرة)
  useEffect(() => {
    if (!isLoaded) return;
    const timer = setTimeout(() => {
      saveSettings({
        ...localSettings,
        employees,
        quickReplies,
        activeEmployeeId: activeEmpId
      });
    }, 1200);
    return () => clearTimeout(timer);
  }, [localSettings, employees, quickReplies, activeEmpId, saveSettings, isLoaded]);

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

  const loadDbTemplates = async () => {
    setIsLoadingTemplates(true);
    try {
      const { data, error } = await supabase
        .from('message_templates')
        .select('*')
        .order('id', { ascending: true });
      if (!error && data) {
        setDbTemplates(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const handleSaveSettings = async () => {
    const success = await saveSettings({
      ...localSettings,
      employees,
      quickReplies,
      activeEmployeeId: activeEmpId
    });
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

  // ==========================================
  // دوال إدارة الموظفين
  // ==========================================
  const handleAddEmployee = () => {
    if (!newEmpName.trim()) return;
    const newEmp: Employee = {
      id: 'EMP_' + Math.floor(Math.random() * 10000),
      name: newEmpName.trim(),
      role: newEmpRole,
      permissions: newEmpPerms
    };
    const updated = [...employees, newEmp];
    setEmployees(updated);
    setNewEmpName('');
    showTemporarySuccess('تم إضافة الموظف بنجاح');
  };

  const handleDeleteEmployee = (empId: string) => {
    if (empId === activeEmpId) {
      showTemporarySuccess('⚠️ لا يمكن حذف الموظف النشط حالياً');
      return;
    }
    const updated = employees.filter(e => e.id !== empId);
    setEmployees(updated);
    showTemporarySuccess('تم حذف الموظف');
  };

  const handleTogglePermission = (perm: string) => {
    if (newEmpPerms.includes(perm)) {
      setNewEmpPerms(newEmpPerms.filter(p => p !== perm));
    } else {
      setNewEmpPerms([...newEmpPerms, perm]);
    }
  };

  // ==========================================
  // دوال إدارة الردود السريعة والقوالب
  // ==========================================
  const handleAddQuickReply = () => {
    if (!newQuickReply.trim()) return;
    const updated = [...quickReplies, newQuickReply.trim()];
    setQuickReplies(updated);
    setNewQuickReply('');
    showTemporarySuccess('تم إضافة الرد السريع');
  };

  const handleDeleteQuickReply = (index: number) => {
    const updated = quickReplies.filter((_, idx) => idx !== index);
    setQuickReplies(updated);
    showTemporarySuccess('تم حذف الرد السريع');
  };

  const handleAddTemplate = async () => {
    if (!newTemplateName.trim() || !newTemplateContent.trim()) return;
    setIsSavingTemplate(true);
    try {
      const { error } = await supabase
        .from('message_templates')
        .insert({
          name: newTemplateName.trim(),
          content: newTemplateContent.trim(),
          category: newTemplateCategory
        });
      if (error) throw error;
      
      setNewTemplateName('');
      setNewTemplateContent('');
      showTemporarySuccess('تم إدراج القالب سحابياً بنجاح');
      await loadDbTemplates();
    } catch (err) {
      console.error(err);
      showTemporarySuccess('❌ فشل إدراج القالب');
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (templateId: number) => {
    try {
      const { error } = await supabase
        .from('message_templates')
        .delete()
        .eq('id', templateId);
      if (error) throw error;
      
      showTemporarySuccess('تم حذف القالب من السحابة');
      await loadDbTemplates();
    } catch (err) {
      console.error(err);
      showTemporarySuccess('❌ فشل حذف القالب');
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 pb-16" dir="rtl">
      
      {/* الهيدر الرئيسي */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">إعدادات النظام والإدارة</h1>
          <p className="text-gray-400 mt-1 text-xs font-semibold">تكوين خوادم الـ APIs وقاعدة البيانات السحابية، إدارة شؤون الموظفين والصلاحيات، وتعديل الردود السريعة</p>
        </div>
        <div className="flex items-center gap-4">
          {saveStatus === 'saving' && (
            <span className="text-amber-450 text-xs font-medium flex items-center gap-1.5 bg-amber-950/20 border border-amber-500/15 px-3 py-1.5 rounded-lg">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              جاري الحفظ التلقائي...
            </span>
          )}
          {saveStatus === 'success' && (
            <span className="text-emerald-400 text-xs font-medium flex items-center gap-1.5 bg-emerald-950/20 border border-emerald-500/15 px-3 py-1.5 rounded-lg">
              تم الحفظ تلقائياً ✓
            </span>
          )}
          {successMsg && (
            <span className="text-emerald-400 text-xs font-semibold bg-emerald-950/40 border border-emerald-500/20 px-3.5 py-2 rounded-xl animate-pulse">
              {successMsg}
            </span>
          )}
          <Button
            onClick={handleSaveSettings}
            icon={<Save className="w-4 h-4" />}
          >
            حفظ كل الإعدادات
          </Button>
        </div>
      </div>

      {/* شريط تبويبات الإعدادات */}
      <div className="flex border-b border-gray-800 gap-4">
        <button
          onClick={() => setActiveTab('api')}
          className={`pb-3 text-xs font-bold transition-all relative ${
            activeTab === 'api' ? 'text-indigo-400 font-extrabold' : 'text-gray-500 hover:text-gray-400'
          }`}
        >
          الخوادم واتصالات الـ APIs
          {activeTab === 'api' && <span className="absolute bottom-0 right-0 left-0 h-0.5 bg-indigo-500 rounded-full" />}
        </button>
        <button
          onClick={() => setActiveTab('employees')}
          className={`pb-3 text-xs font-bold transition-all relative ${
            activeTab === 'employees' ? 'text-indigo-400 font-extrabold' : 'text-gray-500 hover:text-gray-400'
          }`}
        >
          الموظفون والصلاحيات الأمنية
          {activeTab === 'employees' && <span className="absolute bottom-0 right-0 left-0 h-0.5 bg-indigo-500 rounded-full" />}
        </button>
        <button
          onClick={() => setActiveTab('replies')}
          className={`pb-3 text-xs font-bold transition-all relative ${
            activeTab === 'replies' ? 'text-indigo-400 font-extrabold' : 'text-gray-500 hover:text-gray-400'
          }`}
        >
          إعدادات الردود السريعة والقوالب
          {activeTab === 'replies' && <span className="absolute bottom-0 right-0 left-0 h-0.5 bg-indigo-500 rounded-full" />}
        </button>
      </div>

      {/* ======================================================= */}
      {/* 1. تبويب الخوادم والـ APIs */}
      {/* ======================================================= */}
      {activeTab === 'api' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            
            {/* Supabase */}
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
                </div>
              )}

              <div className="grid grid-cols-1 gap-4">
                <Input
                  label="رابط المشروع (Project URL)"
                  value={localSettings.supabase.url}
                  onChange={(e) => setLocalSettings(s => ({ ...s, supabase: { ...s.supabase, url: e.target.value } }))}
                />
                <Input
                  label="المفتاح العام (Anon Key)"
                  type="password"
                  value={localSettings.supabase.anonKey}
                  onChange={(e) => setLocalSettings(s => ({ ...s, supabase: { ...s.supabase, anonKey: e.target.value } }))}
                />
              </div>
            </section>

            {/* Twilio */}
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
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Account SID"
                  value={localSettings.twilio.accountSid}
                  onChange={(e) => setLocalSettings(s => ({ ...s, twilio: { ...s.twilio, accountSid: e.target.value } }))}
                />
                <Input
                  label="Auth Token"
                  type="password"
                  value={localSettings.twilio.authToken}
                  onChange={(e) => setLocalSettings(s => ({ ...s, twilio: { ...s.twilio, authToken: e.target.value } }))}
                />
                <div className="md:col-span-2">
                  <Input
                    label="رقم واتساب المرسل"
                    value={localSettings.twilio.whatsappNumber}
                    onChange={(e) => setLocalSettings(s => ({ ...s, twilio: { ...s.twilio, whatsappNumber: e.target.value } }))}
                  />
                </div>
              </div>
            </section>

            {/* Webhook */}
            <section className="glass rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-800/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <Laptop className="w-5 h-5 text-indigo-400" />
                  <h2 className="text-sm font-bold text-white">خادم استقبال الويب هوك المحلي (Webhook)</h2>
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
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="المنفذ المحلى (Local Port)"
                  value={String(localSettings.webhook.port)}
                  onChange={(e) => setLocalSettings(s => ({ ...s, webhook: { ...s.webhook, port: parseInt(e.target.value) || 3001 } }))}
                />
                <Input
                  label="Webhook Secret"
                  type="password"
                  value={localSettings.webhook.secret}
                  onChange={(e) => setLocalSettings(s => ({ ...s, webhook: { ...s.webhook, secret: e.target.value } }))}
                />
              </div>
            </section>

          </div>

          {/* مزودو واتساب السحابيون */}
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

            {selectedProvider && (
              <section className="glass rounded-3xl p-6 space-y-4">
                <div className="border-b border-gray-800/60 pb-3">
                  <h3 className="text-xs font-bold text-white">تعديل مزود: {selectedProvider.name}</h3>
                </div>
                
                <div className="space-y-3">
                  <Input
                    label="عنوان API"
                    value={selectedProvider.api_url || ''}
                    onChange={(e) => setSelectedProvider((p: any) => ({ ...p, api_url: e.target.value }))}
                  />
                  <Input
                    label="مفتاح API"
                    type="password"
                    value={selectedProvider.api_key || ''}
                    onChange={(e) => setSelectedProvider((p: any) => ({ ...p, api_key: e.target.value }))}
                  />
                  <Input
                    label="رقم الهاتف (Phone)"
                    value={selectedProvider.phone_number || ''}
                    onChange={(e) => setSelectedProvider((p: any) => ({ ...p, phone_number: e.target.value }))}
                  />
                  
                  <Button
                    className="w-full mt-2"
                    onClick={handleSaveProviderDetails}
                    isLoading={isSavingProvider}
                    size="sm"
                  >
                    تحديث بيانات المزود
                  </Button>
                </div>
              </section>
            )}
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* 2. تبويب الموظفين والصلاحيات */}
      {/* ======================================================= */}
      {activeTab === 'employees' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* جدول الموظفين */}
          <div className="md:col-span-2 glass rounded-3xl p-6 space-y-4">
            <div className="border-b border-gray-800/60 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" />
                <h2 className="text-sm font-bold text-white">قائمة موظفي النظام المسؤولين</h2>
              </div>
              <span className="text-[10px] text-gray-500 font-semibold bg-gray-900/40 px-3 py-1 rounded-xl">صلاحيات وأدوار الموظفين</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="border-b border-gray-800/60 text-xs text-gray-400 font-semibold">
                    <th className="pb-3 pr-2">الاسم</th>
                    <th className="pb-3">الدور الوظيفي</th>
                    <th className="pb-3">الصلاحيات الممنوحة</th>
                    <th className="pb-3">الحالة الحالية</th>
                    <th className="pb-3 pl-2 text-left">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/40 text-xs text-gray-300">
                  {employees.map((emp) => {
                    const isActive = emp.id === activeEmpId;
                    return (
                      <tr key={emp.id} className="hover:bg-gray-900/10 transition-all">
                        <td className="py-4 pr-2 font-bold text-white">{emp.name}</td>
                        <td className="py-4 font-semibold text-indigo-300">
                          {emp.role === 'admin' ? 'مدير النظام 👑' : emp.role === 'supervisor' ? 'مشرف 🛡️' : 'موظف دعم 💬'}
                        </td>
                        <td className="py-4 max-w-xs">
                          <div className="flex flex-wrap gap-1">
                            {emp.permissions.map((p, idx) => (
                              <span key={idx} className="bg-gray-800 text-gray-400 text-[9px] px-1.5 py-0.5 rounded">
                                {p === 'manage_settings' ? 'إعدادات' : p === 'send_messages' ? 'مراسلة' : p === 'view_reports' ? 'تقارير' : 'فواتير'}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-4">
                          <button
                            onClick={() => setActiveEmpId(emp.id)}
                            className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${
                              isActive
                                ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/20'
                                : 'bg-gray-900/30 text-gray-500 border-gray-850 hover:border-gray-700'
                            }`}
                          >
                            {isActive ? 'النشط حالياً' : 'تعيين كنشط'}
                          </button>
                        </td>
                        <td className="py-4 pl-2 text-left">
                          <button
                            onClick={() => handleDeleteEmployee(emp.id)}
                            className="p-1 text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                            title="حذف الموظف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* إضافة موظف جديد */}
          <div className="glass rounded-3xl p-6 space-y-4 h-fit">
            <div className="border-b border-gray-800/60 pb-3 flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-400" />
              <h3 className="text-xs font-bold text-white">إدخال موظف جديد وتعيين الأدوار</h3>
            </div>

            <div className="space-y-4">
              <Input
                label="اسم الموظف"
                placeholder="مثال: عمر البشير"
                value={newEmpName}
                onChange={(e) => setNewEmpName(e.target.value)}
              />

              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 font-bold block">الدور الوظيفي</label>
                <select
                  value={newEmpRole}
                  onChange={(e: any) => setNewEmpRole(e.target.value)}
                  className="w-full bg-gray-950/40 border border-gray-800/80 rounded-2xl px-4 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="agent">موظف دعم (Agent)</option>
                  <option value="supervisor">مشرف (Supervisor)</option>
                  <option value="admin">مدير النظام (Admin)</option>
                </select>
              </div>

              {/* الصلاحيات الممنوحة */}
              <div className="space-y-2">
                <label className="text-[10px] text-gray-400 font-bold block">الصلاحيات الأمنية</label>
                <div className="space-y-1.5">
                  {[
                    { key: 'send_messages', label: 'إرسال الرسائل ومتابعة الشات' },
                    { key: 'edit_invoices', label: 'تعديل وإنشاء الفواتير' },
                    { key: 'view_reports', label: 'عرض التقارير والتحليلات السلوكية RFM' },
                    { key: 'manage_settings', label: 'إدارة إعدادات النظام وقنوات الـ API' }
                  ].map((p) => {
                    const hasPerm = newEmpPerms.includes(p.key);
                    return (
                      <div
                        key={p.key}
                        onClick={() => handleTogglePermission(p.key)}
                        className={`p-2 rounded-xl border text-[10px] font-bold cursor-pointer transition-all flex items-center justify-between ${
                          hasPerm
                            ? 'bg-indigo-650/15 border-indigo-500/30 text-indigo-455'
                            : 'bg-gray-950/20 border-gray-850 text-gray-500'
                        }`}
                      >
                        <span>{p.label}</span>
                        {hasPerm && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              <Button
                className="w-full mt-2"
                onClick={handleAddEmployee}
                disabled={!newEmpName.trim()}
              >
                إضافة الموظف المختار
              </Button>
            </div>
          </div>

        </div>
      )}

      {/* ======================================================= */}
      {/* 3. تبويب الردود السريعة والقوالب */}
      {/* ======================================================= */}
      {activeTab === 'replies' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* القوالب العامة سحابياً في Supabase */}
          <div className="glass rounded-3xl p-6 space-y-4">
            <div className="border-b border-gray-800/60 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-400" />
                <h2 className="text-sm font-bold text-white">قوالب الرسائل السحابية (Supabase)</h2>
              </div>
              <span className="text-[10px] text-gray-500 font-semibold bg-gray-900/40 px-3 py-1 rounded-xl">تخزين سحابي مشترك</span>
            </div>

            {/* فورم إضافة قالب سحابي */}
            <div className="p-4 bg-gray-950/30 border border-gray-850 rounded-2xl space-y-3">
              <h3 className="text-[10px] text-white font-bold">إضافة قالب سحابي جديد</h3>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="اسم القالب"
                  placeholder="تأكيد الشحن"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                />
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 font-bold block">التصنيف</label>
                  <select
                    value={newTemplateCategory}
                    onChange={(e) => setNewTemplateCategory(e.target.value)}
                    className="w-full bg-gray-950/40 border border-gray-800/80 rounded-2xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="order_confirm">تأكيد طلب (Order)</option>
                    <option value="follow_up">متابعة (Follow Up)</option>
                    <option value="general">عام (General)</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 font-bold block">محتوى القالب</label>
                <textarea
                  placeholder="مرحباً {{name}}، تم شحن طلبك رقم {{order_id}} بقيمة {{total}}..."
                  value={newTemplateContent}
                  onChange={(e) => setNewTemplateContent(e.target.value)}
                  className="w-full bg-gray-950/40 border border-gray-800/80 focus:border-indigo-500 rounded-2xl px-3 py-2 text-xs text-white outline-none resize-none h-20"
                />
              </div>
              <Button
                onClick={handleAddTemplate}
                disabled={isSavingTemplate || !newTemplateName.trim() || !newTemplateContent.trim()}
                className="w-full"
                size="sm"
              >
                إدراج القالب في قاعدة البيانات
              </Button>
            </div>

            {/* قائمة القوالب الحالية */}
            <div className="space-y-3 overflow-y-auto max-h-[400px]">
              {isLoadingTemplates ? (
                <div className="py-6 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
                </div>
              ) : (
                dbTemplates.map((template) => (
                  <div key={template.id} className="p-3.5 bg-gray-900/30 border border-gray-800/60 rounded-2xl flex items-start justify-between gap-4 hover:border-gray-700 transition-all">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{template.name}</span>
                        <span className="text-[8px] font-bold bg-indigo-950/40 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/10">
                          {template.category}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 font-semibold leading-relaxed mt-1.5">{template.content}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="p-1.5 text-red-400 hover:bg-red-500/15 rounded-lg transition-all shrink-0 mt-0.5"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* الردود السريعة المحلية (Local Quick Replies) */}
          <div className="glass rounded-3xl p-6 space-y-4">
            <div className="border-b border-gray-800/60 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                <h2 className="text-sm font-bold text-white">الردود السريعة للمحادثات (محلية)</h2>
              </div>
              <span className="text-[10px] text-gray-500 font-semibold bg-gray-900/40 px-3 py-1 rounded-xl">أدوات مربع الشات</span>
            </div>

            {/* فورم إضافة رد سريع محلي */}
            <div className="p-4 bg-gray-950/30 border border-gray-850 rounded-2xl space-y-3">
              <h3 className="text-[10px] text-white font-bold">إضافة رد سريع جديد</h3>
              <textarea
                placeholder="مثال: يرجى تزويدنا بالعنوان التفصيلي ورقم الهاتف للتوصيل..."
                value={newQuickReply}
                onChange={(e) => setNewQuickReply(e.target.value)}
                className="w-full bg-gray-955/40 border border-gray-800/80 focus:border-indigo-500 rounded-2xl px-3 py-2 text-xs text-white outline-none resize-none h-16"
              />
              <Button
                onClick={handleAddQuickReply}
                disabled={!newQuickReply.trim()}
                className="w-full"
                size="sm"
              >
                إضافة كخيار رد سريع في الشات
              </Button>
            </div>

            {/* قائمة الردود السريعة */}
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {quickReplies.map((reply, idx) => (
                <div key={idx} className="p-3 bg-gray-900/30 border border-gray-800/60 rounded-2xl flex items-center justify-between gap-4">
                  <p className="text-[10px] text-gray-300 font-semibold leading-relaxed flex-1">{reply}</p>
                  <button
                    onClick={() => handleDeleteQuickReply(idx)}
                    className="p-1.5 text-red-400 hover:bg-red-500/15 rounded-lg transition-all shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {quickReplies.length === 0 && (
                <p className="text-center text-gray-500 text-xs py-4">لا توجد ردود سريعة مضافة</p>
              )}
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
