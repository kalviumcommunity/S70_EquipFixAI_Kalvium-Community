import React, { useEffect, useRef } from 'react';
import { X, Upload, Trash2, Download, User, Phone, Mail, Shield, CheckCircle2 } from 'lucide-react';

/**
 * ProfileImageModal
 * A high-resolution lightbox modal that makes the user's profile image clearly visible on the screen.
 * Also provides options to view details, upload/change photo, or delete photo.
 */
export const ProfileImageModal = ({
  isOpen,
  onClose,
  user,
  onUploadPhoto,
  onDeletePhoto
}) => {
  const fileInputRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const hasCustomAvatar = Boolean(user?.avatar_url);
  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && onUploadPhoto) {
      onUploadPhoto(file);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(3, 7, 18, 0.88)',
        backdropFilter: 'blur(10px)',
        padding: '24px',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '520px',
          backgroundColor: '#0c1527',
          borderRadius: '24px',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 40px rgba(56, 189, 248, 0.2)',
          overflow: 'hidden',
          color: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          animation: 'scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        {/* Top Header Bar */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: 'rgba(15, 23, 42, 0.6)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={16} color="#38bdf8" />
            <span style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#e0f2fe' }}>
              Operator Identity & Profile Photo
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)'; e.currentTarget.style.color = '#ef4444'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)'; e.currentTarget.style.color = '#94a3b8'; }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Big Central Image Container */}
        <div
          style={{
            padding: '32px 24px 20px 24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%'
          }}
        >
          <div
            style={{
              position: 'relative',
              width: '240px',
              height: '240px',
              borderRadius: '50%',
              padding: '6px',
              background: 'linear-gradient(135deg, #0284c7, #38bdf8, #818cf8)',
              boxShadow: '0 0 35px rgba(56, 189, 248, 0.35)',
              marginBottom: '20px'
            }}
          >
            {hasCustomAvatar ? (
              <img
                src={user.avatar_url}
                alt={user?.full_name || 'Profile'}
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  display: 'block',
                  backgroundColor: '#0f172a'
                }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  backgroundColor: '#0f172a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '4.5rem',
                  fontWeight: 900,
                  color: '#38bdf8',
                  letterSpacing: '-0.02em',
                  boxShadow: 'inset 0 0 30px rgba(0, 0, 0, 0.8)'
                }}
              >
                {initials}
              </div>
            )}
          </div>

          {/* User Info Details */}
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff', margin: '0 0 6px 0', letterSpacing: '-0.01em' }}>
            {user?.full_name || 'Plant Operator'}
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span
              style={{
                backgroundColor: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                border: '1px solid rgba(56, 189, 248, 0.35)',
                padding: '3px 10px',
                borderRadius: '12px',
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <Shield size={12} />
              {user?.role?.name || user?.role || 'OPERATOR'}
            </span>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>•</span>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontFamily: 'monospace' }}>
              @{user?.username}
            </span>
          </div>

          {/* Contact Details Card */}
          <div
            style={{
              width: '100%',
              backgroundColor: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid rgba(51, 65, 85, 0.6)',
              borderRadius: '14px',
              padding: '14px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              fontSize: '0.85rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Mail size={14} color="#60a5fa" /> Work Email
              </span>
              <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{user?.email || 'N/A'}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Phone size={14} color="#10b981" /> Direct Phone
              </span>
              <span style={{ color: '#e2e8f0', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '1rem' }}>🇮🇳</span>
                <span>{user?.phone || 'Not Configured'}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div
          style={{
            width: '100%',
            padding: '16px 24px 24px 24px',
            display: 'flex',
            gap: '10px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: 'rgba(15, 23, 42, 0.4)'
          }}
        >
          {/* Upload / Change Photo */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '10px 16px',
              fontSize: '0.825rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#0369a1'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#0284c7'; }}
          >
            <Upload size={15} />
            <span>{hasCustomAvatar ? 'Change Photo' : 'Upload Photo'}</span>
          </button>

          {/* Delete Photo */}
          {hasCustomAvatar && onDeletePhoto && (
            <button
              type="button"
              onClick={onDeletePhoto}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                color: '#f87171',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                borderRadius: '10px',
                padding: '10px 16px',
                fontSize: '0.825rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.25)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)'; }}
              title="Delete custom profile photo"
            >
              <Trash2 size={15} />
              <span>Remove</span>
            </button>
          )}

          {/* Download Full Size (if has custom avatar) */}
          {hasCustomAvatar && (
            <a
              href={user.avatar_url}
              download={`${user?.username || 'operator'}-profile.jpg`}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                backgroundColor: '#1e293b',
                color: '#94a3b8',
                border: '1px solid #334155',
                borderRadius: '10px',
                padding: '10px 14px',
                fontSize: '0.825rem',
                fontWeight: 600,
                textDecoration: 'none',
                cursor: 'pointer'
              }}
              title="Download photo"
            >
              <Download size={15} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileImageModal;
