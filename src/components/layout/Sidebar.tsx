import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, MessageSquare, BarChart3, Settings, Bot, FileText } from 'lucide-react';
import { clsx } from 'clsx';

export default function Sidebar() {
  const menuItems = [
    { name: 'لوحة التحكم', path: '/', icon: LayoutDashboard },
    { name: 'جهات الاتصال', path: '/contacts', icon: Users },
    { name: 'محادثات واتساب', path: '/whatsapp', icon: MessageSquare },
    { name: 'تحليل العملاء RFM', path: '/rfm', icon: BarChart3 },
    { name: 'الفواتير والطباعة', path: '/invoices', icon: FileText },
    { name: 'إعدادات النظام', path: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-gray-900 border-l border-gray-800 flex flex-col h-screen shrink-0">
      {/* هيدر الشريط الجانبي */}
      <div className="flex items-center gap-3 px-6 py-8 border-b border-gray-800/60 bg-gray-950/20">
        <div className="w-10 h-10 rounded-2xl bg-indigo-600/10 flex items-center justify-center border border-indigo-500/20">
          <Bot className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-base font-bold text-white tracking-wide leading-none">بصيرة CRM</h1>
          <span className="text-[10px] text-gray-500 font-semibold mt-1 block">إدارة ذكية ومبيعات أسرع</span>
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
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all duration-200 group active:scale-98',
                  {
                    'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-lg shadow-indigo-600/5': isActive,
                    'text-gray-400 hover:text-white hover:bg-gray-800/40 border border-transparent': !isActive,
                  }
                )
              }
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* الفوتر الجانبي */}
      <div className="p-4 border-t border-gray-800/60 text-center bg-gray-950/20">
        <p className="text-[10px] text-gray-600 font-medium">بصيرة CRM v1.0.0</p>
      </div>
    </aside>
  );
}
