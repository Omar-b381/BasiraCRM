import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Megaphone, History, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import { useRFM } from '../hooks/useRFM';
import { useAuthStore } from '../store/useAuthStore';
import { supabase } from '../lib/supabase';
import type { Campaign, CampaignProgress } from '../types/message.types';
import type { RFMSegment } from '../types/contact.types';

// Components
import CampaignBuilder from '../components/campaigns/CampaignBuilder';
import CampaignHistoryTable from '../components/campaigns/CampaignHistoryTable';
import CampaignProgressBar from '../components/campaigns/CampaignProgressBar';
import CampaignDetailDrawer from '../components/campaigns/CampaignDetailDrawer';

interface ActiveProgressType {
  campaignId: number;
  current: number;
  total: number;
  lastContactName: string;
  status: 'sending' | 'done' | 'error' | 'idle';
}

export default function Campaigns() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentEmployee } = useAuthStore();

  // Load RFM analyzed contacts
  const {
    analyzedContacts,
    isAnalyzing,
    runAnalysis
  } = useRFM();

  // Component state
  const [activeTab, setActiveTab] = useState<'build' | 'history'>('build');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);
  const [isLaunchingCampaign, setIsLaunchingCampaign] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selected campaign details for drawer
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [campaignLogs, setCampaignLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Live progress state
  const [activeProgress, setActiveProgress] = useState<ActiveProgressType>({
    campaignId: 0,
    current: 0,
    total: 0,
    lastContactName: '',
    status: 'idle'
  });

  // Extract initial values passed from RFM page router state
  const routeState = location.state as { segment?: RFMSegment; template?: string } | null;
  const initialSegment = routeState?.segment || 'champions';
  const initialTemplate = routeState?.template || '';

  // 1. Fetch campaigns and providers from Supabase
  const fetchCampaigns = async () => {
    setIsLoadingCampaigns(true);
    try {
      const { data, error: err } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (err) throw err;
      setCampaigns(data || []);
    } catch (err: any) {
      console.error('Error fetching campaigns:', err);
      setError('حدث خطأ أثناء تحميل سجل الحملات التسويقية.');
    } finally {
      setIsLoadingCampaigns(false);
    }
  };

  const fetchProviders = async () => {
    try {
      const { data, error: err } = await supabase
        .from('whatsapp_providers')
        .select('*');

      if (err) throw err;
      setProviders(data || []);
    } catch (err: any) {
      console.error('Error fetching providers:', err);
    }
  };

  useEffect(() => {
    runAnalysis();
    fetchCampaigns();
    fetchProviders();

    // Check if the route requested starting in the history tab
    if (routeState && !routeState.segment) {
      setActiveTab('history');
    }
  }, []);

  // 2. Setup Electron IPC listener for live campaign progress
  useEffect(() => {
    if (window.electronAPI && window.electronAPI.whatsapp) {
      window.electronAPI.whatsapp.onCampaignProgress((progress: any) => {
        setActiveProgress({
          campaignId: progress.campaignId,
          current: progress.current,
          total: progress.total,
          lastContactName: progress.lastContactName,
          status: progress.status
        });

        // If completed, refresh the campaigns list and update stats
        if (progress.status === 'done') {
          fetchCampaigns();
          setIsLaunchingCampaign(false);
        }
      });
    }
  }, []);

  // 3. Launch Campaign Handler
  const handleStartCampaign = async (payload: {
    name: string;
    segment: string;
    template: string;
    providerId: number | null;
    scheduledAt: string | null;
    contacts: any[];
  }) => {
    setError(null);
    setIsLaunchingCampaign(true);

    try {
      // 1. Save campaign metadata in Supabase
      const { data: newCampaign, error: campErr } = await supabase
        .from('campaigns')
        .insert({
          name: payload.name,
          provider_id: payload.providerId,
          template_content: payload.template,
          target_segment: payload.segment,
          status: payload.scheduledAt ? 'scheduled' : 'sending',
          scheduled_at: payload.scheduledAt,
          sent_count: 0,
          delivered_count: 0,
          read_count: 0,
          failed_count: 0
        })
        .select('id')
        .single();

      if (campErr) throw campErr;

      // If scheduled, we are done
      if (payload.scheduledAt) {
        setIsLaunchingCampaign(false);
        fetchCampaigns();
        setActiveTab('history');
        return;
      }

      // If sending now, initialize the progress overlay
      setActiveProgress({
        campaignId: newCampaign.id,
        current: 0,
        total: payload.contacts.length,
        lastContactName: '',
        status: 'sending'
      });

      // 2. Invoke bulk campaign sender in Electron backend
      const result = await window.electronAPI.whatsapp.sendBulkCampaign({
        campaignId: newCampaign.id,
        contacts: payload.contacts.map(c => ({ id: c.id, name: c.name, phone: c.phone })),
        messageTemplate: payload.template
      });

      if (!result.success) {
        throw new Error(result.error || 'فشل إطلاق معالج الإرسال');
      }

    } catch (err: any) {
      console.error('Error starting campaign:', err);
      setError(err.message || 'فشل في بدء إطلاق الحملة التسويقية.');
      setIsLaunchingCampaign(false);
      setActiveProgress(prev => ({ ...prev, status: 'error' }));
    }
  };

  // 4. View Campaign Details in side drawer
  const handleViewDetails = async (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setIsDrawerOpen(true);
    setIsLoadingLogs(true);

    try {
      const { data, error: logErr } = await supabase
        .from('notifications_log')
        .select('id, status, sent_at, message_content, customer_id, provider_id')
        .eq('campaign_id', campaign.id);

      if (logErr) throw logErr;

      // Map references to contacts and providers locally for robustness
      const mappedLogs = (data || []).map((log: any) => ({
        ...log,
        customers: analyzedContacts.find(c => c.id === log.customer_id) || { name: 'عميل غير معروف', phone: '' },
        whatsapp_providers: providers.find(p => p.id === log.provider_id) || { name: 'الافتراضية' }
      }));

      setCampaignLogs(mappedLogs);
    } catch (err) {
      console.error('Error loading campaign logs:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 pb-24" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-white">مدير الحملات التسويقية الذكي</h1>
            <Megaphone className="w-5.5 h-5.5 text-orange-500" />
          </div>
          <p className="text-gray-400 mt-1 text-xs font-semibold">
            أطلق حملات واتساب جماعية مخصصة ومجدولة لعملائك لزيادة المبيعات وإعادة التنشيط
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex bg-[#0b082c] border border-white/5 rounded-2xl p-1 shrink-0">
          <button
            onClick={() => setActiveTab('build')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'build'
                ? 'text-white bg-orange-600'
                : 'text-gray-700 hover:text-gray-900'
            }`}
            style={activeTab === 'build' ? { boxShadow: '0 4px 16px rgba(255,102,50,0.30)' } : {}}
          >
            <Sparkles className="w-4 h-4" />
            بناء حملة جديدة
          </button>
          
          <button
            onClick={() => {
              setActiveTab('history');
              fetchCampaigns();
            }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'history'
                ? 'text-white bg-orange-600'
                : 'text-gray-700 hover:text-gray-900'
            }`}
            style={activeTab === 'history' ? { boxShadow: '0 4px 16px rgba(255,102,50,0.30)' } : {}}
          >
            <History className="w-4 h-4" />
            سجل الحملات السابقة
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-rose-950/20 border border-rose-500/10 text-rose-400 rounded-3xl flex items-start gap-3 text-xs leading-relaxed">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div className="flex-1 font-semibold">
            <p className="font-bold">فشلت العملية</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Active sending progress banner */}
      {activeProgress.status !== 'idle' && (
        <div className="animate-fade-in">
          <CampaignProgressBar
            current={activeProgress.current}
            total={activeProgress.total}
            lastContactName={activeProgress.lastContactName}
            status={activeProgress.status}
            onClose={() => setActiveProgress(prev => ({ ...prev, status: 'idle' }))}
          />
        </div>
      )}

      {/* Main Content Pane */}
      {isAnalyzing ? (
        <div className="py-24 text-center space-y-4">
          <Loader2 className="w-10 h-10 text-orange-500 animate-spin mx-auto" />
          <p className="text-xs text-gray-400 font-bold">جاري تحميل وتحليل شرائح RFM للعملاء...</p>
        </div>
      ) : (
        <div className="transition-all duration-300">
          {activeTab === 'build' ? (
            <CampaignBuilder
              analyzedContacts={analyzedContacts}
              providers={providers}
              initialSegment={initialSegment}
              initialTemplate={initialTemplate}
              onStartCampaign={handleStartCampaign}
              isLoading={isLaunchingCampaign}
            />
          ) : (
            <CampaignHistoryTable
              campaigns={campaigns}
              onViewDetails={handleViewDetails}
              isLoading={isLoadingCampaigns}
            />
          )}
        </div>
      )}

      {/* Detail side drawer */}
      <CampaignDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedCampaign(null);
          setCampaignLogs([]);
        }}
        campaign={selectedCampaign}
        logs={campaignLogs}
        isLoadingLogs={isLoadingLogs}
      />
    </div>
  );
}
