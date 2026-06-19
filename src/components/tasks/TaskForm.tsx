import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2, Calendar, User, Info, AlertTriangle } from 'lucide-react';
import type { Task, TaskPriority, TaskType, TaskStatus } from '../../types/task.types';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useAuthStore } from '../../store/useAuthStore';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';

interface TaskFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<boolean>;
  task?: Task; // If provided, we are in Edit mode
}

export default function TaskForm({
  isOpen,
  onClose,
  onSubmit,
  task
}: TaskFormProps) {
  const { settings } = useSettingsStore();
  const employees = settings.employees || [];
  const { currentEmployee } = useAuthStore();

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<TaskType>('متابعة');
  const [priority, setPriority] = useState<TaskPriority>('متوسطة');
  const [status, setStatus] = useState<TaskStatus>('معلقة');
  const [dueDate, setDueDate] = useState('');
  const [enableReminder, setEnableReminder] = useState(false);
  const [reminderAt, setReminderAt] = useState('');
  const [assignedTo, setAssignedTo] = useState('');

  // Customer search states
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>(undefined);
  const [selectedCustomerName, setSelectedCustomerName] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Initialize fields on open or task change
  useEffect(() => {
    if (isOpen) {
      setError('');
      if (task) {
        setTitle(task.title);
        setDescription(task.description || '');
        setType(task.type);
        setPriority(task.priority);
        setStatus(task.status);
        
        // Format ISO date to datetime-local string (YYYY-MM-DDThh:mm)
        if (task.due_date) {
          const d = new Date(task.due_date);
          setDueDate(formatToDateTimeLocal(d));
        } else {
          setDueDate('');
        }

        if (task.reminder_at) {
          const r = new Date(task.reminder_at);
          setReminderAt(formatToDateTimeLocal(r));
          setEnableReminder(true);
        } else {
          setReminderAt('');
          setEnableReminder(false);
        }

        setAssignedTo(task.assigned_to || currentEmployee?.id || '');
        setSelectedCustomerId(task.customer_id);
        setSelectedCustomerName(task.customerName || '');
        setCustomerSearch(task.customerName || '');
      } else {
        // Reset fields for Create mode
        setTitle('');
        setDescription('');
        setType('متابعة');
        setPriority('متوسطة');
        setStatus('معلقة');
        setDueDate('');
        setReminderAt('');
        setEnableReminder(false);
        setAssignedTo(currentEmployee?.id || '');
        setSelectedCustomerId(undefined);
        setSelectedCustomerName('');
        setCustomerSearch('');
      }
    }
  }, [isOpen, task, currentEmployee]);

  // Convert date to YYYY-MM-DDThh:mm format for HTML input
  const formatToDateTimeLocal = (date: Date) => {
    const tzOffset = date.getTimezoneOffset() * 60000; // offset in milliseconds
    const localISOTime = (new Date(date.getTime() - tzOffset)).toISOString().slice(0, 16);
    return localISOTime;
  };

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search customer handler
  useEffect(() => {
    if (customerSearch.trim().length < 2 || customerSearch === selectedCustomerName) {
      setSearchResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await window.electronAPI.db.getContacts({ search: customerSearch.trim(), limit: 5 });
        if (res.success) {
          setSearchResults(res.data || []);
          setShowDropdown(true);
        }
      } catch (err) {
        console.error('Error searching customers:', err);
      } finally {
        setSearchLoading(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [customerSearch, selectedCustomerName]);

  const handleSelectCustomer = (customer: any) => {
    setSelectedCustomerId(customer.id);
    setSelectedCustomerName(customer.name);
    setCustomerSearch(customer.name);
    setSearchResults([]);
    setShowDropdown(false);
  };

  const handleClearCustomer = () => {
    setSelectedCustomerId(undefined);
    setSelectedCustomerName('');
    setCustomerSearch('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('عنوان المهمة مطلوب');
      return;
    }

    setFormLoading(true);
    setError('');

    const payload = {
      id: task?.id,
      title: title.trim(),
      description: description.trim() || undefined,
      type,
      priority,
      status,
      due_date: dueDate ? new Date(dueDate).toISOString() : undefined,
      reminder_at: enableReminder && reminderAt ? new Date(reminderAt).toISOString() : null,
      customer_id: selectedCustomerId || null,
      assigned_to: assignedTo || currentEmployee?.id || null,
    };

    const success = await onSubmit(payload);
    setFormLoading(false);
    if (success) {
      onClose();
    } else {
      setError('حدث خطأ أثناء حفظ المهمة. يرجى المحاولة لاحقاً.');
    }
  };

  const isAdminOrSupervisor = currentEmployee?.role === 'admin' || currentEmployee?.role === 'supervisor';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={task ? 'تعديل المهمة والمتابعة' : 'إضافة مهمة جديدة'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
        {error && (
          <div className="p-3 bg-red-950/30 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {/* Title */}
        <Input
          label="عنوان المهمة *"
          placeholder="مثال: الاتصال لتأكيد موعد شحن الطلب"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 mb-1.5">ملاحظات / وصف المهمة</label>
          <textarea
            placeholder="تفاصيل إضافية للمتابعة..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full bg-gray-900/50 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:border-indigo-500 focus:ring-indigo-500/20 transition-all duration-200 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Type */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">نوع المهمة</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as TaskType)}
              className="w-full bg-gray-900/50 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:border-indigo-500 focus:ring-indigo-500/20 transition-all duration-200"
            >
              <option value="متابعة" style={{ color: '#070033' }}>متابعة عامة</option>
              <option value="مكالمة" style={{ color: '#070033' }}>مكالمة هاتفية</option>
              <option value="اجتماع" style={{ color: '#070033' }}>اجتماع عمل</option>
              <option value="واتساب" style={{ color: '#070033' }}>رسالة واتساب</option>
              <option value="بريد" style={{ color: '#070033' }}>بريد إلكتروني</option>
              <option value="أخرى" style={{ color: '#070033' }}>أخرى</option>
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">أولوية المهمة</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="w-full bg-gray-900/50 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:border-indigo-500 focus:ring-indigo-500/20 transition-all duration-200"
            >
              <option value="عاجلة" style={{ color: '#070033' }}>🔴 عاجلة جداً</option>
              <option value="عالية" style={{ color: '#070033' }}>🟡 عالية الأهمية</option>
              <option value="متوسطة" style={{ color: '#070033' }}>🔵 متوسطة الأولوية</option>
              <option value="منخفضة" style={{ color: '#070033' }}>⚪ منخفضة</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Due Date */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>تاريخ الاستحقاق</span>
            </label>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-gray-900/50 border border-gray-800 rounded-xl px-4 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:border-indigo-500 focus:ring-indigo-500/20 transition-all duration-200"
            />
          </div>

          {/* Status (Only in Edit mode) */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">حالة المهمة</label>
            <select
              value={status}
              disabled={!task}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
              className="w-full bg-gray-900/50 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:border-indigo-500 focus:ring-indigo-500/20 transition-all duration-200 disabled:opacity-50"
            >
              <option value="معلقة" style={{ color: '#070033' }}>معلقة</option>
              <option value="قيد التنفيذ" style={{ color: '#070033' }}>قيد التنفيذ</option>
              <option value="مكتملة" style={{ color: '#070033' }}>مكتملة</option>
              <option value="ملغاة" style={{ color: '#070033' }}>ملغاة</option>
            </select>
          </div>
        </div>

        {/* Customer Search Autocomplete */}
        <div className="relative" ref={dropdownRef}>
          <label className="block text-xs font-semibold text-gray-400 mb-1.5">ربط بعميل من جهات الاتصال (اختياري)</label>
          <div className="relative">
            <input
              type="text"
              placeholder="ابحث بالاسم أو رقم الهاتف..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              disabled={!!selectedCustomerId}
              className="w-full bg-gray-900/50 border border-gray-800 rounded-xl pr-10 pl-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:border-indigo-500 focus:ring-indigo-500/20 transition-all duration-200 disabled:opacity-70 disabled:bg-gray-950/20"
            />
            {selectedCustomerId ? (
              <button
                type="button"
                onClick={handleClearCustomer}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 bg-gray-800/40 hover:bg-gray-700/60 p-0.5 rounded-lg transition-all"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <Search className="w-4 h-4 text-gray-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
            )}

            {searchLoading && (
              <Loader2 className="w-4 h-4 text-indigo-500 animate-spin absolute left-3.5 top-1/2 -translate-y-1/2" />
            )}
          </div>

          {/* Autocomplete Dropdown */}
          {showDropdown && searchResults.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto">
              {searchResults.map((cust) => (
                <div
                  key={cust.id}
                  onClick={() => handleSelectCustomer(cust)}
                  className="px-4 py-2.5 hover:bg-indigo-600/10 cursor-pointer text-xs font-semibold border-b border-gray-850/30 last:border-0 flex items-center justify-between text-gray-300 hover:text-white"
                >
                  <span>{cust.name}</span>
                  <span className="text-gray-500 text-[10px]">{cust.phone}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Assignee Selection (Only visible to Admin or Supervisor) */}
        {isAdminOrSupervisor ? (
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              <span>تكليف الموظف المسؤول</span>
            </label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full bg-gray-900/50 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:border-indigo-500 focus:ring-indigo-500/20 transition-all duration-200"
            >
              {employees.map((emp: any) => (
                <option key={emp.id} value={emp.id} style={{ color: '#070033' }}>
                  {emp.name} ({emp.role === 'admin' ? 'مدير' : emp.role === 'supervisor' ? 'مشرف' : 'دعم'})
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="text-[10px] text-gray-500 bg-gray-800/10 px-3 py-2 rounded-xl flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" />
            <span>سيتم تعيينك تلقائياً كمسؤول عن تنفيذ هذه المهمة.</span>
          </div>
        )}

        {/* Reminder Settings */}
        <div className="p-4 bg-gray-950/20 border border-gray-850 rounded-2xl space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="enableReminder"
              checked={enableReminder}
              onChange={(e) => setEnableReminder(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-650 bg-gray-900 border-gray-800 focus:ring-indigo-500"
            />
            <label htmlFor="enableReminder" className="text-xs font-bold text-gray-300 cursor-pointer">
              تفعيل منبه التذكير التلقائي (Desktop Notification)
            </label>
          </div>

          {enableReminder && (
            <div className="animate-fadeIn">
              <label className="block text-[10px] font-bold text-gray-400 mb-1">وقت التنبيه</label>
              <input
                type="datetime-local"
                value={reminderAt}
                onChange={(e) => setReminderAt(e.target.value)}
                required={enableReminder}
                className="w-full bg-gray-900/50 border border-gray-800 rounded-xl px-4 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:border-indigo-500 focus:ring-indigo-500/20 transition-all duration-200"
              />
              <p className="text-[9px] text-gray-500 mt-1 leading-relaxed">
                سيقوم النظام بإرسال إشعار للنظام عند حلول هذا الوقت لتذكيرك بالمتابعة الفورية.
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-3 border-t border-gray-800/30">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={formLoading}
            className="flex-1"
          >
            تراجع
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={formLoading}
            className="flex-1"
          >
            {task ? 'حفظ التعديلات' : 'إضافة المهمة'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
