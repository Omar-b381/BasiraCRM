import { ipcMain } from 'electron';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type Store from 'electron-store';
import ws from 'ws';

// ╔══════════════════════════════════════════════════════════════╗
// ║  ⚠️ SUPABASE IPC HANDLER                                      ║
// ║  هذا الملف يحتوي على الاستعلامات المناسبة للجداول الفعلية     ║
// ║  customers, invoices, invoice_items, conversations, messages ║
// ╚══════════════════════════════════════════════════════════════╝

interface SupabaseConfig {
  url: string;
  anonKey: string;
}

let cachedClient: SupabaseClient | null = null;
let lastUrl = '';
let lastAnonKey = '';

export function setupSupabaseIPC(store: Store) {
  const getClient = (): SupabaseClient => {
    const settings = store.get('apiSettings') as { supabase?: SupabaseConfig };
    const config = settings?.supabase;

    if (!config?.url || !config?.anonKey) {
      throw new Error('إعدادات Supabase غير مكتملة — اذهب للإعدادات أولاً');
    }

    const cleanUrl = config.url.replace(/[”"']/g, '').trim();
    const cleanKey = config.anonKey.replace(/[”"']/g, '').trim();

    // إعادة استخدام العميل إذا لم تتغير الإعدادات
    if (!cachedClient || cleanUrl !== lastUrl || cleanKey !== lastAnonKey) {
      lastUrl = cleanUrl;
      lastAnonKey = cleanKey;
      cachedClient = createClient(cleanUrl, cleanKey, {
        auth: { persistSession: false },
        realtime: { transport: ws as any },
        global: {
          headers: {
            'X-Client-Info': 'arabic-crm/1.0.0',
          },
        },
      });
    }

    return cachedClient;
  };

  // ✅ جلب جهات الاتصال (SELECT من جدول customers)
  ipcMain.handle('db:getContacts', async (_, filters) => {
    try {
      const client = getClient();

      let query = client
        .from('customers')
        .select(`
          *,
          invoices (
            final_total,
            status
          )
        `)
        .order('created_at', { ascending: false });

      if (filters?.search) {
        // البحث بالاسم أو رقم الهاتف
        query = query.or(`name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) throw error;

      return { success: true, data: data || [] };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'فشل جلب جهات الاتصال',
        data: []
      };
    }
  });

  // ✅ جلب تفاصيل عميل بالـ ID مع فواتيره (SELECT)
  ipcMain.handle('db:getContactById', async (_, id) => {
    try {
      const client = getClient();

      // جلب بيانات العميل
      const { data: customer, error: custError } = await client
        .from('customers')
        .select('*')
        .eq('customer_id', id)
        .single();

      if (custError) throw custError;

      // جلب فواتير العميل منضمّاً مع عناصر الفاتورة
      const { data: invoices, error: invError } = await client
        .from('invoices')
        .select(`
          invoice_id,
          invoice_date,
          sub_total,
          discount_amount,
          final_total,
          shipping_cost,
          status,
          notes,
          invoice_items (
            item_id,
            product_name,
            details,
            sub_total,
            quantity,
            variant_name
          )
        `)
        .eq('customer_id', id)
        .order('invoice_date', { ascending: false });

      if (invError) throw invError;

      return { success: true, customer, invoices: invoices || [] };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'فشل جلب تفاصيل العميل'
      };
    }
  });

  // ✅ جلب بيانات RFM للتحليل (SELECT من invoices مع invoice_items)
  ipcMain.handle('db:getRFMData', async (_, dateRange) => {
    try {
      const client = getClient();

      const fromDate = dateRange?.from || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
      const toDate = dateRange?.to || new Date().toISOString();

      const { data, error } = await client
        .from('invoices')
        .select(`
          invoice_id,
          customer_id,
          customer_name,
          invoice_date,
          final_total,
          status,
          invoice_items (
            product_name,
            quantity,
            variant_name
          ),
          customers (
            customer_id,
            name,
            phone
          )
        `)
        .gte('invoice_date', fromDate)
        .lte('invoice_date', toDate)
        .order('invoice_date', { ascending: false });

      if (error) throw error;

      return { success: true, data: data || [] };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'فشل جلب بيانات RFM',
        data: []
      };
    }
  });

  // ✅ جلب مزودي خدمة واتساب من الجدول
  ipcMain.handle('db:getProviders', async () => {
    try {
      const client = getClient();
      const { data, error } = await client
        .from('whatsapp_providers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'فشل جلب مزودي الخدمة'
      };
    }
  });

  // ✅ حفظ أو تحديث إعدادات مزود الخدمة
  ipcMain.handle('db:saveProvider', async (_, provider) => {
    try {
      const client = getClient();
      const { id, ...updateData } = provider;

      // تحديث كل المزوّدين ليكونوا غير فعالين إذا كان هذا فعالاً
      if (updateData.is_active) {
        await client
          .from('whatsapp_providers')
          .update({ is_active: false })
          .neq('id', id);
      }

      const { data, error } = await client
        .from('whatsapp_providers')
        .update(updateData)
        .eq('id', id)
        .select();

      if (error) throw error;
      return { success: true, data: data?.[0] };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'فشل حفظ مزود الخدمة'
      };
    }
  });
}
