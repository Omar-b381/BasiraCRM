import type { InvoiceItemDraft, InvoiceEditItem, InvoiceUpdatePayload } from '../types/invoice.types';

/**
 * حساب الإجمالي الفرعي لبند واحد
 */
export function calculateItemSubTotal(quantity: number, unitPrice: number): number {
  const result = quantity * unitPrice;
  return Math.round(result * 100) / 100; // تقريب لمنزلتين عشريتين
}

/**
 * حساب إجمالي كل البنود
 */
export function calculateSubTotal(items: InvoiceItemDraft[]): number {
  const total = items.reduce((sum, item) => sum + (item.sub_total || 0), 0);
  return Math.round(total * 100) / 100;
}

/**
 * حساب الإجمالي النهائي
 * final_total = sub_total - discount_amount + shipping_cost
 */
export function calculateFinalTotal(
  subTotal: number,
  discountAmount: number,
  shippingCost: number
): number {
  const final = subTotal - (discountAmount || 0) + (shippingCost || 0);
  return Math.max(0, Math.round(final * 100) / 100); // لا يقل عن صفر
}

/**
 * التحقق من صحة الفاتورة قبل الحفظ
 */
export function validateInvoice(draft: {
  customer_name: string;
  customer_phone: string;
  items: InvoiceItemDraft[];
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!draft.customer_name?.trim()) {
    errors.push('اسم العميل مطلوب');
  }

  if (!draft.customer_phone?.trim()) {
    errors.push('رقم هاتف العميل مطلوب');
  } else if (!/^[\d+\s-]{8,}$/.test(draft.customer_phone)) {
    errors.push('رقم الهاتف غير صالح');
  }

  if (!draft.items || draft.items.length === 0) {
    errors.push('يجب إضافة بند واحد على الأقل');
  }

  draft.items.forEach((item, idx) => {
    if (!item.product_name?.trim()) {
      errors.push(`الصنف رقم ${idx + 1}: اسم المنتج مطلوب`);
    }
    if (!item.quantity || item.quantity <= 0) {
      errors.push(`الصنف رقم ${idx + 1}: الكمية يجب أن تكون أكبر من صفر`);
    }
  });

  return { valid: errors.length === 0, errors };
}

/**
 * تنسيق المبالغ المالية بالأرقام العربية/الإنجليزية مع العملة
 */
export function formatCurrency(amount: number, currency = 'ج.م'): string {
  const formatted = new Intl.NumberFormat('ar-EG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
  return `${formatted} ${currency}`;
}

/**
 * إعادة حساب الإجمالي الفرعي لكل البنود غير المحذوفة
 */
export function recalculateEditTotals(
  items: InvoiceEditItem[],
  discountAmount: number,
  shippingCost: number
): { sub_total: number; final_total: number } {
  const activeItems = items.filter((i) => i._action !== 'deleted');
  const sub_total = Math.round(
    activeItems.reduce((sum, i) => sum + (i.sub_total || 0), 0) * 100
  ) / 100;
  const final_total = Math.max(
    0,
    Math.round((sub_total - (discountAmount || 0) + (shippingCost || 0)) * 100) / 100
  );
  return { sub_total, final_total };
}

/**
 * تحويل حالة التعديل الكاملة إلى Payload منظم لإرساله إلى IPC
 * يفصل البنود إلى: جديدة / معدّلة / محذوفة
 */
export function buildUpdatePayload(state: {
  invoice_id: number;
  customer_id: string | null;
  customer_phone: string;
  customer_phone_2: string;
  customer_address: string;
  items: InvoiceEditItem[];
  discount_amount: number;
  shipping_cost: number;
  sub_total: number;
  final_total: number;
  notes: string;
  status: string;
  syncCustomerProfile: boolean;
}): InvoiceUpdatePayload {
  const itemsToCreate = state.items
    .filter((i) => i._action === 'new')
    .map((i) => ({
      product_name: i.product_name,
      variant_name: i.variant_name || '',
      quantity: i.quantity,
      sub_total: i.sub_total,
      details: i.details || null,
    }));

  const itemsToUpdate = state.items
    .filter((i) => i._action === 'updated' && i.item_id !== null)
    .map((i) => ({
      item_id: i.item_id as number,
      product_name: i.product_name,
      variant_name: i.variant_name || '',
      quantity: i.quantity,
      sub_total: i.sub_total,
      details: i.details || null,
    }));

  const itemIdsToDelete = state.items
    .filter((i) => i._action === 'deleted' && i.item_id !== null)
    .map((i) => i.item_id as number);

  return {
    invoice_id: state.invoice_id,
    customer_phone: state.customer_phone,
    customer_phone_2: state.customer_phone_2 || null,
    customer_address: state.customer_address || null,
    discount_amount: state.discount_amount,
    shipping_cost: state.shipping_cost,
    sub_total: state.sub_total,
    final_total: state.final_total,
    notes: state.notes || null,
    status: state.status,
    syncCustomerProfile: state.syncCustomerProfile,
    customer_id: state.customer_id,
    itemsToCreate,
    itemsToUpdate,
    itemIdsToDelete,
  };
}

/**
 * هل توجد تعديلات معلّقة فعلاً؟ (لتفعيل/تعطيل زر الحفظ)
 */
export function hasPendingChanges(payload: InvoiceUpdatePayload, original: {
  customer_phone: string;
  customer_phone_2: string | null;
  customer_address: string | null;
  discount_amount: number;
  shipping_cost: number;
  notes: string | null;
  status: string;
}): boolean {
  const fieldsChanged =
    payload.customer_phone !== original.customer_phone ||
    payload.customer_phone_2 !== original.customer_phone_2 ||
    payload.customer_address !== original.customer_address ||
    payload.discount_amount !== original.discount_amount ||
    payload.shipping_cost !== original.shipping_cost ||
    payload.notes !== original.notes ||
    payload.status !== original.status;

  const itemsChanged =
    payload.itemsToCreate.length > 0 ||
    payload.itemsToUpdate.length > 0 ||
    payload.itemIdsToDelete.length > 0;

  return fieldsChanged || itemsChanged;
}
