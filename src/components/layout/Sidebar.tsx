import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, MessageSquare, BarChart3, Settings, Bot, FileText, Truck } from 'lucide-react';
import { clsx } from 'clsx';

export default function Sidebar() {
  const menuItems = [
    { name: 'لوحة التحكم', path: '/', icon: LayoutDashboard },
    { name: 'جهات الاتصال', path: '/contacts', icon: Users },
    { name: 'محادثات واتساب', path: '/whatsapp', icon: MessageSquare },
    { name: 'تحليل العملاء RFM', path: '/rfm', icon: BarChart3 },
    { name: 'الفواتير والطباعة',    path: '/invoices',         icon: FileText },
    { name: 'تصدير الشحن',          path: '/shipping-export',  icon: Truck },
    { name: 'إعدادات النظام',       path: '/settings',         icon: Settings },
  ];

  return (
    <aside
      className="w-64 flex flex-col h-screen shrink-0"
      style={{ backgroundColor: '#070033' }}
    >
      {/* هيدر الشريط الجانبي */}
      <div
        className="flex items-center gap-3 px-6 py-8 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.08)' }}
      >
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center"
          style={{ background: '#FF6632', boxShadow: '0 4px 16px rgba(255,102,50,0.40)' }}
        >
          <Bot className="w-5 h-5" style={{ color: '#FFFFFF' }} />
        </div>
        <div>
          <h1 className="text-base font-bold tracking-wide leading-none" style={{ color: '#FFFFFF' }}>
            بصيرة CRM
          </h1>
          <span className="text-[10px] font-semibold mt-1 block" style={{ color: 'rgba(255,255,255,0.45)' }}>
            إدارة ذكية ومبيعات أسرع
          </span>
        </div>
      </div>

      {/* عناصر القائمة */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              style={({ isActive }) =>
                isActive
                  ? {
                      display: 'flex', alignItems: 'center', gap: '14px',
                      padding: '14px 16px', borderRadius: '16px',
                      fontSize: '14px', fontWeight: 700,
                      background: '#FF6632',
                      color: '#FFFFFF',
                      boxShadow: '0 4px 20px rgba(255,102,50,0.40)',
                      transition: 'all 0.2s',
                      textDecoration: 'none',
                    }
                  : {
                      display: 'flex', alignItems: 'center', gap: '14px',
                      padding: '14px 16px', borderRadius: '16px',
                      fontSize: '14px', fontWeight: 600,
                      color: 'rgba(255,255,255,0.65)',
                      transition: 'all 0.2s',
                      textDecoration: 'none',
                    }
              }
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                if (!el.getAttribute('aria-current')) {
                  el.style.background = 'rgba(255,255,255,0.08)';
                  el.style.color = '#FFFFFF';
                }
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                if (!el.getAttribute('aria-current')) {
                  el.style.background = 'transparent';
                  el.style.color = 'rgba(255,255,255,0.65)';
                }
              }}
            >
              <Icon className="w-5 h-5 shrink-0" style={{ color: 'inherit' }} />
              <span style={{ color: 'inherit' }}>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* الفوتر الجانبي */}
      <div
        className="p-4 border-t text-center"
        style={{ borderColor: 'rgba(255,255,255,0.08)' }}
      >
        <p className="text-[10px] font-medium" style={{ color: 'rgba(255,255,255,0.30)' }}>
          بصيرة CRM v1.0.0
        </p>
      </div>
    </aside>
  );
}
