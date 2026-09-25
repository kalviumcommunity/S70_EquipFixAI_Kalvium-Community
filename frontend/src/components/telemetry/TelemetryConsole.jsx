import React, { useState, useEffect } from 'react';
import {
  Activity, Gauge, Zap, Thermometer, AlertTriangle,
  CheckCircle2, Sparkles, Sliders, RefreshCw, Radio
} from 'lucide-react';
import { AICopilotModal } from '../ai/AICopilotModal';
import { machinesApi } from '../../services/api';
import { useWebSocket } from '../../context/WebSocketContext';

export const TelemetryConsole = () => {
  const [machineStatus, setMachineStatus] = useState('RUNNING'); // 'RUNNING' | 'WARNING' | 'DOWN' | 'CRITICAL'
  const [rpm, setRpm] = useState(12400);
  const [temp, setTemp] = useState(48.2);
  const [vibration, setVibration] = useState(1.8);
  const [pressure, setPressure] = useState(145);
  const [waveOffset, setWaveOffset] = useState(0);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [copilotQuery, setCopilotQuery] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const { lastEvent, addToast } = useWebSocket();

  // Listen to plant-wide real-time machine status updates
  useEffect(() => {
    if (lastEvent?.event === 'machine.status_changed' && lastEvent.data?.machine_code === 'CNC-04') {
      const incomingStatus = lastEvent.data.status;
      setMachineStatus(incomingStatus);
    }
  }, [lastEvent]);

  // Live telemetry pulse
  useEffect(() => {
    const interval = setInterval(() => {
      if (machineStatus === 'RUNNING') {
        setRpm(12400 + Math.floor((Math.random() - 0.5) * 120));
        setTemp(+(48.0 + (Math.random() * 0.8)).toFixed(1));
        setVibration(+(1.7 + (Math.random() * 0.3)).toFixed(1));
        setPressure(144 + Math.floor((Math.random() - 0.5) * 4));
      } else if (machineStatus === 'WARNING') {
        setRpm(11850 + Math.floor((Math.random() - 0.5) * 260));
        setTemp(+(74.5 + (Math.random() * 1.5)).toFixed(1));
        setVibration(+(5.4 + (Math.random() * 0.8)).toFixed(1));
        setPressure(122 + Math.floor((Math.random() - 0.5) * 8));
      } else if (machineStatus === 'CRITICAL' || machineStatus === 'DOWN') {
        setRpm(3400 + Math.floor((Math.random() - 0.5) * 400));
        setTemp(+(94.2 + (Math.random() * 2.0)).toFixed(1));
        setVibration(+(8.6 + (Math.random() * 1.2)).toFixed(1));
        setPressure(75 + Math.floor((Math.random() - 0.5) * 12));
      }
    }, 1200);

    return () => clearInterval(interval);
  }, [machineStatus]);

  // Waveform animation
  useEffect(() => {
    const waveInterval = setInterval(() => {
      setWaveOffset((prev) => (prev + 1) % 100);
    }, 80);
    return () => clearInterval(waveInterval);
  }, []);

  const handleSimulateStatus = async (targetStatus) => {
    setIsUpdating(true);
    setMachineStatus(targetStatus);
    try {
      await machinesApi.updateStatusByCode('CNC-04', targetStatus);
      addToast({
        title: 'Telemetry Event Broadcasted',
        message: `CNC-04 condition updated to ${targetStatus} across all plant stations.`,
        type: targetStatus === 'RUNNING' ? 'success' : targetStatus === 'WARNING' ? 'warning' : 'error'
      });
    } catch (err) {
      console.error('Failed to update CNC-04 status:', err);
      addToast({
        title: 'Simulation Update Failed',
        message: err.response?.data?.detail || err.message || 'Could not update CNC-04 status',
        type: 'error'
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleOpenAICopilot = (question = '') => {
    setCopilotQuery(
      question || (machineStatus === 'RUNNING'
        ? 'What is the recommended preventative maintenance inspection interval for CNC-04?'
        : 'CNC-04 is exhibiting severe spindle vibration and high bearing temperature. What are the diagnostic steps and torque specs?')
    );
    setCopilotOpen(true);
  };

  // Generate SVG path points for the waveform
  const generateWavePath = () => {
    const points = [];
    const width = 600;
    const height = 70;
    const midY = height / 2;
    const numPoints = 60;

    for (let i = 0; i <= numPoints; i++) {
      const x = (i / numPoints) * width;
      let y = midY;

      if (machineStatus === 'RUNNING') {
        // Smooth sine wave
        y = midY + Math.sin((i + waveOffset * 0.5) * 0.4) * 14;
      } else if (machineStatus === 'WARNING') {
        // Jagged harmonic distortion
        const primary = Math.sin((i + waveOffset) * 0.5) * 20;
        const harmonic = Math.sin((i + waveOffset * 2) * 1.2) * 9;
        const noise = (Math.random() - 0.5) * 6;
        y = midY + primary + harmonic + noise;
      } else {
        // Severe clipping / shock pulses
        const primary = Math.sin((i + waveOffset * 1.5) * 0.8) * 28;
        const spike = i % 8 === 0 ? (Math.random() > 0.5 ? 24 : -24) : 0;
        y = midY + primary + spike;
      }

      // Clamp y
      y = Math.max(5, Math.min(height - 5, y));
      points.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
    }

    return points.join(' ');
  };

  const isDown = machineStatus === 'CRITICAL' || machineStatus === 'DOWN';

  const getStatusColor = () => {
    if (machineStatus === 'RUNNING') return { main: '#10b981', light: '#34d399', bg: '#064e3b', border: '#059669' };
    if (machineStatus === 'WARNING') return { main: '#f59e0b', light: '#fbbf24', bg: '#78350f', border: '#d97706' };
    return { main: '#ef4444', light: '#f87171', bg: '#7f1d1d', border: '#dc2626' };
  };

  const statusColor = getStatusColor();

  return (
    <div style={{
      backgroundColor: '#0b1329',
      border: '1px solid #1e293b',
      borderRadius: '16px',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 25px rgba(37, 99, 235, 0.1)',
      overflow: 'hidden'
    }}>
      {/* ---------------- Console Header ---------------- */}
      <div style={{
        backgroundColor: '#0f1a36',
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #1e293b',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* Left: Terminal Dots & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10b981' }} />
          </div>

          <span style={{
            fontSize: '0.825rem',
            color: '#e2e8f0',
            fontFamily: 'var(--font-mono, monospace)',
            fontWeight: 700,
            letterSpacing: '0.02em'
          }}>
            TELEMETRY CONSOLE :: CELL-4 / CNC-04 5-AXIS MILL
          </span>

          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.7rem',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: '9999px',
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            color: '#34d399',
            border: '1px solid rgba(16, 185, 129, 0.3)'
          }}>
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: '#10b981',
              boxShadow: '0 0 6px #10b981'
            }} />
            LIVE FEED • 100Hz
          </span>
        </div>

        {/* Right: Anomaly Simulation Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Simulate Condition:
          </span>

          <button
            type="button"
            disabled={isUpdating}
            onClick={() => handleSimulateStatus('RUNNING')}
            style={{
              padding: '5px 10px',
              borderRadius: '6px',
              fontSize: '0.725rem',
              fontWeight: 700,
              cursor: isUpdating ? 'wait' : 'pointer',
              backgroundColor: machineStatus === 'RUNNING' ? '#065f46' : '#1e293b',
              color: machineStatus === 'RUNNING' ? '#34d399' : '#94a3b8',
              border: `1px solid ${machineStatus === 'RUNNING' ? '#059669' : '#334155'}`,
              transition: 'all 0.15s ease',
              opacity: isUpdating ? 0.7 : 1
            }}
          >
            Normal (RUNNING)
          </button>

          <button
            type="button"
            disabled={isUpdating}
            onClick={() => handleSimulateStatus('WARNING')}
            style={{
              padding: '5px 10px',
              borderRadius: '6px',
              fontSize: '0.725rem',
              fontWeight: 700,
              cursor: isUpdating ? 'wait' : 'pointer',
              backgroundColor: machineStatus === 'WARNING' ? '#78350f' : '#1e293b',
              color: machineStatus === 'WARNING' ? '#fbbf24' : '#94a3b8',
              border: `1px solid ${machineStatus === 'WARNING' ? '#d97706' : '#334155'}`,
              transition: 'all 0.15s ease',
              opacity: isUpdating ? 0.7 : 1
            }}
          >
            Trigger Vibration (WARNING)
          </button>

          <button
            type="button"
            disabled={isUpdating}
            onClick={() => handleSimulateStatus('DOWN')}
            style={{
              padding: '5px 10px',
              borderRadius: '6px',
              fontSize: '0.725rem',
              fontWeight: 700,
              cursor: isUpdating ? 'wait' : 'pointer',
              backgroundColor: isDown ? '#7f1d1d' : '#1e293b',
              color: isDown ? '#f87171' : '#94a3b8',
              border: `1px solid ${isDown ? '#dc2626' : '#334155'}`,
              transition: 'all 0.15s ease',
              opacity: isUpdating ? 0.7 : 1
            }}
          >
            Thermal Trip (DOWN)
          </button>
        </div>
      </div>

      {/* ---------------- Console Body ---------------- */}
      <div style={{ padding: '20px' }}>
        {/* Metric Gauges Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '14px',
          marginBottom: '20px'
        }}>
          {/* 1. Operational State */}
          <div style={{
            backgroundColor: '#070c18',
            padding: '16px',
            borderRadius: '10px',
            border: `1px solid ${statusColor.border}`,
            boxShadow: `0 0 15px ${statusColor.bg}`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                Operational State
              </span>
              <Activity size={16} color={statusColor.light} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: statusColor.main,
                boxShadow: `0 0 10px ${statusColor.main}`
              }} />
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: statusColor.light }}>
                {machineStatus === 'CRITICAL' ? 'DOWN' : machineStatus}
              </span>
            </div>

            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '6px', lineHeight: 1.3 }}>
              {machineStatus === 'RUNNING' && 'Spindle cartridge & 5-axis synchronization nominal'}
              {machineStatus === 'WARNING' && 'Abnormal bearing resonance detected (ISO Zone C)'}
              {isDown && 'Spindle thermal safety excursion > 90°C. Feed-hold trip'}
            </div>
          </div>

          {/* 2. Spindle Velocity */}
          <div style={{
            backgroundColor: '#070c18',
            padding: '16px',
            borderRadius: '10px',
            border: '1px solid #1e293b'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                Spindle Velocity
              </span>
              <Gauge size={16} color="#38bdf8" />
            </div>

            <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-mono, monospace)', color: '#ffffff' }}>
              {rpm.toLocaleString()} <span style={{ fontSize: '0.8rem', color: '#64748b' }}>RPM</span>
            </div>

            {/* Velocity progress indicator */}
            <div style={{
              width: '100%',
              height: '4px',
              backgroundColor: '#1e293b',
              borderRadius: '2px',
              marginTop: '8px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${Math.min(100, Math.round((rpm / 15000) * 100))}%`,
                height: '100%',
                backgroundColor: isDown ? '#ef4444' : '#38bdf8',
                transition: 'width 0.3s ease'
              }} />
            </div>

            <div style={{ fontSize: '0.7rem', color: '#38bdf8', marginTop: '6px' }}>
              Nominal: 12,500 RPM • Max: 15,000 RPM
            </div>
          </div>

          {/* 3. Bearing Temp */}
          <div style={{
            backgroundColor: '#070c18',
            padding: '16px',
            borderRadius: '10px',
            border: '1px solid #1e293b'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                Bearing Temp
              </span>
              <Thermometer size={16} color={temp > 80 ? '#ef4444' : temp > 65 ? '#f59e0b' : '#10b981'} />
            </div>

            <div style={{
              fontSize: '1.4rem',
              fontWeight: 800,
              fontFamily: 'var(--font-mono, monospace)',
              color: temp > 80 ? '#f87171' : temp > 65 ? '#fbbf24' : '#ffffff'
            }}>
              {temp} <span style={{ fontSize: '0.8rem', color: '#64748b' }}>°C</span>
            </div>

            <div style={{
              width: '100%',
              height: '4px',
              backgroundColor: '#1e293b',
              borderRadius: '2px',
              marginTop: '8px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${Math.min(100, Math.round((temp / 100) * 100))}%`,
                height: '100%',
                backgroundColor: temp > 80 ? '#ef4444' : temp > 65 ? '#f59e0b' : '#10b981',
                transition: 'width 0.3s ease'
              }} />
            </div>

            <div style={{
              fontSize: '0.7rem',
              color: temp > 80 ? '#f87171' : temp > 65 ? '#fbbf24' : '#94a3b8',
              marginTop: '6px'
            }}>
              {temp > 80 ? '⚠️ High Thermal Excursion (>80°C)' : temp > 65 ? 'Elevated Temperature (>65°C)' : 'Operating within safe limits (<65°C)'}
            </div>
          </div>

          {/* 4. RMS Vibration */}
          <div style={{
            backgroundColor: '#070c18',
            padding: '16px',
            borderRadius: '10px',
            border: '1px solid #1e293b'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                RMS Vibration
              </span>
              <Zap size={16} color={vibration > 4.5 ? '#ef4444' : vibration > 2.5 ? '#f59e0b' : '#38bdf8'} />
            </div>

            <div style={{
              fontSize: '1.4rem',
              fontWeight: 800,
              fontFamily: 'var(--font-mono, monospace)',
              color: vibration > 4.5 ? '#f87171' : vibration > 2.5 ? '#fbbf24' : '#ffffff'
            }}>
              {vibration} <span style={{ fontSize: '0.8rem', color: '#64748b' }}>mm/s</span>
            </div>

            <div style={{
              width: '100%',
              height: '4px',
              backgroundColor: '#1e293b',
              borderRadius: '2px',
              marginTop: '8px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${Math.min(100, Math.round((vibration / 10) * 100))}%`,
                height: '100%',
                backgroundColor: vibration > 4.5 ? '#ef4444' : vibration > 2.5 ? '#f59e0b' : '#38bdf8',
                transition: 'width 0.3s ease'
              }} />
            </div>

            <div style={{
              fontSize: '0.7rem',
              color: vibration > 4.5 ? '#f87171' : vibration > 2.5 ? '#fbbf24' : '#94a3b8',
              marginTop: '6px'
            }}>
              ISO 10816-3 Zone {vibration > 4.5 ? 'D (Critical Trip)' : vibration > 2.5 ? 'C (Warning Limit)' : 'A (Good)'}
            </div>
          </div>
        </div>

        {/* ---------------- Real-time Accelerometer Oscilloscope Waveform ---------------- */}
        <div style={{
          backgroundColor: '#070c18',
          border: '1px solid #1e293b',
          borderRadius: '10px',
          padding: '14px 18px',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Radio size={14} color="#38bdf8" />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#e2e8f0', letterSpacing: '0.03em' }}>
                SPINDLE ACCELERATION HARMONICS (CH-1 AXIAL SPECTRUM)
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.7rem', color: '#94a3b8' }}>
              <span>Sampling: <strong>25.6 kHz</strong></span>
              <span>Filter: <strong>Bandpass 10Hz - 10kHz</strong></span>
              <span style={{ color: statusColor.light, fontWeight: 700 }}>
                {machineStatus === 'RUNNING' ? 'HARMONICS BALANCED' : 'HIGH RESONANCE SPIKES'}
              </span>
            </div>
          </div>

          {/* SVG Waveform Visualizer */}
          <div style={{
            position: 'relative',
            width: '100%',
            height: '70px',
            backgroundColor: '#050914',
            borderRadius: '6px',
            border: '1px solid #1e293b',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center'
          }}>
            {/* Grid overlay */}
            <div style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: 'linear-gradient(rgba(30, 41, 59, 0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(30, 41, 59, 0.4) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
              pointerEvents: 'none'
            }} />

            <svg
              viewBox="0 0 600 70"
              preserveAspectRatio="none"
              style={{ width: '100%', height: '100%', position: 'relative', zIndex: 1 }}
            >
              <path
                d={generateWavePath()}
                fill="none"
                stroke={statusColor.light}
                strokeWidth={machineStatus === 'RUNNING' ? '2' : '2.5'}
                strokeLinecap="round"
                style={{
                  filter: `drop-shadow(0 0 4px ${statusColor.main})`,
                  transition: 'stroke 0.3s ease'
                }}
              />
            </svg>
          </div>
        </div>

        {/* ---------------- Diagnostic & AI Copilot Action Bar ---------------- */}
        <div style={{
          backgroundColor: machineStatus === 'RUNNING' ? '#081226' : statusColor.bg,
          border: `1px solid ${machineStatus === 'RUNNING' ? '#1e3a8a' : statusColor.border}`,
          borderRadius: '10px',
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          transition: 'all 0.3s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {machineStatus === 'RUNNING' ? (
              <CheckCircle2 size={22} color="#10b981" />
            ) : (
              <AlertTriangle size={22} color={statusColor.light} />
            )}

            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#ffffff' }}>
                {machineStatus === 'RUNNING' && 'CNC-04 Spindle is operating within normal vibration & thermal envelope.'}
                {machineStatus === 'WARNING' && 'Abnormal harmonic signature matches Spindle Bearing Fatigue (Error E-204).'}
                {isDown && 'Critical thermal trip! Lockout/Tagout (LOTO) and spindle inspection required.'}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#cbd5e1', marginTop: '2px' }}>
                {machineStatus === 'RUNNING'
                  ? 'All parameters verify ISO 10816 standards. AI Knowledge Base contains CNC-04 Operation & Maintenance Manual v1.2.'
                  : 'EquipFixAI RAG Engine indexed the exact troubleshooting steps, bearing specs (BRG-204-SKF), and torque specifications.'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={() => handleOpenAICopilot()}
              className="btn btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 700,
                backgroundColor: machineStatus === 'RUNNING' ? '#2563eb' : '#dc2626',
                borderColor: machineStatus === 'RUNNING' ? '#1d4ed8' : '#b91c1c',
                boxShadow: `0 0 15px ${machineStatus === 'RUNNING' ? 'rgba(37, 99, 235, 0.4)' : 'rgba(220, 38, 38, 0.4)'}`
              }}
            >
              <Sparkles size={16} />
              Diagnose CNC-04 with AI
            </button>
          </div>
        </div>
      </div>

      {/* AICopilotModal overlay when requested */}
      <AICopilotModal
        isOpen={copilotOpen}
        onClose={() => setCopilotOpen(false)}
        initialMachineCode="CNC-04"
        initialQuestion={copilotQuery}
      />
    </div>
  );
};

export default TelemetryConsole;
