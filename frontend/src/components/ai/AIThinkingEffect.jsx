import React from 'react';
import { Sparkles } from 'lucide-react';

/**
 * AIThinkingEffect
 * Clean, subtle, ChatGPT-style "Analyzing..." indicator.
 * Displays a minimal pill with animated bouncing dots and gentle pulse.
 */
export const AIThinkingEffect = ({
  label = 'Analyzing...',
  onStop = null
}) => {
  return (
    <div
      className="ai-analyzing-indicator"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 14px',
        borderRadius: '18px',
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        fontSize: '0.825rem',
        color: '#475569',
        fontWeight: 500,
        animation: 'fadeInUp 0.2s ease-out'
      }}
    >
      <div
        style={{
          width: '18px',
          height: '18px',
          borderRadius: '50%',
          backgroundColor: '#eff6ff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#2563eb'
        }}
      >
        <Sparkles size={11} className="ai-analyzing-sparkle" />
      </div>

      <span style={{ color: '#334155', fontWeight: 600 }}>{label}</span>

      {/* Subtle three bouncing dots */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginLeft: '2px' }}>
        <span
          className="ai-dot-bounce"
          style={{
            width: '4px',
            height: '4px',
            borderRadius: '50%',
            backgroundColor: '#3b82f6',
            display: 'inline-block',
            animation: 'chatgptDot 1.4s infinite ease-in-out both'
          }}
        />
        <span
          className="ai-dot-bounce"
          style={{
            width: '4px',
            height: '4px',
            borderRadius: '50%',
            backgroundColor: '#3b82f6',
            display: 'inline-block',
            animation: 'chatgptDot 1.4s infinite ease-in-out both',
            animationDelay: '0.2s'
          }}
        />
        <span
          className="ai-dot-bounce"
          style={{
            width: '4px',
            height: '4px',
            borderRadius: '50%',
            backgroundColor: '#3b82f6',
            display: 'inline-block',
            animation: 'chatgptDot 1.4s infinite ease-in-out both',
            animationDelay: '0.4s'
          }}
        />
      </div>

      {onStop && (
        <button
          type="button"
          onClick={onStop}
          style={{
            marginLeft: '6px',
            padding: '2px 6px',
            borderRadius: '4px',
            border: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
            color: '#64748b',
            fontSize: '0.7rem',
            cursor: 'pointer'
          }}
        >
          Stop
        </button>
      )}
    </div>
  );
};

export default AIThinkingEffect;
