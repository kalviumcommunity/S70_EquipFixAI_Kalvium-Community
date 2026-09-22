import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingSpinner = ({ size = 20, color = 'var(--blue-600)', className = '' }) => {
  return (
    <Loader2 
      size={size} 
      className={`spinner ${className}`} 
      style={{ color, animation: 'spin 0.75s linear infinite' }} 
    />
  );
};

export const LoadingScreen = ({ message = 'Loading operations data...' }) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      minHeight: '300px',
      gap: '16px',
      color: 'var(--slate-600)'
    }}>
      <div style={{
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        backgroundColor: 'var(--blue-50)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid #bfdbfe'
      }}>
        <LoadingSpinner size={26} color="var(--blue-600)" />
      </div>
      <div style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--slate-700)' }}>
        {message}
      </div>
    </div>
  );
};
