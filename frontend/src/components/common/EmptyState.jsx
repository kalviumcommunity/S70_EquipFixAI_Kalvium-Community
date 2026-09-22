import React from 'react';
import { Inbox } from 'lucide-react';

export const EmptyState = ({
  icon: Icon = Inbox,
  title = 'No items found',
  description = 'There are currently no records available in this section.',
  actionLabel,
  onAction,
  className = ''
}) => {
  return (
    <div 
      className={`card ${className}`}
      style={{
        textAlign: 'center',
        padding: '48px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--white)'
      }}
    >
      <div style={{
        width: '56px',
        height: '56px',
        borderRadius: '12px',
        backgroundColor: 'var(--slate-100)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--slate-500)',
        marginBottom: '16px'
      }}>
        <Icon size={28} />
      </div>
      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--slate-800)', margin: '0 0 6px 0' }}>
        {title}
      </h3>
      <p style={{ fontSize: '0.85rem', color: 'var(--slate-500)', maxWidth: '380px', margin: '0 0 20px 0' }}>
        {description}
      </p>
      {actionLabel && onAction && (
        <button type="button" className="btn btn-primary" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
};
