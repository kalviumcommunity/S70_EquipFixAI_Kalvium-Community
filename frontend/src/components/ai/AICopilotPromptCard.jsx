import React, { useState } from 'react';
import { Sparkles, Bot, ArrowRight, Zap, Shield, Search, Eye, Palette, Camera } from 'lucide-react';
import AICopilotModal from './AICopilotModal';
import { getAIConfig } from '../../services/aiCopilotService';

export const AICopilotPromptCard = ({
  defaultMachineCode = '',
  defaultMachineId = null,
  title = 'EquipFix AI Copilot — Instant Industrial Diagnostics',
  subtitle = 'Query 1,400+ pages of OEM manuals, OSHA safety SOPs, and historical approved work orders.'
}) => {
  const [question, setQuestion] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [activeQuery, setActiveQuery] = useState('');
  const [activeMachineCode, setActiveMachineCode] = useState(defaultMachineCode);
  const config = getAIConfig();

  const suggestionChips = [
    { label: 'Why is CNC-04 overheating?', code: 'CNC-04' },
    { label: 'Show recent spindle failures', code: 'CNC-04' },
    { label: 'Mandatory Lockout/Tagout (LOTO) steps', code: '' },
    { label: 'Fleet MTTR benchmark analysis', code: '' }
  ];

  const handleLaunch = (queryText, machineCode = '') => {
    const q = (queryText || question).trim();
    if (!q) return;
    setActiveQuery(q);
    if (machineCode) setActiveMachineCode(machineCode);
    setModalOpen(true);
  };

  return (
    <>
      <div style={{
        background: 'linear-gradient(135deg, #0b1329 0%, #0f1d3d 50%, #091a33 100%)',
        border: '1px solid #1e3a8a',
        borderRadius: '16px',
        padding: '22px 24px',
        color: '#ffffff',
        boxShadow: '0 8px 24px -4px rgba(2, 132, 199, 0.15)',
        marginBottom: '24px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Glow accent */}
        <div style={{
          position: 'absolute',
          top: '-40px',
          right: '-40px',
          width: '200px',
          height: '200px',
          background: 'radial-gradient(circle, rgba(56, 189, 248, 0.15) 0%, rgba(11, 19, 41, 0) 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 12px rgba(14, 165, 233, 0.4)'
            }}>
              <Bot size={20} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <strong style={{ fontSize: '1rem', color: '#ffffff', letterSpacing: '-0.01em' }}>
                  {title}
                </strong>
                <span style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  backgroundColor: config.apiKey ? 'rgba(16, 185, 129, 0.2)' : 'rgba(56, 189, 248, 0.15)',
                  color: config.apiKey ? '#6ee7b7' : '#38bdf8',
                  border: `1px solid ${config.apiKey ? 'rgba(16, 185, 129, 0.4)' : 'rgba(56, 189, 248, 0.3)'}`,
                  padding: '2px 8px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <Zap size={10} /> {config.apiKey ? `${config.provider.toUpperCase()} REALTIME ACTIVE` : 'RAG ENGINE ACTIVE'}
                </span>
              </div>
              <p style={{ fontSize: '0.775rem', color: '#94a3b8', margin: '2px 0 0 0' }}>
                {subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleLaunch(question, defaultMachineCode);
          }}
          style={{ display: 'flex', gap: '10px', marginTop: '14px', marginBottom: '14px' }}
        >
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask AI: e.g. Why is CNC-04 overheating? What is the LOTO procedure for hydraulic press?"
              style={{
                width: '100%',
                padding: '11px 16px 11px 40px',
                backgroundColor: 'rgba(7, 12, 24, 0.8)',
                border: '1px solid #334155',
                borderRadius: '10px',
                color: '#ffffff',
                fontSize: '0.875rem',
                outline: 'none',
                boxSizing: 'border-box',
                boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.3)'
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#38bdf8'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#334155'; }}
            />
            <Search size={18} color="#64748b" style={{ position: 'absolute', left: '14px', top: '12px' }} />
          </div>

          <button
            type="submit"
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
              color: '#ffffff',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
              whiteSpace: 'nowrap'
            }}
          >
            <Sparkles size={16} />
            <span>Ask EquipFix AI</span>
          </button>
        </form>

        {/* Suggestion Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Recommended Queries:
          </span>
          {suggestionChips.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleLaunch(chip.label, chip.code)}
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid #1e293b',
                color: '#cbd5e1',
                padding: '4px 12px',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#1e293b';
                e.currentTarget.style.borderColor = '#38bdf8';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.8)';
                e.currentTarget.style.borderColor = '#1e293b';
                e.currentTarget.style.color = '#cbd5e1';
              }}
            >
              <Zap size={12} color="#38bdf8" />
              <span>{chip.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Embedded Modal Dialog */}
      <AICopilotModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialMachineCode={activeMachineCode}
        initialQuestion={activeQuery}
      />
    </>
  );
};

export default AICopilotPromptCard;
