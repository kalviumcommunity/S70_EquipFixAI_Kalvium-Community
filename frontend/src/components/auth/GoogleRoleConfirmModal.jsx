import React, { useState } from 'react';
import {
  HardHat, Wrench, UserCheck, Factory, Check,
  ArrowRight, X, Shield, Sparkles, Loader2
} from 'lucide-react';

const ROLE_OPTIONS = [
  {
    id: 'LABOR',
    title: 'Labor / Operator',
    badge: 'Floor Operations',
    icon: HardHat,
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.35)',
    activeBorder: '#f59e0b',
    desc: 'Report machine faults, condition monitoring & incident triage.'
  },
  {
    id: 'TECHNICIAN',
    title: 'Technician',
    badge: 'Maintenance',
    icon: Wrench,
    color: '#0ea5e9',
    bgColor: 'rgba(14, 165, 233, 0.1)',
    borderColor: 'rgba(14, 165, 233, 0.35)',
    activeBorder: '#0ea5e9',
    desc: 'Perform diagnostics, execute work orders & manage LOTO safety.'
  },
  {
    id: 'SUPERVISOR',
    title: 'Supervisor',
    badge: 'Shift Management',
    icon: UserCheck,
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
    activeBorder: '#10b981',
    desc: 'Assign technician work orders, cell triage & maintenance sign-offs.'
  },
  {
    id: 'MANAGER',
    title: 'Manager',
    badge: 'Executive Oversight',
    icon: Factory,
    color: '#a855f7',
    bgColor: 'rgba(168, 85, 247, 0.1)',
    borderColor: 'rgba(168, 85, 247, 0.35)',
    activeBorder: '#a855f7',
    desc: 'Plant telemetry, MTTR analytics, audit logs & CSV report exports.'
  }
];

export const GoogleRoleConfirmModal = ({
  isOpen,
  googleUser,
  defaultRole = 'LABOR',
  onConfirmRole,
  onCancel,
  loading = false
}) => {
  const [selectedRoleId, setSelectedRoleId] = useState(() => {
    // If googleUser email suggests manager or technician, default appropriately
    const em = (googleUser?.email || '').toLowerCase();
    if (em.includes('manager') || em.includes('kalvium')) return 'MANAGER';
    if (em.includes('tech')) return 'TECHNICIAN';
    if (em.includes('super')) return 'SUPERVISOR';
    return defaultRole || 'LABOR';
  });

  if (!isOpen || !googleUser) return null;

  const selectedRole = ROLE_OPTIONS.find((r) => r.id === selectedRoleId) || ROLE_OPTIONS[0];

  const handleConfirm = () => {
    if (onConfirmRole) {
      onConfirmRole(selectedRoleId);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99990,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(2, 6, 23, 0.82)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      padding: '20px'
    }}>
      <style>{`
        @keyframes bubbleUpModal {
          0% {
            opacity: 0;
            transform: scale(0.6) translateY(55px);
          }
          65% {
            opacity: 1;
            transform: scale(1.05) translateY(-8px);
          }
          85% {
            transform: scale(0.98) translateY(2px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes bubbleFloat1 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.35; }
          50% { transform: translate(-12px, -20px) scale(1.15); opacity: 0.7; }
        }

        @keyframes bubbleFloat2 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.3; }
          50% { transform: translate(14px, -18px) scale(1.2); opacity: 0.65; }
        }

        @keyframes bubbleFloat3 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.25; }
          50% { transform: translate(-8px, 14px) scale(1.1); opacity: 0.55; }
        }

        .role-bubble-card {
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .role-bubble-card:hover {
          transform: translateY(-3px) scale(1.015);
        }
      `}</style>

      {/* Floating Animated Bubble Particles */}
      <div style={{
        position: 'absolute',
        top: '15%',
        left: '20%',
        width: '120px',
        height: '120px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(56, 189, 248, 0.25) 0%, rgba(56, 189, 248, 0) 70%)',
        animation: 'bubbleFloat1 5s infinite ease-in-out',
        pointerEvents: 'none',
        zIndex: 0
      }} />
      <div style={{
        position: 'absolute',
        bottom: '20%',
        right: '22%',
        width: '140px',
        height: '140px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(16, 185, 129, 0.25) 0%, rgba(16, 185, 129, 0) 70%)',
        animation: 'bubbleFloat2 6s infinite ease-in-out',
        pointerEvents: 'none',
        zIndex: 0
      }} />
      <div style={{
        position: 'absolute',
        top: '40%',
        right: '15%',
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(168, 85, 247, 0.25) 0%, rgba(168, 85, 247, 0) 70%)',
        animation: 'bubbleFloat3 4.5s infinite ease-in-out',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      {/* Main Bubble-Up Dialog Card */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        width: '100%',
        maxWidth: '540px',
        backgroundColor: 'rgba(11, 19, 41, 0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1.5px solid rgba(56, 189, 248, 0.28)',
        borderRadius: '24px',
        padding: '32px 28px',
        boxShadow: '0 25px 65px rgba(0,0,0,0.8), 0 0 50px rgba(2, 132, 199, 0.2)',
        animation: 'bubbleUpModal 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        maxHeight: '92vh',
        overflowY: 'auto'
      }}>
        {/* Header row with close button */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              backgroundColor: 'rgba(56, 189, 248, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Sparkles size={16} color="#38bdf8" />
            </div>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Google SSO Authorization
            </span>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              cursor: loading ? 'not-allowed' : 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseOver={(e) => { e.currentTarget.style.color = '#ffffff'; }}
            onMouseOut={(e) => { e.currentTarget.style.color = '#64748b'; }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Google User Profile Card */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          backgroundColor: 'rgba(15, 23, 42, 0.8)',
          border: '1px solid rgba(51, 65, 85, 0.7)',
          borderRadius: '16px',
          padding: '14px 18px',
          marginBottom: '24px'
        }}>
          {/* Avatar with Google badge */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            {googleUser.photoURL ? (
              <img
                src={googleUser.photoURL}
                alt={googleUser.full_name || 'Google Profile'}
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid #38bdf8'
                }}
              />
            ) : (
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '1.2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #38bdf8'
              }}>
                {(googleUser.full_name || googleUser.email || 'G')[0].toUpperCase()}
              </div>
            )}
            {/* Small Google icon badge */}
            <div style={{
              position: 'absolute',
              bottom: '-2px',
              right: '-2px',
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              backgroundColor: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 4px rgba(0,0,0,0.4)'
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" />
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.97 0 12s.45 3.84 1.25 5.42l4.03-3.15z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
              </svg>
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {googleUser.full_name || 'Google User'}
              </span>
              <span style={{
                fontSize: '0.65rem',
                backgroundColor: 'rgba(16, 185, 129, 0.2)',
                color: '#34d399',
                padding: '1px 6px',
                borderRadius: '4px',
                fontWeight: 600
              }}>
                Verified
              </span>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {googleUser.email}
            </div>
          </div>
        </div>

        {/* Prompt heading */}
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', margin: '0 0 4px 0' }}>
            Confirm Operational Role
          </h3>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
            Select your plant station role to complete sign-in and configure workstation access:
          </p>
        </div>

        {/* 4 Role Options Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
          {ROLE_OPTIONS.map((role) => {
            const Icon = role.icon;
            const isSelected = selectedRoleId === role.id;
            return (
              <div
                key={role.id}
                className="role-bubble-card"
                onClick={() => setSelectedRoleId(role.id)}
                style={{
                  backgroundColor: isSelected ? role.bgColor : 'rgba(15, 23, 42, 0.65)',
                  border: `2px solid ${isSelected ? role.activeBorder : role.borderColor}`,
                  borderRadius: '14px',
                  padding: '14px 12px',
                  cursor: 'pointer',
                  position: 'relative',
                  boxShadow: isSelected ? `0 0 18px ${role.bgColor}, 0 4px 12px rgba(0,0,0,0.3)` : 'none'
                }}
              >
                {/* Check badge when selected */}
                {isSelected && (
                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    backgroundColor: role.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff'
                  }}>
                    <Check size={12} strokeWidth={3} />
                  </div>
                )}

                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '10px'
                }}>
                  <Icon size={20} color={role.color} />
                </div>

                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff', marginBottom: '2px' }}>
                  {role.title}
                </div>

                <div style={{ fontSize: '0.68rem', color: isSelected ? '#cbd5e1' : '#64748b', lineHeight: 1.35 }}>
                  {role.desc}
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            type="button"
            disabled={loading}
            onClick={handleConfirm}
            style={{
              width: '100%',
              padding: '13px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
              color: '#ffffff',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 16px rgba(2, 132, 199, 0.4)',
              transition: 'all 0.15s ease'
            }}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Authorizing Station Access...</span>
              </>
            ) : (
              <>
                <span>Confirm & Enter as {selectedRole.title}</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '10px',
              background: 'transparent',
              color: '#94a3b8',
              border: '1px solid #334155',
              fontWeight: 600,
              fontSize: '0.8rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseOver={(e) => { e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.borderColor = '#64748b'; }}
            onMouseOut={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = '#334155'; }}
          >
            Cancel / Switch Google Account
          </button>
        </div>
      </div>
    </div>
  );
};

export default GoogleRoleConfirmModal;
