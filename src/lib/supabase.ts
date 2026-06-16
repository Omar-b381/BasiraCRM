import { createClient } from '@supabase/supabase-js';

// تنظيف الرموز الزائدة مثل الاقتباس الذكي الذى قد يوجد فى ملف .env
const cleanEnvVar = (val?: string): string => {
  if (!val) return '';
  return val.replace(/[”"']/g, '').trim();
};

const supabaseUrl = cleanEnvVar((import.meta as any).env.VITE_SUPABASE_URL);
const supabaseAnonKey = cleanEnvVar((import.meta as any).env.VITE_SUPABASE_ANON_KEY);

export const supabase = createClient(
  supabaseUrl || 'https://dtklpugpwejrjnkxdkhh.supabase.co',
  supabaseAnonKey || 'placeholder'
);
