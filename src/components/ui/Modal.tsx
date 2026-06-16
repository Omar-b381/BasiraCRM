import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md'
}: ModalProps) {
  // إغلاق المودال عند الضغط على Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* الخلفية المظلمة */}
      <div
        className="fixed inset-0 bg-gray-950/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* محتوى المودال */}
      <div
        className={`relative w-full glass rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] transition-all transform scale-100 ${
          size === 'sm' ? 'max-w-md' :
          size === 'md' ? 'max-w-xl' :
          size === 'lg' ? 'max-w-3xl' :
          'max-w-5xl'
        }`}
      >
        {/* الهيدر */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800/60 bg-gray-900/30">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 p-2 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* البودي */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
