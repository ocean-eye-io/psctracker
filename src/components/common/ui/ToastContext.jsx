// src/components/common/ui/ToastContext.jsx
import React, { createContext, useContext } from 'react';
import { toast as hotToast } from 'react-hot-toast'; // Assuming you use react-hot-toast

const ToastContext = createContext(undefined);

export const ToastProvider = ({ children }) => {
  // This 'toast' function is what gets provided by the context
  const toast = ({ title, description, variant, className }) => {
    if (variant === 'destructive') {
      hotToast.error(<div><strong>{title}</strong><p>{description}</p></div>, { className });
    } else if (variant === 'warning') {
      hotToast.warn(<div><strong>{title}</strong><p>{description}</p></div>, { className });
    } else if (variant === 'subtle') {
      hotToast(<div><strong>{title}</strong><p>{description}</p></div>, { className });
    } else {
      hotToast.success(<div><strong>{title}</strong><p>{description}</p></div>, { className });
    }
  };

  return (
    <ToastContext.Provider value={{ toast }}> {/* <--- THIS IS CRUCIAL */}
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