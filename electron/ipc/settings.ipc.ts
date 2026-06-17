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
    const url = settings?.supabase?.url;
    const anonKey = settings?.supabase?.anonKey;

    if (!url || !anonKey || url.trim() === '' || anonKey.trim() === '' || anonKey === 'placeholder') {
      return null;
    }

    return createClient(url.replace(/[”"']/g, '').trim(), anonKey.replace(/[”"']/g, '').trim(), {
      auth: { persistSession: false },
      realtime: { transport: ws as any }
    });
  };

  // استرجاع الإعدادات المحفوظة
  ipcMain.handle('settings:get', async () => {
    const local = store.get('apiSettings', {
      supabase: { url: '', anonKey: '', serviceRoleKey: '' },
      twilio: { accountSid: '', authToken: '', whatsappNumber: '' },
      meta: { accessToken: '', phoneNumberId: '', whatsappNumber: '', verifyToken: '' },
      activeProvider: 'twilio',
      webhook: { port: 3001, secret: '', enabled: false },
      employees: [],
      quickReplies: [],
      activeEmployeeId: '',
      printSettings: {
        companyName: '',
        companyPhone: '',
        companyAddress: '',
        companyLogo: '',
        taxNumber: '',
        termsText: 'نشكركم لثقتكم في منتجاتنا 🌸',
        paperSize: 'A4',
        showLogo: true
      }
    }) as any;

    // تأكيد الاتصال التلقائي سحابياً كقيم افتراضية إذا كانت فارغة في ملف الإعدادات المحلي
    if (!local.supabase) {
      local.supabase = { url: '', anonKey: '', serviceRoleKey: '' };
    }
    if (!local.printSettings) {
      local.printSettings = {
        companyName: '',
        companyPhone: '',
        companyAddress: '',
        companyLogo: '',
        taxNumber: '',
        termsText: 'نشكركم لثقتكم في منتجاتنا 🌸',
        paperSize: 'A4',
        showLogo: true
      };
    }

    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data: providers } = await Promise.race([
          supabase
            .from('whatsapp_providers')
            .select('*'),
          new Promise<any>((_, reject) =>
            setTimeout(() => reject(new Error('Connection timeout')), 2500)
          )
        ]);

        if (providers && providers.length > 0) {
          const twilioProvider = providers.find((p: any) => p.type === 'twilio');
          const metaProvider = providers.find((p: any) => p.type === 'meta');

          if (twilioProvider) {
            local.twilio = {
              accountSid: twilioProvider.api_url || '',
              authToken: twilioProvider.api_key || '',
              whatsappNumber: twilioProvider.phone_number || '',
            };
            if (twilioProvider.is_active) {
              local.activeProvider = 'twilio';
            }
            if (twilioProvider.config_json) {
              local.webhook = {
                port: twilioProvider.config_json.webhook_port || local.webhook?.port || 3001,
                secret: twilioProvider.config_json.webhook_secret || local.webhook?.secret || '',
                enabled: twilioProvider.config_json.webhook_enabled !== undefined ? twilioProvider.config_json.webhook_enabled : (local.webhook?.enabled || false),
              };
            }
          }

          if (metaProvider) {
            local.meta = {
              accessToken: metaProvider.api_key || '',
              phoneNumberId: metaProvider.api_url || '',
              whatsappNumber: metaProvider.phone_number || '',
              verifyToken: metaProvider.config_json?.verify_token || '',
            };
            if (metaProvider.is_active) {
              local.activeProvider = 'meta';
            }
            if (metaProvider.config_json && !local.webhook?.secret) {
              local.webhook = {
                port: metaProvider.config_json.webhook_port || local.webhook?.port || 3001,
                secret: metaProvider.config_json.webhook_secret || local.webhook?.secret || '',
                enabled: metaProvider.config_json.webhook_enabled !== undefined ? metaProvider.config_json.webhook_enabled : (local.webhook?.enabled || false),
              };
            }
          }
        }

        // جلب إعدادات الطباعة سحابياً
        const { data: printSettingsData } = await Promise.race([
          supabase
            .from('print_settings')
            .select('*')
            .limit(1)
            .maybeSingle(),
          new Promise<any>((_, reject) =>
            setTimeout(() => reject(new Error('Connection timeout')), 2500)
          )
        ]);

        if (printSettingsData) {
          local.printSettings = {
            companyName: printSettingsData.company_name || '',
            companyPhone: printSettingsData.company_phone || '',
            companyAddress: printSettingsData.company_address || '',
            companyLogo: printSettingsData.logo_url || '',
            taxNumber: printSettingsData.tax_number || '',
            termsText: printSettingsData.terms_text || '',
            paperSize: printSettingsData.paper_size || 'A4',
            showLogo: printSettingsData.show_logo !== undefined ? printSettingsData.show_logo : true
          };
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
      meta: {
        accessToken: cleanValue((settings as any).meta?.accessToken),
        phoneNumberId: cleanValue((settings as any).meta?.phoneNumberId),
        whatsappNumber: cleanValue((settings as any).meta?.whatsappNumber),
        verifyToken: cleanValue((settings as any).meta?.verifyToken),
      },
      activeProvider: (settings as any).activeProvider || 'twilio',
      webhook: {
        port: Number((settings as any).webhook?.port) || 3001,
        secret: cleanValue((settings as any).webhook?.secret),
        enabled: Boolean((settings as any).webhook?.enabled),
      },
      employees: Array.isArray((settings as any).employees) ? (settings as any).employees : [],
      quickReplies: Array.isArray((settings as any).quickReplies) ? (settings as any).quickReplies : [],
      activeEmployeeId: cleanValue((settings as any).activeEmployeeId),
      printSettings: {
        companyName: cleanValue((settings as any).printSettings?.companyName),
        companyPhone: cleanValue((settings as any).printSettings?.companyPhone),
        companyAddress: cleanValue((settings as any).printSettings?.companyAddress),
        companyLogo: (settings as any).printSettings?.companyLogo || '',
        taxNumber: cleanValue((settings as any).printSettings?.taxNumber),
        termsText: cleanValue((settings as any).printSettings?.termsText),
        paperSize: (settings as any).printSettings?.paperSize || 'A4',
        showLogo: (settings as any).printSettings?.showLogo !== undefined ? Boolean((settings as any).printSettings?.showLogo) : true
      }
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
        
        // Twilio Data
        const twilioData = {
          name: 'twilio',
          type: 'twilio',
          api_key: cleaned.twilio.authToken,
          api_url: cleaned.twilio.accountSid,
          phone_number: cleaned.twilio.whatsappNumber,
          is_active: cleaned.activeProvider === 'twilio',
          config_json: {
            account_sid: cleaned.twilio.accountSid,
            from_number: cleaned.twilio.whatsappNumber,
            webhook_secret: cleaned.webhook.secret,
            webhook_port: cleaned.webhook.port,
            webhook_enabled: cleaned.webhook.enabled
          }
        };

        const { data: existingTwilio } = await supabase
          .from('whatsapp_providers')
          .select('id')
          .eq('type', 'twilio')
          .limit(1)
          .maybeSingle();

        if (existingTwilio) {
          await supabase
            .from('whatsapp_providers')
            .update(twilioData)
            .eq('id', existingTwilio.id);
        } else {
          await supabase
            .from('whatsapp_providers')
            .insert(twilioData);
        }

        // Meta Data
        const metaData = {
          name: 'meta',
          type: 'meta',
          api_key: cleaned.meta.accessToken,
          api_url: cleaned.meta.phoneNumberId,
          phone_number: cleaned.meta.whatsappNumber,
          is_active: cleaned.activeProvider === 'meta',
          config_json: {
            phone_number_id: cleaned.meta.phoneNumberId,
            verify_token: cleaned.meta.verifyToken,
            webhook_secret: cleaned.webhook.secret,
            webhook_port: cleaned.webhook.port,
            webhook_enabled: cleaned.webhook.enabled
          }
        };

        const { data: existingMeta } = await supabase
          .from('whatsapp_providers')
          .select('id')
          .eq('type', 'meta')
          .limit(1)
          .maybeSingle();

        if (existingMeta) {
          await supabase
            .from('whatsapp_providers')
            .update(metaData)
            .eq('id', existingMeta.id);
        } else {
          await supabase
            .from('whatsapp_providers')
            .insert(metaData);
        }

        // 3. حفظ إعدادات الطباعة سحابياً
        if (cleaned.printSettings) {
          const printData = {
            company_name: cleaned.printSettings.companyName,
            company_phone: cleaned.printSettings.companyPhone,
            company_address: cleaned.printSettings.companyAddress,
            logo_url: cleaned.printSettings.companyLogo,
            tax_number: cleaned.printSettings.taxNumber,
            terms_text: cleaned.printSettings.termsText,
            paper_size: cleaned.printSettings.paperSize,
            show_logo: cleaned.printSettings.showLogo,
            updated_at: new Date().toISOString()
          };

          const { data: existingPrint } = await supabase
            .from('print_settings')
            .select('id')
            .limit(1)
            .maybeSingle();

          if (existingPrint) {
            await supabase
              .from('print_settings')
              .update(printData)
              .eq('id', existingPrint.id);
          } else {
            await supabase
              .from('print_settings')
              .insert(printData);
          }
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
  // فحص اتصال Meta WhatsApp Cloud API
  // ═══════════════════════════════════════════
  ipcMain.handle('test:meta', async (_, config) => {
    const start = Date.now();
    try {
      const accessToken = cleanValue(config?.accessToken);
      const phoneNumberId = cleanValue(config?.phoneNumberId);

      if (!accessToken || !phoneNumberId) {
        return {
          status: 'failed',
          message: 'يرجى إدخال Access Token و Phone Number ID',
          latency: 0
        };
      }

      const response = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      const latency = Date.now() - start;

      if (response.ok) {
        const data = await response.json();
        return {
          status: 'success',
          message: `✅ اتصال Meta Cloud API ناجح. الهاتف: ${data.display_phone_number || phoneNumberId}`,
          latency
        };
      } else {
        const errData = await response.json().catch(() => ({}));
        const errDetail = errData?.error?.message || `كود الخطأ: ${response.status}`;
        return {
          status: 'failed',
          message: `❌ فشل الاتصال بـ Meta: ${errDetail}`,
          latency
        };
      }
    } catch (err: unknown) {
      return {
        status: 'failed',
        message: `❌ خطأ في الاتصال بالشبكة: ${err instanceof Error ? err.message : 'خطأ غير معروف'}`,
        latency: Date.now() - start
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
