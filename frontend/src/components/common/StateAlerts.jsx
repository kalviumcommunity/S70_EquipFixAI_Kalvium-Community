import React from 'react';
import { AlertCircle, CheckCircle, RefreshCw, X } from 'lucide-react';

export const ErrorState = ({
  message = 'An unexpected system error occurred.',
  detail,
  onRetry,
  onDismiss,
  style = {}
}) => {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
      backgroundColor: 'var(--status-down-bg)',
      border: '1px solid var(--status-down-border)',
      color: 'var(--status-down)',
      padding: '14px 16px',
      borderRadius: 'var(--radius-md)',
      marginBottom: '18px',
      ...style
    }}>
      <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{message}</div>
        {detail && (
          <div style={{ fontSize: '0.8rem', marginTop: '4px', opacity: 0.9 }}>
            {detail}
          </div>
        )}
        {onRetry && (
          <button 
            type="button" 
            onClick={onRetry}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: '8px',
              backgroundColor: 'transparent',
              border: 'none',
              color: 'var(--status-down)',
              fontWeight: 600,
              fontSize: '0.8rem',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            <RefreshCw size={14} /> Retry Operation
          </button>
        )}
      </div>
      {onDismiss && (
        <button 
          type="button" 
          onClick={onDismiss}
          style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};

export const SuccessState = ({
  message = 'Action completed successfully.',
  detail,
  onDismiss,
  style = {}
}) => {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
      backgroundColor: 'var(--status-running-bg)',
      border: '1px solid var(--status-running-border)',
      color: 'var(--status-running)',
      padding: '14px 16px',
      borderRadius: 'var(--radius-md)',
      marginBottom: '18px',
      ...style
    }}>
      <CheckCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{message}</div>
        {detail && (
          <div style={{ fontSize: '0.8rem', marginTop: '4px', opacity: 0.9 }}>
            {detail}
          </div>
        )}
      </div>
      {onDismiss && (
        <button 
          type="button" 
          onClick={onDismiss}
          style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};
