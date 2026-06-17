import { create } from 'zustand';
import type { AppSettings, ConnectionTestResult, Employee } from '../types/settings.types';
import { updateSupabaseClient, supabase } from '../lib/supabase';

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
  supabase: {
    url: 'https://dtklpugpwejrjnkxdkhh.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0a2xwdWdwd2Vqcmpua3hka2hoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwOTg0OTEsImV4cCI6MjA3NzY3NDQ5MX0.ZUPzyPWPzZBabr3HjBtg08Fccm6Kq_hRd-9V8muk57Y',
    serviceRoleKey: ''
  },
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
        if (s.supabase?.url && s.supabase?.anonKey) {
          updateSupabaseClient(s.supabase.url, s.supabase.anonKey);
        }

        // Fetch employees from Supabase system_employees table
        let dbEmployees: Employee[] = [];
        if (s.supabase?.url && s.supabase?.anonKey && s.supabase.anonKey !== 'placeholder') {
          try {
            const { data, error } = await supabase
              .from('system_employees')
              .select('*')
              .order('created_at', { ascending: true });

            if (!error && data) {
              if (data.length === 0) {
                // Table is empty, seed it with local employees or DEFAULT_EMPLOYEES
                const localEmps = s.employees && s.employees.length > 0 ? s.employees : [
                  { id: '1', name: 'عمر البشير', username: 'omar', password: '123', role: 'admin', permissions: ['manage_settings', 'send_messages', 'view_reports', 'edit_invoices'] },
                  { id: '2', name: 'أحمد محمود', username: 'ahmed', password: '123', role: 'supervisor', permissions: ['send_messages', 'view_reports', 'edit_invoices'] },
                  { id: '3', name: 'مريم علي', username: 'maryam', password: '123', role: 'agent', permissions: ['send_messages'] },
                  { id: '4', name: 'خالد مصطفى', username: 'khaled', password: '123', role: 'agent', permissions: ['send_messages'] }
                ];
                
                // Insert into Supabase
                const rowsToInsert = localEmps.map(e => ({
                  id: e.id,
                  name: e.name,
                  username: (e as any).username || 'emp_' + e.id,
                  password: (e as any).password || '123',
                  role: e.role,
                  permissions: e.permissions
                }));
                
                await supabase.from('system_employees').insert(rowsToInsert);
                dbEmployees = localEmps.map(e => ({
                  id: e.id,
                  name: e.name,
                  username: (e as any).username || 'emp_' + e.id,
                  password: (e as any).password || '123',
                  role: e.role,
                  permissions: e.permissions
                }));
              } else {
                dbEmployees = data.map((e: any) => ({
                  id: e.id,
                  name: e.name,
                  username: e.username || '',
                  password: e.password || '',
                  role: e.role,
                  permissions: e.permissions || []
                }));
              }
            }
          } catch (e) {
            console.error('Failed to load/seed employees from Supabase:', e);
          }
        }

        const mergedSettings = {
          ...s,
          employees: dbEmployees.length > 0 ? dbEmployees : (s.employees || [])
        };

        set({ settings: mergedSettings, isLoading: false });
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
