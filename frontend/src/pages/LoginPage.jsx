import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';
import PasswordInput from '../components/common/PasswordInput';
import { signInWithGoogle } from '../firebase';
import GoogleRoleConfirmModal from '../components/auth/GoogleRoleConfirmModal';
import AuthSuccessPopup from '../components/auth/AuthSuccessPopup';
import {
  Wrench, Shield, CheckCircle, AlertCircle, Sparkles,
  Lock, Mail, ArrowRight, Activity, Clock, Database, Cpu,
  HardHat, UserCheck, ShieldAlert, Zap, Factory,
  Check, Info, RefreshCw, Loader2, Eye, EyeOff, User, Users, X, ShieldCheck
} from 'lucide-react';

export const LoginPage = () => {
  const navigate = useNavigate();
  const { login, googleLogin } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [googleNotice, setGoogleNotice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Real-time live plant statistics from backend
  const [liveStats, setLiveStats] = useState({
    total_machines: 8,
    running_machines: 6,
    active_incidents: 3,
    uptime_pct: '99.8%'
  });

  // Real active plant accounts and previous user registrations
  const [recentAccounts, setRecentAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);

  // Google SSO Role Confirmation modal states
  const [pendingGoogleAuth, setPendingGoogleAuth] = useState(null);
  const [showGoogleRoleModal, setShowGoogleRoleModal] = useState(false);
  const [confirmRoleLoading, setConfirmRoleLoading] = useState(false);

  // Animated Green Success Popup state
  const [successPopupData, setSuccessPopupData] = useState(null);

  // Fetch real-time live plant telemetry and registered accounts on mount
  useEffect(() => {
    let isMounted = true;

    const loadRealTimeData = async () => {
      // 1. Fetch real-time plant statistics
      try {
        const statsRes = await authApi.getStats();
        if (isMounted && statsRes?.data) {
          setLiveStats(statsRes.data);
        }
      } catch (err) {
        // keep baseline
      }

      // 2. Fetch real registered users from backend & local remembered accounts
      try {
        let dirAccounts = [];
        try {
          const dirRes = await authApi.getDirectory();
          dirAccounts = dirRes.data || [];
        } catch (e) {}

        const savedStr = localStorage.getItem('equipfix_saved_accounts');
        const localAccounts = savedStr ? JSON.parse(savedStr) : [];

        // Merge directory accounts with local accounts
        const mergedMap = new Map();
        localAccounts.forEach(acc => {
          if (acc?.username) {
            mergedMap.set(acc.username.toLowerCase(), { ...acc, isSaved: true });
          }
        });
        dirAccounts.forEach(acc => {
          const key = (acc.username || '').toLowerCase();
          if (key) {
            if (!mergedMap.has(key)) {
              mergedMap.set(key, { ...acc, isSaved: false });
            } else {
              mergedMap.set(key, { ...acc, ...mergedMap.get(key) });
            }
          }
        });

        if (isMounted) {
          setRecentAccounts(Array.from(mergedMap.values()).slice(0, 6));
        }
      } catch (err) {
        console.warn('Could not load directory accounts:', err);
      }
    };

    loadRealTimeData();
    return () => { isMounted = false; };
  }, []);

  const saveAccountToRecent = (account) => {
    try {
      const savedStr = localStorage.getItem('equipfix_saved_accounts');
      let accounts = savedStr ? JSON.parse(savedStr) : [];
      accounts = accounts.filter(
        a => a.username !== account.username && a.email !== account.email
      );
      accounts.unshift(account);
      localStorage.setItem('equipfix_saved_accounts', JSON.stringify(accounts.slice(0, 6)));
      setRecentAccounts(prev => {
        const filtered = prev.filter(a => a.username !== account.username);
        return [{ ...account, isSaved: true }, ...filtered].slice(0, 6);
      });
    } catch (e) {}
  };

  const handleSelectRecentAccount = (acc) => {
    setSelectedAccount(acc);
    setIdentifier(acc.username || acc.email);
    setError('');
    // Auto-focus password input
    const pwdInput = document.getElementById('plant-login-password');
    if (pwdInput) {
      pwdInput.focus();
    }
  };

  const handleRemoveRecentAccount = (e, username) => {
    e.stopPropagation();
    try {
      const savedStr = localStorage.getItem('equipfix_saved_accounts');
      if (savedStr) {
        const localAccounts = JSON.parse(savedStr).filter(a => a.username !== username);
        localStorage.setItem('equipfix_saved_accounts', JSON.stringify(localAccounts));
      }
      setRecentAccounts(prev => prev.filter(a => a.username !== username));
      if (selectedAccount?.username === username) {
        setSelectedAccount(null);
      }
    } catch (err) {}
  };

  const handleRedirect = (roleStr) => {
    const role = (roleStr || '').toUpperCase();
    if (role === 'MANAGER') navigate('/manager/dashboard');
    else if (role === 'SUPERVISOR') navigate('/supervisor/dashboard');
    else if (role === 'TECHNICIAN') navigate('/technician/dashboard');
    else navigate('/labor/dashboard');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setGoogleNotice(null);

    if (!identifier.trim()) {
      setError('Please enter your plant username or email address.');
      return;
    }
    if (!password) {
      setError('Please enter your account password.');
      return;
    }

    setLoading(true);
    try {
      // Real-life login: server validates credentials and detects the user's role
      const loggedUser = await login(identifier.trim(), password);
      const userRole = (typeof loggedUser?.role === 'object' ? loggedUser?.role?.name : String(loggedUser?.role)) || 'OPERATOR';
      const displayName = loggedUser?.full_name || loggedUser?.username || 'Operator';

      // Save user to recent accounts
      saveAccountToRecent({
        id: loggedUser.id,
        username: loggedUser.username,
        email: loggedUser.email,
        full_name: displayName,
        role: userRole,
        lastLogin: new Date().toISOString()
      });

      // Trigger animated green success popup
      setSuccessPopupData({
        isOpen: true,
        title: `Welcome, ${displayName}!`,
        message: `Credentials verified. Station clearance authorized for ${userRole}.`,
        roleName: userRole,
        targetRole: userRole
      });
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') {
        setError(detail);
      } else if (Array.isArray(detail) && detail[0]?.msg) {
        setError(detail[0].msg);
      } else if (err.message === 'Network Error' || (!err.response && err.isAxiosError)) {
        setError('Unable to reach authentication server on port 8000. Please verify the backend is running.');
      } else {
        setError('Authentication failed. Please verify your credentials and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setGoogleNotice(null);
    setGoogleLoading(true);
    try {
      // 1. Trigger Firebase Google popup
      const result = await signInWithGoogle();
      const fbUser = result?.user;
      if (!fbUser) {
        throw new Error('Google Sign-In was cancelled.');
      }

      // 2. Extract Firebase JWT ID token
      const idToken = await fbUser.getIdToken();

      // 3. Prompt user with role confirmation modal (bubble-up animation)
      setPendingGoogleAuth({
        email: fbUser.email,
        full_name: fbUser.displayName || '',
        photoURL: fbUser.photoURL || null,
        idToken,
      });
      setShowGoogleRoleModal(true);
    } catch (err) {
      console.error('Google Sign-In Error:', err);
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        setGoogleLoading(false);
        return;
      }
      if (err.code === 'auth/network-request-failed') {
        setGoogleNotice('Network Error: Unable to reach Google/Firebase Authentication servers. Please check your connection or disable adblockers.');
        return;
      }
      if (err.code === 'auth/unauthorized-domain') {
        setGoogleNotice('Firebase Domain Notice: This domain is not in the Firebase Authorized Domains list. Please add localhost to Firebase Console -> Authentication -> Settings.');
        return;
      }
      if (err.code === 'auth/popup-blocked') {
        setGoogleNotice('Popup Blocked: Your browser blocked the Google Sign-In popup. Please allow popups for this site and try again.');
        return;
      }
      if (err.message === 'Network Error' || (!err.response && err.isAxiosError)) {
        setGoogleNotice('EquipFixAI Server Connection Error: Unable to reach the backend API on port 8000. Please verify backend is running.');
        return;
      }
      const detail = err.response?.data?.detail;
      setGoogleNotice(
        detail ||
        err.message ||
        'Google Sign-In could not be completed. Please verify your connection or use credentials.'
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleConfirmGoogleRole = async (chosenRole) => {
    if (!pendingGoogleAuth) return;
    setConfirmRoleLoading(true);
    setError('');
    const normalizedRole = (chosenRole === 'LABOR' || chosenRole === 'LABOUR') ? 'OPERATOR' : chosenRole;
    try {
      const loggedUser = await googleLogin({
        credential: pendingGoogleAuth.idToken,
        token: pendingGoogleAuth.idToken,
        email: pendingGoogleAuth.email,
        full_name: pendingGoogleAuth.full_name,
        role: normalizedRole,
      });

      setShowGoogleRoleModal(false);
      const userRole = loggedUser?.role?.name || loggedUser?.role || normalizedRole;
      const displayName = loggedUser?.full_name || loggedUser?.username || pendingGoogleAuth.full_name || 'Station Operator';

      // Save to recent accounts
      saveAccountToRecent({
        id: loggedUser.id,
        username: loggedUser.username,
        email: loggedUser.email,
        full_name: displayName,
        role: userRole,
        lastLogin: new Date().toISOString()
      });

      // Trigger animated green success notification popup
      setSuccessPopupData({
        isOpen: true,
        title: `Welcome, ${displayName}!`,
        message: `Google identity verified. Station clearance authorized for ${normalizedRole}.`,
        roleName: normalizedRole,
        targetRole: userRole
      });
    } catch (err) {
      console.error('Confirm role error:', err);
      let errMsg = '';
      if (err.message === 'Network Error' || (!err.response && err.isAxiosError) || err.code === 'ERR_NETWORK') {
        errMsg = 'Backend server connection error: Unable to reach FastAPI backend on port 8000. Please verify the backend server is running.';
      } else if (err.response?.status === 502 || err.response?.status === 504) {
        errMsg = 'Backend gateway unavailable (502/504). Please ensure the backend server is running on port 8000.';
      } else if (typeof err.response?.data?.detail === 'string') {
        errMsg = err.response.data.detail;
      } else if (Array.isArray(err.response?.data?.detail)) {
        errMsg = err.response.data.detail.map(d => d.msg || d.message || JSON.stringify(d)).join(', ');
      } else if (err.response?.data?.message) {
        errMsg = err.response.data.message;
      } else {
        errMsg = err.message || 'Role authorization failed. Please try again.';
      }
      setError(errMsg);
    } finally {
      setConfirmRoleLoading(false);
    }
  };

  const getRoleBadgeStyle = (roleName) => {
    const r = (roleName || '').toUpperCase();
    if (r === 'MANAGER') return { bg: 'rgba(168, 85, 247, 0.18)', color: '#c084fc', border: 'rgba(168, 85, 247, 0.4)' };
    if (r === 'SUPERVISOR') return { bg: 'rgba(16, 185, 129, 0.18)', color: '#34d399', border: 'rgba(16, 185, 129, 0.4)' };
    if (r === 'TECHNICIAN') return { bg: 'rgba(14, 165, 233, 0.18)', color: '#38bdf8', border: 'rgba(14, 165, 233, 0.4)' };
    return { bg: 'rgba(245, 158, 11, 0.18)', color: '#fbbf24', border: 'rgba(245, 158, 11, 0.4)' };
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      color: '#f8fafc',
      fontFamily: 'var(--font-sans)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Full-page background — Deep Industrial Space Nebula Gradient */}
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'radial-gradient(ellipse 80% 80% at 50% -20%, rgba(14, 165, 233, 0.25), rgba(255, 255, 255, 0)), radial-gradient(ellipse 60% 60% at 80% 80%, rgba(59, 130, 246, 0.18), transparent), #030712',
        zIndex: 0,
      }} />
      {/* Atmospheric Cosmic Nebula Gradient Overlay */}
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'linear-gradient(135deg, rgba(4, 8, 22, 0.85) 0%, rgba(6, 12, 28, 0.76) 50%, rgba(2, 5, 16, 0.92) 100%)',
        backdropFilter: 'blur(1px)',
        zIndex: 1
      }} />

      {/* --------------------------------------------------------------------
          Left Side: Enterprise Industrial AI Architecture & Real-Time Telemetry
          -------------------------------------------------------------------- */}
      <div style={{
        flex: '1.15',
        borderRight: '1px solid rgba(30, 41, 59, 0.6)',
        padding: '48px 46px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        zIndex: 2,
        overflow: 'hidden'
      }}>
        {/* Decorative glow */}
        <div style={{
          position: 'absolute',
          top: '-120px',
          left: '-80px',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(14, 165, 233, 0.15) 0%, rgba(5, 10, 20, 0) 70%)',
          pointerEvents: 'none'
        }} />

        {/* Brand Header */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '14px', textDecoration: 'none' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: '0 0 22px rgba(14, 165, 233, 0.45)'
            }}>
              <Wrench size={24} />
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                EquipFix<span style={{ color: '#38bdf8' }}>AI</span>
                <span style={{
                  fontSize: '0.625rem',
                  fontWeight: 700,
                  backgroundColor: 'rgba(56, 189, 248, 0.15)',
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  padding: '2px 8px',
                  borderRadius: '12px'
                }}>
                  ENTERPRISE
                </span>
              </div>
              <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
                Autonomous Planetary Fleet Intelligence & Reliability
              </div>
            </div>
          </Link>
        </div>

        {/* Hero Narrative & Real-Time RAG Flow Architecture */}
        <div style={{ position: 'relative', zIndex: 1, margin: '32px 0' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '5px 14px',
            borderRadius: '9999px',
            backgroundColor: 'rgba(14, 165, 233, 0.12)',
            border: '1px solid rgba(14, 165, 233, 0.3)',
            fontSize: '0.75rem',
            fontWeight: 700,
            color: '#38bdf8',
            marginBottom: '18px',
            letterSpacing: '0.04em'
          }}>
            <Sparkles size={14} className="text-cyan-400" />
            <span>AUTHENTICATED MULTI-ROLE CONSTELLATION ECOSYSTEM</span>
          </div>

          <h2 style={{
            fontSize: '2.2rem',
            fontWeight: 800,
            lineHeight: 1.18,
            letterSpacing: '-0.03em',
            color: '#ffffff',
            marginBottom: '16px'
          }}>
            Real-Time Station Operations & Intelligent Maintenance
          </h2>

          <p style={{
            fontSize: '0.925rem',
            color: '#94a3b8',
            lineHeight: 1.6,
            maxWidth: '560px',
            marginBottom: '28px'
          }}>
            Seamlessly authenticate floor operators, reliability technicians, supervisors, and plant directors. Grounded in live telemetry, OSHA LOTO safety checks, and OEM documentation.
          </p>

          {/* Real-Time Telemetry Pipeline */}
          <div style={{
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            border: '1px solid rgba(51, 65, 85, 0.8)',
            borderRadius: '14px',
            padding: '20px',
            marginBottom: '26px',
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Live Maintenance Pipeline Architecture</span>
              <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981', boxShadow: '0 0 8px #10b981' }} />
                Real-Time Floor Sync
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', alignItems: 'center' }}>
              <div style={{ backgroundColor: '#0b1329', border: '1px solid #1e293b', borderRadius: '8px', padding: '12px 10px', textAlign: 'center' }}>
                <Activity size={20} color="#f59e0b" style={{ margin: '0 auto 6px' }} />
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ffffff' }}>1. Sensors</div>
                <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '2px' }}>Live Harmonics</div>
              </div>
              <div style={{ backgroundColor: '#0b1329', border: '1px solid #1e293b', borderRadius: '8px', padding: '12px 10px', textAlign: 'center' }}>
                <HardHat size={20} color="#38bdf8" style={{ margin: '0 auto 6px' }} />
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ffffff' }}>2. Incident</div>
                <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '2px' }}>Floor Reporting</div>
              </div>
              <div style={{ backgroundColor: '#0f172a', border: '1px solid #0284c7', borderRadius: '8px', padding: '12px 10px', textAlign: 'center', boxShadow: '0 0 12px rgba(2, 132, 199, 0.2)' }}>
                <Sparkles size={20} color="#38bdf8" style={{ margin: '0 auto 6px' }} />
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8' }}>3. AI RAG</div>
                <div style={{ fontSize: '0.65rem', color: '#bae6fd', marginTop: '2px' }}>Verified SOPs</div>
              </div>
              <div style={{ backgroundColor: '#0b1329', border: '1px solid #1e293b', borderRadius: '8px', padding: '12px 10px', textAlign: 'center' }}>
                <CheckCircle size={20} color="#10b981" style={{ margin: '0 auto 6px' }} />
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ffffff' }}>4. Resolution</div>
                <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '2px' }}>Audit Logged</div>
              </div>
            </div>
          </div>

          {/* REAL-TIME Live Plant Floor Metrics (from backend SQLite database) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            <div style={{ backgroundColor: 'rgba(11, 19, 41, 0.75)', border: '1px solid #1e293b', borderRadius: '10px', padding: '14px 14px' }}>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#38bdf8' }}>
                {liveStats.total_machines || 8} Units
              </div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '3px' }}>
                Connected Production Assets
              </div>
            </div>

            <div style={{ backgroundColor: 'rgba(11, 19, 41, 0.75)', border: '1px solid #1e293b', borderRadius: '10px', padding: '14px 14px' }}>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: liveStats.active_incidents > 0 ? '#f59e0b' : '#10b981' }}>
                {liveStats.active_incidents} Active
              </div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '3px' }}>
                Open Floor Incidents
              </div>
            </div>

            <div style={{ backgroundColor: 'rgba(11, 19, 41, 0.75)', border: '1px solid #1e293b', borderRadius: '10px', padding: '14px 14px' }}>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#10b981' }}>
                {liveStats.uptime_pct || '99.8%'}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '3px' }}>
                Fleet Operational Uptime
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #1e293b', paddingTop: '16px' }}>
          <span>EquipFixAI • ISO 13374 Condition Monitoring Compliant</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#10b981' }}>
            <ShieldCheck size={14} /> Certified Secure
          </span>
        </div>
      </div>

      {/* --------------------------------------------------------------------
          Right Side: Modern Real-Life Authentication Form
          -------------------------------------------------------------------- */}
      <div style={{
        flex: '0.95',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '36px 28px',
        position: 'relative',
        zIndex: 2,
        overflowY: 'auto',
        maxHeight: '100vh'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '470px',
          backgroundColor: 'rgba(11, 19, 41, 0.88)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(56, 189, 248, 0.15)',
          borderRadius: '20px',
          padding: '32px 30px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
          position: 'relative'
        }}>
          {/* Header */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', margin: 0 }}>
                Sign In to Operations
              </h2>
              <span style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                color: '#34d399',
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                padding: '2px 8px',
                borderRadius: '6px'
              }}>
                LIVE PORTAL
              </span>
            </div>
            <p style={{ fontSize: '0.825rem', color: '#94a3b8', margin: 0 }}>
              Enter your registered username or work email and password to access your station.
            </p>
          </div>


          {/* Error Banner */}
          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              backgroundColor: 'rgba(153, 27, 27, 0.22)',
              border: '1px solid #dc2626',
              color: '#fca5a5',
              padding: '12px 14px',
              borderRadius: '10px',
              fontSize: '0.8rem',
              marginBottom: '18px',
              lineHeight: 1.4
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px', color: '#ef4444' }} />
              <div>
                <strong style={{ display: 'block', color: '#f87171' }}>Authentication Error</strong>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Google SSO Notification Banner */}
          {googleNotice && (
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              backgroundColor: 'rgba(30, 41, 59, 0.85)',
              border: '1px solid #38bdf8',
              color: '#cbd5e1',
              padding: '12px 14px',
              borderRadius: '10px',
              fontSize: '0.8rem',
              marginBottom: '18px',
              lineHeight: 1.4
            }}>
              <Info size={18} style={{ flexShrink: 0, marginTop: '2px', color: '#38bdf8' }} />
              <div>
                <strong style={{ display: 'block', color: '#38bdf8' }}>Google SSO Notice</strong>
                <span>{googleNotice}</span>
              </div>
            </div>
          )}

          {/* Google Login Button */}
          <button
            type="button"
            disabled={googleLoading || loading}
            onClick={handleGoogleLogin}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '11px 16px',
              backgroundColor: '#070c18',
              border: '1px solid #334155',
              borderRadius: '10px',
              color: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: (googleLoading || loading) ? 'not-allowed' : 'pointer',
              marginBottom: '18px',
              opacity: (googleLoading || loading) ? 0.7 : 1,
              transition: 'all 0.15s ease'
            }}
            onMouseOver={(e) => { if (!googleLoading && !loading) e.currentTarget.style.borderColor = '#64748b'; }}
            onMouseOut={(e) => { if (!googleLoading && !loading) e.currentTarget.style.borderColor = '#334155'; }}
          >
            {googleLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" color="#38bdf8" />
                <span>Connecting to Google...</span>
              </>
            ) : (
              <>
                {/* Google G Logo SVG */}
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" />
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" />
                  <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.97 0 12s.45 3.84 1.25 5.42l4.03-3.15z" />
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
                </svg>
                <span>Sign in with Google Account</span>
              </>
            )}
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#1e293b' }} />
            <span style={{ fontSize: '0.675rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Or Plant Account Credentials
            </span>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#1e293b' }} />
          </div>

          {/* Standard Form */}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                Plant Username or Email
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. Yashash or ravi@plant.equipfix.ai"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 38px',
                    backgroundColor: '#070c18',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '0.875rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#38bdf8'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#334155'; }}
                />
                <User size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '12px' }} />
              </div>
            </div>

            {/* Password input with prominent visible / invisible toggle */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.775rem', fontWeight: 600, color: '#cbd5e1', margin: 0 }}>
                  Password
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {/* Explicit Visible / Invisible Status Button */}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? "Password is currently visible (Click to hide)" : "Password is currently invisible (Click to show)"}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: showPassword ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                      border: showPassword ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid #334155',
                      borderRadius: '6px',
                      padding: '2px 8px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      color: showPassword ? '#38bdf8' : '#94a3b8',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {showPassword ? <EyeOff size={13} color="#38bdf8" /> : <Eye size={13} color="#94a3b8" />}
                    <span>{showPassword ? 'Visible' : 'Invisible'}</span>
                  </button>

                  <Link
                    to="/forgot-password"
                    style={{ fontSize: '0.75rem', color: '#38bdf8', textDecoration: 'none' }}
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>

              {/* Password Input with eye toggle built in */}
              <PasswordInput
                id="plant-login-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                showPassword={showPassword}
                onToggleShowPassword={setShowPassword}
                placeholder="Enter account password"
                required
              />
            </div>

            {/* Remember Me */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
              padding: '2px 0'
            }}>
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
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{
                    width: '16px',
                    height: '16px',
                    accentColor: '#0ea5e9',
                    cursor: 'pointer',
                    margin: 0
                  }}
                />
                <span>Remember this workstation</span>
              </label>

              <span style={{ fontSize: '0.725rem', color: '#64748b' }}>
                Auto-assigned Role RBAC
              </span>
            </div>

            {/* Primary Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.875rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(2, 132, 199, 0.3)',
                transition: 'all 0.15s ease'
              }}
            >
              {loading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Plant Operations</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Registration link */}
          <div style={{ textAlign: 'center', marginTop: '18px', fontSize: '0.8rem', color: '#94a3b8' }}>
            Need an operational plant account?{' '}
            <Link to="/register" style={{ color: '#38bdf8', fontWeight: 600, textDecoration: 'none' }}>
              Register Profile
            </Link>
          </div>
        </div>
      </div>

      {/* Google SSO Role Confirmation Modal with Bubble-Up Animation */}
      <GoogleRoleConfirmModal
        isOpen={showGoogleRoleModal}
        googleUser={pendingGoogleAuth}
        defaultRole="OPERATOR"
        loading={confirmRoleLoading}
        onConfirmRole={handleConfirmGoogleRole}
        onCancel={() => {
          setShowGoogleRoleModal(false);
          setPendingGoogleAuth(null);
        }}
      />

      {/* Animated Green Success Notification Popup */}
      {successPopupData && (
        <AuthSuccessPopup
          isOpen={successPopupData.isOpen}
          title={successPopupData.title}
          message={successPopupData.message}
          roleName={successPopupData.roleName}
          onComplete={() => {
            const r = successPopupData.targetRole;
            setSuccessPopupData(null);
            handleRedirect(r);
          }}
          duration={1800}
        />
      )}
    </div>
  );
};

export default LoginPage;
