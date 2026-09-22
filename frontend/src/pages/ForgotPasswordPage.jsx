import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../services/api';
import { Wrench, Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [resetUrl, setResetUrl] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await authApi.forgotPassword(email.trim().toLowerCase());
      if (res.data?.reset_url) {
        setResetUrl(res.data.reset_url);
      }
      setSubmitted(true);
    } catch (err) {
      const detail = err.response?.data?.detail || err.response?.data?.message;
      if (typeof detail === 'string') {
        setError(detail);
      } else if (err.response?.status >= 500) {
        setError('Authentication server error. Please retry in a few moments.');
      } else if (err.request && !err.response) {
        setError('Unable to reach server. Please ensure backend is running on port 8000.');
      } else {
        setError('An error occurred while dispatching the reset request. Please retry.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#f8fafc',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background: welder with bright arc flash */}
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundImage: 'url(/images/bg-welder.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        zIndex: 0
      }} />
      {/* Dark overlay */}
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'linear-gradient(160deg, rgba(4,8,19,0.90) 0%, rgba(7,12,28,0.75) 50%, rgba(4,8,19,0.93) 100%)',
        zIndex: 1
      }} />

      {/* Glassmorphism Card */}
      <div style={{
        position: 'relative',
        zIndex: 2,
        width: '100%',
        maxWidth: '440px',
        backgroundColor: 'rgba(11, 19, 41, 0.85)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        border: '1px solid rgba(56, 189, 248, 0.14)',
        borderRadius: '20px',
        padding: '40px 36px',
        boxShadow: '0 30px 80px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.04)'
      }}>
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', textDecoration: 'none', marginBottom: '16px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: '0 0 20px rgba(14, 165, 233, 0.35)'
            }}>
              <Wrench size={22} />
            </div>
            <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff' }}>
              EquipFix<span style={{ color: '#38bdf8' }}>AI</span>
            </span>
          </Link>

          {/* Icon badge */}
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'rgba(14, 165, 233, 0.12)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <Mail size={24} color="#38bdf8" />
          </div>

          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: '#ffffff' }}>
            Reset your password
          </h2>
          <p style={{ fontSize: '0.825rem', color: '#94a3b8', marginTop: '8px', lineHeight: 1.6 }}>
            Enter your registered work email and we'll dispatch a secure password reset link to your inbox.
          </p>
        </div>

        {submitted ? (
          <div style={{
            backgroundColor: 'rgba(6, 78, 59, 0.5)',
            border: '1px solid #059669',
            borderRadius: '12px',
            padding: '24px 20px',
            textAlign: 'center',
            color: '#a7f3d0',
            marginBottom: '24px'
          }}>
            <CheckCircle2 size={40} style={{ margin: '0 auto 12px auto', color: '#34d399' }} />
            <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '8px', color: '#ffffff' }}>
              Reset Link Dispatched
            </div>
            <p style={{ fontSize: '0.82rem', color: '#d1fae5', margin: 0, lineHeight: 1.6 }}>
              If an account with that email exists, we've sent instructions to reset your password. Please check your inbox and spam folder.
            </p>

            {resetUrl && (
              <div style={{
                marginTop: '16px',
                padding: '12px 14px',
                backgroundColor: 'rgba(14, 165, 233, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.35)',
                borderRadius: '8px',
                textAlign: 'left'
              }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                  Simulated Terminal Dispatch Link:
                </div>
                <p style={{ fontSize: '0.78rem', color: '#cbd5e1', margin: '0 0 10px 0', lineHeight: 1.4 }}>
                  In local testing mode, you can immediately test password reset using this link:
                </p>
                <Link
                  to={resetUrl}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: '#ffffff',
                    backgroundColor: '#0284c7',
                    padding: '8px 14px',
                    borderRadius: '6px',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    textDecoration: 'none',
                    boxShadow: '0 2px 8px rgba(2, 132, 199, 0.4)'
                  }}
                >
                  Set New Password Now →
                </Link>
              </div>
            )}
          </div>
        ) : (
          <>
            {error && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: 'rgba(69, 10, 10, 0.6)',
                border: '1px solid #991b1b',
                color: '#fca5a5',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                marginBottom: '20px'
              }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label" style={{ color: '#cbd5e1', marginBottom: '6px', display: 'block' }}>Work Email</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    className="form-input"
                    style={{
                      backgroundColor: 'rgba(5,8,18,0.75)',
                      borderColor: '#334155',
                      color: '#ffffff',
                      paddingLeft: '40px',
                      width: '100%',
                      boxSizing: 'border-box'
                    }}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@plant.equipfix.ai"
                    required
                  />
                  <Mail size={16} color="#64748b" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', padding: '11px', borderRadius: '10px', fontWeight: 700, fontSize: '0.9rem' }}
                disabled={loading}
              >
                {loading ? 'Sending Link...' : 'Send Reset Link'}
              </button>
            </form>
          </>
        )}

        <div style={{ textAlign: 'center', marginTop: '24px', borderTop: '1px solid rgba(30, 41, 59, 0.6)', paddingTop: '18px' }}>
          <Link
            to="/login"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: '#94a3b8',
              fontSize: '0.825rem',
              textDecoration: 'none',
              transition: 'color 0.15s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.color = '#38bdf8'; }}
            onMouseOut={(e) => { e.currentTarget.style.color = '#94a3b8'; }}
          >
            <ArrowLeft size={14} /> Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};
