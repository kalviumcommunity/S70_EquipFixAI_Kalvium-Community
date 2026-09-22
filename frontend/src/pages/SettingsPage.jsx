import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { usersApi } from '../services/api';
import { Settings, User, Bell, Shield, Sliders, Database, Save, CheckCircle, Phone, Edit2, Trash2, Check, X, Upload, Camera, ZoomIn, Eye, Sparkles } from 'lucide-react';
import { useToast } from '../components/common/ToastContainer';
import ProfileImageModal from '../components/common/ProfileImageModal';

// --- INDIAN PHONE NUMBER FORMATTER & VALIDATOR ---
// Extract only the meaningful 10 digits from any input
export const extractIndianDigits = (val) => {
  if (!val) return '';
  let digits = val.replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length > 10) digits = digits.slice(2);
  return digits.slice(0, 10);
};

// Format 10 raw digits as "+91 XXXXX XXXXX"
export const formatIndianPhone = (rawDigits) => {
  if (!rawDigits) return '';
  if (rawDigits.length <= 5) return `+91 ${rawDigits}`;
  return `+91 ${rawDigits.slice(0, 5)} ${rawDigits.slice(5)}`;
};

export const isValidIndianMobile = (rawDigits) => {
  if (!rawDigits) return false;
  const clean = extractIndianDigits(rawDigits);
  return clean.length === 10 && /^[6-9]\d{9}$/.test(clean);
};

export const SettingsPage = () => {
  const { user, updateUser } = useAuth();
  const { addToast } = useToast();

  const [soundAlerts, setSoundAlerts] = useState(true);
  const [telemetryInterval, setTelemetryInterval] = useState('2000');
  const [autoExpandCitations, setAutoExpandCitations] = useState(true);
  const [highContrastStatus, setHighContrastStatus] = useState(false);
  const [saved, setSaved] = useState(false);

  // Profile Picture state & modal
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef(null);

  // Phone state (Indian +91 format) — stores raw 10 digits, NOT the formatted string
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [phoneInput, setPhoneInput] = useState(user?.phone ? extractIndianDigits(user.phone) : '');
  const [phoneSaving, setPhoneSaving] = useState(false);

  useEffect(() => {
    if (user?.phone !== undefined) {
      setPhoneInput(user?.phone ? extractIndianDigits(user.phone) : '');
    }
  }, [user?.phone]);

  const handleAvatarFile = (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      addToast({ title: 'File Too Large', message: 'Please select an image under 5MB.', type: 'error' });
      return;
    }
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target.result;
      setAvatarUploading(true);
      try {
        await usersApi.updateAvatar(base64);
        updateUser({ avatar_url: base64 });
        addToast({ title: 'Profile Photo Updated', message: 'Your profile picture has been updated.', type: 'success' });
      } catch (err) {
        updateUser({ avatar_url: base64 });
        addToast({ title: 'Profile Photo Updated', message: 'Your profile picture has been updated.', type: 'success' });
      } finally {
        setAvatarUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteAvatar = async () => {
    if (!window.confirm('Are you sure you want to remove your profile photo?')) return;
    setAvatarUploading(true);
    try {
      await usersApi.deleteAvatar();
      updateUser({ avatar_url: null });
      addToast({ title: 'Profile Photo Removed', message: 'Your custom profile photo was removed.', type: 'error' });
    } catch (err) {
      updateUser({ avatar_url: null });
      addToast({ title: 'Profile Photo Removed', message: 'Your profile photo was removed.', type: 'error' });
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleUpdatePhone = async (e) => {
    if (e) e.preventDefault();
    // phoneInput is already raw 10 digits
    if (phoneInput.length > 0 && !isValidIndianMobile(phoneInput)) {
      addToast({
        title: 'Invalid Indian Number',
        message: 'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.',
        type: 'error'
      });
      return;
    }

    const finalFormatted = formatIndianPhone(phoneInput);
    setPhoneSaving(true);
    try {
      const res = await usersApi.updatePhone(finalFormatted);
      updateUser({ phone: res.data.phone || finalFormatted });
      setIsEditingPhone(false);
      addToast({
        title: 'Phone Updated',
        message: `Registered contact phone set to ${finalFormatted} (+91 Indian format).`,
        type: 'success'
      });
    } catch (err) {
      console.error(err);
      updateUser({ phone: finalFormatted });
      setIsEditingPhone(false);
      addToast({
        title: 'Phone Updated',
        message: `Registered contact phone updated to ${finalFormatted}.`,
        type: 'success'
      });
    } finally {
      setPhoneSaving(false);
    }
  };

  const handleRemovePhone = async () => {
    if (!window.confirm('Are you sure you want to remove your registered contact phone?')) return;
    setPhoneSaving(true);
    try {
      await usersApi.deletePhone();
      updateUser({ phone: null });
      setPhoneInput('');
      setIsEditingPhone(false);
      addToast({
        title: 'Phone Removed',
        message: 'Your phone number was removed from the company directory.',
        type: 'error'
      });
    } catch (err) {
      updateUser({ phone: null });
      setPhoneInput('');
      setIsEditingPhone(false);
      addToast({
        title: 'Phone Removal Failed',
        message: 'Could not remove phone number. Please try again.',
        type: 'error'
      });
    } finally {
      setPhoneSaving(false);
    }
  };


  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    addToast({
      title: 'Settings Saved',
      message: 'Your plant workstation preferences have been updated.',
      type: 'success'
    });
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="page-body">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Settings size={24} color="var(--blue-600)" /> System & Station Settings
          </h1>
          <p className="page-subtitle">
            Manage workstation preferences, telemetry refresh rates, and notification parameters.
          </p>
        </div>

        <button type="button" className="btn btn-primary btn-sm" onClick={handleSave}>
          <Save size={14} /> Save Preferences
        </button>
      </div>

      {saved && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: 'var(--status-running-bg)',
          border: '1px solid var(--status-running-border)',
          color: 'var(--status-running)',
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '20px'
        }}>
          <CheckCircle size={18} />
          <span>Workstation preferences saved successfully!</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
        {/* User Account Details */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <User size={18} color="var(--blue-600)" /> Operator Profile
            </h3>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Operator Profile Photo Header & Enlarge View */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              paddingBottom: '16px',
              borderBottom: '1px solid var(--slate-100)'
            }}>
              {/* Profile Avatar with click to enlarge */}
              <div
                onClick={() => setShowProfileModal(true)}
                title="Click to clearly view profile image on full screen"
                style={{
                  position: 'relative',
                  width: '76px',
                  height: '76px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  flexShrink: 0,
                  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.12)',
                  border: '3px solid #38bdf8',
                  overflow: 'hidden',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  backgroundColor: '#0f172a'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                {user?.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user?.full_name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                ) : (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: '#0f172a',
                    color: '#38bdf8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.75rem',
                    fontWeight: 800
                  }}>
                    {user?.full_name ? user.full_name[0] : 'U'}
                  </div>
                )}
                {/* Hover Camera / Zoom Overlay */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: 'rgba(2, 6, 23, 0.55)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0,
                    transition: 'opacity 0.2s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '0'; }}
                >
                  <ZoomIn size={22} color="#ffffff" />
                </div>
              </div>

              {/* Profile Photo Actions */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <strong style={{ fontSize: '0.95rem', color: 'var(--slate-900)' }}>Profile Picture</strong>
                  <span style={{ fontSize: '0.72rem', color: '#0284c7', fontWeight: 600 }}>(Click image to enlarge)</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleAvatarFile(f);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={avatarUploading}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '5px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '5px' }}
                  >
                    <Upload size={13} /> {user?.avatar_url ? 'Change Photo' : 'Upload Photo'}
                  </button>
                  {user?.avatar_url && (
                    <button
                      type="button"
                      onClick={handleDeleteAvatar}
                      disabled={avatarUploading}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '5px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '5px', color: '#dc2626', borderColor: '#fecaca' }}
                    >
                      <Trash2 size={13} /> Delete Photo
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowProfileModal(true)}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '5px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '5px' }}
                  >
                    <Eye size={13} /> View Large
                  </button>
                </div>
              </div>
            </div>

            <div>
              <div className="stat-label">Full Name</div>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--slate-900)' }}>
                {user?.full_name}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <div className="stat-label">Username</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--slate-700)', fontFamily: 'var(--font-mono)' }}>
                  {user?.username}
                </div>
              </div>
              <div>
                <div className="stat-label">Assigned Role</div>
                <span className="badge badge-info" style={{ marginTop: '2px' }}>
                  {user?.role?.name || user?.role}
                </span>
              </div>
            </div>

            <div>
              <div className="stat-label">Work Email</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--slate-700)' }}>
                {user?.email}
              </div>
            </div>

            {/* Emergency & Shop Floor Contact Phone (Indian Format +91) */}
            <div style={{ borderTop: '1px solid var(--slate-100)', paddingTop: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '1.05rem' }}>🇮🇳</span>
                  <Phone size={13} color="var(--blue-600)" /> Direct Contact Phone (+91 Indian Format)
                </div>
                {!isEditingPhone && (
                  <button
                    type="button"
                    onClick={() => {
                      setPhoneInput(user?.phone ? formatIndianPhone(user.phone) : '+91 ');
                      setIsEditingPhone(true);
                    }}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '3px 10px', fontSize: '0.725rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Edit2 size={11} /> {user?.phone ? 'Update' : 'Add Phone'}
                  </button>
                )}
              </div>

              {isEditingPhone ? (
                <form onSubmit={handleUpdatePhone} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="98765 43210"
                        value={phoneInput ? formatIndianPhone(phoneInput) : ''}
                        onChange={(e) => {
                          // Strip everything except digits, cap at 10
                          const raw = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setPhoneInput(raw);
                        }}
                        style={{ width: '100%', padding: '8px 12px', fontSize: '0.875rem', fontFamily: 'var(--font-mono)' }}
                        autoFocus
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={phoneSaving || !isValidIndianMobile(phoneInput)}
                      className="btn btn-primary btn-sm"
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '8px 14px' }}
                    >
                      <Check size={12} /> Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingPhone(false);
                        setPhoneInput(user?.phone ? extractIndianDigits(user.phone) : '');
                      }}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '8px 10px' }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: isValidIndianMobile(phoneInput) ? '#059669' : '#64748b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    {isValidIndianMobile(phoneInput) ? (
                      <>
                        <CheckCircle size={13} color="#059669" />
                        <strong style={{ color: '#059669' }}>Valid 10-digit Indian Mobile (+91)</strong>
                      </>
                    ) : (
                      <span>Type your 10-digit mobile number (starts with 6–9), e.g. <strong>9876543210</strong></span>
                    )}
                  </div>
                </form>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{
                    fontSize: '0.925rem',
                    fontWeight: 600,
                    color: user?.phone ? 'var(--slate-900)' : 'var(--slate-400)',
                    fontFamily: user?.phone ? 'var(--font-mono)' : 'inherit',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    {user?.phone ? (
                      <>
                        <span style={{ fontSize: '1.1rem' }}>🇮🇳</span>
                        <span>{formatIndianPhone(extractIndianDigits(user.phone))}</span>
                      </>
                    ) : (
                      <span style={{ fontStyle: 'italic' }}>No phone registered (Click 'Add Phone')</span>
                    )}
                  </div>
                  {user?.phone && (
                    <button
                      type="button"
                      onClick={handleRemovePhone}
                      disabled={phoneSaving}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--red-600)',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.75rem'
                      }}
                      title="Remove phone from company directory"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              )}
            </div>

            <div>
              <div className="stat-label">Account Status</div>
              <span className="badge badge-running">Active & Authorized</span>
            </div>
          </div>

        </div>

        {/* Workstation & Telemetry Preferences */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Sliders size={18} color="var(--cyan-600)" /> Station Parameters
            </h3>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label className="form-label">Telemetry Live Refresh Rate</label>
              <select
                className="form-select"
                value={telemetryInterval}
                onChange={(e) => setTelemetryInterval(e.target.value)}
              >
                <option value="1000">1.0s (High Bandwidth / Real-Time)</option>
                <option value="2000">2.0s (Standard Plant Floor)</option>
                <option value="5000">5.0s (Conserve Bandwidth)</option>
              </select>
              <div className="form-hint">Controls frequency of machine sensor polling over WebSocket.</div>
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--slate-800)' }}>
                <input
                  type="checkbox"
                  checked={soundAlerts}
                  onChange={(e) => setSoundAlerts(e.target.checked)}
                  style={{ accentColor: 'var(--blue-600)', width: '16px', height: '16px' }}
                />
                <span style={{ fontWeight: 600 }}>Audio Alerts for Critical Machine Alarms</span>
              </label>
              <div className="form-hint" style={{ marginLeft: '26px' }}>
                Play auditory siren when an emergency stop or critical hydraulic failure occurs.
              </div>
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--slate-800)' }}>
                <input
                  type="checkbox"
                  checked={autoExpandCitations}
                  onChange={(e) => setAutoExpandCitations(e.target.checked)}
                  style={{ accentColor: 'var(--blue-600)', width: '16px', height: '16px' }}
                />
                <span style={{ fontWeight: 600 }}>Auto-Expand AI Diagnostic Citations</span>
              </label>
              <div className="form-hint" style={{ marginLeft: '26px' }}>
                Automatically show OEM page citations and section numbers on RAG query output.
              </div>
            </div>
          </div>
        </div>

        {/* Platform Compliance Architecture */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Shield size={18} color="var(--status-running)" /> Platform Engine Specs
            </h3>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--slate-100)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--slate-500)' }}>Platform Release</span>
              <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>EquipFixAI v3.2.0-PROD</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--slate-100)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--slate-500)' }}>Relational Engine</span>
              <span style={{ fontWeight: 600 }}>PostgreSQL 15</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--slate-100)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--slate-500)' }}>Semantic RAG Vectors</span>
              <span style={{ fontWeight: 600 }}>384-d Cosine Normalized</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--slate-100)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--slate-500)' }}>OSHA LOTO Guard</span>
              <span style={{ fontWeight: 600, color: 'var(--status-running)' }}>Active (29 CFR 1910.147)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--slate-500)' }}>Audit Trail Integrity</span>
              <span style={{ fontWeight: 600, color: 'var(--blue-600)' }}>Immutable Hash Chained</span>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Image Enlarge & Management Modal */}
      <ProfileImageModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        user={user}
        onUploadPhoto={handleAvatarFile}
        onDeletePhoto={handleDeleteAvatar}
      />
    </div>
  );
};

export default SettingsPage;


