import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authApi } from '../services/api';
import PasswordInput from '../components/common/PasswordInput';
import { Wrench, Lock, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

export const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Password strength calculation
  const getPasswordStrength = () => {
    if (!password) return { label: 'Empty', score: 0, color: '#64748b' };
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[!@#$%^&*()_+\-=[\]{}|;:,.<>?/~`]/.test(password)) score++;

    if (score <= 1) return { label: 'Weak', score: 25, color: '#ef4444' };
    if (score === 2) return { label: 'Moderate', score: 50, color: '#f59e0b' };
    if (score === 3) return { label: 'Strong', score: 75, color: '#3b82f6' };
    return { label: 'Very Strong', score: 100, color: '#10b981' };
  };

  const strength = getPasswordStrength();
  const isMatch = password && confirmPassword && password === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const activeToken = token || manualToken;
    if (!activeToken) {
      setError('Please provide a valid password reset token or use the link from your email.');
      return;
    }
    if (!isMatch) {
      setError('Passwords do not match.');
      return;
    }
    if (strength.score < 50) {
      setError('Please choose a stronger password.');
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword(activeToken, password);
      setSuccess(true);
    } catch (err) {
      const detail = err.response?.data?.detail || err.response?.data?.message;
      if (typeof detail === 'string') {
        setError(detail);
      } else if (err.response?.status === 400) {
        setError('Password reset link is invalid or has expired. Please request a new link.');
      } else if (err.response?.status >= 500) {
        setError('Authentication server error. Please retry shortly.');
      } else if (err.request && !err.response) {
        setError('Unable to reach server. Please ensure backend is running on port 8000.');
      } else {
        setError('Failed to update password. Reset link may have expired.');
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
      {/* Background: welder with arc flash */}
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
        background: 'linear-gradient(160deg, rgba(4,8,19,0.90) 0%, rgba(7,12,28,0.78) 50%, rgba(4,8,19,0.93) 100%)',
        zIndex: 1
      }} />

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
        padding: '36px 32px',
        boxShadow: '0 30px 80px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.04)'
      }}>
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', textDecoration: 'none', marginBottom: '14px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <Wrench size={20} />
            </div>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff' }}>
              EquipFix<span style={{ color: '#38bdf8' }}>AI</span>
            </span>
          </Link>

          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: '#ffffff' }}>
            Set New Password
          </h2>
          <p style={{ fontSize: '0.825rem', color: '#94a3b8', marginTop: '6px' }}>
            Choose a strong, secure passphrase for your account.
          </p>
        </div>

        {success ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              backgroundColor: '#064e3b',
              border: '1px solid #059669',
              borderRadius: '10px',
              padding: '24px',
              color: '#a7f3d0',
              marginBottom: '24px'
            }}>
              <CheckCircle2 size={40} style={{ margin: '0 auto 12px auto', color: '#34d399' }} />
              <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px', color: '#ffffff' }}>
                Password updated successfully.
              </div>
              <p style={{ fontSize: '0.825rem', color: '#d1fae5', margin: 0, lineHeight: 1.5 }}>
                Your account password has been updated across all industrial maintenance terminals.
              </p>
            </div>

            <button
              type="button"
              className="btn btn-primary btn-lg"
              style={{ width: '100%', borderRadius: '8px' }}
              onClick={() => navigate('/login')}
            >
              Continue to Sign In <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          <>
            {error && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#450a0a',
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
              {!token && (
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label" style={{ color: '#cbd5e1' }}>Reset Token</label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ backgroundColor: '#070c18', borderColor: '#334155', color: '#ffffff' }}
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                    placeholder="Paste reset token from email"
                    required
                  />
                </div>
              )}

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ color: '#cbd5e1' }}>New Password</label>
                <PasswordInput
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  showPassword={showPasswords}
                  onToggleShowPassword={setShowPasswords}
                  placeholder="••••••••••••"
                  required
                />
              </div>

              {/* Password Strength Meter */}
              {password && (
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.725rem', marginBottom: '4px' }}>
                    <span style={{ color: '#94a3b8' }}>Strength:</span>
                    <span style={{ fontWeight: 600, color: strength.color }}>{strength.label}</span>
                  </div>
                  <div style={{ height: '4px', backgroundColor: '#1e293b', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${strength.score}%`,
                      backgroundColor: strength.color,
                      transition: 'all 0.2s ease'
                    }} />
                  </div>
                </div>
              )}

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ color: '#cbd5e1' }}>Confirm New Password</label>
                <PasswordInput
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  showPassword={showPasswords}
                  onToggleShowPassword={setShowPasswords}
                  placeholder="••••••••••••"
                  required
                  style={{
                    borderColor: confirmPassword
                      ? (isMatch ? '#059669' : '#dc2626')
                      : '#334155'
                  }}
                />
              </div>

              {/* Show Passwords Checkbox */}
              <div style={{ marginBottom: '22px' }}>
                <label style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  color: '#cbd5e1',
                  userSelect: 'none'
                }}>
                  <input
                    type="checkbox"
                    checked={showPasswords}
                    onChange={(e) => setShowPasswords(e.target.checked)}
                    style={{
                      width: '16px',
                      height: '16px',
                      accentColor: '#0ea5e9',
                      cursor: 'pointer',
                      margin: 0
                    }}
                  />
                  <span>Show passwords</span>
                </label>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', padding: '10px', borderRadius: '8px', fontWeight: 600 }}
                disabled={loading || !isMatch || strength.score < 50}
              >
                {loading ? 'Updating Password...' : 'Reset Password'}
              </button>
            </form>
          </>
        )}

        <div style={{ textAlign: 'center', marginTop: '24px', borderTop: '1px solid #1e293b', paddingTop: '16px' }}>
          <Link to="/login" style={{ color: '#94a3b8', fontSize: '0.825rem', textDecoration: 'none' }}>
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};
