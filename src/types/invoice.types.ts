export interface InvoiceItemDraft {
  tempId: string;            // معرف مؤقت في الواجهة فقط (uuid client-side)
  product_name: string;
  variant_name?: string;
  quantity: number;
  unit_price: number;        // للحساب فقط — العمود الفعلي في DB هو sub_total
  sub_total: number;         // quantity * unit_price (محسوب)
  details?: string;
}

export interface InvoiceDraft {
  // ⚠️ لا يوجد invoice_id هنا — يتولد تلقائياً من DB عند الحفظ (IDENTITY)
  customer_id?: string;       // إذا عميل موجود
  customer_name: string;
  customer_phone: string;
  customer_phone_2?: string;
  customer_address?: string;
  invoice_date: string;       // ISO — افتراضي now()
  items: InvoiceItemDraft[];
  sub_total: number;
  discount_amount: number;
  shipping_cost: number;
  final_total: number;
  status: InvoiceStatus;
  notes?: string;
}

// ⚠️ يجب أن تطابق CHECK constraint الموجود فعلياً في عمود status
export type InvoiceStatus =
  | 'قيد الانتظار'
  | 'مؤكدة'
  | 'تم الشحن'
  | 'تم التسليم'
  | 'ملغاة'
  | 'مرتجعة';

export interface SavedInvoice {
  invoice_id: number;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string | null;
  customer_phone_2: string | null;
  customer_address: string | null;
  invoice_date: string;
  sub_total: number;
  discount_amount: number;
  final_total: number;
  shipping_cost: number | null;
  status: string | null;
  notes: string | null;
  refund_amount: number | null;
  refund_reason: string | null;
  items: SavedInvoiceItem[];
}

export interface SavedInvoiceItem {
  item_id: number;
  invoice_id: number;
  product_name: string;
  details: string | null;
  sub_total: number;
  quantity: number;
  variant_name: string;
}

export interface PdfGenerationResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

export interface InvoiceEditItem {
  item_id: number | null;     // null = بند جديد لم يُحفظ بعد
  tempId: string;             // معرف مؤقت في الواجهة (uuid)
  product_name: string;
  variant_name: string;
  quantity: number;
  unit_price: number;         // مُستنتج من sub_total/quantity عند التحميل
  sub_total: number;
  details: string;
  _action: 'unchanged' | 'updated' | 'new' | 'deleted'; // ⚠️ حالة محلية فقط، لا تُحفظ في DB
}

export interface InvoiceEditState {
  invoice_id: number;
  customer_id: string | null;
  customer_name: string;        // 🔒 غير قابل للتعديل في هذه الشاشة
  customer_phone: string;       // ✅ قابل للتعديل
  customer_phone_2: string;     // ✅ قابل للتعديل (إضافة رقم ثانٍ)
  customer_address: string;     // ✅ قابل للتعديل
  invoice_date: string;         // 🔒 غير قابل للتعديل (إلا بحالة استثنائية)
  items: InvoiceEditItem[];
  discount_amount: number;
  shipping_cost: number;
  sub_total: number;            // محسوب تلقائياً من items
  final_total: number;          // محسوب تلقائياً
  status: string;
  notes: string;
  syncCustomerProfile: boolean; // checkbox: تحديث جدول customers أيضاً
}

export interface InvoiceUpdatePayload {
  invoice_id: number;
  customer_phone: string;
  customer_phone_2: string | null;
  customer_address: string | null;
  discount_amount: number;
  shipping_cost: number;
  sub_total: number;
  final_total: number;
  notes: string | null;
  status: string;
  syncCustomerProfile: boolean;
  customer_id: string | null;
  itemsToCreate: Array<{
    product_name: string;
    variant_name: string;
    quantity: number;
    sub_total: number;
    details: string | null;
  }>;
  itemsToUpdate: Array<{
    item_id: number;
    product_name: string;
    variant_name: string;
    quantity: number;
    sub_total: number;
    details: string | null;
  }>;
  itemIdsToDelete: number[];
}
