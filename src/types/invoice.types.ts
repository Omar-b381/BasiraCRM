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
