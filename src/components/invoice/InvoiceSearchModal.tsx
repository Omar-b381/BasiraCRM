import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Loader2, Calendar, User, Phone, DollarSign, RefreshCw } from 'lucide-react';
import { formatCurrency } from '../../lib/invoiceCalculations';

interface SearchResult {
  invoice_id: number;
  customer_name: string;
  customer_phone: string | null;
  invoice_date: string;
  final_total: number;
  status: string | null;
}

interface InvoiceSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (invoiceId: number) => void;
}

export default function InvoiceSearchModal({ isOpen, onClose, onSelect }: InvoiceSearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!isOpen) return;
    
    // Clear state on open
    setQuery('');
    setResults([]);
    setError(null);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    if (query.trim() === '') {
      setResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await window.electronAPI.invoice.search(query.trim());
        if (res.success) {
          setResults(res.data || []);
        } else {
          setError(res.error || 'فشل البحث عن الفواتير');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'خطأ في عملية البحث');
      } finally {
        setIsLoading(false);
      }
    }, 400);

    return () => clearTimeout(debounceRef.current);
  }, [query, isOpen]);

  if (!isOpen) return null;

  const formatDate = (isoDate: string) => {
    return new Date(isoDate).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm" dir="rtl">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h3 className="text-lg font-semibold text-white">بحث عن فاتورة سابقة لإعادة طباعتها</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-850 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-6 pb-2 border-b border-slate-850 bg-slate-900/50">
          <div className="relative">
            <Search className="absolute right-3.5 top-3.5 w-5 h-5 text-slate-500" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث برقم الفاتورة، اسم العميل، أو رقم الهاتف..."
              className="w-full bg-slate-950 text-white rounded-xl py-3 pr-11 pl-4 outline-none border border-slate-800 focus:border-indigo-500 text-sm"
            />
          </div>
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
              <p className="text-sm">جاري جلب الفواتير السابقة...</p>
            </div>
          )}

          {!isLoading && error && (
            <div className="bg-red-900/20 border border-red-800/40 text-red-400 rounded-xl p-4 text-sm text-center">
              {error}
            </div>
          )}

          {!isLoading && results.length === 0 && query.trim() !== '' && (
            <div className="text-center py-12 text-slate-500">
              <p className="text-sm font-medium">لم يتم العثور على أي فواتير تطابق استعلامك.</p>
              <p className="text-xs mt-1 text-slate-650">تحقق من كتابة الاسم أو رقم الفاتورة بشكل صحيح.</p>
            </div>
          )}

          {!isLoading && results.length === 0 && query.trim() === '' && (
            <div className="text-center py-16 text-slate-500">
              <p className="text-sm">أدخل نص البحث للبدء...</p>
            </div>
          )}

          {!isLoading && results.length > 0 && (
            <div className="space-y-2.5">
              {results.map((invoice) => (
                <button
                  key={invoice.invoice_id}
                  onClick={() => {
                    onSelect(invoice.invoice_id);
                    onClose();
                  }}
                  className="w-full text-right bg-slate-950 hover:bg-slate-850 border border-slate-850 hover:border-slate-800 rounded-xl p-4 transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-3 group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="bg-indigo-600/20 text-indigo-400 text-xs font-mono font-bold px-2 py-0.5 rounded border border-indigo-500/20">
                        #{invoice.invoice_id}
                      </span>
                      <h4 className="text-white font-medium group-hover:text-indigo-400 transition-colors">
                        {invoice.customer_name}
                      </h4>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-400 text-xs">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        {formatDate(invoice.invoice_date)}
                      </span>
                      {invoice.customer_phone && (
                        <span className="flex items-center gap-1 font-mono">
                          <Phone className="w-3.5 h-3.5 text-slate-500" />
                          {invoice.customer_phone}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-3 border-t md:border-none border-slate-900 pt-2.5 md:pt-0">
                    <div className="text-right">
                      <p className="text-xs text-slate-500">الإجمالي النهائي</p>
                      <p className="text-sm font-semibold text-emerald-400 font-mono">
                        {formatCurrency(invoice.final_total)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        invoice.status === 'تم التسليم' ? 'bg-emerald-500/15 text-emerald-400' :
                        invoice.status === 'قيد الانتظار' ? 'bg-amber-500/15 text-amber-400' :
                        invoice.status === 'ملغاة' ? 'bg-red-500/15 text-red-400' :
                        'bg-blue-500/15 text-blue-400'
                      }`}>
                        {invoice.status || 'معلقة'}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
