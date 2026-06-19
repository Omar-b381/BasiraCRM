import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, FileText, ClipboardList, Phone, MapPin, Mail, Calendar, User } from 'lucide-react';
import { RFM_SEGMENTS_CONFIG } from '../../types/rfm.types';
import type { CustomerProfile } from '../../types/customer-profile.types';

interface CustomerProfileHeaderProps {
  profile: CustomerProfile;
}

export default function CustomerProfileHeader({ profile }: CustomerProfileHeaderProps) {
  const navigate = useNavigate();

  // Get name initial for Avatar
  const initial = profile.name ? profile.name.trim().charAt(0) : '?';

  // Retrieve RFM segment info
  const segmentKey = profile.rfmScore?.segment || 'lost';
  const segmentInfo = RFM_SEGMENTS_CONFIG[segmentKey];

  // Actions
  const handleStartChat = () => {
    navigate('/whatsapp', {
      state: {
        selectPhone: profile.phone,
        selectContactId: profile.id,
        selectContactName: profile.name
      }
    });
  };

  const handleCreateInvoice = () => {
    navigate('/invoices', {
      state: {
        prefillCustomerId: profile.id,
        prefillCustomerName: profile.name,
        prefillCustomerPhone: profile.phone,
        prefillCustomerAddress: profile.address
      }
    });
  };

  const handleCreateTask = () => {
    navigate('/tasks', {
      state: {
        prefillCustomerId: profile.id,
        prefillCustomerName: profile.name
      }
    });
  };

  // Format joined date
  const joinedDate = new Date(profile.createdAt).toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long'
  });

  return (
    <div className="glass rounded-3xl p-6 relative overflow-hidden border border-white/5 bg-[#0a071e]/5" dir="rtl">
      {/* Decorative gradient overlay */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl pointer-events-none -ml-20 -mt-20"></div>

      <div className="flex flex-col md:flex-row items-center md:items-start gap-6 relative">
        {/* Avatar */}
        <div 
          className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-extrabold shadow-lg shrink-0"
          style={{
            background: segmentInfo 
              ? `linear-gradient(135deg, ${segmentInfo.color} 0%, #070033 100%)`
              : 'linear-gradient(135deg, #FF6632 0%, #070033 100%)',
            boxShadow: segmentInfo ? `0 8px 24px ${segmentInfo.color}15` : 'none'
          }}
        >
          {initial}
        </div>

        {/* Identity Details */}
        <div className="flex-1 text-center md:text-right space-y-3.5">
          <div className="flex flex-col md:flex-row items-center gap-3 justify-center md:justify-start">
            <h2 className="text-xl font-bold text-gray-50">{profile.name}</h2>
            
            {segmentInfo ? (
              <span 
                className="px-3 py-1 rounded-full text-[10px] font-bold border" 
                style={{
                  color: segmentInfo.color,
                  backgroundColor: `${segmentInfo.color}10`,
                  borderColor: `${segmentInfo.color}30`
                }}
              >
                {segmentInfo.nameAr}
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-white/5 border border-white/10 text-gray-400">
                غير مصنف بعد
              </span>
            )}
          </div>

          {/* Contact Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs font-semibold text-gray-500">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <Phone className="w-4 h-4 text-gray-400 shrink-0" />
              <span>{profile.phone}</span>
              {profile.phone2 && <span className="text-gray-400"> / {profile.phone2}</span>}
            </div>

            {profile.address && (
              <div className="flex items-center justify-center md:justify-start gap-2">
                <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                <span className="truncate">{profile.address}</span>
              </div>
            )}

            {profile.email && (
              <div className="flex items-center justify-center md:justify-start gap-2">
                <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                <span className="truncate">{profile.email}</span>
              </div>
            )}

            <div className="flex items-center justify-center md:justify-start gap-2 sm:col-span-2 lg:col-span-1">
              <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
              <span>عضو منذ: {joinedDate}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-row md:flex-col gap-2.5 shrink-0 w-full md:w-auto justify-center md:justify-end mt-4 md:mt-0">
          <button
            onClick={handleStartChat}
            className="flex-1 md:w-40 py-2.5 px-4 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 hover:brightness-110 transition-all shadow-md bg-emerald-600"
            style={{ boxShadow: '0 4px 12px rgba(18,140,126,0.2)' }}
          >
            <MessageSquare className="w-4 h-4" />
            💬 ابدأ محادثة
          </button>

          <button
            onClick={handleCreateInvoice}
            className="flex-1 md:w-40 py-2.5 px-4 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 hover:brightness-110 transition-all shadow-md bg-orange-600"
            style={{ boxShadow: '0 4px 12px rgba(255,102,50,0.2)' }}
          >
            <FileText className="w-4 h-4" />
            📄 فاتورة جديدة
          </button>

          <button
            onClick={handleCreateTask}
            className="flex-1 md:w-40 py-2.5 px-4 rounded-xl text-xs font-bold text-gray-900 flex items-center justify-center gap-2 bg-[#070033] hover:bg-[#0f074a] transition-all border border-white/10 shadow-md"
          >
            <ClipboardList className="w-4 h-4 text-gray-900" />
            مهمة جديدة
          </button>
        </div>
      </div>
    </div>
  );
}
