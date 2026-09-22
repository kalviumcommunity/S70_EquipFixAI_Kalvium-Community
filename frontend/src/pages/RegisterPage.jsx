import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../services/api';
import PasswordInput from '../components/common/PasswordInput';
import AuthSuccessPopup from '../components/auth/AuthSuccessPopup';
import {
  Wrench, Shield, CheckCircle, AlertCircle, Sparkles,
  Lock, Mail, User, Building, BadgeCheck, ArrowRight
} from 'lucide-react';

export const RegisterPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    full_name: '',
    password: '',
    confirm_password: '',
    department: 'Machining',
    employee_id: '',
    role_name: 'OPERATOR'
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [agreeCompliance, setAgreeCompliance] = useState(true);

  // Live password validation checks
  const pwd = formData.password;
  const hasMinLength = pwd.length >= 8;
  const hasUpper = /[A-Z]/.test(pwd);
  const hasNumber = /[0-9]/.test(pwd);
  const hasSpecial = /[!@#$%^&*()_+\-=[\]{}|;:,.<>?/~`]/.test(pwd);
  const isPasswordValid = hasMinLength && hasUpper && hasNumber && hasSpecial;
  const isMatch = pwd && formData.confirm_password && pwd === formData.confirm_password;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.username.trim() || !formData.email.trim() || !formData.full_name.trim()) {
      setError('Please fill in all required profile fields.');
      return;
    }
    if (!isPasswordValid) {
      setError('Please satisfy all password complexity criteria (8+ chars, uppercase, number, special char).');
      return;
    }
    if (!isMatch) {
      setError('Passwords do not match. Please ensure both passwords are identical.');
      return;
    }
    if (!agreeCompliance) {
      setError('Please acknowledge plant safety regulations and Lockout/Tagout (LOTO) protocols.');
      return;
    }

    setLoading(true);
    try {
      await authApi.register({
        username: formData.username.trim(),
        email: formData.email.trim().toLowerCase(),
        full_name: formData.full_name.trim(),
        password: formData.password,
        department: formData.department,
        employee_id: formData.employee_id?.trim() || null,
        role_name: formData.role_name
      });
      setSuccess(true);
      setShowSuccessPopup(true);
    } catch (err) {

      const data = err.response?.data;
      if (typeof data?.detail === 'string') {
        setError(data.detail);
      } else if (Array.isArray(data?.detail)) {
        setError(data.detail.map((item) => (typeof item === 'string' ? item : item.msg || 'Invalid field format')).join('. '));
      } else if (typeof data?.message === 'string') {
        setError(data.message);
      } else if (err.response?.status === 400) {
        setError(data?.detail || 'Invalid registration details. Please verify your username, email, and password.');
      } else if (err.response?.status === 409) {
        setError('A user with this username or email already exists.');
      } else if (err.response?.status === 403) {
        setError('Manager accounts cannot be self-registered. Contact IT or plant administration.');
      } else if (err.response?.status >= 500) {
        setError('Authentication server error. Please retry in a few moments.');
      } else if (err.request && !err.response) {
        setError('Unable to reach authentication server. Please ensure backend is running on port 8000.');
      } else {
        setError(err.message || 'Registration could not be completed. Please review your details and try again.');
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
      padding: '30px 20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background: industrial worker with sparks */}
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundImage: 'url(/images/bg-worker.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center 30%',
        backgroundRepeat: 'no-repeat',
        zIndex: 0
      }} />
      {/* Dark gradient overlay */}
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'linear-gradient(135deg, rgba(4,8,19,0.88) 0%, rgba(7,12,28,0.78) 60%, rgba(4,8,19,0.92) 100%)',
        zIndex: 1
      }} />

      {/* Glassmorphism Card */}
      <div style={{
        position: 'relative',
        zIndex: 2,
        width: '100%',
        maxWidth: '520px',
        backgroundColor: 'rgba(11, 19, 41, 0.82)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        border: '1px solid rgba(56, 189, 248, 0.14)',
        borderRadius: '20px',
        padding: '36px 32px',
        boxShadow: '0 30px 80px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.04)'
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', textDecoration: 'none', marginBottom: '12px' }}>
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
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, color: '#ffffff' }}>
            Create Operations Account
          </h2>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>
            Register your employee profile to access industrial maintenance systems.
          </p>
        </div>

        {/* Success Alert */}
        {success && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#064e3b',
            border: '1px solid #059669',
            color: '#a7f3d0',
            padding: '12px 14px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            marginBottom: '20px'
          }}>
            <CheckCircle size={18} />
            <span>Account created successfully! Redirecting to Sign In...</span>
          </div>
        )}

        {/* Error Alert */}
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
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Full Name & Username */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label className="form-label" style={{ color: '#cbd5e1' }}>Full Name</label>
              <input
                type="text"
                name="full_name"
                className="form-input"
                style={{ backgroundColor: 'rgba(5,8,18,0.7)', borderColor: '#334155', color: '#ffffff' }}
                value={formData.full_name}
                onChange={handleChange}
                placeholder="Sarah Connor"
                required
              />
            </div>
            <div>
              <label className="form-label" style={{ color: '#cbd5e1' }}>Username</label>
              <input
                type="text"
                name="username"
                className="form-input"
                style={{ backgroundColor: 'rgba(5,8,18,0.7)', borderColor: '#334155', color: '#ffffff' }}
                value={formData.username}
                onChange={handleChange}
                placeholder="sconnor"
                required
              />
            </div>
          </div>

          {/* Email */}
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label" style={{ color: '#cbd5e1' }}>Work Email</label>
            <input
              type="email"
              name="email"
              className="form-input"
              style={{ backgroundColor: 'rgba(5,8,18,0.7)', borderColor: '#334155', color: '#ffffff' }}
              value={formData.email}
              onChange={handleChange}
              placeholder="s.connor@plant.equipfix.ai"
              required
            />
          </div>

          {/* Department & Role */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label className="form-label" style={{ color: '#cbd5e1' }}>Department</label>
              <select
                name="department"
                className="form-select"
                style={{ backgroundColor: 'rgba(5,8,18,0.7)', borderColor: '#334155', color: '#ffffff' }}
                value={formData.department}
                onChange={handleChange}
              >
                <option value="Machining">Machining (CNC)</option>
                <option value="Assembly">Assembly Line</option>
                <option value="Hydraulics">Hydraulics & Press</option>
                <option value="Packaging">Packaging</option>
                <option value="Quality">Quality & Inspection</option>
              </select>
            </div>
            <div>
              <label className="form-label" style={{ color: '#cbd5e1' }}>Role Requested</label>
              <select
                name="role_name"
                className="form-select"
                style={{ backgroundColor: 'rgba(5,8,18,0.7)', borderColor: '#334155', color: '#ffffff' }}
                value={formData.role_name}
                onChange={handleChange}
              >
                <option value="OPERATOR">Labor / Operator</option>
                <option value="TECHNICIAN">Technician</option>
                <option value="SUPERVISOR">Supervisor</option>
                <option value="MANAGER">Plant Manager / Executive</option>
              </select>
            </div>
          </div>

          <div style={{
            fontSize: '0.74rem',
            color: '#38bdf8',
            backgroundColor: 'rgba(56, 189, 248, 0.08)',
            border: '1px solid rgba(56, 189, 248, 0.2)',
            borderRadius: '6px',
            padding: '8px 12px',
            marginBottom: '16px',
            lineHeight: 1.4
          }}>
            {formData.role_name === 'MANAGER' && '⚡ Manager Portal: Executive oversight, SQL analytics, and plant-wide work order authorization.'}
            {formData.role_name === 'SUPERVISOR' && '⚡ Supervisor Portal: Cell triage, technician assignments, and maintenance sign-offs.'}
            {formData.role_name === 'TECHNICIAN' && '⚡ Technician Portal: Machine diagnostics, LOTO safety protocols, and parts repair logs.'}
            {formData.role_name === 'OPERATOR' && '⚡ Operator Portal: Floor incident reporting and machine condition monitoring.'}
          </div>

          {/* Password & Confirm Password */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '10px' }}>
            <div>
              <label className="form-label" style={{ color: '#cbd5e1' }}>Password</label>
              <PasswordInput
                name="password"
                value={formData.password}
                onChange={handleChange}
                showPassword={showPasswords}
                onToggleShowPassword={setShowPasswords}
                placeholder="••••••••••••"
                required
              />
            </div>
            <div>
              <label className="form-label" style={{ color: '#cbd5e1' }}>Confirm Password</label>
              <PasswordInput
                name="confirm_password"
                value={formData.confirm_password}
                onChange={handleChange}
                showPassword={showPasswords}
                onToggleShowPassword={setShowPasswords}
                placeholder="••••••••••••"
                required
                style={{
                  borderColor: formData.confirm_password
                    ? (isMatch ? '#059669' : '#dc2626')
                    : '#334155'
                }}
              />
            </div>
          </div>

          {/* Show Passwords Checkbox */}
          <div style={{ marginBottom: '16px' }}>
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

          {/* Password Requirements Checklist Cards */}
          <div style={{
            backgroundColor: 'rgba(5, 8, 18, 0.7)',
            border: '1px solid rgba(30, 41, 59, 0.8)',
            borderRadius: '10px',
            padding: '12px 14px',
            marginBottom: '18px'
          }}>
            <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
              Password Complexity Criteria:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {[
                { met: hasMinLength, text: '8+ characters' },
                { met: hasUpper, text: 'Uppercase letter' },
                { met: hasNumber, text: 'Number (0-9)' },
                { met: hasSpecial, text: 'Special character' }
              ].map((req, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    backgroundColor: req.met ? 'rgba(5, 150, 105, 0.12)' : 'rgba(30, 41, 59, 0.5)',
                    border: `1px solid ${req.met ? 'rgba(5, 150, 105, 0.35)' : '#1e293b'}`,
                    fontSize: '0.75rem',
                    color: req.met ? '#34d399' : '#64748b',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{
                    width: '15px',
                    height: '15px',
                    borderRadius: '3px',
                    backgroundColor: req.met ? '#059669' : '#1e293b',
                    border: `1px solid ${req.met ? '#059669' : '#475569'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.7rem',
                    color: '#ffffff',
                    fontWeight: 800,
                    flexShrink: 0
                  }}>
                    {req.met ? '✓' : ''}
                  </div>
                  <span>{req.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Safety & Compliance Agreement Checkbox */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              cursor: 'pointer',
              fontSize: '0.785rem',
              color: '#94a3b8',
              lineHeight: 1.4,
              userSelect: 'none'
            }}>
              <input
                type="checkbox"
                checked={agreeCompliance}
                onChange={(e) => setAgreeCompliance(e.target.checked)}
                style={{
                  width: '16px',
                  height: '16px',
                  accentColor: '#0ea5e9',
                  cursor: 'pointer',
                  marginTop: '2px',
                  flexShrink: 0
                }}
              />
              <span>
                I agree to follow plant safety regulations and Lockout/Tagout (LOTO) protocols.
              </span>
            </label>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '10px', borderRadius: '8px', fontWeight: 600 }}
            disabled={loading || !isPasswordValid || !isMatch || !agreeCompliance}
          >
            {loading ? 'Registering Account...' : 'Create Account'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.825rem', color: '#94a3b8' }}>
          Already registered?{' '}
          <Link to="/login" style={{ color: '#38bdf8', fontWeight: 600, textDecoration: 'none' }}>
            Sign In
          </Link>
        </div>
      </div>

      {/* Animated Green Success Notification Popup */}
      <AuthSuccessPopup
        isOpen={showSuccessPopup}
        title="Plant Profile Registered!"
        message={`Welcome to the plant team, ${formData.full_name.trim()}! Your profile has been created with ${formData.role_name} clearance.`}
        roleName={formData.role_name}
        actionText="Sign In to Plant"
        onComplete={() => navigate('/login')}
        duration={2200}
      />
    </div>
  );
};

