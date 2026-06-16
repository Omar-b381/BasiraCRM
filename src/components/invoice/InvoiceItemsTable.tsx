import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, ChevronDown } from 'lucide-react';
import { useInvoiceStore } from '../../store/useInvoiceStore';
import { formatCurrency } from '../../lib/invoiceCalculations';
import type { InvoiceItemDraft } from '../../types/invoice.types';

interface InvoiceItemRowProps {
  item: InvoiceItemDraft;
  onUpdate: (field: keyof InvoiceItemDraft, value: any) => void;
  onRemove: () => void;
}

function InvoiceItemRow({ item, onUpdate, onRemove }: InvoiceItemRowProps) {
  const [productQuery, setProductQuery] = useState(item.product_name);
  const [matchingProducts, setMatchingProducts] = useState<any[]>([]);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  
  const [variants, setVariants] = useState<any[]>([]);
  const [showVariantDropdown, setShowVariantDropdown] = useState(false);

  const productDropdownRef = useRef<HTMLTableCellElement>(null);
  const variantDropdownRef = useRef<HTMLTableCellElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Sync state if product name changes from outside (e.g. reload invoice)
  useEffect(() => {
    setProductQuery(item.product_name);
  }, [item.product_name]);

  // Load variants when product name changes
  useEffect(() => {
    if (!item.product_name || item.product_name.trim() === '') {
      setVariants([]);
      return;
    }
    const loadVariants = async () => {
      try {
        const res = await window.electronAPI.invoice.getProductVariants(item.product_name);
        if (res.success) {
          setVariants(res.data || []);
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadVariants();
  }, [item.product_name]);

  // Click outside listener to close dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (productDropdownRef.current && !productDropdownRef.current.contains(event.target as Node)) {
        setShowProductDropdown(false);
      }
      if (variantDropdownRef.current && !variantDropdownRef.current.contains(event.target as Node)) {
        setShowVariantDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleProductChange = (value: string) => {
    setProductQuery(value);
    onUpdate('product_name', value);

    // Debounced search
    clearTimeout(searchTimeoutRef.current);
    if (value.trim().length === 0) {
      setMatchingProducts([]);
      setShowProductDropdown(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await window.electronAPI.invoice.searchProducts(value.trim());
        if (res.success) {
          setMatchingProducts(res.data || []);
          setShowProductDropdown(true);
        }
      } catch (err) {
        console.error(err);
      }
    }, 250);
  };

  const handleSelectProduct = (productName: string) => {
    setProductQuery(productName);
    onUpdate('product_name', productName);
    setShowProductDropdown(false);
  };

  const handleSelectVariant = (variantName: string, price: number) => {
    onUpdate('variant_name', variantName);
    onUpdate('unit_price', price);
    setShowVariantDropdown(false);
  };

  return (
    <tr className="border-b border-slate-800/50 hover:bg-slate-800/10">
      {/* Product Name Input with Autocomplete dropdown */}
      <td className="py-3 px-2 relative" ref={productDropdownRef}>
        <input
          value={productQuery}
          onChange={(e) => handleProductChange(e.target.value)}
          onFocus={async () => {
            try {
              const res = await window.electronAPI.invoice.searchProducts(productQuery.trim());
              if (res.success) {
                setMatchingProducts(res.data || []);
                setShowProductDropdown(true);
              }
            } catch (err) {
              console.error(err);
            }
          }}
          placeholder="اسم المنتج أو الصنف"
          className="w-full bg-slate-950 text-white rounded-lg px-3 py-2 text-sm outline-none border border-slate-800 focus:border-indigo-500"
        />
        {showProductDropdown && matchingProducts.length > 0 && (
          <div className="absolute z-50 w-[95%] mt-1 bg-slate-950 border border-slate-800 rounded-lg overflow-hidden shadow-2xl max-h-48 overflow-y-auto">
            {matchingProducts.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => handleSelectProduct(p.name)}
                className="w-full text-right px-3 py-2 hover:bg-slate-800 transition-colors text-xs text-white border-b border-slate-900/50 last:border-none"
              >
                {p.name}
              </button>
            ))}
          </div>
        )}
      </td>

      {/* Variant Name Input: Dropdown if variants exist, otherwise free text */}
      <td className="py-3 px-2 relative" ref={variantDropdownRef}>
        {variants.length > 0 ? (
          <div>
            <button
              type="button"
              onClick={() => setShowVariantDropdown(!showVariantDropdown)}
              className="w-full bg-slate-950 text-white rounded-lg px-3 py-2.5 text-xs outline-none border border-slate-800 focus:border-indigo-500 text-right flex items-center justify-between"
            >
              <span className="truncate">{item.variant_name || 'اختر المتغير (مقاس/لون)...'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0 mr-1" />
            </button>
            {showVariantDropdown && (
              <div className="absolute z-50 w-[95%] mt-1 bg-slate-950 border border-slate-800 rounded-lg overflow-hidden shadow-2xl max-h-48 overflow-y-auto">
                {variants.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => handleSelectVariant(v.variant_name, Number(v.price))}
                    className="w-full text-right px-3 py-2 hover:bg-slate-800 transition-colors text-xs text-white border-b border-slate-900/50 last:border-none flex justify-between items-center"
                  >
                    <span>{v.variant_name}</span>
                    <span className="text-indigo-400 font-mono">{formatCurrency(Number(v.price))}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <input
            value={item.variant_name || ''}
            onChange={(e) => onUpdate('variant_name', e.target.value)}
            placeholder="مثال: XL أحمر"
            className="w-full bg-slate-950 text-white rounded-lg px-3 py-2 text-sm outline-none border border-slate-800 focus:border-indigo-500"
          />
        )}
      </td>

      {/* Quantity */}
      <td className="py-3 px-2">
        <input
          type="number"
          min={1}
          value={item.quantity === 0 ? '' : item.quantity}
          onChange={(e) => onUpdate('quantity', parseFloat(e.target.value) || 0)}
          placeholder="1"
          className="w-full bg-slate-950 text-white rounded-lg px-3 py-2 text-sm outline-none border border-slate-800 focus:border-indigo-500 text-center font-mono"
        />
      </td>

      {/* Unit Price */}
      <td className="py-3 px-2">
        <input
          type="number"
          min={0}
          value={item.unit_price === 0 ? '' : item.unit_price}
          onChange={(e) => onUpdate('unit_price', parseFloat(e.target.value) || 0)}
          placeholder="0.00"
          className="w-full bg-slate-950 text-white rounded-lg px-3 py-2 text-sm outline-none border border-slate-800 focus:border-indigo-500 text-right font-mono"
        />
      </td>

      {/* Sub Total */}
      <td className="py-3 px-2 text-slate-300 font-semibold whitespace-nowrap font-mono">
        {formatCurrency(item.sub_total)}
      </td>

      {/* Delete button */}
      <td className="py-3 px-2">
        <button
          type="button"
          onClick={onRemove}
          className="p-2 text-red-400 hover:bg-red-950/30 rounded-lg transition-colors"
          title="حذف الصنف"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
}

export default function InvoiceItemsTable() {
  const { draft, addItem, updateItem, removeItem } = useInvoiceStore();

  // إضافة صف فارغ تلقائياً بمجرد البدء في تعبئة الصف الأخير
  useEffect(() => {
    if (draft.items.length === 0) {
      addItem();
      return;
    }
    const lastItem = draft.items[draft.items.length - 1];
    if (lastItem && lastItem.product_name && lastItem.product_name.trim() !== '') {
      addItem();
    }
  }, [draft.items, addItem]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl overflow-visible">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold">بنود الفاتورة</h3>
        <button
          type="button"
          onClick={addItem}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all"
        >
          <Plus className="w-4 h-4" />
          إضافة صنف
        </button>
      </div>

      <div className="overflow-visible">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-400 text-right border-b border-slate-800">
              <th className="py-3 px-2 font-medium">الصنف *</th>
              <th className="py-3 px-2 font-medium">المتغير (مقاس/لون)</th>
              <th className="py-3 px-2 font-medium w-24">الكمية *</th>
              <th className="py-3 px-2 font-medium w-32">سعر الوحدة *</th>
              <th className="py-3 px-2 font-medium w-32">الإجمالي</th>
              <th className="py-3 px-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {draft.items.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-slate-500 py-10">
                  لا توجد أصناف حالياً — اضغط على "إضافة صنف" للبدء في تعبئة الفاتورة
                </td>
              </tr>
            ) : (
              draft.items.map((item) => (
                <InvoiceItemRow
                  key={item.tempId}
                  item={item}
                  onUpdate={(field, val) => updateItem(item.tempId, field, val)}
                  onRemove={() => removeItem(item.tempId)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
