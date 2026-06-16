import React, { useState, useRef, useEffect } from 'react';
import { Search, UserPlus, Check } from 'lucide-react';
import { useInvoiceStore } from '../../store/useInvoiceStore';

interface CustomerResult {
  customer_id: string;
  name: string;
  phone: string;
  address: string | null;
  customer_phone_2: string | null;
}

export default function CustomerSelector() {
  const { draft, setCustomer } = useInvoiceStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CustomerResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isNewCustomer, setIsNewCustomer] = useState(!draft.customer_id);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const res = await window.electronAPI.invoice.searchCustomer(query.trim());
      if (res.success) {
        setResults(res.data);
        setShowDropdown(true);
      }
    }, 350);
  }, [query]);

  const selectCustomer = (customer: CustomerResult) => {
    setCustomer({
      customer_id: customer.customer_id,
      customer_name: customer.name,
      customer_phone: customer.phone,
      customer_phone_2: customer.customer_phone_2 || undefined,
      customer_address: customer.address || undefined,
    });
    setIsNewCustomer(false);
    setShowDropdown(false);
    setQuery('');
  };

  const startNewCustomer = () => {
    setCustomer({
      customer_id: undefined,
      customer_name: '',
      customer_phone: '',
      customer_phone_2: undefined,
      customer_address: undefined,
    });
    setIsNewCustomer(true);
    setShowDropdown(false);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold">بيانات العميل</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsNewCustomer(false)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              !isNewCustomer ? 'bg-indigo-600 text-white' : 'bg-slate-850 text-slate-400 hover:text-slate-200'
            }`}
          >
            عميل موجود
          </button>
          <button
            type="button"
            onClick={startNewCustomer}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isNewCustomer ? 'bg-indigo-600 text-white' : 'bg-slate-850 text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            عميل جديد
          </button>
        </div>
      </div>

      {!isNewCustomer && (
        <div className="relative mb-4">
          <Search className="absolute right-3 top-3 w-4 h-4 text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث بالاسم أو رقم الهاتف..."
            className="w-full bg-slate-950 text-white rounded-lg py-2.5 pr-9 pl-3 outline-none border border-slate-800 focus:border-indigo-500 text-sm"
          />
          {showDropdown && results.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg overflow-hidden shadow-xl max-h-60 overflow-y-auto">
              {results.map((c) => (
                <button
                  key={c.customer_id}
                  type="button"
                  onClick={() => selectCustomer(c)}
                  className="w-full text-right px-4 py-2.5 hover:bg-slate-800 transition-colors flex items-center justify-between border-b border-slate-900 last:border-none"
                >
                  <div>
                    <p className="text-white text-sm font-medium">{c.name}</p>
                    <p className="text-slate-500 text-xs font-mono">{c.phone}</p>
                  </div>
                  {draft.customer_id === c.customer_id && <Check className="w-4 h-4 text-emerald-400" />}
                </button>
              ))}
            </div>
          )}
          {showDropdown && results.length === 0 && query.trim().length >= 2 && (
            <div className="absolute z-10 w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg p-3 text-center text-slate-500 text-sm">
              لا توجد نتائج مطابقة
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-slate-400 mb-1.5">اسم العميل *</label>
          <input
            value={draft.customer_name}
            onChange={(e) => setCustomer({ customer_name: e.target.value })}
            disabled={!isNewCustomer && !!draft.customer_id}
            className="w-full bg-slate-950 text-white rounded-lg px-4 py-2.5 text-sm outline-none border border-slate-800 focus:border-indigo-500 disabled:opacity-60"
            placeholder="الاسم الثلاثي أو الثنائي"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1.5">رقم الهاتف *</label>
          <input
            value={draft.customer_phone}
            onChange={(e) => setCustomer({ customer_phone: e.target.value })}
            dir="ltr"
            disabled={!isNewCustomer && !!draft.customer_id}
            className="w-full bg-slate-950 text-white rounded-lg px-4 py-2.5 text-sm outline-none border border-slate-800 focus:border-indigo-500 font-mono disabled:opacity-60 text-right"
            placeholder="01xxxxxxxxx"
          />
        </div>
        <div className="col-span-1 md:col-span-2">
          <label className="block text-sm text-slate-400 mb-1.5">العنوان</label>
          <input
            value={draft.customer_address || ''}
            onChange={(e) => setCustomer({ customer_address: e.target.value })}
            disabled={!isNewCustomer && !!draft.customer_id}
            className="w-full bg-slate-950 text-white rounded-lg px-4 py-2.5 text-sm outline-none border border-slate-800 focus:border-indigo-500 disabled:opacity-60"
            placeholder="المحافظة، المدينة، الشارع، تفاصيل الشحن..."
          />
        </div>
      </div>
    </div>
  );
}
