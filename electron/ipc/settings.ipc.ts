import { ipcMain } from 'electron';
import type Store from 'electron-store';
import { createClient } from '@supabase/supabase-js';
import Twilio from 'twilio';

// تنظيف قيم الإعدادات من الاقتباسات الزائدة
const cleanValue = (val?: string): string => {
  if (!val) return '';
  return val.replace(/[”"']/g, '').trim();
};

export function setupSettingsIPC(store: Store) {
  // استرجاع الإعدادات المحفوظة
  ipcMain.handle('settings:get', async () => {
    return store.get('apiSettings', {
      supabase: { url: '', anonKey: '', serviceRoleKey: '' },
      twilio: { accountSid: '', authToken: '', whatsappNumber: '' },
      webhook: { port: 3001, secret: '', enabled: false },
    });
  });

  // حفظ الإعدادات (محلياً — مشفرة)
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
      }
    };

    store.set('apiSettings', cleaned);
    return { success: true, message: 'تم حفظ الإعدادات بنجاح' };
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

      const client = createClient(url, anonKey);

      // ✅ اختبار آمن — فقط SELECT بدون تعديل
      const { error } = await client
        .from('_test_connection_dummy_')
        .select('count')
        .limit(1);

      const latency = Date.now() - start;

      // حتى لو الجدول غير موجود، الاتصال نجح لأن الخادم استجاب
      if (error?.code === '42P01' || !error) {
        return {
          status: 'success',
          message: `✅ الاتصال بـ Supabase ناجح`,
          latency,
          projectUrl: url
        };
      }

      if (error?.code === 'PGRST116') {
        return {
          status: 'success',
          message: `✅ الاتصال ناجح (${latency}ms)`,
          latency
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
