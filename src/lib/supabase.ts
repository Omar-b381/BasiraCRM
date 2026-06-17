import { createClient, SupabaseClient } from '@supabase/supabase-js';

// تنظيف الرموز الزائدة مثل الاقتباس الذكي الذى قد يوجد فى ملف .env
const cleanEnvVar = (val?: string): string => {
  if (!val) return '';
  return val.replace(/[”"']/g, '').trim();
};

const defaultUrl = cleanEnvVar((import.meta as any).env.VITE_SUPABASE_URL) || 'https://dtklpugpwejrjnkxdkhh.supabase.co';
const defaultAnonKey = cleanEnvVar((import.meta as any).env.VITE_SUPABASE_ANON_KEY) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0a2xwdWdwd2Vqcmpua3hka2hoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwOTg0OTEsImV4cCI6MjA3NzY3NDQ5MX0.ZUPzyPWPzZBabr3HjBtg08Fccm6Kq_hRd-9V8muk57Y';

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
