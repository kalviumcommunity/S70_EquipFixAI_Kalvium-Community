import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ title, message, type = 'info', duration = 4000 }) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    const toastDuration = duration > 0 ? duration : 4500;
    setToasts((prev) => [...prev, { id, title, message, type, duration: toastDuration }]);

    if (toastDuration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, toastDuration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={20} color="#10b981" style={{ filter: 'drop-shadow(0 0 6px rgba(16, 185, 129, 0.4))' }} />;
      case 'warning':
        return <AlertTriangle size={20} color="#f59e0b" style={{ filter: 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.4))' }} />;
      case 'error':
        return <AlertCircle size={20} color="#ef4444" style={{ filter: 'drop-shadow(0 0 6px rgba(239, 68, 68, 0.4))' }} />;
      default:
        return <Info size={20} color="#38bdf8" style={{ filter: 'drop-shadow(0 0 6px rgba(56, 189, 248, 0.4))' }} />;
    }
  };

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast-item ${toast.type}`}>
            <div style={{ flexShrink: 0, marginTop: '2px' }}>
              {getIcon(toast.type)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {toast.title && (
                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#f8fafc', letterSpacing: '-0.01em' }}>
                  {toast.title}
                </div>
              )}
              {toast.message && (
                <div style={{ fontSize: '0.8rem', color: '#cbd5e1', marginTop: '3px', lineHeight: 1.45 }}>
                  {toast.message}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              aria-label="Dismiss notification"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: 'none',
                borderRadius: '6px',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '4px',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#ffffff';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#94a3b8';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              }}
            >
              <X size={15} />
            </button>
            <div
              className="toast-progress"
              style={{ animationDuration: `${toast.duration}ms` }}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      addToast: () => {},
      removeToast: () => {}
    };
  }
  return context;
};
