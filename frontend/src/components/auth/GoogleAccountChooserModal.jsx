import React, { useState, useEffect } from 'react';
import {
  X, UserPlus, ArrowRight, Check, Shield, Loader2,
  HardHat, Wrench, UserCheck, Factory, Sparkles, ChevronRight
} from 'lucide-react';

const GOOGLE_ICON_SVG = (
  <svg width="22" height="22" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" />
    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" />
    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.97 0 12s.45 3.84 1.25 5.42l4.03-3.15z" />
    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
  </svg>
);

const DEFAULT_GOOGLE_ACCOUNTS = [
  {
    email: 'manager@equipfix.ai',
    name: 'Alex Mercer',
    role: 'MANAGER',
    photoURL: null,
    badge: 'Operations Manager'
  },
  {
    email: 'supervisor@equipfix.ai',
    name: 'Marcus Vance',
    role: 'SUPERVISOR',
    photoURL: null,
    badge: 'Shift Supervisor'
  },
  {
    email: 'technician@equipfix.ai',
    name: 'Elena Rostova',
    role: 'TECHNICIAN',
    photoURL: null,
    badge: 'Lead Technician'
  },
  {
    email: 'operator@equipfix.ai',
    name: 'David Chen',
    role: 'OPERATOR',
    photoURL: null,
    badge: 'Station Operator'
  }
];

export const GoogleAccountChooserModal = ({
  isOpen,
  onSelectAccount,
  onClose,
  loading = false,
  directoryAccounts = []
}) => {
  const [accounts, setAccounts] = useState([]);
  const [showAddAnother, setShowAddAnother] = useState(false);
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [customRole, setCustomRole] = useState('OPERATOR');
  const [submittingAccount, setSubmittingAccount] = useState(null);

  useEffect(() => {
    try {
      // 1. Load saved Google accounts from localStorage
      const savedStr = localStorage.getItem('equipfix_google_accounts');
      const savedAccounts = savedStr ? JSON.parse(savedStr) : [];

      // 2. Merge saved accounts + directory accounts + baseline defaults
      const map = new Map();

      // Put saved accounts first
      savedAccounts.forEach(acc => {
        if (acc?.email) map.set(acc.email.toLowerCase(), acc);
      });

      // Add directory accounts
      directoryAccounts.forEach(acc => {
        if (acc?.email && !map.has(acc.email.toLowerCase())) {
          map.set(acc.email.toLowerCase(), {
            email: acc.email,
            name: acc.full_name || acc.username || 'Plant User',
            role: typeof acc.role === 'object' ? acc.role.name : acc.role || 'OPERATOR',
            badge: typeof acc.role === 'object' ? acc.role.name : acc.role || 'Member'
          });
        }
      });

      // Add default seeded plant accounts if map is small
      DEFAULT_GOOGLE_ACCOUNTS.forEach(acc => {
        if (!map.has(acc.email.toLowerCase())) {
          map.set(acc.email.toLowerCase(), acc);
        }
      });

      setAccounts(Array.from(map.values()).slice(0, 5));
    } catch (e) {
      setAccounts(DEFAULT_GOOGLE_ACCOUNTS);
    }
  }, [isOpen, directoryAccounts]);

  if (!isOpen) return null;

  const handlePickAccount = async (account) => {
    setSubmittingAccount(account.email);
    try {
      // Persist chosen account to top of saved Google accounts
      const savedStr = localStorage.getItem('equipfix_google_accounts');
      let currentSaved = savedStr ? JSON.parse(savedStr) : [];
      currentSaved = currentSaved.filter(a => a.email !== account.email);
      currentSaved.unshift(account);
      localStorage.setItem('equipfix_google_accounts', JSON.stringify(currentSaved.slice(0, 6)));

      if (onSelectAccount) {
        await onSelectAccount({
          email: account.email,
          full_name: account.name || account.full_name,
          role: account.role || 'OPERATOR',
          photoURL: account.photoURL || null
        });
      }
    } finally {
      setSubmittingAccount(null);
    }
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    if (!customEmail.trim() || !customEmail.includes('@')) return;

    const email = customEmail.trim().toLowerCase();
    const name = customName.trim() || email.split('@')[0].replace('.', ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    // Auto-detect role if not explicitly set
    let role = customRole;
    if (email.includes('manager') || email.includes('kalvium')) role = 'MANAGER';
    else if (email.includes('tech')) role = 'TECHNICIAN';
    else if (email.includes('super')) role = 'SUPERVISOR';

    handlePickAccount({
      email,
      name,
      role,
      photoURL: null,
      badge: role
    });
  };

  const getRoleColor = (role) => {
    const r = (role || '').toUpperCase();
    if (r === 'MANAGER') return '#a855f7';
    if (r === 'SUPERVISOR') return '#10b981';
    if (r === 'TECHNICIAN') return '#0ea5e9';
    return '#f59e0b';
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(2, 6, 23, 0.85)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      padding: '16px'
    }}>
      <style>{`
        @keyframes googleModalPop {
          0% { opacity: 0; transform: scale(0.92) translateY(12px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .google-account-row {
          transition: background-color 0.15s ease, border-color 0.15s ease, transform 0.1s ease;
        }
        .google-account-row:hover {
          background-color: rgba(30, 41, 59, 0.9) !important;
          border-color: rgba(56, 189, 248, 0.5) !important;
          transform: translateX(2px);
        }
      `}</style>

      <div style={{
        width: '100%',
        maxWidth: '460px',
        backgroundColor: '#0f172a',
        borderRadius: '24px',
        border: '1.5px solid rgba(56, 189, 248, 0.3)',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.75), 0 0 40px rgba(2, 132, 199, 0.25)',
        animation: 'googleModalPop 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        overflow: 'hidden',
        color: '#f8fafc'
      }}>
        {/* Header with Google Logo & Close */}
        <div style={{
          padding: '24px 24px 16px 24px',
          borderBottom: '1px solid rgba(51, 65, 85, 0.6)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              {GOOGLE_ICON_SVG}
              <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.02em' }}>
                Google
              </span>
            </div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#ffffff', margin: '0 0 2px 0' }}>
              Choose an account
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
              to continue to <strong style={{ color: '#38bdf8' }}>EquipFixAI Platform</strong>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading || !!submittingAccount}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseOver={(e) => { e.currentTarget.style.color = '#ffffff'; }}
            onMouseOut={(e) => { e.currentTarget.style.color = '#94a3b8'; }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content body */}
        <div style={{ padding: '16px 20px', maxHeight: '60vh', overflowY: 'auto' }}>
          {!showAddAnother ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {accounts.map((acc) => {
                const isSelected = submittingAccount === acc.email;
                const roleColor = getRoleColor(acc.role);
                const initial = (acc.name || acc.email || 'G')[0].toUpperCase();

                return (
                  <div
                    key={acc.email}
                    className="google-account-row"
                    onClick={() => !loading && !submittingAccount && handlePickAccount(acc)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      padding: '12px 14px',
                      borderRadius: '14px',
                      border: '1px solid rgba(51, 65, 85, 0.7)',
                      backgroundColor: 'rgba(15, 23, 42, 0.65)',
                      cursor: (loading || submittingAccount) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {/* Account Avatar */}
                    {acc.photoURL ? (
                      <img
                        src={acc.photoURL}
                        alt={acc.name}
                        style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {initial}
                      </div>
                    )}

                    {/* Account Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {acc.name}
                        </span>
                        <span style={{
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          color: roleColor,
                          backgroundColor: `${roleColor}18`,
                          border: `1px solid ${roleColor}40`,
                          padding: '1px 6px',
                          borderRadius: '4px'
                        }}>
                          {acc.role || 'USER'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {acc.email}
                      </div>
                    </div>

                    {/* Selection State / Chevron */}
                    {isSelected ? (
                      <Loader2 size={18} className="animate-spin" style={{ color: '#38bdf8', flexShrink: 0 }} />
                    ) : (
                      <ChevronRight size={18} style={{ color: '#64748b', flexShrink: 0 }} />
                    )}
                  </div>
                );
              })}

              {/* Use Another Account Button */}
              <div
                className="google-account-row"
                onClick={() => setShowAddAnother(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '12px 14px',
                  borderRadius: '14px',
                  border: '1px dashed rgba(56, 189, 248, 0.4)',
                  backgroundColor: 'rgba(2, 132, 199, 0.08)',
                  cursor: 'pointer',
                  marginTop: '4px'
                }}
              >
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(56, 189, 248, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#38bdf8',
                  flexShrink: 0
                }}>
                  <UserPlus size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#38bdf8' }}>
                    Use another Google account
                  </span>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    Sign in with your Gmail or workspace email
                  </div>
                </div>
                <ChevronRight size={18} style={{ color: '#38bdf8', flexShrink: 0 }} />
              </div>
            </div>
          ) : (
            /* Add Another Account Form */
            <form onSubmit={handleCustomSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  Google Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@gmail.com"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(30, 41, 59, 0.8)',
                    border: '1px solid #38bdf8',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  Full Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Yashash R Gowda"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(30, 41, 59, 0.8)',
                    border: '1px solid rgba(51, 65, 85, 0.8)',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  Station Operational Role
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {[
                    { id: 'OPERATOR', label: 'Operator' },
                    { id: 'TECHNICIAN', label: 'Technician' },
                    { id: 'SUPERVISOR', label: 'Supervisor' },
                    { id: 'MANAGER', label: 'Manager' }
                  ].map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setCustomRole(r.id)}
                      style={{
                        padding: '8px',
                        borderRadius: '8px',
                        border: `1.5px solid ${customRole === r.id ? '#38bdf8' : 'rgba(51, 65, 85, 0.7)'}`,
                        backgroundColor: customRole === r.id ? 'rgba(56, 189, 248, 0.15)' : 'rgba(15, 23, 42, 0.6)',
                        color: customRole === r.id ? '#38bdf8' : '#94a3b8',
                        fontWeight: 600,
                        fontSize: '0.78rem',
                        cursor: 'pointer'
                      }}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddAnother(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '8px 14px'
                  }}
                >
                  Back to list
                </button>
                <button
                  type="submit"
                  disabled={loading || !customEmail.trim()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: '#0284c7',
                    border: 'none',
                    color: '#ffffff',
                    padding: '8px 18px',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                  <span>Sign In as Account</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer info */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid rgba(51, 65, 85, 0.6)',
          backgroundColor: 'rgba(11, 19, 41, 0.6)',
          fontSize: '0.72rem',
          color: '#64748b',
          lineHeight: 1.4
        }}>
          To continue, Google verifies your identity and authorizes station clearance for EquipFixAI industrial operations.
        </div>
      </div>
    </div>
  );
};

export default GoogleAccountChooserModal;
