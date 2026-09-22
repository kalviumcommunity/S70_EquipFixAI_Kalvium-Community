import React, { useEffect, useState } from 'react';
import { CheckCircle2, ArrowRight, Sparkles, ShieldCheck, Factory, Wrench, UserCheck, HardHat } from 'lucide-react';

export const AuthSuccessPopup = ({
  isOpen,
  title = "Authentication Successful!",
  message = "Welcome to EquipFixAI Industrial Suite",
  roleName = "Operator",
  onComplete,
  duration = 1800,
  actionText = "Enter Station Now"
}) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setProgress(0);
      return;
    }

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);
      if (elapsed >= duration) {
        clearInterval(interval);
        if (onComplete) onComplete();
      }
    }, 40);

    return () => clearInterval(interval);
  }, [isOpen, duration, onComplete]);

  if (!isOpen) return null;

  const getRoleIcon = (role) => {
    const r = (role || '').toUpperCase();
    if (r.includes('MANAGE')) return <Factory size={16} color="#34d399" />;
    if (r.includes('SUPER')) return <UserCheck size={16} color="#34d399" />;
    if (r.includes('TECH')) return <Wrench size={16} color="#34d399" />;
    return <HardHat size={16} color="#34d399" />;
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(2, 6, 23, 0.78)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      padding: '20px'
    }}>
      <style>{`
        @keyframes successPopIn {
          0% {
            opacity: 0;
            transform: scale(0.65) translateY(24px);
          }
          65% {
            opacity: 1;
            transform: scale(1.04) translateY(-6px);
          }
          85% {
            transform: scale(0.98) translateY(2px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes checkPulse {
          0% {
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7), 0 0 25px rgba(16, 185, 129, 0.5);
          }
          70% {
            box-shadow: 0 0 0 22px rgba(16, 185, 129, 0), 0 0 45px rgba(16, 185, 129, 0.8);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0), 0 0 25px rgba(16, 185, 129, 0.5);
          }
        }

        @keyframes checkRotate {
          0% { transform: scale(0) rotate(-45deg); opacity: 0; }
          70% { transform: scale(1.2) rotate(8deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }

        @keyframes glowBorder {
          0%, 100% { border-color: rgba(16, 185, 129, 0.5); }
          50% { border-color: rgba(52, 211, 153, 0.9); }
        }
      `}</style>

      <div style={{
        width: '100%',
        maxWidth: '460px',
        backgroundColor: '#071612',
        background: 'linear-gradient(145deg, #091c16 0%, #061410 60%, #030a08 100%)',
        border: '1.5px solid rgba(16, 185, 129, 0.6)',
        borderRadius: '24px',
        padding: '36px 30px 28px',
        textAlign: 'center',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.75), 0 0 50px rgba(16, 185, 129, 0.35)',
        animation: 'successPopIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards, glowBorder 3s infinite',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Subtle decorative background glow */}
        <div style={{
          position: 'absolute',
          top: '-70px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '240px',
          height: '240px',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.28) 0%, rgba(16, 185, 129, 0) 70%)',
          pointerEvents: 'none',
          zIndex: 0
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Animated Animated Checkmark Icon */}
          <div style={{
            width: '80px',
            height: '80px',
            margin: '0 auto 20px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'checkPulse 2s infinite, checkRotate 0.5s ease-out forwards',
            boxShadow: '0 10px 25px rgba(16, 185, 129, 0.5)'
          }}>
            <CheckCircle2 size={46} color="#ffffff" strokeWidth={2.6} />
          </div>

          {/* Plant Security Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(52, 211, 153, 0.35)',
            borderRadius: '20px',
            padding: '4px 14px',
            fontSize: '0.75rem',
            fontWeight: 700,
            color: '#34d399',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            marginBottom: '14px'
          }}>
            <ShieldCheck size={14} color="#34d399" />
            <span>Operational Clearance Granted</span>
          </div>

          {/* Main Title */}
          <h2 style={{
            fontSize: '1.45rem',
            fontWeight: 800,
            color: '#ffffff',
            margin: '0 0 8px 0',
            letterSpacing: '-0.02em'
          }}>
            {title}
          </h2>

          {/* User Message */}
          <p style={{
            fontSize: '0.88rem',
            color: '#cbd5e1',
            margin: '0 0 16px 0',
            lineHeight: 1.5
          }}>
            {message}
          </p>

          {/* Role pill display */}
          {roleName && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'rgba(5, 46, 34, 0.65)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '10px',
              padding: '8px 16px',
              fontSize: '0.82rem',
              color: '#6ee7b7',
              fontWeight: 600,
              marginBottom: '22px'
            }}>
              {getRoleIcon(roleName)}
              <span>Assigned Station: <strong style={{ color: '#ffffff' }}>{roleName}</strong></span>
            </div>
          )}

          {/* Progress Bar Container */}
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.07)',
            borderRadius: '10px',
            height: '8px',
            overflow: 'hidden',
            marginBottom: '18px',
            position: 'relative'
          }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #10b981 0%, #34d399 100%)',
              borderRadius: '10px',
              transition: 'width 0.08s linear',
              boxShadow: '0 0 10px rgba(52, 211, 153, 0.8)'
            }} />
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.78rem',
            color: '#94a3b8'
          }}>
            <span>Initializing station console...</span>
            <button
              type="button"
              onClick={onComplete}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: 'transparent',
                border: 'none',
                color: '#34d399',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: '6px',
                transition: 'color 0.15s ease'
              }}
              onMouseOver={(e) => { e.currentTarget.style.color = '#a7f3d0'; }}
              onMouseOut={(e) => { e.currentTarget.style.color = '#34d399'; }}
            >
              <span>{actionText}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthSuccessPopup;
