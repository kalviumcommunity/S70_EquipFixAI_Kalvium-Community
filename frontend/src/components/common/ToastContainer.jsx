import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((firstArg, maybeMessage, maybeType = 'info', maybeDuration = 4500) => {
    let title = '';
    let message = '';
    let type = 'info';
    let duration = 4500;

    if (typeof firstArg === 'object' && firstArg !== null) {
      title = firstArg.title || '';
      message = firstArg.message || '';
      type = firstArg.type || 'info';
      duration = firstArg.duration > 0 ? firstArg.duration : 4500;
    } else {
      title = typeof firstArg === 'string' ? firstArg : '';
      message = typeof maybeMessage === 'string' ? maybeMessage : '';
      type = typeof maybeType === 'string' ? maybeType : 'info';
      duration = typeof maybeDuration === 'number' && maybeDuration > 0 ? maybeDuration : 4500;
    }

    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, message, type, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
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
