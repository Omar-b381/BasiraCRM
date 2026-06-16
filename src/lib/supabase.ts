import { createClient, SupabaseClient } from '@supabase/supabase-js';

// تنظيف الرموز الزائدة مثل الاقتباس الذكي الذى قد يوجد فى ملف .env
const cleanEnvVar = (val?: string): string => {
  if (!val) return '';
  return val.replace(/[”"']/g, '').trim();
};

const defaultUrl = cleanEnvVar((import.meta as any).env.VITE_SUPABASE_URL) || 'https://dtklpugpwejrjnkxdkhh.supabase.co';
const defaultAnonKey = cleanEnvVar((import.meta as any).env.VITE_SUPABASE_ANON_KEY) || 'placeholder';

let activeClient = createClient(defaultUrl, defaultAnonKey);

export const updateSupabaseClient = (url: string, anonKey: string) => {
  const cleanUrl = cleanEnvVar(url);
  const cleanKey = cleanEnvVar(anonKey);
  if (cleanUrl && cleanKey && cleanKey !== 'placeholder') {
    activeClient = createClient(cleanUrl, cleanKey);
  }
};

// Proxy to allow dynamic redirection of calls to the active client
export const supabase = new Proxy({} as SupabaseClient, {
  get(target, prop, receiver) {
    return Reflect.get(activeClient, prop, receiver);
  }
});
