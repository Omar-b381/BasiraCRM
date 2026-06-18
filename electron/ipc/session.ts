// 🔒 إدارة جلسة الموظف النشط والتحقق من الصلاحيات في الـ Main Process
import type { Employee } from '../../src/types/settings.types';

let currentSessionEmployee: Employee | null = null;

export function setSessionEmployee(employee: Employee | null) {
  currentSessionEmployee = employee;
  console.log('Main Process Session Updated:', employee ? `${employee.name} (${employee.role})` : 'Logged Out');
}

export function getSessionEmployee(): Employee | null {
  return currentSessionEmployee;
}

// التحقق من الصلاحية أو كونه مديراً
export function checkPermission(permission?: string): boolean {
  if (!currentSessionEmployee) {
    return false;
  }
  if (currentSessionEmployee.role === 'admin') {
    return true;
  }
  if (!permission) {
    return true; // لا يتطلب صلاحية معينة، فقط يتطلب تسجيل الدخول
  }
  return Array.isArray(currentSessionEmployee.permissions) && currentSessionEmployee.permissions.includes(permission);
}

// دالة مساعدة لرمي خطأ حماية في الـ IPC Handlers
export function enforcePermission(permission?: string) {
  if (!checkPermission(permission)) {
    throw new Error('⚠️ غير مصرح: لا تمتلك الصلاحيات الكافية لتنفيذ هذه العملية.');
  }
}
