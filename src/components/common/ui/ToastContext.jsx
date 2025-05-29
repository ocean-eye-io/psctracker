// src/components/common/ui/ToastContext.jsx
import React, { createContext, useContext } from 'react';
import { toast as hotToast } from 'react-hot-toast'; // Correctly import react-hot-toast

const ToastContext = createContext(undefined);

export const ToastProvider = ({ children }) => {
  // This 'toast' function is what gets provided by the context
  const toast = ({ title, description, variant, className }) => {
    const content = (
      <div>
        {title && <strong>{title}</strong>}
        {description && <p>{description}</p>}
      </div>
    );

    if (variant === 'destructive') {
      hotToast.error(content, { className });
    } else if (variant === 'warning') {
      hotToast.warn(content, { className });
    } else if (variant === 'subtle') {
      hotToast(content, { className }); // Default toast for subtle
    } else {
      hotToast.success(content, { className });
    }
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};