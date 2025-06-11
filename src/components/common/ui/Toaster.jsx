// src/components/common/ui/Toaster.jsx
import React from 'react';
import { Toaster as HotToaster } from 'react-hot-toast';

export const Toaster = () => {
  return (
    <HotToaster
      position="top-right"
      toastOptions={{
        className: '',
        duration: 5000,
        style: {
          background: '#132337',
          color: '#fff',
          border: '1px solid rgba(59, 173, 229, 0.2)',
        },
        success: {
          style: {
            background: '#10B981',
            color: '#fff',
          },
        },
        error: {
          style: {
            background: '#EF4444',
            color: '#fff',
          },
        },
      }}
    />
  );
};