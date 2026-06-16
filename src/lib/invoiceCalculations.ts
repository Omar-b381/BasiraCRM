import type { InvoiceItemDraft } from '../types/invoice.types';

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
