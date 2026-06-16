// ═══════════════════════════════════════════════════════
//  أنواع البيانات — شاشة تصدير Excel لشركة الشحن
// ═══════════════════════════════════════════════════════

export interface ParsedAddress {
  city: string;
  area: string;
  confidence: 'high' | 'medium' | 'low'; // مستوى الثقة في التحليل
}

/** صف واحد في جدول التصدير */
export interface ShippingRow {
  // معرّفات
  invoiceId: number;
  customerId: string | null;

  // الأعمدة المطلوبة من شركة الشحن
  consigneeName: string;
  city: string;
  area: string;
  address: string;
  phone1: string;
  phone2: string;
  email: string;
  orderId: string;        // invoice_id كـ string
  clientId: string;       // customer_id كـ string
  itemName: string;
  quantity: number;
  itemDescription: string;
  cod: number;            // final_total
  weight: string;         // فارغ افتراضياً — يملأه المستخدم
  size: string;           // فارغ افتراضياً — يملأه المستخدم
  serviceType: string;    // "Normal COD" افتراضي
  notes: string;

  // حالة التحليل (لون الصف)
  addressConfidence: 'high' | 'medium' | 'low';

  // هل تم تعديله يدوياً؟
  manuallyEdited: boolean;
}

/** فلاتر استعلام الفواتير للتصدير */
export interface ShippingExportFilters {
  dateFrom?: string;      // ISO date
  dateTo?: string;        // ISO date
  status?: string[];      // ['مؤكدة', 'تم الشحن', ...]
  customerQuery?: string;
  invoiceIds?: number[];  // قائمة أرقام فواتير محددة (تتجاوز كل الفلاتر الأخرى)
}

/** نتيجة جلب فواتير التصدير من Main Process */
export interface ShippingInvoiceRaw {
  invoice_id: number;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string | null;
  customer_phone_2: string | null;
  customer_address: string | null;
  invoice_date: string;
  final_total: number;
  status: string | null;
  notes: string | null;
  email: string | null;
  // أول بند من الفاتورة (لـ Item Name)
  first_item_name: string | null;
  first_item_quantity: number | null;
  first_item_description: string | null;
}
