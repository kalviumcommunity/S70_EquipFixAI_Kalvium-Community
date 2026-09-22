import React, { useEffect } from 'react';
import { X, Bot, Sparkles } from 'lucide-react';
import { AITroubleshootingPanel } from './AITroubleshootingPanel';

export const AICopilotModal = ({
  isOpen,
  onClose,
  initialMachineId = null,
  initialMachineCode = '',
  initialQuestion = ''
}) => {
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

  return (
    <div
      className="modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 10, 20, 0.85)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        zIndex: 1000
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '880px',
          maxHeight: '90vh',
          overflowY: 'auto',
          backgroundColor: '#0b1329',
          border: '1px solid #1e3a8a',
          borderRadius: '18px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 30px rgba(14, 165, 233, 0.15)',
          padding: '24px',
          color: '#f8fafc',
          boxSizing: 'border-box'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: '16px',
          marginBottom: '18px',
          borderBottom: '1px solid #1e293b'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 16px rgba(14, 165, 233, 0.4)',
              color: '#ffffff'
            }}>
              <Bot size={22} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', margin: 0, letterSpacing: '-0.01em' }}>
                  EquipFix AI Copilot
                </h3>
                <span style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  backgroundColor: 'rgba(56, 189, 248, 0.15)',
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <Sparkles size={11} /> RAG GROUNDED
                </span>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '3px 0 0 0' }}>
                Source-referenced industrial diagnostics powered by plant manuals, safety SOPs, and telemetry.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '6px',
              background: '#070c18',
              border: '1px solid #1e293b',
              borderRadius: '8px',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseOver={(e) => { e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.borderColor = '#38bdf8'; }}
            onMouseOut={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = '#1e293b'; }}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div>
          <AITroubleshootingPanel
            machineId={initialMachineId}
            machineCode={initialMachineCode}
            incidentSummary={initialQuestion}
          />
        </div>
      </div>
    </div>
  );
};

export default AICopilotModal;
