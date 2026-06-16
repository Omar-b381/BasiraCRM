export type RFMSegment =
  | 'champions'        // أبطال
  | 'loyal'            // مخلصون
  | 'potential_loyal'  // محتملو الولاء
  | 'new_customers'    // عملاء جدد
  | 'promising'        // واعدون
  | 'need_attention'   // يحتاجون اهتمام
  | 'about_to_sleep'   // على وشك النوم
  | 'at_risk'          // في خطر
  | 'cannot_lose'      // لا يمكن خسارتهم
  | 'hibernating'      // سابتون
  | 'lost'             // مفقودون

export interface RFMScore {
  recency: number;    // 1-5
  frequency: number;  // 1-5
  monetary: number;   // 1-5
  total: number;      // 3-15
  segment: RFMSegment;
}

export interface Contact {
  id: string;          // customer_id
  name: string;
  phone: string;
  address?: string;
  email?: string;
  tags?: string[];
  notes?: string;
  lastPurchaseDate?: string;
  purchaseCount: number;
  totalSpend: number;
  rfmScore?: RFMScore;
  createdAt: string;
  updatedAt?: string;
  customer_phone_2?: string;
}
