// src/components/common/ui/toaster.jsx
import React from 'react';
import { useToast } from './ToastContext';
import { X } from 'lucide-react';

export const Toaster = () => {
  const { toasts, removeToast } = useToast();

  const getVariantClasses = (variant) => {
    switch (variant) {
      case 'destructive':
        return 'bg-red-600 text-white border-red-700';
      case 'warning':
        return 'bg-yellow-600 text-white border-yellow-700';
      case 'subtle':
        return 'bg-[#132337] border border-[#3BADE5]/20 text-white';
      case 'default':
      default:
        return 'bg-gray-800 text-white border-gray-700';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-xs">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`p-4 rounded-md shadow-lg flex items-start gap-3 transition-all duration-300 ease-out transform translate-x-0 opacity-100 ${getVariantClasses(toast.variant)} ${toast.className}`}
          role="alert"
        >
          <div className="flex-1">
            {toast.title && <div className="font-semibold text-sm">{toast.title}</div>}
            {toast.description && <div className="text-xs opacity-90 mt-1">{toast.description}</div>}
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="p-1 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors"
            aria-label="Close toast"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};