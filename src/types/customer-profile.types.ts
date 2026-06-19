import { SavedInvoice } from './invoice.types';
import { RFMScore } from './contact.types';

export interface ProductFrequency {
  product_name: string;
  total_quantity: number;
  total_spent: number;
  times_ordered: number;
}

export interface CustomerProfile {
  // بيانات العميل الأساسية
  id: string;
  name: string;
  phone: string;
  phone2?: string | null;
  address?: string | null;
  email?: string | null;
  createdAt: string;

  // الإحصاءات المالية (محسوبة)
  totalSpent: number;
  totalOrders: number;
  avgOrderValue: number;
  lastPurchaseDate?: string;
  daysSinceLastPurchase?: number;

  // الفواتير الكاملة
  invoices: SavedInvoice[];

  // المنتجات المفضلة
  topProducts: ProductFrequency[];

  // درجة RFM
  rfmScore?: RFMScore;
}
