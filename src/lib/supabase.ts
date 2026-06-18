import { createClient, SupabaseClient } from '@supabase/supabase-js';

// تنظيف الرموز الزائدة مثل الاقتباس الذكي الذى قد يوجد فى ملف .env
const cleanEnvVar = (val?: string): string => {
  if (!val) return '';
  return val.replace(/[”"']/g, '').trim();
};

const defaultUrl = cleanEnvVar((import.meta as any).env.VITE_SUPABASE_URL) || 'https://placeholder.supabase.co';
const defaultAnonKey = cleanEnvVar((import.meta as any).env.VITE_SUPABASE_ANON_KEY) || 'placeholder';

let activeUrl = defaultUrl;
let activeKey = defaultAnonKey;
let activeClient = createClient(defaultUrl, defaultAnonKey, {
  global: {
    headers: {
      'x-basira-signature': 'basira-crm-secure-client-token-2024'
    }
  }
});

export const updateSupabaseClient = (url: string, anonKey: string) => {
  const cleanUrl = cleanEnvVar(url);
  const cleanKey = cleanEnvVar(anonKey);
  if (cleanUrl && cleanKey && cleanKey !== 'placeholder') {
    // منع إعادة إنشاء العميل إذا كانت القيم متطابقة لتجنب تحذيرات GoTrueClient المتعددة
    if (cleanUrl === activeUrl && cleanKey === activeKey) {
      return;
    }
    activeUrl = cleanUrl;
    activeKey = cleanKey;
    activeClient = createClient(cleanUrl, cleanKey, {
      global: {
        headers: {
          'x-basira-signature': 'basira-crm-secure-client-token-2024'
        }
      }
    });
  }
};

// Proxy to allow dynamic redirection of calls to the active client
export const supabase = new Proxy({} as SupabaseClient, {
  get(target, prop, receiver) {
    return Reflect.get(activeClient, prop, receiver);
  }
});
