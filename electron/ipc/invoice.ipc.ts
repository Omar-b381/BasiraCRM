import { ipcMain, BrowserWindow, dialog } from 'electron';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type Store from 'electron-store';
import path from 'path';
import os from 'os';
import fs from 'fs';
import ws from 'ws';
import { buildInvoiceHtml } from '../pdf/invoiceHtmlBuilder';
import type { InvoiceDraft } from '../../src/types/invoice.types';

// ╔══════════════════════════════════════════════════════════════╗
// ║  ⚠️ عمليات DB المسموحة هنا فقط:                              ║
// ║  SELECT من customers / invoices / invoice_items               ║
// ║  INSERT في invoices / invoice_items (فاتورة جديدة)            ║
// ║  UPDATE على invoices (الحالة/الملاحظات فقط لفاتورة موجودة)    ║
// ║  ❌ أي عملية أخرى يجب رفضها وإبلاغ المستخدم                  ║
// ╚══════════════════════════════════════════════════════════════╝

interface SupabaseConfig {
  url: string;
  anonKey: string;
}

let cachedClient: SupabaseClient | null = null;
let lastUrl = '';
let lastAnonKey = '';

export function setupInvoiceIPC(store: Store) {
  const getClient = (): SupabaseClient => {
    const settings = store.get('apiSettings') as { supabase?: SupabaseConfig };
    const config = settings?.supabase;
    if (!config?.url || !config?.anonKey) {
      throw new Error('إعدادات Supabase غير مكتملة — اذهب إلى الإعدادات أولاً');
    }
    const cleanUrl = config.url.replace(/[”"']/g, '').trim();
    const cleanKey = config.anonKey.replace(/[”"']/g, '').trim();

    if (!cachedClient || cleanUrl !== lastUrl || cleanKey !== lastAnonKey) {
      lastUrl = cleanUrl;
      lastAnonKey = cleanKey;
      cachedClient = createClient(cleanUrl, cleanKey, {
        auth: { persistSession: false },
        realtime: { transport: ws as any },
      });
    }
    return cachedClient;
  };

  // ═══════════════════════════════════════════
  // ✅ بحث عن عميل بالاسم أو الهاتف (SELECT فقط)
  // ═══════════════════════════════════════════
  ipcMain.handle('invoice:searchCustomer', async (_, query: string) => {
    try {
      const client = getClient();
      const { data, error } = await client
        .from('customers')
        .select('customer_id, name, phone, address, customer_phone_2')
        .or(`name.ilike.%${query}%,phone.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'فشل البحث عن العميل',
        data: [],
      };
    }
  });

  // ═══════════════════════════════════════════
  // ✅ حفظ فاتورة جديدة (INSERT فقط — لا UPDATE لجداول أخرى)
  // ═══════════════════════════════════════════
  ipcMain.handle('invoice:create', async (_, draft: InvoiceDraft) => {
    try {
      const client = getClient();

      // الخطوة 1: إدراج الفاتورة الرئيسية
      const { data: invoiceData, error: invoiceError } = await client
        .from('invoices')
        .insert({
          customer_id: draft.customer_id || null,
          customer_name: draft.customer_name,
          customer_phone: draft.customer_phone,
          customer_phone_2: draft.customer_phone_2 || null,
          customer_address: draft.customer_address || null,
          invoice_date: draft.invoice_date,
          sub_total: draft.sub_total,
          discount_amount: draft.discount_amount,
          final_total: draft.final_total,
          shipping_cost: draft.shipping_cost,
          status: draft.status,
          notes: draft.notes || null,
        })
        .select('invoice_id')
        .single();

      if (invoiceError) throw invoiceError;
      const newInvoiceId = invoiceData.invoice_id;

      // الخطوة 2: إدراج بنود الفاتورة (INSERT في invoice_items)
      const itemsPayload = draft.items.map((item) => ({
        invoice_id: newInvoiceId,
        product_name: item.product_name,
        details: item.details || null,
        sub_total: item.sub_total,
        quantity: item.quantity,
        variant_name: item.variant_name || '',
      }));

      const { error: itemsError } = await client
        .from('invoice_items')
        .insert(itemsPayload);

      if (itemsError) {
        // ⚠️ في حالة فشل البنود، نُبلغ المستخدم — لا نحذف الفاتورة تلقائياً
        // (لأن DELETE غير مسموح بدون تأكيد صريح من المستخدم)
        return {
          success: false,
          error: `تم إنشاء الفاتورة رقم ${newInvoiceId} لكن فشل حفظ البنود: ${itemsError.message}. يرجى مراجعة الفاتورة يدوياً.`,
          partialInvoiceId: newInvoiceId,
        };
      }

      return { success: true, invoiceId: newInvoiceId };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'فشل حفظ الفاتورة',
      };
    }
  });

  // ═══════════════════════════════════════════
  // ✅ جلب فاتورة محفوظة مع بنودها (SELECT فقط)
  // ═══════════════════════════════════════════
  ipcMain.handle('invoice:getById', async (_, invoiceId: number) => {
    try {
      const client = getClient();

      const { data: invoice, error: invoiceError } = await client
        .from('invoices')
        .select('*')
        .eq('invoice_id', invoiceId)
        .single();

      if (invoiceError) throw invoiceError;

      const { data: items, error: itemsError } = await client
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoiceId);

      if (itemsError) throw itemsError;

      return { success: true, data: { ...invoice, items: items || [] } };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'فشل جلب الفاتورة',
      };
    }
  });

  // ═══════════════════════════════════════════
  // ✅ تحديث حالة وملاحظات الفاتورة (UPDATE فقط)
  // ═══════════════════════════════════════════
  // ═══════════════════════════════════════════
  // ✅ تحديث فاتورة (UPDATE محكوم + INSERT/DELETE للبنود + دعم التوافقية الرجعية)
  // ═══════════════════════════════════════════
  ipcMain.handle('invoice:update', async (_, payload: any) => {
    try {
      const client = getClient();

      // التحقق من توافقية البايلود القديم { invoiceId, status, notes }
      if (payload && 'invoiceId' in payload && !('invoice_id' in payload)) {
        const { invoiceId, status, notes } = payload;
        if (!invoiceId || typeof invoiceId !== 'number') {
          return { success: false, error: 'رقم الفاتورة غير صالح' };
        }
        const { error } = await client
          .from('invoices')
          .update({ status, notes })
          .eq('invoice_id', invoiceId);

        if (error) throw error;
        return { success: true };
      }

      // التحقق الصارم من البايلود الجديد
      if (!payload || !payload.invoice_id || typeof payload.invoice_id !== 'number') {
        return { success: false, error: 'رقم الفاتورة غير صالح — تم رفض العملية' };
      }

      const results: { step: string; error?: string }[] = [];

      // الخطوة 1: حذف البنود المحددة (DELETE بـ item_id محدد فقط)
      if (payload.itemIdsToDelete && payload.itemIdsToDelete.length > 0) {
        const { error: deleteError } = await client
          .from('invoice_items')
          .delete()
          .in('item_id', payload.itemIdsToDelete)
          .eq('invoice_id', payload.invoice_id); // ⚠️ حماية إضافية — البند يجب أن ينتمي لهذه الفاتورة

        if (deleteError) {
          results.push({ step: 'حذف البنود', error: deleteError.message });
        }
      }

      // الخطوة 2: تحديث البنود المعدّلة (UPDATE واحد لكل بند، بـ item_id محدد)
      if (payload.itemsToUpdate && payload.itemsToUpdate.length > 0) {
        for (const item of payload.itemsToUpdate) {
          const { error: updateError } = await client
            .from('invoice_items')
            .update({
              product_name: item.product_name,
              variant_name: item.variant_name,
              quantity: item.quantity,
              sub_total: item.sub_total,
              details: item.details,
            })
            .eq('item_id', item.item_id)
            .eq('invoice_id', payload.invoice_id); // ⚠️ حماية إضافية

          if (updateError) {
            results.push({ step: `تحديث البند ${item.item_id}`, error: updateError.message });
          }
        }
      }

      // الخطوة 3: إدراج البنود الجديدة (INSERT)
      if (payload.itemsToCreate && payload.itemsToCreate.length > 0) {
        const { error: insertError } = await client
          .from('invoice_items')
          .insert(
            payload.itemsToCreate.map((item: any) => ({
              invoice_id: payload.invoice_id,
              product_name: item.product_name,
              variant_name: item.variant_name,
              quantity: item.quantity,
              sub_total: item.sub_total,
              details: item.details,
            }))
          );

        if (insertError) {
          results.push({ step: 'إضافة بنود جديدة', error: insertError.message });
        }
      }

      // إذا فشلت أي خطوة من خطوات البنود، أبلغ المستخدم قبل تحديث الفاتورة الرئيسية
      const failedSteps = results.filter((r) => r.error);
      if (failedSteps.length > 0) {
        return {
          success: false,
          error: `فشلت بعض العمليات: ${failedSteps.map((s) => `${s.step} (${s.error})`).join(' | ')}`,
          partialFailure: true,
        };
      }

      // الخطوة 4: تحديث الفاتورة الرئيسية (UPDATE بـ invoice_id محدد فقط)
      const { error: invoiceUpdateError } = await client
        .from('invoices')
        .update({
          customer_phone: payload.customer_phone,
          customer_phone_2: payload.customer_phone_2,
          customer_address: payload.customer_address,
          discount_amount: payload.discount_amount,
          shipping_cost: payload.shipping_cost,
          sub_total: payload.sub_total,
          final_total: payload.final_total,
          notes: payload.notes,
          status: payload.status,
        })
        .eq('invoice_id', payload.invoice_id);

      if (invoiceUpdateError) throw invoiceUpdateError;

      // الخطوة 5 (اختيارية): مزامنة بيانات العميل الأصلي في customers
      if (payload.syncCustomerProfile && payload.customer_id) {
        const { error: customerUpdateError } = await client
          .from('customers')
          .update({
            phone: payload.customer_phone,
            customer_phone_2: payload.customer_phone_2,
            address: payload.customer_address,
          })
          .eq('customer_id', payload.customer_id); // ⚠️ شرط محدد على customer_id

        if (customerUpdateError) {
          return {
            success: true, // الفاتورة نفسها تحدّثت بنجاح
            warning: `تم تحديث الفاتورة لكن فشلت مزامنة ملف العميل: ${customerUpdateError.message}`,
          };
        }
      }

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'فشل تحديث الفاتورة',
      };
    }
  });

  // ═══════════════════════════════════════════
  // ✅ إلغاء فاتورة (UPDATE status فقط — لا حذف نهائي)
  // ═══════════════════════════════════════════
  ipcMain.handle('invoice:cancel', async (_, invoiceId: number, reason?: string) => {
    try {
      if (!invoiceId || typeof invoiceId !== 'number') {
        return { success: false, error: 'رقم الفاتورة غير صالح' };
      }

      const client = getClient();
      const { error } = await client
        .from('invoices')
        .update({
          status: 'ملغاة',
          notes: reason ? `[ملغاة] ${reason}` : undefined,
        })
        .eq('invoice_id', invoiceId);

      if (error) throw error;
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'فشل إلغاء الفاتورة',
      };
    }
  });

  // ═══════════════════════════════════════════
  // ✅ بحث عن فواتير سابقة (لإعادة الطباعة) — SELECT فقط
  // ═══════════════════════════════════════════
  ipcMain.handle('invoice:search', async (_, query: string) => {
    try {
      const client = getClient();
      const isNum = !isNaN(Number(query.trim())) && query.trim() !== '';
      const numVal = isNum ? Number(query.trim()) : 0;

      let q = client
        .from('invoices')
        .select('invoice_id, customer_name, customer_phone, invoice_date, final_total, status');

      if (isNum) {
        q = q.eq('invoice_id', numVal);
      } else {
        q = q.or(`customer_name.ilike.%${query}%,customer_phone.ilike.%${query}%`);
      }

      const { data, error } = await q
        .order('invoice_date', { ascending: false })
        .limit(20);

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'فشل البحث عن الفواتير',
        data: [],
      };
    }
  });

  // ═══════════════════════════════════════════
  // 🖨️ توليد PDF وحفظه على القرص (Electron printToPDF)
  // ═══════════════════════════════════════════
  ipcMain.handle('invoice:generatePdf', async (_, invoiceData) => {
    let pdfWindow: BrowserWindow | null = null;
    try {
      const html = buildInvoiceHtml(invoiceData);

      // نافذة خفية مخصصة للطباعة فقط
      pdfWindow = new BrowserWindow({
        show: false,
        webPreferences: { offscreen: true },
      });

      await pdfWindow.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(html)}`);

      const pdfBuffer = await pdfWindow.webContents.printToPDF({
        printBackground: true,
        pageSize: 'A4',
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        landscape: false,
      });

      pdfWindow.close();
      pdfWindow = null;

      // اختيار مسار الحفظ من المستخدم
      const { filePath, canceled } = await dialog.showSaveDialog({
        title: 'حفظ الفاتورة كـ PDF',
        defaultPath: path.join(
          os.homedir(),
          'Desktop',
          `فاتورة-${invoiceData.invoice_id}.pdf`
        ),
        filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
      });

      if (canceled || !filePath) {
        return { success: false, error: 'تم إلغاء الحفظ' };
      }

      fs.writeFileSync(filePath, pdfBuffer);

      return { success: true, filePath };
    } catch (err) {
      if (pdfWindow) {
        try { pdfWindow.close(); } catch {}
      }
      return {
        success: false,
        error: err instanceof Error ? err.message : 'فشل توليد PDF',
      };
    }
  });

  // ═══════════════════════════════════════════
  // 🖨️ طباعة مباشرة (بدون حفظ)
  // ═══════════════════════════════════════════
  ipcMain.handle('invoice:printDirect', async (_, invoiceData) => {
    let printWindow: BrowserWindow | null = null;
    try {
      const html = buildInvoiceHtml(invoiceData);

      printWindow = new BrowserWindow({ show: false });
      await printWindow.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(html)}`);

      return new Promise((resolve) => {
        if (!printWindow) {
          resolve({ success: false, error: 'فشل تهيئة نافذة الطباعة' });
          return;
        }
        printWindow.webContents.print(
          { silent: false, printBackground: true },
          (success, errorType) => {
            if (printWindow) {
              try { printWindow.close(); } catch {}
            }
            resolve(
              success
                ? { success: true }
                : { success: false, error: errorType || 'فشل الطباعة' }
            );
          }
        );
      });
    } catch (err) {
      if (printWindow) {
        try { printWindow.close(); } catch {}
      }
      return {
        success: false,
        error: err instanceof Error ? err.message : 'فشل الطباعة',
      };
    }
  });

  // ═══════════════════════════════════════════
  // 🛍️ بحث المنتجات ومتغيراتها (SELECT من التعريفات والمتغيرات)
  // ═══════════════════════════════════════════
  ipcMain.handle('invoice:searchProducts', async (_, query: string) => {
    try {
      const client = getClient();
      let q = client
        .from('product_definitions')
        .select('name, type')
        .eq('is_active', true);
      
      if (query && query.trim() !== '') {
        q = q.ilike('name', `%${query.trim()}%`);
      }
      
      const { data, error } = await q.limit(20);
      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'فشل البحث عن المنتجات',
        data: [],
      };
    }
  });

  ipcMain.handle('invoice:getProductVariants', async (_, productName: string) => {
    try {
      const client = getClient();
      const { data, error } = await client
        .from('product_variants')
        .select('id, variant_name, price')
        .eq('product_name', productName);
      
      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'فشل جلب متغيرات المنتج',
        data: [],
      };
    }
  });

  ipcMain.handle('invoice:getNextId', async () => {
    try {
      const client = getClient();
      const { data, error } = await client
        .from('invoices')
        .select('invoice_id')
        .order('invoice_id', { ascending: false })
        .limit(1);

      if (error) throw error;
      
      const lastId = data && data.length > 0 ? Number(data[0].invoice_id) : 0;
      return { success: true, nextId: lastId + 1 };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'فشل جلب رقم الفاتورة التالي',
        nextId: null,
      };
    }
  });

  // ═══════════════════════════════════════════
  // ✅ جلب تسعيرات الشحن (SELECT من shipping_rates)
  // ═══════════════════════════════════════════
  ipcMain.handle('invoice:getShippingRates', async () => {
    try {
      const client = getClient();
      const { data, error } = await client
        .from('shipping_rates')
        .select('id, region_name, rate')
        .order('region_name', { ascending: true });

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'فشل جلب تسعيرات الشحن',
        data: []
      };
    }
  });
}
