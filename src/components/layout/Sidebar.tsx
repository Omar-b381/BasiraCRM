import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, MessageSquare, Megaphone, BarChart3, Settings, Bot, FileText, Truck, ClipboardCheck, ClipboardList, LogOut } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import TasksBadge from '../tasks/TasksBadge';

export default function Sidebar() {
  const { currentEmployee, logout } = useAuthStore();

  const menuItems = [
    { name: 'لوحة التحكم', path: '/', icon: LayoutDashboard, requiredPermission: 'view_reports' },
    { name: 'جهات الاتصال', path: '/contacts', icon: Users, requiredPermission: 'send_messages' },
    { name: 'محادثات واتساب', path: '/whatsapp', icon: MessageSquare, requiredPermission: 'send_messages' },
    { name: 'الحملات التسويقية', path: '/campaigns', icon: Megaphone, requiredPermission: 'send_messages' },
    { name: 'تحليل العملاء RFM', path: '/rfm', icon: BarChart3, requiredPermission: 'view_reports' },
    { name: 'الفواتير والطباعة',    path: '/invoices',         icon: FileText, requiredPermission: 'edit_invoices' },
    { name: 'تصدير الشحن',          path: '/shipping-export',  icon: Truck, requiredPermission: 'edit_invoices' },
    { name: 'متابعة ومطابقة الشحنات', path: '/order-tracking',  icon: ClipboardCheck, requiredPermission: 'edit_invoices' },
    { name: 'المهام والمتابعة',    path: '/tasks',            icon: ClipboardList, requiredPermission: 'manage_tasks' },
    { name: 'إعدادات النظام',       path: '/settings',         icon: Settings, requiredPermission: 'manage_settings' },
  ];

  // Filter items by employee permissions
  const filteredMenuItems = menuItems.filter(item => {
    if (!currentEmployee) return false;
    // Admin has access to everything
    if (currentEmployee.role === 'admin') return true;
    return currentEmployee.permissions?.includes(item.requiredPermission);
  });

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
        {filteredMenuItems.map((item) => {
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
              {item.path === '/tasks' && (
                <TasksBadge className="mr-auto" />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* معلومات الموظف وزر تسجيل الخروج */}
      {currentEmployee && (
        <div
          className="p-4 border-t space-y-3"
          style={{ borderColor: 'rgba(255,255,255,0.08)' }}
        >
          <div className="flex items-center justify-between gap-2 text-right">
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{currentEmployee.name}</p>
              <p className="text-[10px] text-gray-400 font-semibold truncate mt-0.5">
                {currentEmployee.role === 'admin'
                  ? 'مدير النظام 👑'
                  : currentEmployee.role === 'supervisor'
                  ? 'مشرف 🛡️'
                  : 'موظف دعم 💬'}
              </p>
            </div>
            <button
              onClick={() => logout()}
              title="تسجيل الخروج"
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
          <div className="text-center">
            <p className="text-[9px] font-medium" style={{ color: 'rgba(255,255,255,0.25)' }}>
              بصيرة CRM v1.0.0
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}
