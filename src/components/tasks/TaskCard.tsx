import React from 'react';
import { 
  Phone, Users, Mail, MessageSquare, ClipboardList, AlertTriangle, 
  Clock, Trash2, Edit3, CheckCircle, Circle, MessageCircle, Bell 
} from 'lucide-react';
import type { Task, TaskPriority, TaskType } from '../../types/task.types';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useAuthStore } from '../../store/useAuthStore';
import Badge from '../ui/Badge';
import { useMessagesStore } from '../../store/useMessagesStore';
import { useNavigate } from 'react-router-dom';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: number) => void;
  onToggleComplete: (id: number) => void;
}

export default function TaskCard({ 
  task, 
  onEdit, 
  onDelete, 
  onToggleComplete 
}: TaskCardProps) {
  const { settings } = useSettingsStore();
  const employees = settings.employees || [];
  const { currentEmployee } = useAuthStore();
  const { conversations, setActiveConversation } = useMessagesStore();
  const navigate = useNavigate();

  // Resolve employee names
  const assigneeName = React.useMemo(() => {
    if (!task.assigned_to) return 'غير محدد';
    if (task.assigned_to === currentEmployee?.id) return 'أنت';
    return employees.find((e: any) => e.id === task.assigned_to)?.name || 'موظف غير معروف';
  }, [task.assigned_to, employees, currentEmployee]);

  const creatorName = React.useMemo(() => {
    if (!task.created_by) return 'النظام';
    if (task.created_by === currentEmployee?.id) return 'أنت';
    return employees.find((e: any) => e.id === task.created_by)?.name || 'موظف غير معروف';
  }, [task.created_by, employees, currentEmployee]);

  // Determine if task is overdue
  const isOverdue = React.useMemo(() => {
    if (task.status === 'مكتملة') return false;
    if (!task.due_date) return false;
    return new Date(task.due_date) < new Date();
  }, [task.due_date, task.status]);

  // Map task types to icons
  const getTypeIcon = (type: TaskType) => {
    switch (type) {
      case 'مكالمة':
        return <Phone className="w-3.5 h-3.5" />;
      case 'اجتماع':
        return <Users className="w-3.5 h-3.5" />;
      case 'بريد':
        return <Mail className="w-3.5 h-3.5" />;
      case 'واتساب':
        return <MessageCircle className="w-3.5 h-3.5" />;
      case 'متابعة':
        return <ClipboardList className="w-3.5 h-3.5" />;
      default:
        return <ClipboardList className="w-3.5 h-3.5" />;
    }
  };

  // Map priorities to badge variants
  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'عاجلة':
        return <Badge variant="red">{priority}</Badge>;
      case 'عالية':
        return <Badge variant="amber">{priority}</Badge>;
      case 'متوسطة':
        return <Badge variant="blue">{priority}</Badge>;
      case 'منخفضة':
        return <Badge variant="gray">{priority}</Badge>;
      default:
        return <Badge variant="gray">{priority}</Badge>;
    }
  };

  // Handle routing directly to WhatsApp chat for the linked customer
  const handleWhatsAppChat = () => {
    if (!task.customer_id) return;
    
    // In Basira CRM, the messages store manages conversations.
    // We can search for the contact's phone using our stores or fetch their details.
    // For now, let's navigate to contacts page or if we have a phone we can route directly.
    // We can fetch contact phone by opening the WhatsApp conversation or let them search.
    // If we have contactName, we can search for conversation:
    const cleanName = task.customerName || '';
    const existing = conversations.find(
      (c) => c.contactName.trim() === cleanName.trim()
    );

    if (existing) {
      setActiveConversation(existing);
      navigate('/whatsapp');
    } else {
      // Navigate to contacts with query to start chat
      navigate('/contacts');
    }
  };

  const isCompleted = task.status === 'مكتملة';

  // Format dates
  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleString('ar-EG', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div 
      className={`glass rounded-2xl p-5 transition-all duration-300 relative group flex flex-col gap-4 border ${
        isCompleted 
          ? 'opacity-60 border-gray-800 bg-gray-900/10' 
          : isOverdue 
            ? 'border-red-500/20 bg-red-950/5' 
            : 'border-gray-800/80 hover:border-gray-700 bg-gray-900/30'
      }`}
    >
      {/* Upper Row: Status checkbox and Actions */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <button 
            onClick={() => onToggleComplete(task.id)}
            className={`shrink-0 mt-0.5 transition-all duration-200 ${
              isCompleted ? 'text-emerald-500 scale-110' : 'text-gray-500 hover:text-indigo-500'
            }`}
          >
            {isCompleted ? (
              <CheckCircle className="w-5 h-5 fill-emerald-950/30" />
            ) : (
              <Circle className="w-5 h-5" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            <h4 
              className={`text-sm font-bold text-white break-words ${
                isCompleted ? 'line-through text-gray-500' : ''
              }`}
            >
              {task.title}
            </h4>
            {task.description && (
              <p className={`text-xs mt-1 leading-relaxed ${isCompleted ? 'text-gray-600' : 'text-gray-400'}`}>
                {task.description}
              </p>
            )}
          </div>
        </div>

        {/* Actions (hover triggers or buttons) */}
        <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={() => onEdit(task)}
            className="p-1.5 rounded-lg bg-gray-800/40 hover:bg-indigo-600/10 text-gray-400 hover:text-indigo-500 transition-all"
            title="تعديل المهمة"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="p-1.5 rounded-lg bg-gray-800/40 hover:bg-red-600/10 text-gray-400 hover:text-red-500 transition-all"
            title="حذف المهمة"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Middle Row: Customer and Assignment */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] font-semibold text-gray-400 border-t border-gray-800/50 pt-3">
        {task.customerName ? (
          <div className="flex items-center gap-1.5 bg-gray-800/20 px-2 py-1 rounded-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
            <span>العميل:</span>
            <span className="text-white font-bold">{task.customerName}</span>
            <button 
              onClick={handleWhatsAppChat}
              className="text-emerald-500 hover:text-emerald-400 p-0.5 rounded transition-all mr-1"
              title="محادثة واتساب"
            >
              <MessageCircle className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 bg-gray-800/20 px-2 py-1 rounded-lg text-gray-500">
            <span>بدون عميل مرتبط</span>
          </div>
        )}

        <div className="flex items-center gap-1 bg-gray-800/20 px-2 py-1 rounded-lg">
          <span>المسؤول:</span>
          <span className="text-indigo-300 font-bold">{assigneeName}</span>
        </div>

        {task.created_by !== task.assigned_to && (
          <div className="flex items-center gap-1 text-[10px] text-gray-500 self-center">
            <span>منشئ: {creatorName}</span>
          </div>
        )}
      </div>

      {/* Bottom Row: Metadata Badges */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] font-semibold text-gray-500 border-t border-gray-800/30 pt-3 mt-auto">
        <div className="flex items-center gap-2">
          {/* Type Icon */}
          <div className="flex items-center gap-1 bg-gray-850 px-2 py-1 rounded-lg text-gray-400">
            {getTypeIcon(task.type)}
            <span>{task.type}</span>
          </div>

          {/* Priority */}
          {getPriorityBadge(task.priority)}
        </div>

        {/* Dates (Due Date and Reminder) */}
        <div className="flex items-center gap-2">
          {task.reminder_at && !isCompleted && (
            <div className="flex items-center gap-1 bg-indigo-950/20 text-indigo-400 border border-indigo-500/10 px-2 py-1 rounded-lg">
              <Bell className="w-3 h-3 text-indigo-400" />
              <span>تذكير: {formatDateTime(task.reminder_at)}</span>
            </div>
          )}

          {task.due_date && (
            <div 
              className={`flex items-center gap-1 px-2 py-1 rounded-lg border ${
                isCompleted 
                  ? 'bg-gray-800/20 text-gray-500 border-transparent' 
                  : isOverdue 
                    ? 'bg-red-950/20 text-red-400 border-red-500/20 animate-pulse' 
                    : 'bg-gray-800/40 text-gray-300 border-transparent'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>{isCompleted ? 'اكتملت في: ' : 'استحقاق: '}{formatDateTime(isCompleted ? task.completed_at : task.due_date)}</span>
              {!isCompleted && isOverdue && <span className="font-bold text-[9px] mr-1">(متأخرة)</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
