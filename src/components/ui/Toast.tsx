import React, { useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';
import { clsx } from 'clsx';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastProps {
  toast: ToastMessage;
  onClose: (id: string) => void;
}

export default function Toast({ toast, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onClose]);

  return (
    <div
      className={clsx(
        'flex items-center gap-3 px-4 py-3.5 rounded-2xl shadow-xl border glass min-w-[280px] max-w-sm transition-all duration-300',
        {
          'border-emerald-500/20 bg-emerald-950/30 text-emerald-400': toast.type === 'success',
          'border-red-500/20 bg-red-950/30 text-red-400': toast.type === 'error',
          'border-blue-500/20 bg-blue-950/30 text-blue-400': toast.type === 'info',
        }
      )}
    >
      <div className="shrink-0">
        {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-400" />}
        {toast.type === 'error' && <XCircle className="w-5 h-5 text-red-400" />}
        {toast.type === 'info' && <AlertCircle className="w-5 h-5 text-blue-400" />}
      </div>
      <p className="flex-1 text-xs font-semibold leading-relaxed">{toast.message}</p>
      <button
        onClick={() => onClose(toast.id)}
        className="text-current opacity-60 hover:opacity-100 p-1 rounded-lg hover:bg-white/5 transition-all"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
export type { ToastMessage as ToastType };
