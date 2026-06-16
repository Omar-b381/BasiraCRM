import { create } from 'zustand';
import type { InvoiceEditState, InvoiceEditItem } from '../types/invoice.types';
import { calculateItemSubTotal, recalculateEditTotals } from '../lib/invoiceCalculations';

interface InvoiceEditStore {
  state: InvoiceEditState | null;
  originalSnapshot: InvoiceEditState | null; // للمقارنة عند "هل توجد تعديلات؟"
  isLoading: boolean;
  isSaving: boolean;
  loadInvoice: (data: any) => void;
  updateCustomerField: (field: 'customer_phone' | 'customer_phone_2' | 'customer_address', value: string) => void;
  toggleSyncProfile: (value: boolean) => void;
  addNewItem: () => void;
  updateItem: (tempId: string, field: 'product_name' | 'variant_name' | 'quantity' | 'unit_price' | 'details', value: string | number) => void;
  markItemDeleted: (tempId: string) => void;
  restoreItem: (tempId: string) => void;
  setDiscount: (amount: number) => void;
  setShipping: (amount: number) => void;
  setNotes: (notes: string) => void;
  setStatus: (status: string) => void;
  setSaving: (val: boolean) => void;
  reset: () => void;
}

function recalc(state: InvoiceEditState): InvoiceEditState {
  const { sub_total, final_total } = recalculateEditTotals(
    state.items,
    state.discount_amount,
    state.shipping_cost
  );
  return { ...state, sub_total, final_total };
}

export const useInvoiceEditStore = create<InvoiceEditStore>((set, get) => ({
  state: null,
  originalSnapshot: null,
  isLoading: false,
  isSaving: false,

  loadInvoice: (data) => {
    const items: InvoiceEditItem[] = data.items.map((item: any) => ({
      item_id: item.item_id,
      tempId: crypto.randomUUID(),
      product_name: item.product_name,
      variant_name: item.variant_name || '',
      quantity: item.quantity,
      unit_price: item.quantity > 0 ? Math.round((item.sub_total / item.quantity) * 100) / 100 : 0,
      sub_total: item.sub_total,
      details: item.details || '',
      _action: 'unchanged',
    }));

    const loaded: InvoiceEditState = {
      invoice_id: data.invoice_id,
      customer_id: data.customer_id,
      customer_name: data.customer_name,
      customer_phone: data.customer_phone || '',
      customer_phone_2: data.customer_phone_2 || '',
      customer_address: data.customer_address || '',
      invoice_date: data.invoice_date,
      items,
      discount_amount: data.discount_amount || 0,
      shipping_cost: data.shipping_cost || 0,
      sub_total: data.sub_total,
      final_total: data.final_total,
      status: data.status,
      notes: data.notes || '',
      syncCustomerProfile: false,
    };

    set({ state: loaded, originalSnapshot: JSON.parse(JSON.stringify(loaded)) });
  },

  updateCustomerField: (field, value) =>
    set((s) => (s.state ? { state: { ...s.state, [field]: value } } : s)),

  toggleSyncProfile: (value) =>
    set((s) => (s.state ? { state: { ...s.state, syncCustomerProfile: value } } : s)),

  addNewItem: () =>
    set((s) => {
      if (!s.state) return s;
      const newItem: InvoiceEditItem = {
        item_id: null,
        tempId: crypto.randomUUID(),
        product_name: '',
        variant_name: '',
        quantity: 1,
        unit_price: 0,
        sub_total: 0,
        details: '',
        _action: 'new',
      };
      return { state: recalc({ ...s.state, items: [...s.state.items, newItem] }) };
    }),

  updateItem: (tempId, field, value) =>
    set((s) => {
      if (!s.state) return s;
      const items = s.state.items.map((item) => {
        if (item.tempId !== tempId) return item;
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unit_price') {
          updated.sub_total = calculateItemSubTotal(
            Number(updated.quantity) || 0,
            Number(updated.unit_price) || 0
          );
        }
        // ⚠️ إذا كان البند موجوداً مسبقاً (item_id غير null) ولم يكن جديداً، نعلّمه "updated"
        if (updated._action === 'unchanged' && updated.item_id !== null) {
          updated._action = 'updated';
        }
        return updated;
      });
      return { state: recalc({ ...s.state, items }) };
    }),

  // ⚠️ الحذف منطقي فقط في الواجهة حتى الحفظ — لا يُرسل DELETE فوري
  markItemDeleted: (tempId) =>
    set((s) => {
      if (!s.state) return s;
      const items = s.state.items.map((item) =>
        item.tempId === tempId ? { ...item, _action: 'deleted' as const } : item
      );
      return { state: recalc({ ...s.state, items }) };
    }),

  restoreItem: (tempId) =>
    set((s) => {
      if (!s.state) return s;
      const items = s.state.items.map((item) => {
        if (item.tempId !== tempId) return item;
        // إذا كان بنداً جديداً ملغى استرجاعه يعود إلى 'new'، وإن كان موجوداً يعود 'unchanged'
        const restoredAction = item.item_id === null ? 'new' : 'unchanged';
        return { ...item, _action: restoredAction as InvoiceEditItem['_action'] };
      });
      return { state: recalc({ ...s.state, items }) };
    }),

  setDiscount: (amount) =>
    set((s) => (s.state ? { state: recalc({ ...s.state, discount_amount: amount }) } : s)),

  setShipping: (amount) =>
    set((s) => (s.state ? { state: recalc({ ...s.state, shipping_cost: amount }) } : s)),

  setNotes: (notes) => set((s) => (s.state ? { state: { ...s.state, notes } } : s)),

  setStatus: (status) => set((s) => (s.state ? { state: { ...s.state, status } } : s)),

  setSaving: (val) => set({ isSaving: val }),

  reset: () => set({ state: null, originalSnapshot: null }),
}));
