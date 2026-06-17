import React, { useState } from 'react';
import { Bot, Lock, User, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import Button from '../components/ui/Button';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuthStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('الرجاء إدخال اسم المستخدم وكلمة المرور');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const { data, error: dbErr } = await supabase
        .from('system_employees')
        .select('*')
        .eq('username', username.trim())
        .eq('password', password.trim())
        .maybeSingle();

      if (dbErr) {
        throw new Error(dbErr.message);
      }

      if (!data) {
        setError('خطأ: اسم المستخدم أو كلمة المرور غير صحيحة');
      } else {
        login({
          id: data.id,
          name: data.name,
          username: data.username,
          role: data.role,
          permissions: data.permissions || []
        });
      }
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? `خطأ أثناء تسجيل الدخول: ${err.message}`
          : 'حدث خطأ في الاتصال بالخادم، يرجى التحقق من إعدادات الاتصال السحابي.'
      );
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
      {/* Background blobs for premium glassmorphic vibe */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-indigo-600/20 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-pink-600/10 rounded-full blur-[100px] animate-pulse delay-1000" />

      <div className="w-full max-w-md glass rounded-[32px] p-8 border border-white/10 relative z-10 space-y-6 shadow-2xl">
        {/* Header / Logo */}
        <div className="text-center space-y-3">
          <div
            className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto"
            style={{
              background: 'linear-gradient(135deg, #FF6632 0%, #FF8D3B 100%)',
              boxShadow: '0 8px 24px rgba(255,102,50,0.35)',
            }}
          >
            <Bot className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">تسجيل الدخول</h1>
            <p className="text-xs text-gray-400 mt-1 font-medium">بصيرة CRM — نظام إدارة علاقات العملاء</p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-950/40 border border-red-500/20 text-red-400 p-4 rounded-2xl flex items-center gap-3 text-xs font-semibold">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] text-gray-400 font-bold block mb-1">اسم المستخدم</label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="أدخل اسم المستخدم"
                className="w-full bg-slate-950/50 border border-slate-800 text-white rounded-2xl px-4 py-3.5 pr-11 text-sm focus:outline-none focus:border-indigo-500 transition-all font-semibold"
              />
              <User className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-gray-400 font-bold block mb-1">كلمة المرور</label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="أدخل كلمة المرور"
                className="w-full bg-slate-950/50 border border-slate-800 text-white rounded-2xl px-4 py-3.5 pr-11 text-sm focus:outline-none focus:border-indigo-500 transition-all font-semibold"
              />
              <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
          </div>

          <Button
            type="submit"
            isLoading={isLoading}
            className="w-full py-3.5 rounded-2xl font-bold text-sm mt-2"
            style={{
              background: 'linear-gradient(135deg, #FF6632 0%, #FF8D3B 100%)',
              color: '#FFFFFF',
              boxShadow: '0 4px 16px rgba(255,102,50,0.30)',
            }}
          >
            دخول النظام
          </Button>
        </form>

        <div className="text-center">
          <p className="text-[10px] text-gray-500 font-semibold text-center">
            إذا لم يكن لديك حساب، يرجى مراجعة مدير النظام لإضافة حسابك وصلاحياتك.
          </p>
        </div>
      </div>
    </div>
  );
}
