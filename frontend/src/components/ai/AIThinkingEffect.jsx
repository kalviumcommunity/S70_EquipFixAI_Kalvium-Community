import React, { useState, useEffect } from 'react';
import { Sparkles, Brain, Cpu, RefreshCw, Zap } from 'lucide-react';

/**
 * AIThinkingEffect
 * Sleek, modern, glowing AI thinking animation with cycling reasoning phases,
 * shimmering neural wave, and pulsing thinking dots.
 */
export const AIThinkingEffect = ({
  mode = 'chat', // 'chat' | 'vision' | 'diagram'
  modelName = 'Gemini 2.0 Flash',
  machineCode = ''
}) => {
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  const chatPhases = [
    { text: 'Thinking...', subtext: 'Synthesizing equipment knowledge & telemetry...' },
    { text: 'Analyzing root cause...', subtext: 'Cross-referencing OEM manuals & sensor signals...' },
    { text: 'Formulating step-by-step guide...', subtext: 'Verifying ISO/OSHA safety protocols & emojis...' },
    { text: 'Finalizing diagnostic response...', subtext: 'Preparing actionable engineering instructions...' }
  ];

  const visionPhases = [
    { text: 'Thinking...', subtext: 'Processing high-resolution image tensors...' },
    { text: 'Detecting visual wear & fractures...', subtext: 'Isolating mechanical spalling and surface cracks...' },
    { text: 'Synthesizing visual inspection breakdown...', subtext: 'Correlating with industrial component standards...' }
  ];

  const diagramPhases = [
    { text: 'Thinking...', subtext: 'Extracting mechanical geometry & part hierarchies...' },
    { text: 'Rendering CAD blueprint & schematics...', subtext: 'Plotting isometric exploded vectors...' },
    { text: 'Finalizing high-resolution illustration...', subtext: 'Applying callouts, tolerances & legend keys...' }
  ];

  const phases = mode === 'vision' ? visionPhases : (mode === 'diagram' ? diagramPhases : chatPhases);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed((prev) => +(prev + 0.1).toFixed(1));
    }, 100);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhaseIdx((prev) => (prev + 1) % phases.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [phases.length]);

  const current = phases[phaseIdx];

  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '14px 18px',
        borderRadius: '14px',
        backgroundColor: '#0c1527',
        border: '1px solid rgba(56, 189, 248, 0.35)',
        boxShadow: '0 8px 28px -4px rgba(2, 132, 199, 0.25), 0 0 16px rgba(56, 189, 248, 0.1)',
        maxWidth: '100%',
        minWidth: '280px',
        overflow: 'hidden',
        color: '#f8fafc'
      }}
    >
      {/* Shimmering Top Accent Wave */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: 'linear-gradient(90deg, transparent, #38bdf8, #818cf8, #38bdf8, transparent)',
          animation: 'thinkingShimmer 2s linear infinite'
        }}
      />

      {/* Main Thinking Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Pulsing AI Sparkle / Brain Icon */}
          <div
            style={{
              position: 'relative',
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              backgroundColor: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 12px rgba(56, 189, 248, 0.3)'
            }}
          >
            <Sparkles size={16} color="#38bdf8" className="animate-spin" style={{ animationDuration: '4s' }} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#e0f2fe' }}>
                {current.text}
              </span>
              {/* Three Bouncing Thinking Dots */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span
                  style={{
                    width: '5px',
                    height: '5px',
                    borderRadius: '50%',
                    backgroundColor: '#38bdf8',
                    display: 'inline-block',
                    animation: 'thinkingDot 1.4s ease-in-out infinite'
                  }}
                />
                <span
                  style={{
                    width: '5px',
                    height: '5px',
                    borderRadius: '50%',
                    backgroundColor: '#38bdf8',
                    display: 'inline-block',
                    animation: 'thinkingDot 1.4s ease-in-out infinite 0.2s'
                  }}
                />
                <span
                  style={{
                    width: '5px',
                    height: '5px',
                    borderRadius: '50%',
                    backgroundColor: '#38bdf8',
                    display: 'inline-block',
                    animation: 'thinkingDot 1.4s ease-in-out infinite 0.4s'
                  }}
                />
              </div>
            </div>

            <div style={{ fontSize: '0.725rem', color: '#94a3b8', marginTop: '1px' }}>
              {current.subtext}
            </div>
          </div>
        </div>

        {/* Elapsed Thinking Timer */}
        <div
          style={{
            fontFamily: 'monospace',
            fontSize: '0.75rem',
            fontWeight: 700,
            color: '#38bdf8',
            backgroundColor: 'rgba(56, 189, 248, 0.1)',
            padding: '2px 8px',
            borderRadius: '6px',
            border: '1px solid rgba(56, 189, 248, 0.2)',
            flexShrink: 0
          }}
        >
          {elapsed.toFixed(1)}s
        </div>
      </div>

      {/* Subtle Bottom Model Tag */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.675rem',
          color: '#64748b',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          paddingTop: '6px',
          marginTop: '2px'
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Brain size={11} color="#38bdf8" />
          <span>EquipFix AI Copilot • {modelName}</span>
        </span>
        {machineCode && (
          <span style={{ color: '#38bdf8', fontWeight: 600 }}>Station: {machineCode}</span>
        )}
      </div>
    </div>
  );
};

export default AIThinkingEffect;
