import React from 'react';
import { Sparkles, ShoppingBag, DollarSign, Package } from 'lucide-react';
import type { ProductFrequency } from '../../types/customer-profile.types';

interface TopProductsTabProps {
  products: ProductFrequency[];
}

export default function TopProductsTab({ products }: TopProductsTabProps) {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
      maximumFractionDigits: 0
    }).format(val).replace('ج.م.', 'ج.م');
  };

  if (products.length === 0) {
    return (
      <div className="py-16 text-center space-y-3 bg-[#0a071e]/5 rounded-3xl border border-white/5" dir="rtl">
        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto">
          <Package className="w-6 h-6 text-gray-500" />
        </div>
        <div>
          <p className="text-sm font-bold text-white">لا توجد بيانات مشتريات للمنتجات</p>
          <p className="text-xs text-gray-400 font-semibold mt-1">عند تأكيد فواتير للعميل ستظهر قائمة منتجاته المفضلة هنا.</p>
        </div>
      </div>
    );
  }

  // Find max quantity to calculate relative percentages
  const maxQty = products.length > 0 ? Math.max(...products.map(p => p.total_quantity)) : 1;

  return (
    <div className="space-y-4" dir="rtl">
      {/* Description Header */}
      <div className="bg-[#0a071e]/5 p-4 rounded-3xl border border-white/5">
        <h4 className="text-xs font-bold text-white">تحليل تفضيل المنتجات والطلبات</h4>
        <p className="text-[9px] text-gray-500 font-semibold mt-0.5">قائمة بالمنتجات الأكثر شراءً وتكراراً من قبل العميل مرتبة تنازلياً</p>
      </div>

      {/* Grid of Products */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {products.map((prod, idx) => {
          const percentage = Math.round((prod.total_quantity / maxQty) * 100);
          
          return (
            <div 
              key={idx}
              className="glass rounded-3xl p-5 border border-white/5 hover:border-orange-500/20 transition-all flex flex-col justify-between gap-4 bg-[#0a071e]/5"
            >
              {/* Product Info */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-white">{prod.product_name}</p>
                  <div className="flex items-center gap-3 text-[9px] text-gray-500 font-semibold">
                    <span className="flex items-center gap-0.5">
                      <ShoppingBag className="w-3.5 h-3.5" />
                      مرات الطلب: {prod.times_ordered}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Package className="w-3.5 h-3.5" />
                      الكمية الإجمالية: {prod.total_quantity}
                    </span>
                  </div>
                </div>
                
                <span className="text-xs font-extrabold text-orange-400 shrink-0">
                  {formatCurrency(prod.total_spent)}
                </span>
              </div>

              {/* Progress Indicator */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[9px] font-bold text-gray-400">
                  <span>الأفضلية النسبية:</span>
                  <span>{percentage}%</span>
                </div>
                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden p-0.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-l from-orange-500 to-[#FF6632] shadow-[0_0_8px_rgba(255,102,50,0.3)] transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
