import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export const PasswordInput = ({
  value,
  onChange,
  name = 'password',
  id,
  placeholder = '••••••••••••',
  required = false,
  disabled = false,
  className = '',
  style = {},
  showPassword: controlledShowPassword,
  onToggleShowPassword,
  autoComplete = 'current-password',
  ...rest
}) => {
  const [internalShow, setInternalShow] = useState(false);

  const isControlled = typeof controlledShowPassword === 'boolean';
  const show = isControlled ? controlledShowPassword : internalShow;

  const handleToggle = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const nextState = !show;
    if (!isControlled) {
      setInternalShow(nextState);
    }
    if (onToggleShowPassword) {
      onToggleShowPassword(nextState);
    }
  };

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
      <input
        type={show ? 'text' : 'password'}
        name={name}
        id={id || name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        autoComplete={autoComplete}
        style={{
          width: '100%',
          padding: '10px 84px 10px 14px',
          backgroundColor: '#070c18',
          border: '1px solid #334155',
          borderRadius: '8px',
          color: '#ffffff',
          fontSize: '0.875rem',
          outline: 'none',
          boxSizing: 'border-box',
          transition: 'border-color 0.15s ease',
          ...style
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = '#38bdf8'; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = style.borderColor || '#334155'; }}
        {...rest}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={handleToggle}
        disabled={disabled}
        title={show ? "Password Visible — Click to hide (make invisible)" : "Password Invisible — Click to show (make visible)"}
        aria-label={show ? "Make password invisible" : "Make password visible"}
        style={{
          position: 'absolute',
          right: '8px',
          top: '50%',
          transform: 'translateY(-50%)',
          background: show ? 'rgba(56, 189, 248, 0.18)' : 'rgba(255, 255, 255, 0.05)',
          border: show ? '1px solid rgba(56, 189, 248, 0.45)' : '1px solid rgba(51, 65, 85, 0.6)',
          borderRadius: '6px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          padding: '4px 8px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          color: show ? '#38bdf8' : '#94a3b8',
          fontSize: '0.72rem',
          fontWeight: 600,
          transition: 'all 0.15s ease',
          zIndex: 2,
          userSelect: 'none'
        }}
        onMouseOver={(e) => {
          if (!disabled) {
            e.currentTarget.style.color = '#38bdf8';
            e.currentTarget.style.borderColor = '#38bdf8';
            e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 0.15)';
          }
        }}
        onMouseOut={(e) => {
          if (!disabled) {
            e.currentTarget.style.color = show ? '#38bdf8' : '#94a3b8';
            e.currentTarget.style.borderColor = show ? 'rgba(56, 189, 248, 0.45)' : 'rgba(51, 65, 85, 0.6)';
            e.currentTarget.style.backgroundColor = show ? 'rgba(56, 189, 248, 0.18)' : 'rgba(255, 255, 255, 0.05)';
          }
        }}
      >
        {show ? <EyeOff size={14} color="#38bdf8" /> : <Eye size={14} color="#94a3b8" />}
        <span style={{ letterSpacing: '0.02em' }}>{show ? 'Hide' : 'Show'}</span>
      </button>
    </div>
  );
};

export default PasswordInput;
