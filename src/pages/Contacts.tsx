import React, { useEffect } from 'react';
import { Search, Eye } from 'lucide-react';
import { useContactsStore } from '../store/useContactsStore';
import { useNavigate } from 'react-router-dom';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';

export default function Contacts() {
  const {
    contacts,
    isLoading,
    searchQuery,
    setSearchQuery,
    fetchContacts
  } = useContactsStore();

  const navigate = useNavigate();

  useEffect(() => {
    fetchContacts();
  }, []);

  const handleOpenDetails = (customerId: string) => {
    navigate(`/customers/${customerId}`);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 pb-16">
      {/* الهيدر وبحث */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">إدارة جهات الاتصال والعملاء</h1>
          <p className="text-gray-400 mt-1 text-xs font-semibold">استعراض وتفقد سجلات العملاء المسجلين، فواتير الشراء وعناوين الشحن</p>
        </div>

        {/* شريط البحث */}
        <div className="w-full md:w-80 relative">
          <Input
            placeholder="البحث بالاسم أو رقم الهاتف..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
          <Search className="w-4 h-4 text-gray-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* جدول العملاء */}
      <div className="glass rounded-3xl overflow-hidden">
        {isLoading && contacts.length === 0 ? (
          <div className="py-20 text-center text-gray-500 text-xs font-semibold">جارٍ تحميل بيانات العملاء...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-gray-800/60 text-xs text-gray-400 font-semibold bg-gray-900/10">
                  <th className="py-4 pr-6">العميل</th>
                  <th className="py-4">رقم الهاتف الأساسى</th>
                  <th className="py-4">رقم الهاتف الاحتياطى</th>
                  <th className="py-4">العنوان المسجل</th>
                  <th className="py-4">تاريخ التسجيل</th>
                  <th className="py-4 pl-6 text-center">تفاصيل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/40 text-xs text-gray-300">
                {contacts.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-900/10 transition-all">
                    <td className="py-4 pr-6 font-bold text-white">
                      {c.name}
                    </td>
                    <td className="py-4 font-semibold text-gray-200">{c.phone}</td>
                    <td className="py-4 text-gray-400">{c.customer_phone_2 || '-'}</td>
                    <td className="py-4 text-gray-400 max-w-xs truncate">{c.address || '-'}</td>
                    <td className="py-4 text-gray-500">
                      {new Date(c.createdAt).toLocaleDateString('ar-EG')}
                    </td>
                    <td className="py-4 pl-6 text-center">
                      <button
                        onClick={() => handleOpenDetails(c.id)}
                        className="p-2 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded-xl transition-all inline-flex items-center gap-1.5 active:scale-95"
                      >
                        <Eye className="w-4 h-4" />
                        مشاهدة
                      </button>
                    </td>
                  </tr>
                ))}
                {contacts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-500">
                      لا يوجد أي عملاء يطابقون بحثك
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>



    </div>
  );
}
