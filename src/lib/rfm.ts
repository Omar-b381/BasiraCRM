import type { Contact, RFMScore, RFMSegment } from '../types/contact.types';

export interface InvoiceItemRecord {
  product_name: string;
  quantity: number;
  variant_name?: string;
}

export interface InvoiceRecord {
  invoice_id?: number | string;
  customer_id: string;
  customer_name?: string;
  status?: string;
  invoice_date: string;
  final_total: number;
  invoice_items?: InvoiceItemRecord[];
  customers?: {
    customer_id: string;
    name: string;
    phone: string;
  };
}

interface CustomerMetrics {
  customerId: string;
  recencyDays: number;      // أيام منذ آخر شراء
  frequency: number;        // عدد الطلبات
  monetary: number;         // إجمالي الإنفاق
}

export interface ProductAffinity {
  productName: string;
  quantity: number;
  purchaseCount: number;
}

// ═══════════════════════════════════════════════════
// الخطوة 1: حساب مقاييس RFM الخام
// ═══════════════════════════════════════════════════
export function calculateRawMetrics(invoices: InvoiceRecord[]): Map<string, CustomerMetrics> {
  const metricsMap = new Map<string, CustomerMetrics>();
  const now = Date.now();

  for (const inv of invoices) {
    if (!inv.customer_id) continue;
    if (inv.status === 'ملغي') continue; // Exclude cancelled invoices
    const existing = metricsMap.get(inv.customer_id);
    const orderDate = new Date(inv.invoice_date).getTime();
    const daysSince = Math.floor((now - orderDate) / (1000 * 60 * 60 * 24));

    if (!existing) {
      metricsMap.set(inv.customer_id, {
        customerId: inv.customer_id,
        recencyDays: daysSince,
        frequency: 1,
        monetary: inv.final_total || 0,
      });
    } else {
      metricsMap.set(inv.customer_id, {
        ...existing,
        recencyDays: Math.min(existing.recencyDays, daysSince),
        frequency: existing.frequency + 1,
        monetary: existing.monetary + (inv.final_total || 0),
      });
    }
  }

  return metricsMap;
}

// ═══════════════════════════════════════════════════
// الخطوة 2: تحويل المقاييس لدرجات 1-5
// ═══════════════════════════════════════════════════
export function scoreMetrics(metricsMap: Map<string, CustomerMetrics>): Map<string, RFMScore> {
  const allMetrics = Array.from(metricsMap.values());

  const recencies = allMetrics.map((m) => m.recencyDays).sort((a, b) => a - b);
  const frequencies = allMetrics.map((m) => m.frequency).sort((a, b) => a - b);
  const monetaries = allMetrics.map((m) => m.monetary).sort((a, b) => a - b);

  const getQuintile = (value: number, sorted: number[], reverse = false): number => {
    if (sorted.length <= 1) return reverse ? 1 : 5;
    const idx = sorted.findIndex((v) => v >= value);
    const percentile = idx === -1 ? 100 : (idx / (sorted.length - 1)) * 100;
    const score = Math.ceil(percentile / 20) || 1;
    return reverse ? 6 - score : score;
  };

  const scoreMap = new Map<string, RFMScore>();

  for (const [id, metrics] of metricsMap) {
    // Recency: أقل أيام = أفضل (عكسي)
    const r = getQuintile(metrics.recencyDays, recencies, true);
    // Frequency: أكثر طلبات = أفضل (عادي)
    const f = getQuintile(metrics.frequency, frequencies, false);
    // Monetary: أكثر إنفاق = أفضل (عادي)
    const m = getQuintile(metrics.monetary, monetaries, false);

    const total = r + f + m;
    const segment = classifySegment(r, f, m);

    scoreMap.set(id, { recency: r, frequency: f, monetary: m, total, segment });
  }

  return scoreMap;
}

// ═══════════════════════════════════════════════════
// الخطوة 3: تصنيف الشرائح
// ═══════════════════════════════════════════════════
export function classifySegment(r: number, f: number, m: number): RFMSegment {
  if (r >= 4 && f >= 4 && m >= 4) return 'champions';
  if (f >= 4 && m >= 4) return 'loyal';
  if (r >= 3 && f >= 3 && m >= 3) return 'potential_loyal';
  if (r >= 4 && f <= 1) return 'new_customers';
  if (r >= 3 && f <= 2) return 'promising';
  if (r >= 3 && f >= 2 && m >= 2) return 'need_attention';
  if (r === 2 && f >= 2) return 'about_to_sleep';
  if (r <= 2 && f >= 3 && m >= 3) return 'cannot_lose';
  if (r <= 2 && f >= 2) return 'at_risk';
  if (r <= 2 && f <= 2 && m >= 2) return 'hibernating';
  return 'lost';
}

// ═══════════════════════════════════════════════════
// الخطوة 4: تحليل تفضيل المنتجات لكل شريحة
// ═══════════════════════════════════════════════════
export function calculateSegmentProductAffinities(
  invoices: InvoiceRecord[],
  scores: Map<string, RFMScore>
): Map<RFMSegment, ProductAffinity[]> {
  const segmentProductsMap = new Map<RFMSegment, Map<string, { qty: number; count: number }>>();

  for (const inv of invoices) {
    if (!inv.customer_id || !inv.invoice_items) continue;
    const score = scores.get(inv.customer_id);
    if (!score) continue;

    const segment = score.segment;
    if (!segmentProductsMap.has(segment)) {
      segmentProductsMap.set(segment, new Map());
    }

    const productsMap = segmentProductsMap.get(segment)!;

    for (const item of inv.invoice_items) {
      const pName = item.product_name;
      if (!pName) continue;
      const qty = Number(item.quantity) || 1;

      const existing = productsMap.get(pName);
      if (!existing) {
        productsMap.set(pName, { qty, count: 1 });
      } else {
        productsMap.set(pName, {
          qty: existing.qty + qty,
          count: existing.count + 1
        });
      }
    }
  }

  const result = new Map<RFMSegment, ProductAffinity[]>();

  for (const [segment, productsMap] of segmentProductsMap.entries()) {
    const list: ProductAffinity[] = Array.from(productsMap.entries()).map(([productName, stats]) => ({
      productName,
      quantity: stats.qty,
      purchaseCount: stats.count
    }));

    // ترتيب المنتجات تنازلياً حسب إجمالي الكمية المشتراة
    list.sort((a, b) => b.quantity - a.quantity);

    result.set(segment, list);
  }

  return result;
}

// ═══════════════════════════════════════════════════
// الدالة الرئيسية
// ═══════════════════════════════════════════════════
export function runRFMAnalysis(
  invoices: InvoiceRecord[],
  contacts: Contact[]
): { contactsWithScores: Contact[]; segmentAffinities: Map<RFMSegment, ProductAffinity[]> } {
  const rawMetrics = calculateRawMetrics(invoices);
  const scores = scoreMetrics(rawMetrics);
  const segmentAffinities = calculateSegmentProductAffinities(invoices, scores);

  const contactsWithScores = contacts.map((contact) => {
    const score = scores.get(contact.id);
    const metrics = rawMetrics.get(contact.id);
    return score ? {
      ...contact,
      purchaseCount: metrics ? metrics.frequency : contact.purchaseCount || 0,
      totalSpend: metrics ? metrics.monetary : contact.totalSpend || 0,
      rfmScore: score
    } : contact;
  });

  return { contactsWithScores, segmentAffinities };
}
