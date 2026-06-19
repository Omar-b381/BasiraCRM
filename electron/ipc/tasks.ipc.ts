import { ipcMain, Notification } from 'electron';
import type Store from 'electron-store';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import ws from 'ws';
import { enforcePermission, getSessionEmployee } from './session';
import type { Task } from '../../src/types/task.types';

let cachedClient: SupabaseClient | null = null;
let lastUrl = '';
let lastAnonKey = '';

function getSupabaseClient(store: Store): SupabaseClient {
  const settings = store.get('apiSettings') as { supabase?: { url: string; anonKey: string } };
  const config = settings?.supabase;

  if (!config?.url || !config?.anonKey) {
    throw new Error('إعدادات Supabase غير مكتملة — اذهب للإعدادات أولاً');
  }

  const cleanUrl = config.url.replace(/[”"']/g, '').trim();
  const cleanKey = config.anonKey.replace(/[”"']/g, '').trim();

  if (!cachedClient || cleanUrl !== lastUrl || cleanKey !== lastAnonKey) {
    lastUrl = cleanUrl;
    lastAnonKey = cleanKey;
    cachedClient = createClient(cleanUrl, cleanKey, {
      auth: { persistSession: false },
      realtime: { transport: ws as any },
      global: {
        headers: {
          'X-Client-Info': 'arabic-crm/1.0.0',
          'x-basira-signature': 'basira-crm-secure-client-token-2024'
        },
      },
    });
  }

  return cachedClient;
}

export function setupTasksIPC(store: Store, getMainWindow: () => Electron.BrowserWindow | null) {
  // ✅ Get tasks (with permission gating & role checks)
  ipcMain.handle('tasks:get', async () => {
    try {
      enforcePermission('manage_tasks');
      const employee = getSessionEmployee();
      if (!employee) throw new Error('الموظف غير مسجل الدخول');

      const client = getSupabaseClient(store);

      let query = client
        .from('tasks')
        .select(`
          *,
          customers (
            customer_id,
            name,
            phone
          )
        `);

      // Agents only see tasks they created or are assigned to them
      if (employee.role === 'agent') {
        query = query.or(`created_by.eq.${employee.id},assigned_to.eq.${employee.id}`);
      }

      // Order by created_at descending
      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      const mappedData = (data || []).map((task: any) => ({
        ...task,
        customerName: task.customers?.name || undefined
      }));

      return { success: true, data: mappedData };
    } catch (err: any) {
      console.error('Error in tasks:get handler:', err);
      return { success: false, error: err.message || 'فشل جلب المهام', data: [] };
    }
  });

  // ✅ Create task
  ipcMain.handle('tasks:create', async (_, taskData: Partial<Task>) => {
    try {
      enforcePermission('manage_tasks');
      const employee = getSessionEmployee();
      if (!employee) throw new Error('الموظف غير مسجل الدخول');

      const client = getSupabaseClient(store);

      const insertData = {
        ...taskData,
        created_by: employee.id,
        assigned_to: taskData.assigned_to || employee.id,
      };

      // Strip UI/join properties
      delete (insertData as any).customerName;
      delete (insertData as any).id;
      delete (insertData as any).created_at;
      delete (insertData as any).updated_at;

      const { data, error } = await client
        .from('tasks')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (err: any) {
      console.error('Error in tasks:create handler:', err);
      return { success: false, error: err.message || 'فشل إنشاء المهمة' };
    }
  });

  // ✅ Update task
  ipcMain.handle('tasks:update', async (_, updatedTask: Partial<Task>) => {
    try {
      enforcePermission('manage_tasks');
      const employee = getSessionEmployee();
      if (!employee) throw new Error('الموظف غير مسجل الدخول');

      const client = getSupabaseClient(store);
      const taskId = updatedTask.id;
      if (!taskId) throw new Error('معرف المهمة مطلوب للتحديث');

      const updateData = { ...updatedTask };
      delete (updateData as any).customerName;
      delete (updateData as any).id;
      delete (updateData as any).created_at;
      delete (updateData as any).updated_at;

      const { data, error } = await client
        .from('tasks')
        .update(updateData)
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;

      // If reminder time was updated, reset local notified state for this task
      if (updatedTask.reminder_at) {
        const notifiedIds = store.get('notifiedTaskIds', []) as number[];
        const filteredIds = notifiedIds.filter(id => id !== taskId);
        store.set('notifiedTaskIds', filteredIds);
      }

      return { success: true, data };
    } catch (err: any) {
      console.error('Error in tasks:update handler:', err);
      return { success: false, error: err.message || 'فشل تحديث المهمة' };
    }
  });

  // ✅ Delete task
  ipcMain.handle('tasks:delete', async (_, id: number) => {
    try {
      enforcePermission('manage_tasks');
      const client = getSupabaseClient(store);

      const { error } = await client
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Clean up local notified ID
      const notifiedIds = store.get('notifiedTaskIds', []) as number[];
      store.set('notifiedTaskIds', notifiedIds.filter(nid => nid !== id));

      return { success: true };
    } catch (err: any) {
      console.error('Error in tasks:delete handler:', err);
      return { success: false, error: err.message || 'فشل حذف المهمة' };
    }
  });

  // Start the background reminder loop
  startTasksReminderLoop(store, getMainWindow);
}

function startTasksReminderLoop(store: Store, getMainWindow: () => Electron.BrowserWindow | null) {
  setInterval(async () => {
    try {
      // 1. Verify if settings are configured
      const settings = store.get('apiSettings') as { supabase?: { url: string; anonKey: string } };
      if (!settings?.supabase?.url || !settings?.supabase?.anonKey) {
        return;
      }

      // 2. Only run if an employee is logged in
      const currentEmployee = getSessionEmployee();
      if (!currentEmployee) {
        return;
      }

      const client = getSupabaseClient(store);
      const mainWindow = getMainWindow();
      const now = new Date();

      // Query pending tasks with a reminder assigned to or created by the logged in employee
      const { data: tasks, error } = await client
        .from('tasks')
        .select(`
          *,
          customers (
            customer_id,
            name
          )
        `)
        .eq('status', 'pending')
        .not('reminder_at', 'is', null)
        .or(`assigned_to.eq.${currentEmployee.id},created_by.eq.${currentEmployee.id}`);

      if (error) throw error;
      if (!tasks || tasks.length === 0) return;

      const notifiedIds = store.get('notifiedTaskIds', []) as number[];
      let updatedNotifiedIds = [...notifiedIds];
      let hasUpdates = false;

      tasks.forEach((task: any) => {
        if (!task.reminder_at) return;

        const reminderTime = new Date(task.reminder_at);
        if (reminderTime <= now) {
          const taskId = task.id;

          if (!notifiedIds.includes(taskId)) {
            const timeDifferenceMinutes = (now.getTime() - reminderTime.getTime()) / (1000 * 60);

            updatedNotifiedIds.push(taskId);
            hasUpdates = true;

            // Trigger notification only if it is NOT older than 5 minutes
            if (timeDifferenceMinutes <= 5) {
              const customerName = task.customers?.name || '';
              const payload = {
                ...task,
                customerName
              };

              // Send event to React renderer process
              if (mainWindow) {
                mainWindow.webContents.send('tasks:reminder', payload);
              }

              // Show native desktop system notification
              if (Notification.isSupported()) {
                const notif = new Notification({
                  title: 'تذكير بمهمة 📌',
                  body: `${task.title}${customerName ? `\nالعميل: ${customerName}` : ''}`,
                });
                notif.show();
                notif.on('click', () => {
                  if (mainWindow) {
                    if (mainWindow.isMinimized()) mainWindow.restore();
                    mainWindow.focus();
                    mainWindow.webContents.send('tasks:reminder-clicked', payload);
                  }
                });
              }
            }
          }
        }
      });

      if (hasUpdates) {
        // Prune the local notification cache size to last 1000 items
        if (updatedNotifiedIds.length > 1000) {
          updatedNotifiedIds = updatedNotifiedIds.slice(updatedNotifiedIds.length - 1000);
        }
        store.set('notifiedTaskIds', updatedNotifiedIds);
      }
    } catch (err) {
      console.error('Error in tasks reminder loop:', err);
    }
  }, 30000); // check every 30 seconds
}
