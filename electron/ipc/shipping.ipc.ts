import { ipcMain, dialog } from 'electron';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type Store from 'electron-store';
import path from 'path';
import os from 'os';
import ws from 'ws';
import ExcelJS from 'exceljs';
import { enforcePermission } from './session';

// ╔══════════════════════════════════════════════════════════════╗
// ║  IPC Handlers — شاشة تصدير Excel لشركة الشحن                ║
// ║  SELECT من invoices / invoice_items / customers              ║
// ╚══════════════════════════════════════════════════════════════╝

interface SupabaseConfig {
  url: string;
  anonKey: string;
}

let cachedClient: SupabaseClient | null = null;
let lastUrl = '';
let lastAnonKey = '';

export function setupShippingIPC(store: Store) {
  const getClient = (): SupabaseClient => {
    const settings = store.get('apiSettings') as { supabase?: SupabaseConfig };
    const config = settings?.supabase;
    if (!config?.url || !config?.anonKey) {
      throw new Error('إعدادات Supabase غير مكتملة — اذهب إلى الإعدادات أولاً');
    }
    const cleanUrl = config.url.replace(/["\"']/g, '').trim();
    const cleanKey = config.anonKey.replace(/["\"']/g, '').trim();

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

  // ═══════════════════════════════════════════════════════
  // ✅ جلب فواتير للتصدير مع بيانات أول بند لكل فاتورة
  // ═══════════════════════════════════════════════════════
  ipcMain.handle('shipping:getInvoicesForExport', async (_, filters: any) => {
    try {
      enforcePermission('edit_invoices');
      const client = getClient();

      // بناء الاستعلام الأساسي على الفواتير
      let query = client
        .from('invoices')
        .select(`
          invoice_id,
          customer_id,
          customer_name,
          customer_phone,
          customer_phone_2,
          customer_address,
          invoice_date,
          final_total,
          status,
          notes
        `);

      // ✅ وضع الأرقام المباشرة — يتجاوز كل الفلاتر الأخرى
      if (filters?.invoiceIds && filters.invoiceIds.length > 0) {
        query = query.in('invoice_id', filters.invoiceIds);
      } else {
        // تطبيق فلاتر التاريخ
        if (filters?.dateFrom) {
          query = query.gte('invoice_date', filters.dateFrom);
        }
        if (filters?.dateTo) {
          // نضيف يوم واحد لنشمل نهاية اليوم
          const toDate = new Date(filters.dateTo);
          toDate.setDate(toDate.getDate() + 1);
          query = query.lt('invoice_date', toDate.toISOString().split('T')[0]);
        }

        // فلتر الحالة
        if (filters?.status && filters.status.length > 0) {
          query = query.in('status', filters.status);
        }

        // بحث بالعميل
        if (filters?.customerQuery && filters.customerQuery.trim() !== '') {
          const q = filters.customerQuery.trim();
          query = query.or(`customer_name.ilike.%${q}%,customer_phone.ilike.%${q}%`);
        }
      }

      const { data: invoices, error: invoicesError } = await query
        .order('invoice_date', { ascending: false })
        .limit(500);

      if (invoicesError) throw invoicesError;
      if (!invoices || invoices.length === 0) {
        return { success: true, data: [] };
      }

      // جلب بنود الفواتير (أول بند لكل فاتورة)
      const invoiceIds = invoices.map((inv: any) => inv.invoice_id);
      const { data: allItems, error: itemsError } = await client
        .from('invoice_items')
        .select('invoice_id, product_name, quantity, details, variant_name')
        .in('invoice_id', invoiceIds)
        .order('item_id', { ascending: true });

      if (itemsError) throw itemsError;

      // جلب بريد العملاء (إذا كان customer_id موجود)
      const customerIds = invoices
        .map((inv: any) => inv.customer_id)
        .filter((id: any) => id !== null && id !== undefined);

      let emailMap: Record<string, string> = {};
      if (customerIds.length > 0) {
        const { data: customers } = await client
          .from('customers')
          .select('customer_id, email')
          .in('customer_id', customerIds);

        if (customers) {
          customers.forEach((c: any) => {
            if (c.email) emailMap[c.customer_id] = c.email;
          });
        }
      }

      // تجميع أول بند لكل فاتورة
      const itemsByInvoice: Record<number, any> = {};
      if (allItems) {
        for (const item of allItems) {
          if (!itemsByInvoice[item.invoice_id]) {
            itemsByInvoice[item.invoice_id] = item;
          }
        }
      }

      // دمج البيانات
      const result = invoices.map((inv: any) => {
        const firstItem = itemsByInvoice[inv.invoice_id];
        return {
          invoice_id: inv.invoice_id,
          customer_id: inv.customer_id,
          customer_name: inv.customer_name || '',
          customer_phone: inv.customer_phone || '',
          customer_phone_2: inv.customer_phone_2 || '',
          customer_address: inv.customer_address || '',
          invoice_date: inv.invoice_date,
          final_total: inv.final_total || 0,
          status: inv.status,
          notes: inv.notes || '',
          email: inv.customer_id ? (emailMap[inv.customer_id] || '') : '',
          first_item_name: firstItem?.product_name || '',
          first_item_quantity: firstItem?.quantity || 1,
          first_item_description: [firstItem?.variant_name, firstItem?.details]
            .filter(Boolean)
            .join(' — ') || '',
        };
      });

      return { success: true, data: result };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'فشل جلب الفواتير',
        data: [],
      };
    }
  });

  // ═══════════════════════════════════════════════════════
  // 📊 تصدير Excel — يستقبل صفوف جاهزة من الـ Renderer
  // ═══════════════════════════════════════════════════════
  ipcMain.handle('shipping:exportExcel', async (_, rows: any[]) => {
    try {
      enforcePermission('edit_invoices');
      if (!rows || rows.length === 0) {
        return { success: false, error: 'لا توجد بيانات للتصدير' };
      }

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'بصيرة CRM';
      workbook.created = new Date();

      const sheet = workbook.addWorksheet('Shipping Orders', {
        views: [{ rightToLeft: false }],
      });

      // ── تعريف الأعمدة بالترتيب المطلوب من شركة الشحن ──
      sheet.columns = [
        { header: 'Consignee Name', key: 'consigneeName', width: 30 },
        { header: 'City',           key: 'city',           width: 18 },
        { header: 'Area',           key: 'area',           width: 22 },
        { header: 'Address',        key: 'address',        width: 50 },
        { header: 'Phone_1',        key: 'phone1',         width: 18 },
        { header: 'Phone_2',        key: 'phone2',         width: 18 },
        { header: 'E-mail',         key: 'email',          width: 28 },
        { header: 'Order ID',       key: 'orderId',        width: 14 },
        { header: 'Client ID',      key: 'clientId',       width: 14 },
        { header: 'Item Name',      key: 'itemName',       width: 28 },
        { header: 'Quantity',       key: 'quantity',       width: 12 },
        { header: 'Item Description', key: 'itemDescription', width: 40 },
        { header: 'COD',            key: 'cod',            width: 14 },
        { header: 'Weight',         key: 'weight',         width: 12 },
        { header: 'Size',           key: 'size',           width: 12 },
        { header: 'Service Type',   key: 'serviceType',    width: 18 },
        { header: 'notes',          key: 'notes',          width: 40 },
      ];

      // ── تنسيق صف الهيدر — بولد فقط بدون ألوان ──
      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true, size: 11, name: 'Calibri' };
      headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
      headerRow.height = 24;

      // ── إدراج الصفوف ──
      rows.forEach((row) => {
        const dataRow = sheet.addRow({
          consigneeName:   row.consigneeName   || '',
          city:            row.city            || '',
          area:            row.area            || '',
          address:         row.address         || '',
          phone1:          row.phone1          || '',
          phone2:          row.phone2          || '',
          email:           row.email           || '',
          orderId:         row.orderId         || '',
          clientId:        row.clientId        || '',
          itemName:        row.itemName        || '',
          quantity:        row.quantity > 0 ? row.quantity : '',
          itemDescription: row.itemDescription || '',
          cod:             row.cod             || 0,
          weight:          row.weight          || '',
          size:            row.size            || '',
          serviceType:     row.serviceType     || 'Normal COD',
          notes:           row.notes           || '',
        });

        dataRow.alignment = { vertical: 'middle', wrapText: true };
        dataRow.height = 18;
      });

      // ── تجميد الصف الأول (الهيدر) ──
      sheet.views = [{ state: 'frozen', ySplit: 1 }];

      // ── حدود الجدول ──
      const lastRow = sheet.rowCount;
      for (let r = 1; r <= lastRow; r++) {
        for (let c = 1; c <= 17; c++) {
          const cell = sheet.getRow(r).getCell(c);
          cell.border = {
            top:    { style: 'thin', color: { argb: 'FFD1D5DB' } },
            left:   { style: 'thin', color: { argb: 'FFD1D5DB' } },
            bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            right:  { style: 'thin', color: { argb: 'FFD1D5DB' } },
          };
        }
      }

      // ── اختيار مسار الحفظ ──
      const today = new Date().toISOString().split('T')[0];
      const { filePath, canceled } = await dialog.showSaveDialog({
        title: 'حفظ ملف الشحن',
        defaultPath: path.join(os.homedir(), 'Desktop', `shipping-export-${today}.xlsx`),
        filters: [{ name: 'Excel Files', extensions: ['xlsx'] }],
      });

      if (canceled || !filePath) {
        return { success: false, error: 'تم إلغاء الحفظ' };
      }

      await workbook.xlsx.writeFile(filePath);
      return { success: true, filePath };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'فشل تصدير Excel',
      };
    }
  });

  // ═══════════════════════════════════════════════════════
  // 🔍 مطابقة ملف Excel لشركة الشحن
  // ═══════════════════════════════════════════════════════
  ipcMain.handle('shipping:parseExcelForTracking', async () => {
    try {
      enforcePermission('edit_invoices');
      const { filePaths, canceled } = await dialog.showOpenDialog({
        title: 'اختر ملف شركة الشحن للمطابقة',
        filters: [{ name: 'Excel Files', extensions: ['xlsx', 'xls'] }],
        properties: ['openFile'],
      });

      if (canceled || filePaths.length === 0) {
        return { success: false, error: 'تم إلغاء اختيار الملف' };
      }

      const filePath = filePaths[0];
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);
      const sheet = workbook.worksheets[0];

      if (!sheet || sheet.rowCount < 2) {
        return { success: false, error: 'الملف فارغ أو غير صالح' };
      }

      // البحث عن أعمدة: رقم الطلب، رقم البوليصة، حالة الشحنة
      const headerRow = sheet.getRow(1);
      let orderIdCol = -1;
      let trackingCol = -1;
      let statusCol = -1;

      headerRow.eachCell((cell, colNumber) => {
        const val = String(cell.value || '').trim();
        if (val === 'رقم الطلب') orderIdCol = colNumber;
        else if (val === 'رقم البوليصة') trackingCol = colNumber;
        else if (val === 'حالة الشحنة') statusCol = colNumber;
      });

      // fallback في حال لم يجد المسميات الدقيقة
      if (orderIdCol === -1) orderIdCol = 14; // الافتراضي العمود 14
      if (trackingCol === -1) trackingCol = 1;  // الافتراضي العمود 1
      if (statusCol === -1) statusCol = 21;    // الافتراضي العمود 21

      const parsedRows: any[] = [];
      const orderIds: number[] = [];

      for (let i = 2; i <= sheet.rowCount; i++) {
        const row = sheet.getRow(i);
        const orderIdVal = row.getCell(orderIdCol).value;
        const trackingCode = String(row.getCell(trackingCol).value || '').trim();
        const excelStatus = String(row.getCell(statusCol).value || '').trim();

        if (!orderIdVal) continue;
        const orderId = Number(orderIdVal);
        if (isNaN(orderId)) continue;

        parsedRows.push({
          orderId,
          trackingCode,
          excelStatus,
        });
        orderIds.push(orderId);
      }

      if (orderIds.length === 0) {
        return { success: false, error: 'لم يتم العثور على أرقام طلبات صالحة في الملف' };
      }

      // جلب الفواتير المطابقة من قاعدة البيانات
      const client = getClient();
      const { data: invoices, error } = await client
        .from('invoices')
        .select('invoice_id, customer_name, status')
        .in('invoice_id', orderIds);

      if (error) throw error;

      const dbMap = new Map<number, any>();
      if (invoices) {
        invoices.forEach(inv => dbMap.set(Number(inv.invoice_id), inv));
      }

      // دمج واقتراح الحالات
      const result = parsedRows.map(row => {
        const dbOrder = dbMap.get(row.orderId);
        
        // مطابقة الحالة المباشرة كما هي في ملف Excel
        const proposedStatus = row.excelStatus || 'معلقة';

        return {
          orderId: row.orderId,
          trackingCode: row.trackingCode,
          excelStatus: row.excelStatus,
          crmStatus: dbOrder ? dbOrder.status : null,
          customerName: dbOrder ? dbOrder.customer_name : 'غير موجود في النظام',
          proposedStatus: proposedStatus,
        };
      });

      return { success: true, data: result };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'فشل تحليل ملف المطابقة',
      };
    }
  });

  // ═══════════════════════════════════════════════════════
  // 💾 تحديث الحالات دفعياً
  // ═══════════════════════════════════════════════════════
  ipcMain.handle('shipping:updateStatuses', async (_, updates: Array<{ invoiceId: number; status: string }>) => {
    try {
      enforcePermission('edit_invoices');
      if (!updates || updates.length === 0) {
        return { success: false, error: 'لا توجد تحديثات لتطبيقها' };
      }

      const client = getClient();
      
      // نقوم بالتحديث دفعياً لتجنب إجهاد الشبكة (Port/Socket Exhaustion) أو حظر الاتصال من Supabase
      const BATCH_SIZE = 15;
      for (let i = 0; i < updates.length; i += BATCH_SIZE) {
        const batch = updates.slice(i, i + BATCH_SIZE);
        await Promise.all(
          batch.map(async (u) => {
            const { error } = await client
              .from('invoices')
              .update({ status: u.status })
              .eq('invoice_id', u.invoiceId);
            
            if (error) {
              throw new Error(`فشل تحديث الفاتورة ${u.invoiceId}: ${error.message}`);
            }
          })
        );
        // تأخير بسيط بين كل دفعة وأخرى
        await new Promise((resolve) => setTimeout(resolve, 85));
      }
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'فشل تحديث حالات الطلبات',
      };
    }
  });

  // ═══════════════════════════════════════════════════════
  // 📊 جلب إحصائيات قاعدة البيانات بأكملها (KPIs)
  // ═══════════════════════════════════════════════════════
  ipcMain.handle('shipping:getDbStats', async () => {
    try {
      enforcePermission('view_reports');
      const client = getClient();
      
      const { count: total, error: errTotal } = await client
        .from('invoices')
        .select('*', { count: 'exact', head: true });
      if (errTotal) throw errTotal;

      const deliveredStatuses = ['تم التسليم', 'تسليم ناجح', 'تسليم جزئي'];
      const shippingStatuses = [
        'تم الشحن', 'قيد التوصيل', 'تم الاستلام في المخزن', 'استبدال او استلام طرد',
        'في الطريق للمخزن', 'جاري توصيل الاوردر', 'في الطريق للراسل', 'محاولة تشغيل'
      ];
      const pendingStatuses = ['قيد الانتظار', 'مؤكدة', 'طلب بيك أب', 'التعبئة', '(جديد)'];
      const returnedStatuses = ['مرتجعة', 'تم الارتجاع للراسل', 'تم الارتجاع للمخزن', 'تقفيل مرتجع'];

      const { count: delivered, error: errDelivered } = await client
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .in('status', deliveredStatuses);
      if (errDelivered) throw errDelivered;

      const { count: shipping, error: errShipping } = await client
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .in('status', shippingStatuses);
      if (errShipping) throw errShipping;

      const { count: pending, error: errPending } = await client
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .in('status', pendingStatuses);
      if (errPending) throw errPending;

      const { count: returned, error: errReturned } = await client
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .in('status', returnedStatuses);
      if (errReturned) throw errReturned;

      const stats = {
        total: total || 0,
        delivered: delivered || 0,
        shipping: shipping || 0,
        pending: pending || 0,
        returned: returned || 0,
      };

      return { success: true, stats };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'فشل جلب إحصائيات قاعدة البيانات',
      };
    }
  });
}

