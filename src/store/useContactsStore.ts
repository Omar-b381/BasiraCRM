import { create } from 'zustand';
import type { Contact } from '../types/contact.types';

interface ContactsState {
  contacts: Contact[];
  selectedContact: Contact | null;
  selectedContactInvoices: any[];
  isLoading: boolean;
  searchQuery: string;
  error: string | null;
  fetchContacts: (search?: string) => Promise<void>;
  fetchContactById: (id: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  clearSelectedContact: () => void;
}

export const useContactsStore = create<ContactsState>((set, get) => ({
  contacts: [],
  selectedContact: null,
  selectedContactInvoices: [],
  isLoading: false,
  searchQuery: '',
  error: null,

  fetchContacts: async (search) => {
    set({ isLoading: true, error: null });
    try {
      const res = await window.electronAPI.db.getContacts({ search });
      if (res.success) {
        // Map database schema values to Contact interface structure
        const mappedContacts: Contact[] = res.data.map((c: any) => {
          const activeInvoices = (c.invoices || []).filter((inv: any) => inv.status !== 'ملغاة');
          return {
            id: c.customer_id,
            name: c.name,
            phone: c.phone,
            address: c.address,
            email: c.email || '',
            customer_phone_2: c.customer_phone_2 || '',
            purchaseCount: activeInvoices.length,
            totalSpend: activeInvoices.reduce((sum: number, inv: any) => sum + (inv.final_total || 0), 0),
            createdAt: c.created_at,
            tags: []
          };
        });
        set({ contacts: mappedContacts, isLoading: false });
      } else {
        set({ error: res.error || 'فشل تحميل جهات الاتصال', isLoading: false });
      }
    } catch (err) {
      set({ error: 'خطأ أثناء الاتصال بقاعدة البيانات', isLoading: false });
    }
  },

  fetchContactById: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const res = await window.electronAPI.db.getContactById(id);
      if (res.success) {
        const c = res.customer;
        const mappedContact: Contact = {
          id: c.customer_id,
          name: c.name,
          phone: c.phone,
          address: c.address,
          email: c.email || '',
          customer_phone_2: c.customer_phone_2 || '',
          purchaseCount: res.invoices?.length || 0,
          totalSpend: res.invoices?.reduce((sum: number, inv: any) => sum + (inv.final_total || 0), 0) || 0,
          createdAt: c.created_at,
          tags: []
        };
        set({
          selectedContact: mappedContact,
          selectedContactInvoices: res.invoices || [],
          isLoading: false
        });
      } else {
        set({ error: res.error || 'فشل جلب تفاصيل العميل', isLoading: false });
      }
    } catch (err) {
      set({ error: 'خطأ أثناء الاتصال بقاعدة البيانات', isLoading: false });
    }
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
    get().fetchContacts(query);
  },

  clearSelectedContact: () => {
    set({ selectedContact: null, selectedContactInvoices: [] });
  }
}));
