export type TaskPriority = 'عاجلة' | 'عالية' | 'متوسطة' | 'منخفضة';
export type TaskStatus = 'معلقة' | 'قيد التنفيذ' | 'مكتملة' | 'ملغاة';
export type TaskType = 'مكالمة' | 'اجتماع' | 'متابعة' | 'بريد' | 'واتساب' | 'أخرى';

export interface Task {
  id: number;
  title: string;
  description?: string;
  type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  due_date?: string;         // ISO String timestamp
  completed_at?: string;     // ISO String timestamp
  customer_id?: string;
  customerName?: string;     // Resolved customer name
  assigned_to?: string;      // Employee ID of assignee
  created_by?: string;       // Employee ID of creator
  created_at: string;        // ISO String timestamp
  updated_at: string;        // ISO String timestamp
  reminder_at?: string;      // ISO String timestamp
}
