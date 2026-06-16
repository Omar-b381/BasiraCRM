import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, RotateCcw, ChevronDown } from 'lucide-react';
import { useInvoiceEditStore } from '../../store/useInvoiceEditStore';
import { formatCurrency } from '../../lib/invoiceCalculations';
import ConfirmDeleteItemModal from './ConfirmDeleteItemModal';

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  new: { label: 'جديد', color: 'bg-emerald-950 border border-emerald-800 text-emerald-400' },
  updated: { label: 'معدّل', color: 'bg-amber-950 border border-amber-800 text-amber-400' },
  deleted: { label: 'محذوف', color: 'bg-red-950 border border-red-800/60 text-red-400' },
  unchanged: { label: '', color: '' },
};

interface EditableItemRowProps {
  item: any;
  onUpdate: (field: string, value: any) => void;
  onRemove: () => void;
  isDeleted: boolean;
  actionInfo: { label: string; color: string };
  restoreItem: () => void;
}

function EditableItemRow({
  item,
  onUpdate,
  onRemove,
  isDeleted,
  actionInfo,
  restoreItem,
}: EditableItemRowProps) {
  const [productQuery, setProductQuery] = useState(item.product_name);
  const [matchingProducts, setMatchingProducts] = useState<any[]>([]);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [variants, setVariants] = useState<any[]>([]);
  const [showVariantDropdown, setShowVariantDropdown] = useState(false);

  const productDropdownRef = useRef<HTMLTableCellElement>(null);
  const variantDropdownRef = useRef<HTMLTableCellElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Sync state if product name changes from outside
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

  // Click outside to close dropdowns
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
    <tr className={`border-b border-slate-800/50 hover:bg-slate-800/10 ${isDeleted ? 'opacity-40' : ''}`}>
      {/* Action status label */}
      <td className="py-3 px-2 w-16">
        {actionInfo.label && (
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${actionInfo.color}`}>
            {actionInfo.label}
          </span>
        )}
      </td>

      {/* Product Name Autocomplete */}
      <td className="py-3 px-2 relative font-sans" ref={productDropdownRef}>
        <input
          value={productQuery}
          onChange={(e) => handleProductChange(e.target.value)}
          disabled={isDeleted}
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
          className="w-full bg-slate-950 text-white rounded-lg px-3 py-2 text-sm outline-none border border-slate-800 focus:border-indigo-500 disabled:opacity-50"
        />
        {showProductDropdown && matchingProducts.length > 0 && (
          <div className="absolute z-50 w-[95%] mt-1 bg-slate-950 border border-slate-800 rounded-lg overflow-hidden shadow-2xl max-h-48 overflow-y-auto">
            {matchingProducts.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => handleSelectProduct(p.name)}
                className="w-full text-right px-3 py-2 hover:bg-slate-850 transition-colors text-xs text-white border-b border-slate-900/50 last:border-none"
              >
                {p.name}
              </button>
            ))}
          </div>
        )}
      </td>

      {/* Variant Dropdown / Text */}
      <td className="py-3 px-2 relative" ref={variantDropdownRef}>
        {variants.length > 0 ? (
          <div>
            <button
              type="button"
              disabled={isDeleted}
              onClick={() => setShowVariantDropdown(!showVariantDropdown)}
              className="w-full bg-slate-950 text-white rounded-lg px-3 py-2 text-sm outline-none border border-slate-800 focus:border-indigo-500 text-right flex items-center justify-between disabled:opacity-50"
            >
              <span className="truncate">{item.variant_name || 'اختر المتغير...'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0 mr-1" />
            </button>
            {showVariantDropdown && !isDeleted && (
              <div className="absolute z-50 w-[95%] mt-1 bg-slate-950 border border-slate-800 rounded-lg overflow-hidden shadow-2xl max-h-48 overflow-y-auto">
                {variants.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => handleSelectVariant(v.variant_name, Number(v.price))}
                    className="w-full text-right px-3 py-2 hover:bg-slate-850 transition-colors text-xs text-white border-b border-slate-900/50 last:border-none flex justify-between items-center"
                  >
                    <span>{v.variant_name}</span>
                    <span className="text-indigo-400 font-mono text-[11px]">{formatCurrency(Number(v.price))}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <input
            value={item.variant_name || ''}
            onChange={(e) => onUpdate('variant_name', e.target.value)}
            disabled={isDeleted}
            placeholder="مثال: XL أحمر"
            className="w-full bg-slate-950 text-white rounded-lg px-3 py-2 text-sm outline-none border border-slate-800 focus:border-indigo-500 disabled:opacity-50"
          />
        )}
      </td>

      {/* Quantity */}
      <td className="py-3 px-2 w-24">
        <input
          type="number"
          min={1}
          value={item.quantity === 0 ? '' : item.quantity}
          onChange={(e) => onUpdate('quantity', parseFloat(e.target.value) || 0)}
          disabled={isDeleted}
          className="w-full bg-slate-950 text-white rounded-lg px-3 py-2 text-sm outline-none border border-slate-800 focus:border-indigo-500 text-center font-mono disabled:opacity-50"
        />
      </td>

      {/* Unit Price */}
      <td className="py-3 px-2 w-32">
        <input
          type="number"
          min={0}
          value={item.unit_price === 0 ? '' : item.unit_price}
          onChange={(e) => onUpdate('unit_price', parseFloat(e.target.value) || 0)}
          disabled={isDeleted}
          className="w-full bg-slate-950 text-white rounded-lg px-3 py-2 text-sm outline-none border border-slate-800 focus:border-indigo-500 text-right font-mono disabled:opacity-50"
        />
      </td>

      {/* Sub Total */}
      <td className="py-3 px-2 w-32 text-slate-300 font-medium whitespace-nowrap font-mono text-left">
        {formatCurrency(item.sub_total)}
      </td>

      {/* Actions (Delete/Restore) */}
      <td className="py-3 px-2 w-10 text-center">
        {isDeleted ? (
          <button
            type="button"
            onClick={restoreItem}
            title="استرجاع البند"
            className="p-2 text-indigo-400 hover:bg-indigo-950/40 border border-indigo-900/35 rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onRemove}
            title="حذف البند"
            className="p-2 text-red-400 hover:bg-red-950/40 border border-red-900/35 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </td>
    </tr>
  );
}

export default function EditableItemsTable() {
  const { state, addNewItem, updateItem, markItemDeleted, restoreItem } = useInvoiceEditStore();
  const [pendingDelete, setPendingDelete] = useState<{ tempId: string; name: string } | null>(null);

  if (!state) return null;

  const handleDeleteClick = (tempId: string, name: string, isNewUnsaved: boolean) => {
    // بند جديد لم يُحفظ بعد → حذف فوري بدون تأكيد (لا يوجد أثر في DB)
    if (isNewUnsaved) {
      markItemDeleted(tempId);
      return;
    }
    // بند موجود في DB → يتطلب تأكيداً صريحاً
    setPendingDelete({ tempId, name });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold text-sm">بنود الفاتورة</h3>
        <button
          onClick={addNewItem}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-550 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-lg shadow-indigo-650/15 transition-all"
        >
          <Plus className="w-4 h-4" />
          إضافة صنف
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-400 text-right border-b border-slate-800">
              <th className="py-2.5 px-2 font-medium w-16 text-right">الحالة</th>
              <th className="py-2.5 px-2 font-medium text-right">الصنف</th>
              <th className="py-2.5 px-2 font-medium text-right">المتغير</th>
              <th className="py-2.5 px-2 font-medium w-24 text-center">الكمية</th>
              <th className="py-2.5 px-2 font-medium w-32 text-right">السعر</th>
              <th className="py-2.5 px-2 font-medium w-32 text-left">الإجمالي</th>
              <th className="py-2.5 px-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {state.items.map((item) => {
              const isDeleted = item._action === 'deleted';
              const actionInfo = ACTION_LABELS[item._action] || { label: '', color: '' };

              return (
                <EditableItemRow
                  key={item.tempId}
                  item={item}
                  onUpdate={(field, value) => updateItem(item.tempId, field as any, value)}
                  onRemove={() => handleDeleteClick(item.tempId, item.product_name || 'صنف غير محدد الاسم', item.item_id === null)}
                  isDeleted={isDeleted}
                  actionInfo={actionInfo}
                  restoreItem={() => restoreItem(item.tempId)}
                />
              );
            })}
          </tbody>
        </table>
      </div>

      {pendingDelete && (
        <ConfirmDeleteItemModal
          itemName={pendingDelete.name}
          onConfirm={() => {
            markItemDeleted(pendingDelete.tempId);
            setPendingDelete(null);
          }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
