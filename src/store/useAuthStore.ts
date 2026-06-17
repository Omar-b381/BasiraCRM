import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Employee } from '../types/settings.types';

interface AuthState {
  currentEmployee: Employee | null;
  isLoggedIn: boolean;
  login: (employee: Employee) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      currentEmployee: null,
      isLoggedIn: false,
      login: (employee) => set({ currentEmployee: employee, isLoggedIn: true }),
      logout: () => set({ currentEmployee: null, isLoggedIn: false }),
    }),
    {
      name: 'arabic-crm-auth',
    }
  )
);
