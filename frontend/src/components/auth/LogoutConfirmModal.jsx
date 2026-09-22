import React, { useEffect } from 'react';
import { LogOut, ShieldAlert, ArrowRight, X } from 'lucide-react';

export const LogoutConfirmModal = ({ isOpen, onClose, onConfirm, user }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const roleName = user?.role?.name || user?.role || 'OPERATOR';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(3, 7, 18, 0.85)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        padding: '20px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '520px',
          borderRadius: '24px',
          overflow: 'hidden',
          border: '1px solid rgba(56, 189, 248, 0.35)',
          background: 'linear-gradient(135deg, #0b1329 0%, #030712 100%)',
          animation: 'scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Dark High-Contrast Gradient Backdrop Layer over the GIF */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(8, 17, 38, 0.82) 0%, rgba(4, 9, 24, 0.94) 100%)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            zIndex: 1,
          }}
        />

        {/* Modal Inner Content */}
        <div style={{ position: 'relative', zIndex: 2, padding: '32px' }}>
          {/* Top Close Button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Cancel"
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '10px',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#ffffff';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#94a3b8';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
            }}
          >
            <X size={18} />
          </button>

          {/* Glowing Animated Icon */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '18px',
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.25), rgba(185, 28, 28, 0.35))',
                border: '1px solid rgba(248, 113, 113, 0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#f87171',
                boxShadow: '0 0 24px rgba(239, 68, 68, 0.4)',
              }}
            >
              <LogOut size={26} />
            </div>
            <div>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  color: '#38bdf8',
                  textTransform: 'uppercase',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <ShieldAlert size={13} color="#38bdf8" /> Station Security Protocol
              </span>
              <h2
                style={{
                  margin: '4px 0 0 0',
                  fontSize: '1.4rem',
                  fontWeight: 800,
                  color: '#ffffff',
                  letterSpacing: '-0.02em',
                }}
              >
                Sign Out Confirmation
              </h2>
            </div>
          </div>

          {/* Message & Station Identity Badge */}
          <p
            style={{
              fontSize: '0.9rem',
              color: '#cbd5e1',
              lineHeight: 1.6,
              margin: '0 0 20px 0',
            }}
          >
            Are you sure you want to terminate your industrial station session? Your real-time WebSocket telemetry line, active diagnostics lock, and station tokens will be securely closed.
          </p>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderRadius: '12px',
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              border: '1px solid rgba(56, 189, 248, 0.2)',
              marginBottom: '28px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #0284c7, #2563eb)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                }}
              >
                {user?.full_name ? user.full_name[0] : 'U'}
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc' }}>
                  {user?.full_name || 'Plant Operator'}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  {user?.email || 'operator@plant.local'}
                </div>
              </div>
            </div>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 800,
                color: '#38bdf8',
                backgroundColor: 'rgba(14, 165, 233, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                padding: '4px 10px',
                borderRadius: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              {roleName}
            </span>
          </div>

          {/* Modal Action Buttons */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '12px 18px',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                color: '#e2e8f0',
                fontSize: '0.875rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.12)';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
                e.currentTarget.style.color = '#e2e8f0';
              }}
            >
              Stay on Station
            </button>

            <button
              type="button"
              onClick={onConfirm}
              style={{
                flex: 1.3,
                padding: '12px 18px',
                borderRadius: '12px',
                border: '1px solid rgba(248, 113, 113, 0.4)',
                background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                color: '#ffffff',
                fontSize: '0.875rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 8px 24px -4px rgba(239, 68, 68, 0.5)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.filter = 'brightness(1.1)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.filter = 'none';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <span>Sign Out & Terminate</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
