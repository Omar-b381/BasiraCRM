import fs from 'fs';
import path from 'path';
import type { SavedInvoice } from '../../src/types/invoice.types';

// ╔══════════════════════════════════════════════════════════════╗
// ║  هذا الملف يبني HTML النهائي من القالب المرفق template.html  ║
// ║  لا يُعدّل القالب نفسه — يستبدل المتغيرات {{ }} فقط فقط       ║
// ╚══════════════════════════════════════════════════════════════╝

interface InvoiceLike {
  invoice_id: number | string;
  customer_name: string;
  customer_phone: string | null;
  customer_address: string | null;
  invoice_date: string;
  sub_total: number;
  discount_amount: number;
  final_total: number;
  notes?: string | null;
  items: Array<{
    product_name: string;
    variant_name?: string | null;
    quantity: number;
    sub_total: number;
  }>;
}

function escapeHtml(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat('ar-EG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0) + ' ج.م';
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function buildItemsRows(items: InvoiceLike['items']): string {
  return items
    .map((item) => {
      const variantLabel = item.variant_name ? ` (${escapeHtml(item.variant_name)})` : '';
      return `
        <tr>
          <td>${escapeHtml(item.product_name)}${variantLabel}</td>
          <td>${escapeHtml(item.quantity)}</td>
          <td>${formatMoney(item.sub_total)}</td>
        </tr>`;
    })
    .join('');
}

function buildDiscountSection(discountAmount: number): string {
  if (!discountAmount || discountAmount <= 0) return '';
  return `
    <tr>
      <td>الخصم:</td>
      <td class="total">- ${formatMoney(discountAmount)}</td>
    </tr>`;
}

function buildNotesSection(notes?: string | null): string {
  if (!notes?.trim()) return '';
  return `
    <div class="notes-section">
      <p><strong>ملاحظات:</strong> ${escapeHtml(notes)}</p>
    </div>`;
}

/**
 * يحمّل القالب الثابت ويستبدل المتغيرات ببيانات الفاتورة الفعلية
 * ⚠️ هذه الدالة لا تتصل بقاعدة البيانات — تستقبل بيانات جاهزة فقط
 */
export function buildInvoiceHtml(invoice: InvoiceLike, logoBase64?: string): string {
  // Try several potential template paths to be robust
  let templatePath = path.join(__dirname, '../../assets/invoice-template.html');
  if (!fs.existsSync(templatePath)) {
    templatePath = path.join(__dirname, '../assets/invoice-template.html');
  }
  if (!fs.existsSync(templatePath)) {
    templatePath = path.join(process.cwd(), 'assets/invoice-template.html');
  }
  if (!fs.existsSync(templatePath)) {
    templatePath = path.join(process.cwd(), 'template.html');
  }

  if (!fs.existsSync(templatePath)) {
    throw new Error(`تعذر العثور على قالب الفاتورة في المسار: ${templatePath}`);
  }

  let html = fs.readFileSync(templatePath, 'utf-8');

  const replacements: Record<string, string> = {
    '{{invoice_id}}': escapeHtml(invoice.invoice_id),
    '{{customer_name}}': escapeHtml(invoice.customer_name),
    '{{customer_phone}}': escapeHtml(invoice.customer_phone || '—'),
    '{{customer_address}}': escapeHtml(invoice.customer_address || '—'),
    '{{invoice_date}}': formatDate(invoice.invoice_date),
    '{{sub_total}}': formatMoney(invoice.sub_total),
    '{{final_total}}': formatMoney(invoice.final_total),
    '{{items_table_rows}}': buildItemsRows(invoice.items),
    '{{discount_section}}': buildDiscountSection(invoice.discount_amount),
    '{{notes_section}}': buildNotesSection(invoice.notes),
  };

  for (const [key, value] of Object.entries(replacements)) {
    html = html.split(key).join(value);
  }

  // استبدال الشعار إذا توفر (Base64) — وإلا حذف الصورة لمنع كسر التصميم
  if (logoBase64) {
    html = html.replace('src="logo.png"', `src="data:image/png;base64,${logoBase64}"`);
  } else {
    html = html.replace(/<img src="logo\.png"[^>]*>/, '');
  }

  return html;
}
