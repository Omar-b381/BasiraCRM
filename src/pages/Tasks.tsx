import React, { useEffect, useState } from 'react';
import { 
  ClipboardList, CheckCircle, Clock, AlertTriangle, Plus, Search, 
  Filter, CalendarCheck, RefreshCw, ClipboardCheck, ArrowUpRight 
} from 'lucide-react';
import { useTasksStore } from '../store/useTasksStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useAuthStore } from '../store/useAuthStore';
import TaskCard from '../components/tasks/TaskCard';
import TaskForm from '../components/tasks/TaskForm';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Toast, { ToastType } from '../components/ui/Toast';
import type { Task, TaskPriority, TaskType } from '../types/task.types';

export default function Tasks() {
  const { 
    tasks, 
    isLoading, 
    error, 
    fetchTasks, 
    createTask, 
    updateTask, 
    deleteTask, 
    markDone 
  } = useTasksStore();

  const { fetchSettings } = useSettingsStore();
  const { currentEmployee } = useAuthStore();

  // Modal and editing state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'my_active' | 'others_active' | 'completed'>('my_active');

  const [toast, setToast] = useState<ToastType | null>(null);

  // Load tasks on mount
  useEffect(() => {
    fetchTasks();
    fetchSettings(); // Load employees for resolving names
  }, [fetchTasks, fetchSettings]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({
      id: Math.random().toString(36).substring(2, 9),
      message,
      type
    });
  };

  const handleOpenCreateModal = () => {
    setEditingTask(undefined);
    setIsFormOpen(true);
  };

  const handleOpenEditModal = (task: Task) => {
    setEditingTask(task);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (payload: any) => {
    let success = false;
    if (editingTask) {
      success = await updateTask(payload);
      if (success) showToast('تم تحديث المهمة بنجاح');
    } else {
      success = await createTask(payload);
      if (success) showToast('تم إضافة المهمة السحابية بنجاح');
    }
    return success;
  };

  const handleDeleteTask = async (id: number) => {
    if (window.confirm('هل أنت متأكد من حذف هذه المهمة نهائياً؟')) {
      const success = await deleteTask(id);
      if (success) {
        showToast('تم حذف المهمة بنجاح', 'info');
      } else {
        showToast('فشل حذف المهمة', 'error');
      }
    }
  };

  const handleToggleComplete = async (id: number) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    if (task.status === 'مكتملة') {
      // Re-open task
      const success = await updateTask({
        ...task,
        status: 'معلقة',
        completed_at: undefined
      });
      if (success) showToast('تم إعادة فتح المهمة');
    } else {
      // Complete task
      const success = await markDone(id);
      if (success) showToast('أحسنت! تم إكمال المهمة بنجاح 🎉');
    }
  };

  // KPIs Calculations
  const stats = React.useMemo(() => {
    const now = new Date();
    const myTasks = tasks.filter(t => t.assigned_to === currentEmployee?.id);
    
    return {
      pending: myTasks.filter(t => t.status === 'معلقة' || t.status === 'قيد التنفيذ').length,
      overdue: myTasks.filter(t => t.status === 'معلقة' && t.due_date && new Date(t.due_date) < now).length,
      completed: myTasks.filter(t => t.status === 'مكتملة').length,
      urgent: myTasks.filter(t => t.status === 'معلقة' && t.priority === 'عاجلة').length
    };
  }, [tasks, currentEmployee]);

  // Filter tasks based on search, filters, and selected tab
  const filteredTasks = React.useMemo(() => {
    const now = new Date();
    return tasks.filter(task => {
      // 1. Tab filtering
      const isCompleted = task.status === 'مكتملة' || task.status === 'ملغاة';
      const isMine = task.assigned_to === currentEmployee?.id;

      if (activeTab === 'my_active') {
        if (isCompleted || !isMine) return false;
      } else if (activeTab === 'others_active') {
        if (isCompleted || isMine) return false;
      } else {
        if (!isCompleted) return false;
      }

      // 2. Search query filtering (title, description, or customerName)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(query);
        const matchesDesc = (task.description || '').toLowerCase().includes(query);
        const matchesCust = (task.customerName || '').toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc && !matchesCust) return false;
      }

      // 3. Priority filter
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;

      // 4. Type filter
      if (typeFilter !== 'all' && task.type !== typeFilter) return false;

      return true;
    });
  }, [tasks, activeTab, searchQuery, priorityFilter, typeFilter, currentEmployee]);

  const isAdminOrSupervisor = currentEmployee?.role === 'admin' || currentEmployee?.role === 'supervisor';

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 pb-16" dir="rtl">
      {/* Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-indigo-400" />
            <span>نظام المهام والمتابعات الذكي</span>
          </h1>
          <p className="text-gray-400 mt-1 text-xs font-semibold">
            تتبع وإسناد مهام المتابعة وربطها بالعملاء مع إرسال تذكيرات فورية للأجهزة
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchTasks();
              showToast('تم تحديث قائمة المهام', 'info');
            }}
            disabled={isLoading}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
          >
            تحديث
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenCreateModal}
            icon={<Plus className="w-4 h-4" />}
          >
            إضافة مهمة سحابية
          </Button>
        </div>
      </div>

      {/* Database Warning if Error */}
      {error && error.includes('schema cache') && (
        <div className="p-4 bg-amber-950/20 border border-amber-500/20 rounded-2xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white">إعداد قاعدة البيانات مطلوب ⚠️</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              يبدو أن جدول المهام (`public.tasks`) لم يتم تفعيله بعد في خادم Supabase السحابي الخاص بك.
              يرجى نسخ الكود من ملف <span className="text-indigo-400 font-semibold">[tasks_setup.sql](file:///d:/PROJECTSIMPORTANT/mwasemcrm/supabase/tasks_setup.sql)</span> وتشغيله في الـ SQL Editor بلوحة تحكم Supabase للبدء في استخدام الميزة.
            </p>
          </div>
        </div>
      )}

      {/* KPI Cards (Only for Current Employee's Tasks) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending KPI */}
        <div className="glass rounded-2xl p-5 border border-gray-800/80 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-gray-500">مهامي المعلقة</span>
            <h3 className="text-2xl font-bold text-white">{stats.pending}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-950/30 border border-blue-500/10 flex items-center justify-center">
            <Clock className="w-5 h-5 text-blue-400" />
          </div>
        </div>

        {/* Overdue KPI */}
        <div className="glass rounded-2xl p-5 border border-gray-800/80 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-gray-500">مهامي المتأخرة</span>
            <h3 className="text-2xl font-bold text-red-400">{stats.overdue}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-950/30 border border-red-500/10 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-400 animate-bounce" />
          </div>
        </div>

        {/* Urgent KPI */}
        <div className="glass rounded-2xl p-5 border border-gray-800/80 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-gray-500">مهام عاجلة</span>
            <h3 className="text-2xl font-bold text-amber-400">{stats.urgent}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-950/30 border border-amber-500/10 flex items-center justify-center">
            <ArrowUpRight className="w-5 h-5 text-amber-400" />
          </div>
        </div>

        {/* Completed KPI */}
        <div className="glass rounded-2xl p-5 border border-gray-800/80 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-gray-500">المهام المكتملة</span>
            <h3 className="text-2xl font-bold text-emerald-400">{stats.completed}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-950/30 border border-emerald-500/10 flex items-center justify-center">
            <ClipboardCheck className="w-5 h-5 text-emerald-400" />
          </div>
        </div>
      </div>

      {/* Filters and Navigation */}
      <div className="glass rounded-3xl p-6 border border-gray-800/80 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-4">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 bg-gray-950/40 p-1.5 rounded-2xl shrink-0">
            <button
              onClick={() => setActiveTab('my_active')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'my_active'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white hover:bg-gray-900/40'
              }`}
            >
              مهامي النشطة
            </button>

            {isAdminOrSupervisor && (
              <button
                onClick={() => setActiveTab('others_active')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'others_active'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-white hover:bg-gray-900/40'
                }`}
              >
                مهام الموظفين الآخرين
              </button>
            )}

            <button
              onClick={() => setActiveTab('completed')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'completed'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white hover:bg-gray-900/40'
              }`}
            >
              الأرشيف والمكتملة
            </button>
          </div>

          {/* Quick Search */}
          <div className="w-full md:w-72 relative">
            <input
              type="text"
              placeholder="البحث في المهام أو العملاء..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-950/40 border border-gray-800 rounded-xl pr-10 pl-4 py-2.5 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:border-indigo-500 focus:ring-indigo-500/20 transition-all duration-200"
            />
            <Search className="w-4 h-4 text-gray-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* Advanced Filters */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-gray-400">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-gray-500" />
            <span>تصفية متقدمة:</span>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-1.5">
            <span>الأولوية:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-gray-950/40 border border-gray-800 rounded-lg px-2.5 py-1.5 text-[11px] text-gray-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="all" style={{ color: '#070033' }}>الكل</option>
              <option value="عاجلة" style={{ color: '#070033' }}>عاجلة</option>
              <option value="عالية" style={{ color: '#070033' }}>عالية</option>
              <option value="متوسطة" style={{ color: '#070033' }}>متوسطة</option>
              <option value="منخفضة" style={{ color: '#070033' }}>منخفضة</option>
            </select>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1.5">
            <span>نوع المهمة:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-gray-950/40 border border-gray-800 rounded-lg px-2.5 py-1.5 text-[11px] text-gray-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="all" style={{ color: '#070033' }}>الكل</option>
              <option value="متابعة" style={{ color: '#070033' }}>متابعة عامة</option>
              <option value="مكالمة" style={{ color: '#070033' }}>مكالمات</option>
              <option value="اجتماع" style={{ color: '#070033' }}>اجتماعات</option>
              <option value="واتساب" style={{ color: '#070033' }}>واتساب</option>
              <option value="بريد" style={{ color: '#070033' }}>بريد إلكتروني</option>
              <option value="أخرى" style={{ color: '#070033' }}>أخرى</option>
            </select>
          </div>
        </div>

        {/* Tasks List */}
        {isLoading ? (
          <div className="py-20 text-center text-gray-400 text-xs font-semibold flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
            <span>جاري تحميل المهام من السحابة...</span>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="py-20 text-center text-gray-500 border border-dashed border-gray-800 rounded-2xl space-y-3">
            <ClipboardList className="w-8 h-8 mx-auto text-gray-655 opacity-40" />
            <p className="text-xs font-bold">لا توجد مهام مطابقة للتصفية الحالية</p>
            <p className="text-[10px] text-gray-655">قم بإضافة مهمة جديدة لبدء المتابعة</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onEdit={handleOpenEditModal}
                onDelete={handleDeleteTask}
                onToggleComplete={handleToggleComplete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Task Form Modal */}
      <TaskForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        task={editingTask}
      />

      {/* screen toast notifications */}
      {toast && (
        <div className="fixed bottom-5 left-5 z-[100]">
          <Toast toast={toast} onClose={() => setToast(null)} />
        </div>
      )}
    </div>
  );
}
