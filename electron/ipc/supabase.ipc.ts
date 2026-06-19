import { ipcMain } from 'electron';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type Store from 'electron-store';
import ws from 'ws';
import { enforcePermission } from './session';

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
            'x-basira-signature': 'basira-crm-secure-client-token-2024'
          },
        },
      });
    }

    return cachedClient;
  };

  // ✅ جلب جهات الاتصال (SELECT من جدول customers)
  ipcMain.handle('db:getContacts', async (_, filters) => {
    try {
      enforcePermission('send_messages');
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
      console.error('Error in db:getContacts handler:', err);
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
      enforcePermission('send_messages');
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

  // ✅ جلب بروفايل عميل كامل 360 درجة مع الإحصاءات والمنتجات المفضلة (SELECT)
  ipcMain.handle('db:getCustomerProfile', async (_, customerId) => {
    try {
      enforcePermission('send_messages');
      const client = getClient();

      // 1. جلب بيانات العميل الأساسية
      const { data: customer, error: custError } = await client
        .from('customers')
        .select('*')
        .eq('customer_id', customerId)
        .single();

      if (custError) throw custError;

      // 2. جلب فواتير العميل مع عناصر الفاتورة
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
        .eq('customer_id', customerId)
        .order('invoice_date', { ascending: false });

      if (invError) throw invError;

      // 3. حساب المؤشرات المالية في الميموري
      let totalSpent = 0;
      let totalOrders = 0;
      let lastPurchaseDate: string | undefined = undefined;

      const validInvoices = invoices || [];
      for (const inv of validInvoices) {
        if (inv.status !== 'canceled' && inv.status !== 'draft') {
          totalSpent += (inv.final_total || 0);
          totalOrders++;
          if (!lastPurchaseDate || new Date(inv.invoice_date) > new Date(lastPurchaseDate)) {
            lastPurchaseDate = inv.invoice_date;
          }
        }
      }

      const avgOrderValue = totalOrders > 0 ? (totalSpent / totalOrders) : 0;
      const daysSinceLastPurchase = lastPurchaseDate
        ? Math.floor((Date.now() - new Date(lastPurchaseDate).getTime()) / (1000 * 60 * 60 * 24))
        : undefined;

      // 4. تجميع المنتجات الأكثر شراءً وترتيبها تنازلياً
      const productMap: Record<string, { product_name: string; total_quantity: number; total_spent: number; times_ordered: number }> = {};

      for (const inv of validInvoices) {
        if (inv.status !== 'canceled' && inv.status !== 'draft') {
          for (const item of inv.invoice_items || []) {
            const pName = item.product_name || 'منتج غير معروف';
            if (!productMap[pName]) {
              productMap[pName] = {
                product_name: pName,
                total_quantity: 0,
                total_spent: 0,
                times_ordered: 0
              };
            }
            productMap[pName].total_quantity += (item.quantity || 0);
            productMap[pName].total_spent += (item.sub_total || 0);
            productMap[pName].times_ordered += 1;
          }
        }
      }

      const topProducts = Object.values(productMap).sort((a, b) => b.times_ordered - a.times_ordered);

      return {
        success: true,
        customer,
        invoices: validInvoices,
        totalSpent,
        totalOrders,
        avgOrderValue,
        lastPurchaseDate,
        daysSinceLastPurchase,
        topProducts
      };
    } catch (err) {
      console.error('Error in db:getCustomerProfile:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'فشل جلب ملف العميل الموحد',
        totalSpent: 0,
        totalOrders: 0,
        avgOrderValue: 0,
        invoices: [],
        topProducts: []
      };
    }
  });

  // ✅ جلب بيانات RFM للتحليل (SELECT من invoices مع invoice_items)
  ipcMain.handle('db:getRFMData', async (_, dateRange) => {
    try {
      enforcePermission('view_reports');
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
      enforcePermission('manage_settings');
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
      enforcePermission('manage_settings');
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
