import React, { useEffect, useState } from 'react';
import { Search, Eye, Phone, MapPin, Mail, Calendar, Receipt, Sparkles, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useContactsStore } from '../store/useContactsStore';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';

export default function Contacts() {
  const {
    contacts,
    selectedContact,
    selectedContactInvoices,
    isLoading,
    searchQuery,
    setSearchQuery,
    fetchContacts,
    fetchContactById,
    clearSelectedContact
  } = useContactsStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<number | null>(null);

  useEffect(() => {
    fetchContacts();
  }, []);

  const handleOpenDetails = async (customerId: string) => {
    await fetchContactById(customerId);
    setExpandedInvoiceId(null);
    setIsModalOpen(true);
  };

  const handleCloseDetails = () => {
    setIsModalOpen(false);
    clearSelectedContact();
  };

  const toggleInvoiceExpand = (invoiceId: number) => {
    setExpandedInvoiceId(expandedInvoiceId === invoiceId ? null : invoiceId);
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

      {/* مودال تفاصيل العميل السلوكية والمالية */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseDetails}
        title="ملف العميل وسجل المعاملات"
        size="lg"
      >
        {selectedContact && (
          <div className="space-y-6">
            
            {/* الكارت التعريفي للعميل */}
            <div className="p-6 bg-gray-900/40 border border-gray-800 rounded-3xl grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h2 className="text-lg font-bold text-white">{selectedContact.name}</h2>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <span>الأساسي: {selectedContact.phone}</span>
                </div>
                {selectedContact.customer_phone_2 && (
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Phone className="w-4 h-4 text-gray-500" />
                    <span>الاحتياطي: {selectedContact.customer_phone_2}</span>
                  </div>
                )}
                {selectedContact.email && (
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <span>البريد: {selectedContact.email}</span>
                  </div>
                )}
              </div>
              
              <div className="space-y-3">
                <div className="flex items-start gap-2 text-xs text-gray-400">
                  <MapPin className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
                  <span className="leading-relaxed">العنوان: {selectedContact.address || 'غير مسجل'}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span>تاريخ التسجيل: {new Date(selectedContact.createdAt).toLocaleDateString('ar-EG')}</span>
                </div>
                
                {/* خلاصة سلوكية */}
                <div className="flex gap-2.5 pt-2">
                  <div className="bg-indigo-600/10 border border-indigo-500/20 px-3 py-1.5 rounded-xl">
                    <span className="text-[10px] text-gray-400 block">إجمالي الطلبات</span>
                    <span className="text-sm font-extrabold text-indigo-400">{selectedContact.purchaseCount} فاتورة</span>
                  </div>
                  <div className="bg-emerald-600/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
                    <span className="text-[10px] text-gray-400 block">إجمالي الإنفاق</span>
                    <span className="text-sm font-extrabold text-emerald-400">{(selectedContact.totalSpend || 0).toLocaleString()} ج.م</span>
                  </div>
                </div>
              </div>
            </div>

            {/* سجل المبيعات والفواتير */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-indigo-400" />
                سجل الفواتير الصادرة للعميل ({selectedContactInvoices.length})
              </h3>

              <div className="space-y-3">
                {selectedContactInvoices.map((inv) => {
                  const isExpanded = expandedInvoiceId === inv.invoice_id;
                  return (
                    <div
                      key={inv.invoice_id}
                      className="border border-gray-800 rounded-2xl overflow-hidden bg-gray-900/10"
                    >
                      {/* رأس الفاتورة */}
                      <div
                        onClick={() => toggleInvoiceExpand(inv.invoice_id)}
                        className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-900/20 transition-all text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-extrabold text-gray-400">#{inv.invoice_id}</span>
                          <span className="text-gray-500">{new Date(inv.invoice_date).toLocaleDateString('ar-EG')}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-extrabold text-indigo-300">{(inv.final_total || 0).toLocaleString()} ج.م</span>
                          <Badge variant={inv.status === 'تسليم ناجح' ? 'emerald' : 'amber'}>
                            {inv.status || 'معلق'}
                          </Badge>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                        </div>
                      </div>

                      {/* تفاصيل المنتجات داخل الفاتورة عند التوسيع */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-1 bg-gray-900/30 border-t border-gray-800/60 text-xs">
                          {inv.notes && (
                            <div className="mb-3 p-3 bg-gray-950/40 border border-gray-800/80 rounded-xl text-gray-400">
                              <strong className="text-[10px] text-gray-300 block mb-1">ملاحظات الطلب:</strong>
                              {inv.notes}
                            </div>
                          )}

                          <div className="space-y-2">
                            <h4 className="text-[10px] font-bold text-gray-400 mb-1.5">عناصر الفاتورة (المنتجات):</h4>
                            <div className="divide-y divide-gray-800/40 border border-gray-800 rounded-xl overflow-hidden bg-gray-950/10">
                              {inv.invoice_items?.map((item: any, idx: number) => (
                                <div key={idx} className="p-3 flex items-center justify-between">
                                  <div className="space-y-0.5">
                                    <span className="font-bold text-white">{item.product_name}</span>
                                    {item.variant_name && (
                                      <span className="text-[10px] text-gray-500 block">الحجم/النوع: {item.variant_name}</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-6">
                                    <span className="text-gray-400">{item.quantity} × {item.details || 'قطعة'}</span>
                                    <span className="font-bold text-indigo-300">{item.sub_total?.toLocaleString()} ج.م</span>
                                  </div>
                                </div>
                              ))}
                              {(!inv.invoice_items || inv.invoice_items.length === 0) && (
                                <div className="p-3 text-center text-gray-600">لا توجد عناصر مسجلة لهذه الفاتورة</div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                    </div>
                  );
                })}
                {selectedContactInvoices.length === 0 && (
                  <div className="text-center py-6 text-gray-600 text-xs">لا يوجد أي فواتير مسجلة لهذا العميل بعد</div>
                )}
              </div>

            </div>

          </div>
        )}
      </Modal>

    </div>
  );
}
