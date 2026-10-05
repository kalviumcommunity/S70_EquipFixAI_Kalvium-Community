import React, { useState, useEffect } from 'react';
import { Sparkles, Brain, Cpu, RefreshCw, Zap } from 'lucide-react';

/**
 * AIThinkingEffect
 * Sleek, modern, glowing AI thinking animation with cycling reasoning phases,
 * shimmering neural wave, and pulsing thinking dots.
 */
export const AIThinkingEffect = ({
  mode = 'chat', // 'chat' | 'vision' | 'diagram'
  modelName = 'Gemini 3.8 Flash',
  machineCode = '',
  onStop = null
}) => {
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  const chatPhases = [
    { text: 'Analyzing root cause...', subtext: 'Cross-referencing OEM manuals & vibration signals...' },
    { text: 'Scanning sensor telemetry...', subtext: 'Evaluating thermal thresholds & bearing telemetry...' },
    { text: 'Formulating step-by-step guide...', subtext: 'Verifying ISO/OSHA safety protocols & mitigation...' },
    { text: 'Finalizing diagnostic response...', subtext: 'Preparing actionable engineering instructions...' }
  ];

  const visionPhases = [
    { text: 'Analyzing visual tensors...', subtext: 'Scanning equipment imagery for surface wear & fractures...' },
    { text: 'Detecting mechanical spalling...', subtext: 'Isolating hydraulic fluid seepage & thermal scorch...' },
    { text: 'Synthesizing visual inspection breakdown...', subtext: 'Correlating with industrial component standards...' }
  ];

  const diagramPhases = [
    { text: 'Analyzing CAD schematics...', subtext: 'Extracting mechanical geometry & exploded part trees...' },
    { text: 'Rendering blueprint vectors...', subtext: 'Plotting isometric paths, callouts & tolerance markers...' },
    { text: 'Finalizing high-resolution illustration...', subtext: 'Applying component legend keys & torque specs...' }
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
    }, 1600);
    return () => clearInterval(interval);
  }, [phases.length]);

  const current = phases[phaseIdx];

  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-flex',
        flexDirection: 'column',
        gap: '10px',
        padding: '14px 18px',
        borderRadius: '14px',
        backgroundColor: '#070f1e',
        border: '1px solid rgba(56, 189, 248, 0.4)',
        boxShadow: '0 8px 30px -4px rgba(2, 132, 199, 0.3), 0 0 20px rgba(56, 189, 248, 0.15)',
        maxWidth: '100%',
        minWidth: '320px',
        overflow: 'hidden',
        color: '#f8fafc',
        animation: 'analyzingPulseGlow 3s ease-in-out infinite'
      }}
    >
      {/* Laser Scanning Beam */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: 'linear-gradient(90deg, transparent, #38bdf8, #818cf8, #06b6d4, transparent)',
          animation: 'analyzingScanBeam 2s linear infinite'
        }}
      />

      {/* Main Row: Radar Scanner, Waveform & Phase */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Active Diagnostic Radar Scanner */}
          <div
            style={{
              position: 'relative',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: 'rgba(56, 189, 248, 0.12)',
              border: '1.5px solid rgba(56, 189, 248, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 14px rgba(56, 189, 248, 0.35)',
              flexShrink: 0,
              overflow: 'hidden'
            }}
          >
            {/* Spinning Radar Line */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'conic-gradient(from 0deg, rgba(56, 189, 248, 0.6) 0deg, transparent 60deg, transparent 360deg)',
                animation: 'analyzingRadarSweep 1.8s linear infinite'
              }}
            />
            {/* Concentric Reticle Ring */}
            <div
              style={{
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                border: '1px dashed rgba(56, 189, 248, 0.6)',
                zIndex: 1
              }}
            />
            <Sparkles size={11} color="#38bdf8" style={{ position: 'relative', zIndex: 2 }} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontSize: '0.675rem',
                fontWeight: 800,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#38bdf8',
                backgroundColor: 'rgba(56, 189, 248, 0.15)',
                padding: '1px 6px',
                borderRadius: '4px',
                border: '1px solid rgba(56, 189, 248, 0.3)'
              }}>
                ANALYZING
              </span>
              <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#e0f2fe' }}>
                {current.text}
              </span>
            </div>

            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
              {current.subtext}
            </div>
          </div>
        </div>

        {/* Right side: Waveform Visualizer + Monospace Timer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {/* Animated 5-Bar Diagnostic Telemetry Equalizer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: '2.5px',
              height: '18px',
              padding: '2px',
              backgroundColor: 'rgba(56, 189, 248, 0.08)',
              borderRadius: '4px',
              border: '1px solid rgba(56, 189, 248, 0.15)'
            }}
            title="Active telemetry data streaming"
          >
            <span style={{ width: '3px', backgroundColor: '#38bdf8', borderRadius: '1px', animation: 'telemetryBar1 0.9s ease-in-out infinite' }} />
            <span style={{ width: '3px', backgroundColor: '#38bdf8', borderRadius: '1px', animation: 'telemetryBar2 1.1s ease-in-out infinite' }} />
            <span style={{ width: '3px', backgroundColor: '#38bdf8', borderRadius: '1px', animation: 'telemetryBar3 0.8s ease-in-out infinite' }} />
            <span style={{ width: '3px', backgroundColor: '#38bdf8', borderRadius: '1px', animation: 'telemetryBar4 1.2s ease-in-out infinite' }} />
            <span style={{ width: '3px', backgroundColor: '#38bdf8', borderRadius: '1px', animation: 'telemetryBar5 1.0s ease-in-out infinite' }} />
          </div>

          {/* Monospace Elapsed Timer */}
          <div
            style={{
              fontFamily: 'monospace',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#38bdf8',
              backgroundColor: 'rgba(56, 189, 248, 0.12)',
              padding: '3px 8px',
              borderRadius: '6px',
              border: '1px solid rgba(56, 189, 248, 0.3)'
            }}
          >
            {elapsed.toFixed(1)}s
          </div>
        </div>
      </div>

      {/* Live Telemetry Scanning Indicator Chips */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          flexWrap: 'wrap',
          paddingTop: '6px',
          borderTop: '1px solid rgba(255, 255, 255, 0.07)'
        }}
      >
        <span
          style={{
            fontSize: '0.66rem',
            fontWeight: 600,
            color: '#7dd3fc',
            backgroundColor: 'rgba(14, 165, 233, 0.12)',
            padding: '2px 7px',
            borderRadius: '12px',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            animation: 'telemetryChipPulse 2s ease-in-out infinite'
          }}
        >
          <Zap size={10} color="#38bdf8" />
          <span>Telemetry Stream: Active</span>
        </span>

        <span
          style={{
            fontSize: '0.66rem',
            fontWeight: 600,
            color: '#a5b4fc',
            backgroundColor: 'rgba(99, 102, 241, 0.12)',
            padding: '2px 7px',
            borderRadius: '12px',
            border: '1px solid rgba(129, 140, 248, 0.25)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <Brain size={10} color="#818cf8" />
          <span>1,400+ OEM Chunks</span>
        </span>

        {machineCode && (
          <span
            style={{
              fontSize: '0.66rem',
              fontWeight: 600,
              color: '#86efac',
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              padding: '2px 7px',
              borderRadius: '12px',
              border: '1px solid rgba(34, 197, 94, 0.25)',
              marginLeft: 'auto'
            }}
          >
            {machineCode}
          </span>
        )}
      </div>
    </div>
  );
};

export default AIThinkingEffect;
