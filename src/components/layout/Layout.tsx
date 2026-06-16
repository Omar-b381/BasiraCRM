import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function Layout() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-950 text-gray-100 font-sans" dir="rtl">
      {/* الشريط الجانبي */}
      <Sidebar />

      {/* المنطقة الرئيسية للمحتوى */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* الهيدر العلوي */}
        <TopBar />

        {/* مساحة عرض الصفحات */}
        <main className="flex-1 overflow-y-auto bg-gray-950/20">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
