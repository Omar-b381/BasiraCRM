import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, FileText, MessageSquare, Award, ShoppingBag, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { useRFM } from '../hooks/useRFM';
import type { CustomerProfile as CustomerProfileType } from '../types/customer-profile.types';
import type { Contact } from '../types/contact.types';

// Components
import CustomerProfileHeader from '../components/customers/CustomerProfileHeader';
import CustomerKPIStrip from '../components/customers/CustomerKPIStrip';
import OrderHistoryTab from '../components/customers/OrderHistoryTab';
import ConversationsTab from '../components/customers/ConversationsTab';
import RFMDetailTab from '../components/customers/RFMDetailTab';
import TopProductsTab from '../components/customers/TopProductsTab';

export default function CustomerProfile() {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();

  // Load RFM Hook to align scores
  const { analyzedContacts, runAnalysis, isAnalyzing: isAnalyzingRFM } = useRFM();

  // Page States
  const [profile, setProfile] = useState<CustomerProfileType | null>(null);
  const [activeTab, setActiveTab] = useState<'invoices' | 'conversations' | 'rfm' | 'products'>('invoices');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomerProfile = async () => {
    if (!customerId) return;
    setIsLoading(true);
    setError(null);

    try {
      // 1. Fetch backend profile KPIs, invoices, and top products
      const res = await window.electronAPI.db.getCustomerProfile(customerId);
      
      if (!res.success) {
        throw new Error(res.error || 'فشل جلب ملف بيانات العميل');
      }

      // 2. Fetch and run RFM analysis to get the سلوكي segment
      const rfmResult = await runAnalysis();
      const analyzedContactsList = rfmResult?.contactsWithScores || [];
      const matchedContact = analyzedContactsList.find((c: Contact) => c.id === customerId);

      const customerData = res.customer || {};

      const profileData: CustomerProfileType = {
        id: customerId,
        name: customerData.name || 'عميل غير معروف',
        phone: customerData.phone || '',
        phone2: customerData.customer_phone_2 || null,
        address: customerData.address || null,
        email: customerData.email || null,
        createdAt: customerData.created_at || new Date().toISOString(),
        totalSpent: res.totalSpent,
        totalOrders: res.totalOrders,
        avgOrderValue: res.avgOrderValue,
        lastPurchaseDate: res.lastPurchaseDate,
        daysSinceLastPurchase: res.daysSinceLastPurchase,
        invoices: res.invoices || [],
        topProducts: res.topProducts || [],
        rfmScore: matchedContact?.rfmScore
      };

      setProfile(profileData);
    } catch (err: any) {
      console.error('Error fetching customer profile:', err);
      setError(err.message || 'فشل تحميل بروفايل العميل الموحد.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerProfile();
  }, [customerId]);

  if (isLoading || isAnalyzingRFM) {
    return (
      <div className="py-32 text-center space-y-4" dir="rtl">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin mx-auto" />
        <p className="text-xs text-gray-400 font-bold">جاري تحميل بروفايل العميل وحساب الإحصائيات السلوكية 360°...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="p-8 max-w-2xl mx-auto py-24 text-center space-y-5" dir="rtl">
        <div className="w-14 h-14 rounded-full bg-rose-950/20 border border-rose-500/10 flex items-center justify-center mx-auto text-rose-400">
          <AlertCircle className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-white">حدث خطأ أثناء تحميل البيانات</h3>
          <p className="text-xs text-gray-400 font-semibold">{error || 'العميل المحدد غير موجود في قاعدة البيانات.'}</p>
        </div>
        <button
          onClick={() => navigate('/contacts')}
          className="px-5 py-2.5 bg-white/5 border border-white/5 hover:border-orange-500/25 text-gray-400 hover:text-orange-400 text-xs font-bold rounded-xl transition-all"
        >
          العودة لجهات الاتصال
        </button>
      </div>
    );
  }

  const tabs = [
    { id: 'invoices', label: '📦 تاريخ الطلبات', icon: FileText },
    { id: 'conversations', label: '💬 المحادثات الأخيرة', icon: MessageSquare },
    { id: 'rfm', label: '📊 تحليل RFM السلوكي', icon: Award },
    { id: 'products', label: '🛍️ المنتجات المفضلة', icon: ShoppingBag }
  ] as const;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 pb-20" dir="rtl">
      {/* Top Header Navigation */}
      <div className="flex items-center justify-between border-b border-white/5 pb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-all border border-white/5 flex items-center justify-center shrink-0"
            title="العودة للخلف"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              بروفايل العميل الموحد 360°
            </h1>
            <p className="text-gray-400 mt-1 text-xs font-semibold">
              شاشة موحدة تستعرض الملف التعريفي والتحليلي الكامل للعميل
            </p>
          </div>
        </div>
      </div>

      {/* Header Info Profile Card */}
      <CustomerProfileHeader profile={profile} />

      {/* KPI Stats Strip */}
      <CustomerKPIStrip profile={profile} />

      {/* Tabs & Content Section */}
      <div className="space-y-6">
        {/* Tab Switcher Controls */}
        <div className="flex bg-[#0b082c] border border-white/5 rounded-2xl p-1.5 self-start w-fit flex-wrap gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'text-white bg-orange-600'
                    : 'text-gray-700 hover:text-gray-900'
                }`}
                style={isActive ? { boxShadow: '0 4px 16px rgba(255,102,50,0.30)' } : {}}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Active Tab View */}
        <div className="transition-all duration-300">
          {activeTab === 'invoices' && (
            <OrderHistoryTab invoices={profile.invoices} />
          )}

          {activeTab === 'conversations' && (
            <ConversationsTab 
              phone={profile.phone} 
              customerId={profile.id} 
              customerName={profile.name} 
            />
          )}

          {activeTab === 'rfm' && (
            <RFMDetailTab rfmScore={profile.rfmScore} />
          )}

          {activeTab === 'products' && (
            <TopProductsTab products={profile.topProducts} />
          )}
        </div>
      </div>
    </div>
  );
}
