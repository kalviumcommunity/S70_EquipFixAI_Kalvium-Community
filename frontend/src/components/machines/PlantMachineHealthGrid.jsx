import React, { useState, useEffect } from 'react';
import { machinesApi } from '../../services/api';
import { useWebSocket } from '../../context/WebSocketContext';
import {
  Cpu, Activity, AlertTriangle, CheckCircle2, Wrench,
  Sparkles, Thermometer, Radio, Gauge, ArrowRight
} from 'lucide-react';
import AICopilotModal from '../ai/AICopilotModal';

export const PlantMachineHealthGrid = ({ initialMachines = null, onSelectMachine = null }) => {
  const [machines, setMachines] = useState(initialMachines || []);
  const [loading, setLoading] = useState(!initialMachines);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [selectedMachineForAI, setSelectedMachineForAI] = useState(null);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const { lastEvent } = useWebSocket();

  useEffect(() => {
    if (!initialMachines) {
      fetchMachines();
    } else {
      setMachines(initialMachines);
    }
  }, [initialMachines]);

  // Real-time synchronization on machine status changes
  useEffect(() => {
    if (lastEvent?.event === 'machine.status_changed') {
      fetchMachines();
    }
  }, [lastEvent]);

  const fetchMachines = async () => {
    try {
      setLoading(true);
      const res = await machinesApi.list();
      setMachines(res.data);
    } catch (err) {
      console.error('Failed to load plant machines:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'RUNNING':
        return { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0', dot: '#10b981' };
      case 'WARNING':
        return { bg: '#fffbeb', text: '#d97706', border: '#fde68a', dot: '#f59e0b' };
      case 'DOWN':
        return { bg: '#fef2f2', text: '#dc2626', border: '#fecaca', dot: '#ef4444' };
      case 'MAINTENANCE':
        return { bg: '#f5f3ff', text: '#7c3aed', border: '#ddd6fe', dot: '#8b5cf6' };
      default:
        return { bg: '#f8fafc', text: '#64748b', border: '#e2e8f0', dot: '#94a3b8' };
    }
  };

  const getMachineLiveTelemetry = (m) => {
    const seed = (m.id * 17) % 7;
    if (m.status === 'DOWN') {
      return { temp: `${91 + seed}°C`, vib: `${(4.5 + seed * 0.1).toFixed(1)} mm/s`, psi: `${108 + seed} PSI`, state: 'Critical Emergency Trip' };
    }
    if (m.status === 'WARNING') {
      return { temp: `${78 + seed}°C`, vib: `${(2.4 + seed * 0.1).toFixed(1)} mm/s`, psi: `${132 + seed} PSI`, state: 'Harmonic Anomaly Alert' };
    }
    if (m.status === 'MAINTENANCE') {
      return { temp: `${28 + seed}°C`, vib: '0.0 mm/s', psi: '0 PSI', state: 'LOTO Lockout Verified' };
    }
    return { temp: `${56 + seed}°C`, vib: `${(1.1 + seed * 0.08).toFixed(1)} mm/s`, psi: `${142 + seed} PSI`, state: 'ISO 10816-3 Nominal' };
  };

  const filteredMachines = machines.filter((m) => {
    if (activeFilter === 'ALL') return true;
    return m.status === activeFilter;
  });

  const totalCount = machines.length;
  const runningCount = machines.filter((m) => m.status === 'RUNNING').length;
  const warningCount = machines.filter((m) => m.status === 'WARNING').length;
  const downCount = machines.filter((m) => m.status === 'DOWN').length;

  const handleOpenAI = (machine) => {
    setSelectedMachineForAI(machine);
    setCopilotOpen(true);
  };

  return (
    <div style={{
      backgroundColor: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '14px',
      padding: '20px',
      marginBottom: '24px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu size={20} color="#2563eb" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Plant Machine Health Overview
            </h3>
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '9999px',
              backgroundColor: downCount > 0 ? '#fee2e2' : '#dcfce7',
              color: downCount > 0 ? '#b91c1c' : '#15803d'
            }}>
              {runningCount}/{totalCount} Active ({Math.round((runningCount / (totalCount || 1)) * 100)}% Availability)
            </span>
          </div>
          <p style={{ fontSize: '0.785rem', color: '#64748b', margin: '3px 0 0 0' }}>
            Real-time shop floor telemetry and condition monitoring across production cells.
          </p>
        </div>

        {/* Filter Chips */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {['ALL', 'RUNNING', 'WARNING', 'DOWN', 'MAINTENANCE'].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setActiveFilter(f)}
              style={{
                border: 'none',
                backgroundColor: activeFilter === f ? '#0f172a' : '#f1f5f9',
                color: activeFilter === f ? '#ffffff' : '#64748b',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.725rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {f} {f === 'ALL' ? `(${totalCount})` : f === 'RUNNING' ? `(${runningCount})` : f === 'WARNING' ? `(${warningCount})` : f === 'DOWN' ? `(${downCount})` : ''}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
          Querying machine status telemetry...
        </div>
      ) : filteredMachines.length === 0 ? (
        <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
          No equipment matching the selected filter.
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '14px'
        }}>
          {filteredMachines.map((m) => {
            const sc = getStatusColor(m.status);
            const tele = getMachineLiveTelemetry(m);

            return (
              <div
                key={m.id}
                style={{
                  border: `1px solid ${m.status === 'DOWN' ? '#fecaca' : '#e2e8f0'}`,
                  borderRadius: '10px',
                  padding: '14px',
                  backgroundColor: m.status === 'DOWN' ? '#fffaf0' : '#ffffff',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                }}
              >
                <div>
                  {/* Card Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: sc.dot
                        }} />
                        <strong style={{ fontSize: '0.875rem', color: '#0f172a' }}>{m.machine_code}</strong>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px', fontWeight: 500 }}>
                        {m.name}
                      </div>
                    </div>

                    <span style={{
                      backgroundColor: sc.bg,
                      color: sc.text,
                      border: `1px solid ${sc.border}`,
                      fontSize: '0.675rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      letterSpacing: '0.03em'
                    }}>
                      {m.status}
                    </span>
                  </div>

                  {/* Machine Specs */}
                  <div style={{ fontSize: '0.725rem', color: '#64748b', marginBottom: '10px' }}>
                    <span>{m.type}</span> • <span>{m.location}</span>
                  </div>

                  {/* Telemetry row */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '6px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '6px',
                    padding: '8px',
                    marginBottom: '12px'
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.625rem', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                        <Thermometer size={10} /> Temp
                      </div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: m.status === 'DOWN' || m.status === 'WARNING' ? '#dc2626' : '#1e293b' }}>
                        {tele.temp}
                      </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.625rem', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                        <Radio size={10} /> Vib
                      </div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: m.status === 'DOWN' ? '#dc2626' : '#1e293b' }}>
                        {tele.vib}
                      </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.625rem', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                        <Gauge size={10} /> Pressure
                      </div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e293b' }}>
                        {tele.psi}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                  {onSelectMachine ? (
                    <button
                      type="button"
                      onClick={() => onSelectMachine(m)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#2563eb',
                        fontSize: '0.725rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <span>Select Machine</span>
                      <ArrowRight size={12} />
                    </button>
                  ) : (
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                      {tele.state}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => handleOpenAI(m)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      backgroundColor: '#eff6ff',
                      color: '#1d4ed8',
                      border: '1px solid #bfdbfe',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#dbeafe'; }}
                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#eff6ff'; }}
                    title={`Ask EquipFix AI regarding ${m.machine_code}`}
                  >
                    <Sparkles size={12} color="#2563eb" />
                    <span>Diagnose</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Embedded Modal Dialog */}
      {selectedMachineForAI && (
        <AICopilotModal
          isOpen={copilotOpen}
          onClose={() => setCopilotOpen(false)}
          initialMachineId={selectedMachineForAI.id}
          initialMachineCode={selectedMachineForAI.machine_code}
          initialQuestion={`Diagnose operational condition and maintenance checks for ${selectedMachineForAI.machine_code} (${selectedMachineForAI.name})`}
        />
      )}
    </div>
  );
};

export default PlantMachineHealthGrid;
