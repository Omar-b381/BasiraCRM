import { create } from 'zustand';
import type { AppSettings, ConnectionTestResult } from '../types/settings.types';
import { updateSupabaseClient } from '../lib/supabase';

interface SettingsState {
  settings: AppSettings;
  isLoading: boolean;
  saveStatus: 'idle' | 'saving' | 'success' | 'failed';
  errorMessage: string | null;
  fetchSettings: () => Promise<void>;
  saveSettings: (settings: AppSettings) => Promise<boolean>;
  testSupabase: (config: AppSettings['supabase']) => Promise<ConnectionTestResult>;
  testTwilio: (config: AppSettings['twilio']) => Promise<ConnectionTestResult>;
  testMeta: (config: AppSettings['meta']) => Promise<ConnectionTestResult>;
  testWebhook: () => Promise<ConnectionTestResult>;
}

const defaultSettings: AppSettings = {
  supabase: { url: '', anonKey: '', serviceRoleKey: '' },
  twilio: { accountSid: '', authToken: '', whatsappNumber: '' },
  meta: { accessToken: '', phoneNumberId: '', whatsappNumber: '', verifyToken: '' },
  activeProvider: 'twilio',
  webhook: { port: 3001, secret: '', enabled: false },
};

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: defaultSettings,
  isLoading: false,
  saveStatus: 'idle',
  errorMessage: null,

  fetchSettings: async () => {
    set({ isLoading: true });
    try {
      const s = await window.electronAPI.settings.get();
      if (s) {
        set({ settings: s, isLoading: false });
        if (s.supabase?.url && s.supabase?.anonKey) {
          updateSupabaseClient(s.supabase.url, s.supabase.anonKey);
        }
      } else {
        set({ isLoading: false });
      }
    } catch (err) {
      set({ errorMessage: 'فشل تحميل الإعدادات', isLoading: false });
    }
  },

  saveSettings: async (settings) => {
    set({ saveStatus: 'saving' });
    try {
      const res = await window.electronAPI.settings.save(settings);
      if (res.success) {
        set({ settings, saveStatus: 'success' });
        if (settings.supabase?.url && settings.supabase?.anonKey) {
          updateSupabaseClient(settings.supabase.url, settings.supabase.anonKey);
        }
        setTimeout(() => set({ saveStatus: 'idle' }), 3000);
        return true;
      } else {
        set({ saveStatus: 'failed', errorMessage: res.error || 'فشل الحفظ' });
        return false;
      }
    } catch (err) {
      set({ saveStatus: 'failed', errorMessage: 'خطأ غير متوقع أثناء الحفظ' });
      return false;
    }
  },

  testSupabase: async (config) => {
    return window.electronAPI.testConnection.supabase(config);
  },

  testTwilio: async (config) => {
    return window.electronAPI.testConnection.twilio(config);
  },

  testMeta: async (config) => {
    return window.electronAPI.testConnection.meta(config);
  },

  testWebhook: async () => {
    return window.electronAPI.testConnection.webhook();
  },
}));
