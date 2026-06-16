import { create } from 'zustand';
import type { InvoiceDraft, InvoiceItemDraft, SavedInvoice } from '../types/invoice.types';
import { calculateItemSubTotal, calculateSubTotal, calculateFinalTotal } from '../lib/invoiceCalculations';

interface InvoiceState {
  draft: InvoiceDraft;
  isSaving: boolean;
  isGeneratingPdf: boolean;
  setCustomer: (data: Partial<Pick<InvoiceDraft, 'customer_id' | 'customer_name' | 'customer_phone' | 'customer_phone_2' | 'customer_address'>>) => void;
  addItem: () => void;
  updateItem: (tempId: string, field: keyof InvoiceItemDraft, value: string | number) => void;
  removeItem: (tempId: string) => void;
  setDiscount: (amount: number) => void;
  setShipping: (amount: number) => void;
  setNotes: (notes: string) => void;
  setStatus: (status: InvoiceDraft['status']) => void;
  resetDraft: () => void;
  setSaving: (val: boolean) => void;
  setGeneratingPdf: (val: boolean) => void;
  loadSavedInvoice: (invoice: SavedInvoice) => void;
}

const emptyDraft: InvoiceDraft = {
  customer_name: '',
  customer_phone: '',
  invoice_date: new Date().toISOString(),
  items: [],
  sub_total: 0,
  discount_amount: 0,
  shipping_cost: 0,
  final_total: 0,
  status: 'قيد الانتظار',
};

function recalculate(draft: InvoiceDraft): InvoiceDraft {
  const sub_total = calculateSubTotal(draft.items);
  const final_total = calculateFinalTotal(sub_total, draft.discount_amount, draft.shipping_cost);
  return { ...draft, sub_total, final_total };
}

export const useInvoiceStore = create<InvoiceState>((set) => ({
  draft: emptyDraft,
  isSaving: false,
  isGeneratingPdf: false,

  setCustomer: (data) =>
    set((state) => ({ draft: { ...state.draft, ...data } })),

  addItem: () =>
    set((state) => ({
      draft: {
        ...state.draft,
        items: [
          ...state.draft.items,
          {
            tempId: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
            product_name: '',
            variant_name: '',
            quantity: 1,
            unit_price: 0,
            sub_total: 0,
          },
        ],
      },
    })),

  updateItem: (tempId, field, value) =>
    set((state) => {
      const items = state.draft.items.map((item) => {
        if (item.tempId !== tempId) return item;
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unit_price') {
          updated.sub_total = calculateItemSubTotal(
            Number(updated.quantity) || 0,
            Number(updated.unit_price) || 0
          );
        }
        return updated;
      });
      return { draft: recalculate({ ...state.draft, items }) };
    }),

  removeItem: (tempId) =>
    set((state) => ({
      draft: recalculate({
        ...state.draft,
        items: state.draft.items.filter((i) => i.tempId !== tempId),
      }),
    })),

  setDiscount: (amount) =>
    set((state) => ({ draft: recalculate({ ...state.draft, discount_amount: amount }) })),

  setShipping: (amount) =>
    set((state) => ({ draft: recalculate({ ...state.draft, shipping_cost: amount }) })),

  setNotes: (notes) => set((state) => ({ draft: { ...state.draft, notes } })),

  setStatus: (status) => set((state) => ({ draft: { ...state.draft, status } })),

  resetDraft: () => set({ draft: emptyDraft }),

  setSaving: (val) => set({ isSaving: val }),
  setGeneratingPdf: (val) => set({ isGeneratingPdf: val }),
  loadSavedInvoice: (invoice) => {
    const items = (invoice.items || []).map((item) => {
      const quantity = Number(item.quantity) || 0;
      const sub_total = Number(item.sub_total) || 0;
      const unit_price = quantity > 0 ? Math.round((sub_total / quantity) * 100) / 100 : 0;
      return {
        tempId: item.item_id ? item.item_id.toString() : Math.random().toString(36).substring(2, 15),
        product_name: item.product_name,
        variant_name: item.variant_name,
        quantity,
        unit_price,
        sub_total,
        details: item.details || undefined,
      };
    });

    set({
      draft: {
        customer_id: invoice.customer_id || undefined,
        customer_name: invoice.customer_name,
        customer_phone: invoice.customer_phone || '',
        customer_phone_2: invoice.customer_phone_2 || undefined,
        customer_address: invoice.customer_address || undefined,
        invoice_date: invoice.invoice_date,
        items,
        sub_total: Number(invoice.sub_total) || 0,
        discount_amount: Number(invoice.discount_amount) || 0,
        shipping_cost: Number(invoice.shipping_cost) || 0,
        final_total: Number(invoice.final_total) || 0,
        status: (invoice.status || 'قيد الانتظار') as InvoiceDraft['status'],
        notes: invoice.notes || undefined,
      },
    });
  },
}));
