'use client';

import { createContext, useContext, useState, useCallback } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'loading';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type: ToastType) => void;
  hideToast: (id: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);

    if (type !== 'loading') {
      setTimeout(() => {
        hideToast(id);
      }, 5000);
    }
  }, []);

  const hideToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const getToastStyles = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'bg-green-500 text-white';
      case 'error':
        return 'bg-red-500 text-white';
      case 'loading':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-gray-800 text-white';
    }
  };

  const getToastIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'loading':
        return '⟳';
      default:
        return 'ℹ';
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`${getToastStyles(toast.type)} px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px] animate-slide-in`}
          >
            <span className={`text-xl ${toast.type === 'loading' ? 'animate-spin' : ''}`}>
              {getToastIcon(toast.type)}
            </span>
            <span className="flex-1">{toast.message}</span>
            {toast.type !== 'loading' && (
              <button
                onClick={() => hideToast(toast.id)}
                className="text-white/80 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
