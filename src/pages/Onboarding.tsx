import React, { useState } from 'react';
import { Bot, Wifi, Key, AlertCircle, CheckCircle2, Loader2, Database } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { useSettingsStore } from '../store/useSettingsStore';

export default function Onboarding() {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const { fetchSettings, saveSettings } = useSettingsStore();

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !anonKey.trim()) {
      setError('الرجاء إدخال رابط المشروع والمفتاح العام (Anon Key)');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);

    const cleanUrl = url.replace(/[”"']/g, '').trim();
    const cleanKey = anonKey.replace(/[”"']/g, '').trim();

    try {
      // 1. اختبار الاتصال بالمشروع سحابياً
      const testClient = createClient(cleanUrl, cleanKey, {
        global: {
          headers: {
            'x-basira-signature': 'basira-crm-secure-client-token-2024'
          }
        }
      });
      
      // نقوم بمحاولة قراءة جدول الموظفين للتحقق من الاتصال ووجود الجداول
      const { data, error: dbErr } = await testClient
        .from('system_employees')
        .select('id')
        .limit(1);

      if (dbErr) {
        // إذا كان الخطأ بسبب عدم وجود الجدول، فهذا يعني أن المشروع متصل ولكن لم يتم تشغيل الـ Schema بعد
        if (dbErr.code === '42P01') {
          throw new Error('تم الاتصال بمشروع Supabase بنجاح! ولكن يرجى تشغيل كود SQL لإنشاء الجداول (schema.sql) في الـ SQL Editor أولاً.');
        }
        throw new Error(dbErr.message);
      }

      // 2. إذا نجح الاتصال بالكامل، نقوم بحفظ الإعدادات محلياً
      const currentSettings = useSettingsStore.getState().settings;
      const updatedSettings = {
        ...currentSettings,
        supabase: {
          url: cleanUrl,
          anonKey: cleanKey,
          serviceRoleKey: ''
        }
      };

      const saveSuccess = await saveSettings(updatedSettings);
      if (saveSuccess) {
        setSuccessMsg('✅ تم حفظ الإعدادات والاتصال بالسحابة بنجاح! جاري التوجيه...');
        setTimeout(() => {
          fetchSettings(); // تحديث حالة المخزن ليتم تحويل المستخدم لشاشة تسجيل الدخول
        }, 2000);
      } else {
        setError('فشل حفظ الإعدادات محلياً في ملف التخزين.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'فشل الاتصال بالخادم السحابي، يرجى التحقق من صحة الرابط والمفتاح.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden"
      style={{ backgroundColor: '#070033' }}
      dir="rtl"
    >
      {/* Background decoration */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-indigo-600/20 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-pink-600/10 rounded-full blur-[100px] animate-pulse delay-1000" />

      <div className="w-full max-w-xl glass rounded-[32px] p-8 border border-white/10 relative z-10 space-y-6 shadow-2xl">
        {/* Header */}
        <div className="text-center space-y-3">
          <div
            className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto"
            style={{
              background: 'linear-gradient(135deg, #FF6632 0%, #FF8D3B 100%)',
              boxShadow: '0 8px 24px rgba(255,102,50,0.35)',
            }}
          >
            <Database className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">إعداد الاتصال السحابي لأول مرة</h1>
            <p className="text-xs text-gray-400 mt-1 font-medium">
              مرحباً بك في بصيرة CRM. يرجى تهيئة وربط نظامك بمشروع Supabase الخاص بشركتك للبدء.
            </p>
          </div>
        </div>

        {/* Status Alerts */}
        {error && (
          <div className="bg-red-950/40 border border-red-500/20 text-red-400 p-4 rounded-2xl flex items-start gap-3 text-xs font-semibold">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 p-4 rounded-2xl flex items-center gap-3 text-xs font-bold animate-pulse">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSetup} className="space-y-5">
          <div className="space-y-1">
            <label className="text-[10px] text-gray-400 font-bold block mb-1">رابط مشروع Supabase (Project URL)</label>
            <div className="relative">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://xxxxxx.supabase.co"
                className="w-full bg-slate-950/50 border border-slate-800 text-white rounded-2xl px-4 py-3.5 pr-11 text-xs focus:outline-none focus:border-indigo-500 transition-all font-semibold"
                disabled={isLoading}
              />
              <Wifi className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-gray-400 font-bold block mb-1">مفتاح الاتصال العام (Anon Key)</label>
            <div className="relative">
              <textarea
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpX..."
                className="w-full bg-slate-950/50 border border-slate-800 text-white rounded-2xl px-4 py-3 pr-11 text-xs focus:outline-none focus:border-indigo-500 transition-all font-semibold h-24 resize-none"
                disabled={isLoading}
              />
              <Key className="absolute right-4 top-5 w-5 h-5 text-gray-400" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 rounded-2xl font-bold text-xs mt-2 flex items-center justify-center gap-2 transition-all"
            style={{
              background: 'linear-gradient(135deg, #FF6632 0%, #FF8D3B 100%)',
              color: '#FFFFFF',
              boxShadow: '0 4px 16px rgba(255,102,50,0.30)',
            }}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                جاري فحص الاتصال وتأسيس الجداول...
              </>
            ) : (
              'فحص الاتصال وحفظ الإعدادات'
            )}
          </button>
        </form>

        {/* Guidelines / Help */}
        <div className="bg-slate-950/30 border border-slate-800/40 rounded-2xl p-4 text-[10px] text-gray-450 leading-relaxed space-y-2">
          <p className="font-bold text-white">💡 خطوات إعداد خادم شركتك الخاص:</p>
          <ol className="list-decimal list-inside space-y-1 font-medium">
            <li>قم بإنشاء مشروع جديد مجاني في موقع <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">supabase.com</a>.</li>
            <li>اذهب إلى إعدادات المشروع (Project Settings) ثم API لنسخ رابط URL ومفتاح Anon Key ولصقهم بالأعلى.</li>
            <li>قم بتنزيل وتشغيل كود SQL المرفق مع التطبيق في مجلد <code className="text-indigo-400">supabase/schema.sql</code> داخل قسم SQL Editor لتهيئة الجداول.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
