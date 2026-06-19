import React from 'react';
import { DollarSign, ShoppingBag, BarChart3, Clock } from 'lucide-react';
import type { CustomerProfile } from '../../types/customer-profile.types';

interface CustomerKPIStripProps {
  profile: CustomerProfile;
}

export default function CustomerKPIStrip({ profile }: CustomerKPIStripProps) {
  // Format currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
      maximumFractionDigits: 0
    }).format(val).replace('ج.م.', 'ج.م');
  };

  // Recency formatting
  const formatRecency = (days?: number) => {
    if (days === undefined || days === null) return 'لا يوجد';
    if (days === 0) return 'اليوم';
    if (days === 1) return 'أمس';
    if (days === 2) return 'منذ يومين';
    if (days >= 3 && days <= 10) return `منذ ${days} أيام`;
    return `منذ ${days} يوماً`;
  };

  const kpis = [
    {
      title: 'إجمالي الإنفاق',
      value: formatCurrency(profile.totalSpent),
      icon: DollarSign,
      color: '#FF6632',
      bgColor: 'rgba(255, 102, 50, 0.08)',
      glowColor: 'rgba(255, 102, 50, 0.15)'
    },
    {
      title: 'عدد الطلبات الناجحة',
      value: `${profile.totalOrders} طلب`,
      icon: ShoppingBag,
      color: '#3B82F6',
      bgColor: 'rgba(59, 130, 246, 0.08)',
      glowColor: 'rgba(59, 130, 246, 0.15)'
    },
    {
      title: 'متوسط قيمة الطلب',
      value: formatCurrency(profile.avgOrderValue),
      icon: BarChart3,
      color: '#10B981',
      bgColor: 'rgba(16, 185, 129, 0.08)',
      glowColor: 'rgba(16, 185, 129, 0.15)'
    },
    {
      title: 'آخر عملية شراء',
      value: formatRecency(profile.daysSinceLastPurchase),
      icon: Clock,
      color: '#8B5CF6',
      bgColor: 'rgba(139, 92, 246, 0.08)',
      glowColor: 'rgba(139, 92, 246, 0.15)'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" dir="rtl">
      {kpis.map((kpi, idx) => {
        const Icon = kpi.icon;
        return (
          <div 
            key={idx}
            className="glass rounded-3xl p-5 border border-white/5 flex items-center justify-between hover:scale-[1.02] transition-all relative overflow-hidden bg-[#0a071e]/5"
            style={{ boxShadow: `0 4px 20px ${kpi.glowColor}` }}
          >
            <div className="space-y-1.5 text-right">
              <p className="text-[10px] font-bold text-gray-400">{kpi.title}</p>
              <h3 className="text-base font-extrabold text-gray-50 leading-none">{kpi.value}</h3>
            </div>
            
            <div 
              className="w-10 h-10 rounded-2xl flex items-center justify-center border"
              style={{
                color: kpi.color,
                backgroundColor: kpi.bgColor,
                borderColor: `${kpi.color}25`
              }}
            >
              <Icon className="w-5 h-5" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
