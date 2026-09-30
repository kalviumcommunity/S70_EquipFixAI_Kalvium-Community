import React, { useEffect } from 'react';
import { X } from 'lucide-react';
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
        padding: '16px',
        zIndex: 1000
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1060px',
          height: '86vh',
          backgroundColor: '#080c16',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 30px rgba(14, 165, 233, 0.2)',
          color: '#f8fafc',
          boxSizing: 'border-box',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            zIndex: 60,
            padding: '6px',
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            color: '#94a3b8',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Close dialog (Esc)"
        >
          <X size={16} />
        </button>

        <AITroubleshootingPanel
          machineId={initialMachineId}
          machineCode={initialMachineCode}
          incidentSummary={initialQuestion}
          initialQuestion={initialQuestion}
          isFullPage={true}
        />
      </div>
    </div>
  );
};

export default AICopilotModal;
