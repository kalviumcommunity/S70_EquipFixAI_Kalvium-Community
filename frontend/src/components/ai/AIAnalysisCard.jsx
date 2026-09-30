import React from 'react';
import {
  Sparkles, CheckCircle2, Search, Cpu, Shield,
  FileText, History, ArrowRight, Loader2, Bot, AlertTriangle
} from 'lucide-react';

export const AI_ANALYSIS_STAGES = [
  { id: 'understand', label: 'Understanding your request...', icon: Search },
  { id: 'equipment', label: 'Identifying equipment context...', icon: Cpu },
  { id: 'symptoms', label: 'Extracting symptoms & error codes...', icon: AlertTriangle },
  { id: 'search_docs', label: 'Searching equipment documentation...', icon: FileText },
  { id: 'find_sops', label: 'Finding relevant maintenance procedures...', icon: FileText },
  { id: 'compare_causes', label: 'Comparing possible causes...', icon: Cpu },
  { id: 'check_safety', label: 'Checking safety requirements (OSHA 1910.147 LOTO)...', icon: Shield },
  { id: 'review_history', label: 'Reviewing maintenance history & past work orders...', icon: History },
  { id: 'validate', label: 'Validating retrieved evidence...', icon: CheckCircle2 },
  { id: 'prepare', label: 'Preparing recommendation...', icon: Sparkles }
];

export const AIAnalysisCard = ({ currentStageIndex = 0, machineCode = '', activeStageText = '' }) => {
  const progressPercent = Math.min(100, Math.round(((currentStageIndex + 1) / AI_ANALYSIS_STAGES.length) * 100));

  return (
    <div
      style={{
        backgroundColor: '#050a17',
        border: '1px solid rgba(56, 189, 248, 0.35)',
        borderRadius: '12px',
        padding: '16px 18px',
        color: '#ffffff',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.75)',
        marginBottom: '16px',
        position: 'relative',
        overflow: 'hidden',
        animation: 'fadeIn 0.25s ease-in'
      }}
    >
      {/* Top Banner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
          <div
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '7px',
              background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 10px rgba(56, 189, 248, 0.4)'
            }}
          >
            <Bot size={15} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.01em' }}>
                EquipFixAI Copilot Analysis
              </span>
              <span
                style={{
                  fontSize: '0.625rem',
                  fontWeight: 700,
                  backgroundColor: 'rgba(56, 189, 248, 0.15)',
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  padding: '1px 6px',
                  borderRadius: '10px'
                }}
              >
                RAG REASONING
              </span>
            </div>
            {machineCode && (
              <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                Grounded target: <strong style={{ color: '#38bdf8' }}>{machineCode}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Progress percent badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Loader2 size={14} className="spin" color="#38bdf8" />
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#38bdf8', fontFamily: 'monospace' }}>
            {progressPercent}%
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div
        style={{
          height: '3px',
          width: '100%',
          backgroundColor: '#0f172a',
          borderRadius: '2px',
          overflow: 'hidden',
          marginBottom: '14px'
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progressPercent}%`,
            background: 'linear-gradient(90deg, #0284c7 0%, #38bdf8 50%, #10b981 100%)',
            transition: 'width 0.3s ease',
            boxShadow: '0 0 8px rgba(56, 189, 248, 0.6)'
          }}
        />
      </div>

      {/* Dynamic Stages Checklist */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '6px 14px'
        }}
      >
        {AI_ANALYSIS_STAGES.map((stage, idx) => {
          const isDone = idx < currentStageIndex;
          const isCurrent = idx === currentStageIndex;
          const isPending = idx > currentStageIndex;

          return (
            <div
              key={stage.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.78rem',
                padding: '4px 8px',
                borderRadius: '6px',
                backgroundColor: isCurrent ? 'rgba(56, 189, 248, 0.08)' : 'transparent',
                border: isCurrent ? '1px solid rgba(56, 189, 248, 0.25)' : '1px solid transparent',
                color: isDone ? '#34d399' : isCurrent ? '#38bdf8' : '#64748b',
                transition: 'all 0.2s ease'
              }}
            >
              {isDone ? (
                <CheckCircle2 size={13} color="#10b981" style={{ flexShrink: 0 }} />
              ) : isCurrent ? (
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#38bdf8',
                    boxShadow: '0 0 8px #38bdf8',
                    display: 'inline-block',
                    flexShrink: 0
                  }}
                />
              ) : (
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: '#334155',
                    display: 'inline-block',
                    flexShrink: 0
                  }}
                />
              )}
              <span
                style={{
                  fontWeight: isCurrent ? 700 : isDone ? 500 : 400,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>

      {activeStageText && (
        <div
          style={{
            marginTop: '10px',
            paddingTop: '8px',
            borderTop: '1px solid rgba(30, 41, 59, 0.6)',
            fontSize: '0.72rem',
            color: '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <ArrowRight size={12} color="#38bdf8" />
          <span>{activeStageText}</span>
        </div>
      )}
    </div>
  );
};

export default AIAnalysisCard;
