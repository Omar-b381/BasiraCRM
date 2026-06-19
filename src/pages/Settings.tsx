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
  { id: '1', name: 'عمر البشير', username: 'omar', role: 'admin', permissions: ['manage_settings', 'send_messages', 'view_reports', 'edit_invoices', 'manage_tasks'] },
  { id: '2', name: 'أحمد محمود', username: 'ahmed', role: 'supervisor', permissions: ['send_messages', 'view_reports', 'edit_invoices', 'manage_tasks'] },
  { id: '3', name: 'مريم علي', username: 'maryam', role: 'agent', permissions: ['send_messages', 'manage_tasks'] },
  { id: '4', name: 'خالد مصطفى', username: 'khaled', role: 'agent', permissions: ['send_messages', 'manage_tasks'] }
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
  
  const [activeTab, setActiveTab] = useState<'api' | 'employees' | 'replies' | 'print'>('api');

  // إعدادات الخوادم والـ APIs
  const [localSettings, setLocalSettings] = useState<AppSettings>({
    supabase: { url: '', anonKey: '', serviceRoleKey: '' },
    twilio: { accountSid: '', authToken: '', whatsappNumber: '' },
    meta: { accessToken: '', phoneNumberId: '', whatsappNumber: '', verifyToken: '' },
    activeProvider: 'twilio',
    webhook: { port: 3001, secret: '', enabled: false },
    employees: [],
    quickReplies: [],
    activeEmployeeId: '',
    printSettings: {
      companyName: '',
      companyPhone: '',
      companyAddress: '',
      companyLogo: '',
      taxNumber: '',
      termsText: 'نشكركم لثقتكم في منتجاتنا 🌸',
      paperSize: 'A4',
      showLogo: true
    }
  });


  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // إعدادات الموظفين
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [activeEmpId, setActiveEmpId] = useState('');
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpUsername, setNewEmpUsername] = useState('');
  const [newEmpPassword, setNewEmpPassword] = useState('');
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
    loadDbTemplates();
  }, []);

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

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64String = reader.result as string;
      setLocalSettings(prev => ({
        ...prev,
        printSettings: {
          ...prev.printSettings!,
          companyLogo: base64String
        }
      }));
    };
    reader.readAsDataURL(file);
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



  // ==========================================
  // دوال إدارة الموظفين
  // ==========================================
  const handleAddEmployee = async () => {
    if (!newEmpName.trim() || !newEmpUsername.trim() || !newEmpPassword.trim()) {
      showTemporarySuccess('❌ يرجى تعبئة جميع الحقول: الاسم، اسم المستخدم، وكلمة المرور');
      return;
    }
    const newEmp: Employee = {
      id: 'EMP_' + Math.floor(Math.random() * 10000),
      name: newEmpName.trim(),
      username: newEmpUsername.trim(),
      password: newEmpPassword.trim(),
      role: newEmpRole,
      permissions: newEmpPerms
    };

    try {
      // تشفير كلمة المرور قبل الحفظ سحابياً
      const hashRes = await window.electronAPI.auth.hashPassword(newEmpPassword.trim());
      if (!hashRes.success || !hashRes.hash) {
        showTemporarySuccess('❌ فشل تشفير كلمة المرور: ' + (hashRes.error || 'خطأ غير معروف'));
        return;
      }

      // 1. حفظ الموظف سحابياً في جدول system_employees
      const { error: dbErr } = await supabase
        .from('system_employees')
        .insert({
          id: newEmp.id,
          name: newEmp.name,
          username: newEmp.username,
          password: hashRes.hash, // حفظ الهاش المشفر
          role: newEmp.role,
          permissions: newEmp.permissions
        });

      if (dbErr) {
        showTemporarySuccess('❌ فشل حفظ الموظف في السحابة: ' + dbErr.message);
        return;
      }

      // 2. تحديث الحالة المحلية
      const updated = [...employees, newEmp];
      setEmployees(updated);
      setNewEmpName('');
      setNewEmpUsername('');
      setNewEmpPassword('');
      showTemporarySuccess('تم إضافة الموظف بنجاح سحابياً ومحلياً');
    } catch (err) {
      console.error(err);
      showTemporarySuccess('❌ حدث خطأ غير متوقع أثناء الحفظ سحابياً');
    }
  };

  const handleDeleteEmployee = async (empId: string) => {
    if (empId === activeEmpId) {
      showTemporarySuccess('⚠️ لا يمكن حذف الموظف النشط حالياً');
      return;
    }

    try {
      // 1. حذف الموظف سحابياً من جدول system_employees
      const { error: dbErr } = await supabase
        .from('system_employees')
        .delete()
        .eq('id', empId);

      if (dbErr) {
        showTemporarySuccess('❌ فشل حذف الموظف من السحابة: ' + dbErr.message);
        return;
      }

      // 2. تحديث الحالة المحلية
      const updated = employees.filter(e => e.id !== empId);
      setEmployees(updated);
      showTemporarySuccess('تم حذف الموظف بنجاح');
    } catch (err) {
      console.error(err);
      showTemporarySuccess('❌ حدث خطأ غير متوقع أثناء الحذف من السحابة');
    }
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
        <button
          onClick={() => setActiveTab('print')}
          className={`pb-3 text-xs font-bold transition-all relative ${
            activeTab === 'print' ? 'text-indigo-400 font-extrabold' : 'text-gray-500 hover:text-gray-400'
          }`}
        >
          هوية الفواتير وإعدادات الطباعة
          {activeTab === 'print' && <span className="absolute bottom-0 right-0 left-0 h-0.5 bg-indigo-500 rounded-full" />}
        </button>
      </div>

      {/* ======================================================= */}
      {/* 1. تبويب الخوادم والـ APIs */}
      {/* ======================================================= */}
      {activeTab === 'api' && (
        <div className="max-w-4xl mx-auto space-y-6">
          
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

          {/* اختيار مزود الخدمة */}
          <section className="glass rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-2.5 border-b border-gray-800/60 pb-3">
              <Shield className="w-5 h-5 text-indigo-400" />
              <h2 className="text-sm font-bold text-white">مزود خدمة الواتساب النشط</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setLocalSettings(s => ({ ...s, activeProvider: 'twilio' }))}
                className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${
                  localSettings.activeProvider === 'twilio'
                    ? 'bg-emerald-950/20 border-emerald-500/30 text-white font-bold'
                    : 'bg-transparent border-gray-800/40 text-gray-400 hover:border-gray-800 hover:text-white'
                }`}
              >
                <MessageSquare className="w-6 h-6 text-emerald-400" />
                <span className="text-xs">Twilio API</span>
              </button>
              <button
                type="button"
                onClick={() => setLocalSettings(s => ({ ...s, activeProvider: 'meta' }))}
                className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${
                  localSettings.activeProvider === 'meta'
                    ? 'bg-indigo-950/20 border-indigo-500/30 text-white font-bold'
                    : 'bg-transparent border-gray-800/40 text-gray-400 hover:border-gray-800 hover:text-white'
                }`}
              >
                <Database className="w-6 h-6 text-indigo-400" />
                <span className="text-xs">Meta WhatsApp Cloud API</span>
              </button>
            </div>
          </section>

          {/* Twilio */}
          {localSettings.activeProvider === 'twilio' && (
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
          )}

          {/* Meta Cloud API */}
          {localSettings.activeProvider === 'meta' && (
            <section className="glass rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-800/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <Database className="w-5 h-5 text-indigo-400" />
                  <h2 className="text-sm font-bold text-white">إعدادات Meta WhatsApp Cloud API</h2>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => runTest('meta', localSettings.meta)}
                  isLoading={tests.meta?.status === 'testing'}
                  icon={<RefreshCw className="w-3.5 h-3.5" />}
                >
                  فحص الاتصال
                </Button>
              </div>

              {tests.meta && (
                <div className={`p-3 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
                  tests.meta.status === 'success' ? 'bg-emerald-950/20 text-emerald-400 border border-emerald-500/10' : 'bg-red-950/20 text-red-400 border border-red-500/10'
                }`}>
                  {tests.meta.status === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                  <span>{tests.meta.message}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Input
                    label="Meta Access Token (رمز الوصول)"
                    type="password"
                    value={localSettings.meta?.accessToken || ''}
                    onChange={(e) => setLocalSettings(s => ({ ...s, meta: { ...(s.meta || { accessToken: '', phoneNumberId: '', whatsappNumber: '', verifyToken: '' }), accessToken: e.target.value } }))}
                  />
                </div>
                <Input
                  label="Phone Number ID (معرّف رقم الهاتف)"
                  value={localSettings.meta?.phoneNumberId || ''}
                  onChange={(e) => setLocalSettings(s => ({ ...s, meta: { ...(s.meta || { accessToken: '', phoneNumberId: '', whatsappNumber: '', verifyToken: '' }), phoneNumberId: e.target.value } }))}
                />
                <Input
                  label="رقم واتساب المرسل (بدون + أو علامة)"
                  value={localSettings.meta?.whatsappNumber || ''}
                  placeholder="مثال: 201200000000"
                  onChange={(e) => setLocalSettings(s => ({ ...s, meta: { ...(s.meta || { accessToken: '', phoneNumberId: '', whatsappNumber: '', verifyToken: '' }), whatsappNumber: e.target.value } }))}
                />
                <div className="md:col-span-2">
                  <Input
                    label="Webhook Verify Token (رمز تحقق الويب هوك)"
                    value={localSettings.meta?.verifyToken || ''}
                    onChange={(e) => setLocalSettings(s => ({ ...s, meta: { ...(s.meta || { accessToken: '', phoneNumberId: '', whatsappNumber: '', verifyToken: '' }), verifyToken: e.target.value } }))}
                  />
                </div>
              </div>
            </section>
          )}

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
                                {p === 'manage_settings' ? 'إعدادات' : p === 'send_messages' ? 'مراسلة' : p === 'view_reports' ? 'تقارير' : p === 'manage_tasks' ? 'مهام' : 'فواتير'}
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

              <Input
                label="اسم المستخدم (Username)"
                placeholder="مثال: omar"
                value={newEmpUsername}
                onChange={(e) => setNewEmpUsername(e.target.value)}
              />

              <Input
                label="كلمة المرور (Password)"
                placeholder="مثال: 123456"
                type="password"
                value={newEmpPassword}
                onChange={(e) => setNewEmpPassword(e.target.value)}
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
                    { key: 'manage_tasks', label: 'إدارة المهام والتذكيرات والمتابعات السحابية' },
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

      {/* ======================================================= */}
      {/* 4. تبويب هوية الفواتير وإعدادات الطباعة */}
      {/* ======================================================= */}
      {activeTab === 'print' && (
        <div className="max-w-4xl mx-auto space-y-6">
          <section className="glass rounded-3xl p-6 space-y-6">
            <div className="flex items-center gap-2.5 border-b border-gray-800/60 pb-3">
              <Laptop className="w-5 h-5 text-indigo-400" />
              <h2 className="text-sm font-bold text-white">تفاصيل هوية الشركة المطبوعة على الفواتير</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="اسم الشركة (يظهر في الترويسة)"
                value={localSettings.printSettings?.companyName || ''}
                onChange={(e) => setLocalSettings(s => ({
                  ...s,
                  printSettings: { ...s.printSettings!, companyName: e.target.value }
                }))}
                placeholder="مثال: مؤسسة مواسم التجارية"
              />
              <Input
                label="رقم الهاتف"
                value={localSettings.printSettings?.companyPhone || ''}
                onChange={(e) => setLocalSettings(s => ({
                  ...s,
                  printSettings: { ...s.printSettings!, companyPhone: e.target.value }
                }))}
                placeholder="مثال: 0100XXXXXXX"
              />
              <Input
                label="العنوان"
                value={localSettings.printSettings?.companyAddress || ''}
                onChange={(e) => setLocalSettings(s => ({
                  ...s,
                  printSettings: { ...s.printSettings!, companyAddress: e.target.value }
                }))}
                placeholder="مثال: القاهرة، مصر"
              />
              <Input
                label="الرقم الضريبي (اختياري)"
                value={localSettings.printSettings?.taxNumber || ''}
                onChange={(e) => setLocalSettings(s => ({
                  ...s,
                  printSettings: { ...s.printSettings!, taxNumber: e.target.value }
                }))}
                placeholder="الرقم الضريبي للشركة"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-gray-400 font-bold block mb-1">الشروط والأحكام / نص التذييل</label>
              <textarea
                value={localSettings.printSettings?.termsText || ''}
                onChange={(e) => setLocalSettings(s => ({
                  ...s,
                  printSettings: { ...s.printSettings!, termsText: e.target.value }
                }))}
                placeholder="اكتب الشروط أو رسالة شكر للعملاء هنا..."
                className="w-full bg-slate-950/50 border border-slate-800 text-white rounded-2xl px-4 py-3 text-xs focus:outline-none focus:border-indigo-500 transition-all font-semibold h-24 resize-none"
              />
            </div>

            {/* إعدادات الشعار وحجم الورق */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-gray-800/40">
              <div className="space-y-4">
                <label className="text-[10px] text-gray-400 font-bold block">شعار الشركة (Company Logo)</label>
                <div className="flex items-center gap-4">
                  {localSettings.printSettings?.companyLogo ? (
                    <div className="relative group shrink-0">
                      <img
                        src={localSettings.printSettings.companyLogo}
                        alt="Logo Preview"
                        className="w-20 h-20 object-contain rounded-2xl bg-white p-2 border border-gray-800"
                      />
                      <button
                        type="button"
                        onClick={() => setLocalSettings(s => ({
                          ...s,
                          printSettings: { ...s.printSettings!, companyLogo: '' }
                        }))}
                        className="absolute -top-1.5 -left-1.5 bg-red-650 hover:bg-red-700 text-white rounded-full p-1 transition-all shadow-md"
                        title="حذف الشعار"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-gray-800 flex items-center justify-center text-gray-600">
                      <Plus className="w-6 h-6" />
                    </div>
                  )}

                  <div className="space-y-1.5 flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      id="logo-upload-input"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <label
                      htmlFor="logo-upload-input"
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer transition-all shadow-lg shadow-indigo-600/15"
                    >
                      اختر صورة الشعار
                    </label>
                    <p className="text-[10px] text-gray-500">صيغ مدعومة: PNG, JPG, WebP. يفضل مقاس مربع أو مستطيل صغير.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] text-gray-400 font-bold block">خيارات الطباعة الإضافية</label>
                <div className="space-y-3">
                  <label className="flex items-center gap-2.5 text-xs text-gray-300 cursor-pointer font-semibold">
                    <input
                      type="checkbox"
                      checked={localSettings.printSettings?.showLogo !== false}
                      onChange={(e) => setLocalSettings(s => ({
                        ...s,
                        printSettings: { ...s.printSettings!, showLogo: e.target.checked }
                      }))}
                      className="w-4 h-4 rounded border-gray-800 bg-slate-950 text-indigo-600 focus:ring-0 focus:ring-offset-0"
                    />
                    عرض الشعار على الفاتورة المطبوعة
                  </label>

                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400 font-bold block">مقاس الورق الافتراضي</label>
                    <select
                      value={localSettings.printSettings?.paperSize || 'A4'}
                      onChange={(e) => setLocalSettings(s => ({
                        ...s,
                        printSettings: { ...s.printSettings!, paperSize: e.target.value as any }
                      }))}
                      className="w-full max-w-[200px] bg-slate-950/60 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 transition-all font-semibold"
                    >
                      <option value="A4">A4 (افتراضي)</option>
                      <option value="A5">A5</option>
                      <option value="Receipt">إيصال حراري (Receipt)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

    </div>
  );
}
