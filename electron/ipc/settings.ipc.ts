import { ipcMain } from 'electron';
import type Store from 'electron-store';
import { createClient } from '@supabase/supabase-js';
import Twilio from 'twilio';
import ws from 'ws';

// تنظيف قيم الإعدادات من الاقتباسات الزائدة
const cleanValue = (val?: string): string => {
  if (!val) return '';
  return val.replace(/[”"']/g, '').trim();
};

export function setupSettingsIPC(store: Store) {
  // دالة مساعدة للحصول على عميل Supabase المحدث
  const getSupabaseClient = () => {
    const settings = store.get('apiSettings') as { supabase?: { url: string; anonKey: string } };
    const config = settings?.supabase;
    if (!config?.url || !config?.anonKey) {
      return null;
    }
    return createClient(config.url.replace(/[”"']/g, '').trim(), config.anonKey.replace(/[”"']/g, '').trim(), {
      auth: { persistSession: false },
      realtime: { transport: ws as any }
    });
  };

  // استرجاع الإعدادات المحفوظة
  ipcMain.handle('settings:get', async () => {
    const local = store.get('apiSettings', {
      supabase: { url: '', anonKey: '', serviceRoleKey: '' },
      twilio: { accountSid: '', authToken: '', whatsappNumber: '' },
      webhook: { port: 3001, secret: '', enabled: false },
      employees: [],
      quickReplies: [],
      activeEmployeeId: '',
    }) as any;

    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data: provider } = await supabase
          .from('whatsapp_providers')
          .select('*')
          .eq('type', 'twilio')
          .limit(1)
          .maybeSingle();

        if (provider) {
          local.twilio = {
            accountSid: provider.api_url || '',
            authToken: provider.api_key || '',
            whatsappNumber: provider.phone_number || '',
          };
          if (provider.config_json) {
            local.webhook = {
              port: provider.config_json.webhook_port || local.webhook?.port || 3001,
              secret: provider.config_json.webhook_secret || local.webhook?.secret || '',
              enabled: provider.config_json.webhook_enabled !== undefined ? provider.config_json.webhook_enabled : (local.webhook?.enabled || false),
            };
          }
        }
      }
    } catch (err) {
      console.error('Error fetching API settings from Supabase:', err);
    }

    return local;
  });

  // حفظ الإعدادات (محلياً وسحابياً)
  ipcMain.handle('settings:save', async (_, settings) => {
    if (!settings || typeof settings !== 'object') {
      return { success: false, error: 'بيانات غير صالحة' };
    }
    
    // تنظيف المفاتيح قبل الحفظ
    const cleaned = {
      supabase: {
        url: cleanValue((settings as any).supabase?.url),
        anonKey: cleanValue((settings as any).supabase?.anonKey),
        serviceRoleKey: cleanValue((settings as any).supabase?.serviceRoleKey),
      },
      twilio: {
        accountSid: cleanValue((settings as any).twilio?.accountSid),
        authToken: cleanValue((settings as any).twilio?.authToken),
        whatsappNumber: cleanValue((settings as any).twilio?.whatsappNumber),
      },
      webhook: {
        port: Number((settings as any).webhook?.port) || 3001,
        secret: cleanValue((settings as any).webhook?.secret),
        enabled: Boolean((settings as any).webhook?.enabled),
      },
      employees: Array.isArray((settings as any).employees) ? (settings as any).employees : [],
      quickReplies: Array.isArray((settings as any).quickReplies) ? (settings as any).quickReplies : [],
      activeEmployeeId: cleanValue((settings as any).activeEmployeeId),
    };

    // 1. حفظ الإعدادات محلياً
    store.set('apiSettings', cleaned);

    // 2. حفظ الإعدادات سحابياً في جدول whatsapp_providers
    try {
      if (cleaned.supabase.url && cleaned.supabase.anonKey) {
        const supabase = createClient(cleaned.supabase.url, cleaned.supabase.anonKey, {
          auth: { persistSession: false },
          realtime: { transport: ws as any }
        });
        const twilioData = {
          name: 'twilio',
          type: 'twilio',
          api_key: cleaned.twilio.authToken,
          api_url: cleaned.twilio.accountSid,
          phone_number: cleaned.twilio.whatsappNumber,
          is_active: true,
          config_json: {
            account_sid: cleaned.twilio.accountSid,
            from_number: cleaned.twilio.whatsappNumber,
            webhook_secret: cleaned.webhook.secret,
            webhook_port: cleaned.webhook.port,
            webhook_enabled: cleaned.webhook.enabled
          }
        };

        const { data: existing } = await supabase
          .from('whatsapp_providers')
          .select('id')
          .eq('type', 'twilio')
          .limit(1)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('whatsapp_providers')
            .update(twilioData)
            .eq('id', existing.id);
        } else {
          await supabase
            .from('whatsapp_providers')
            .insert(twilioData);
        }
      }
    } catch (err) {
      console.error('Error syncing API settings to Supabase:', err);
    }

    return { success: true, message: 'تم حفظ الإعدادات بنجاح وسحابياً' };
  });

  // ═══════════════════════════════════════════
  // فحص اتصال Supabase
  // ═══════════════════════════════════════════
  ipcMain.handle('test:supabase', async (_, config) => {
    const start = Date.now();
    try {
      const url = cleanValue(config?.url);
      const anonKey = cleanValue(config?.anonKey);

      if (!url || !anonKey) {
        return {
          status: 'failed',
          message: 'يرجى إدخال URL و Anon Key أولاً',
          latency: 0
        };
      }

      const client = createClient(url, anonKey, { realtime: { transport: ws as any } });

      // ✅ اختبار آمن — فقط SELECT بدون تعديل
      const { error } = await client
        .from('customers')
        .select('customer_id')
        .limit(1);

      const latency = Date.now() - start;

      // قائمة بالأكواد التي تدل على استجابة قاعدة البيانات (بما فيها الجداول غير الموجودة أو مشاكل الصلاحيات)
      const isConnected = !error || 
        error.code === '42P01' || 
        error.code === 'PGRST104' || 
        error.code === 'PGRST116' ||
        error.code === 'PGRST301';

      if (isConnected) {
        return {
          status: 'success',
          message: `✅ الاتصال بـ Supabase ناجح`,
          latency,
          projectUrl: url
        };
      }

      return {
        status: 'failed',
        message: `❌ فشل الاتصال: ${error.message}`,
        latency
      };

    } catch (err: unknown) {
      return {
        status: 'failed',
        message: `❌ خطأ في الشبكة: ${err instanceof Error ? err.message : 'خطأ غير معروف'}`,
        latency: Date.now() - start
      };
    }
  });

  // ═══════════════════════════════════════════
  // فحص اتصال Twilio
  // ═══════════════════════════════════════════
  ipcMain.handle('test:twilio', async (_, config) => {
    const start = Date.now();
    try {
      const accountSid = cleanValue(config?.accountSid);
      const authToken = cleanValue(config?.authToken);

      if (!accountSid || !authToken) {
        return {
          status: 'failed',
          message: 'يرجى إدخال Account SID و Auth Token',
          latency: 0
        };
      }

      const client = Twilio(accountSid, authToken);

      // اختبار بجلب معلومات الحساب
      const account = await client.api.accounts(accountSid).fetch();
      const latency = Date.now() - start;

      return {
        status: 'success',
        message: `✅ اتصال Twilio ناجح`,
        latency,
        accountName: account.friendlyName,
        accountStatus: account.status
      };

    } catch (err: unknown) {
      const latency = Date.now() - start;
      const errMsg = err instanceof Error ? err.message : 'خطأ غير معروف';

      if (errMsg.includes('Authentication')) {
        return {
          status: 'failed',
          message: '❌ بيانات Twilio غير صحيحة',
          latency
        };
      }

      return {
        status: 'failed',
        message: `❌ فشل الاتصال: ${errMsg}`,
        latency
      };
    }
  });

  // ═══════════════════════════════════════════
  // فحص Webhook Server
  // ═══════════════════════════════════════════
  ipcMain.handle('test:webhook', async () => {
    const start = Date.now();
    try {
      const settings = store.get('apiSettings') as { webhook?: { port: number } };
      const port = settings?.webhook?.port || 3001;

      const response = await fetch(`http://localhost:${port}/health`);
      const latency = Date.now() - start;

      if (response.ok) {
        return {
          status: 'success',
          message: `✅ Webhook Server يعمل على المنفذ ${port}`,
          latency
        };
      }

      return {
        status: 'failed',
        message: `❌ Webhook Server لا يستجيب بـ OK`,
        latency
      };
    } catch {
      return {
        status: 'failed',
        message: '❌ Webhook Server غير مشغّل — ابدأ Docker أو الخادم المحلي أولاً',
        latency: Date.now() - start
      };
    }
  });
}
