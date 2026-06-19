import { create } from 'zustand';
import type { Task } from '../types/task.types';

interface TasksState {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  fetchTasks: () => Promise<void>;
  createTask: (taskData: any) => Promise<boolean>;
  updateTask: (task: Task) => Promise<boolean>;
  deleteTask: (id: number) => Promise<boolean>;
  markDone: (id: number) => Promise<boolean>;
}

export const useTasksStore = create<TasksState>((set, get) => ({
  tasks: [],
  isLoading: false,
  error: null,

  fetchTasks: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await window.electronAPI.tasks.getTasks();
      if (res.success) {
        set({ tasks: res.data, isLoading: false });
      } else {
        set({ error: res.error || 'فشل تحميل المهام', isLoading: false });
      }
    } catch (err: any) {
      set({ error: err.message || 'خطأ أثناء تحميل المهام', isLoading: false });
    }
  },

  createTask: async (taskData) => {
    set({ isLoading: true, error: null });
    try {
      const res = await window.electronAPI.tasks.createTask(taskData);
      if (res.success) {
        await get().fetchTasks();
        return true;
      } else {
        set({ error: res.error || 'فشل إنشاء المهمة', isLoading: false });
        return false;
      }
    } catch (err: any) {
      set({ error: err.message || 'خطأ أثناء إنشاء المهمة', isLoading: false });
      return false;
    }
  },

  updateTask: async (task) => {
    set({ isLoading: true, error: null });
    try {
      const res = await window.electronAPI.tasks.updateTask(task);
      if (res.success) {
        await get().fetchTasks();
        return true;
      } else {
        set({ error: res.error || 'فشل تحديث المهمة', isLoading: false });
        return false;
      }
    } catch (err: any) {
      set({ error: err.message || 'خطأ أثناء تحديث المهمة', isLoading: false });
      return false;
    }
  },

  deleteTask: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const res = await window.electronAPI.tasks.deleteTask(id);
      if (res.success) {
        set({
          tasks: get().tasks.filter(t => t.id !== id),
          isLoading: false
        });
        return true;
      } else {
        set({ error: res.error || 'فشل حذف المهمة', isLoading: false });
        return false;
      }
    } catch (err: any) {
      set({ error: err.message || 'خطأ أثناء حذف المهمة', isLoading: false });
      return false;
    }
  },

  markDone: async (id) => {
    const task = get().tasks.find(t => t.id === id);
    if (!task) return false;
    
    const updatedTask: Task = {
      ...task,
      status: 'مكتملة',
      completed_at: new Date().toISOString()
    };
    return get().updateTask(updatedTask);
  }
}));
