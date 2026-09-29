import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { machinesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/ToastContainer';
import { useWebSocket } from '../context/WebSocketContext';
import {
  Cpu, Search, Plus, Eye, History, CheckCircle2, AlertTriangle,
  Activity, Thermometer, Radio, Gauge, Zap, Sparkles, Layers,
  FileText, Wrench, ShieldAlert, Clock, RefreshCw, X, Box
} from 'lucide-react';
import { TelemetryConsole } from '../components/telemetry/TelemetryConsole';
import { PlantMachineHealthGrid } from '../components/machines/PlantMachineHealthGrid';
import { AICopilotModal } from '../components/ai/AICopilotModal';

export const MachinesPage = () => {
  const { hasRole } = useAuth();
  const { addToast } = useToast();
  const { lastEvent } = useWebSocket();
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('ALL');

  // AI Copilot Modal State
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [copilotMachine, setCopilotMachine] = useState(null);

  // Machine Detail / History Modal State
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [timelineData, setTimelineData] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState('TIMELINE');

  // New Machine Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    machine_code: '',
    name: '',
    type: 'Milling Center',
    department: 'Machining Dept',
    location: 'Bay 1',
  });
  const [savingMachine, setSavingMachine] = useState(false);

  const loadMachines = async () => {
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status_filter = statusFilter;
      const res = await machinesApi.list(params);
      setMachines(res.data);
    } catch (err) {
      console.error('Failed to load fleet machines:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMachines();
  }, [search, statusFilter, lastEvent]);

  const viewMachineDetail = async (machine) => {
    setSelectedMachine(machine);
    setLoadingHistory(true);
    try {
      const [histRes, timeRes] = await Promise.all([
        machinesApi.getHistory(machine.id),
        machinesApi.getTimeline(machine.id),
      ]);
      setHistoryData(histRes.data);
      setTimelineData(timeRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleLaunchAI = (machine) => {
    setCopilotMachine(machine);
    setCopilotOpen(true);
  };

  const handleCreateMachine = async (e) => {
    e.preventDefault();
    setSavingMachine(true);
    try {
      await machinesApi.create(addForm);
      addToast({
        title: 'Machine Registered',
        message: `Equipment ${addForm.machine_code} (${addForm.name}) registered successfully.`,
        type: 'success'
      });
      setShowAddModal(false);
      setAddForm({
        machine_code: '',
        name: '',
        type: 'Milling Center',
        department: 'Machining Dept',
        location: 'Bay 1',
      });
      loadMachines();
    } catch (err) {
      addToast({
        title: 'Registration Failed',
        message: err.response?.data?.detail || 'Failed to create machine equipment record.',
        type: 'error'
      });
    } finally {
      setSavingMachine(false);
    }
  };

  // Enriched OEM details generator
  const getOEMDetails = (m) => {
    const code = (m.machine_code || '').toUpperCase();
    const id = m.id || 1;
    const seed = (id * 13) % 7;

    if (code.includes('CNC-04')) {
      return {
        oem: 'DMG Mori Seiki Corp',
        model: 'NVX 5080-II (5-Axis Spindle)',
        serial: 'DMG-2024-JP-8891',
        power: '22 kW / 480V 3-Phase',
        hours: 4820,
        oee: '91.8%',
        temp: 88,
        vib: '3.4 mm/s',
        psi: '115 PSI',
        load: 86
      };
    }
    if (code.includes('CNC')) {
      return {
        oem: 'Haas Automation, Inc.',
        model: 'VF-4SS Machining Center',
        serial: `HAAS-2023-US-${4200 + id}`,
        power: '22.4 kW / 12,000 RPM',
        hours: 3200 + id * 210,
        oee: '94.2%',
        temp: 58 + seed,
        vib: '1.2 mm/s',
        psi: '142 PSI',
        load: 64 + seed
      };
    }
    if (code.includes('HYD') || code.includes('PRESS')) {
      return {
        oem: 'Bosch Rexroth AG',
        model: 'CytroBox 210-Bar Servo Press',
        serial: `BRX-2022-DE-${9100 + id}`,
        power: '30 kW / 210 Bar',
        hours: 6410 + id * 110,
        oee: '88.5%',
        temp: 62 + seed,
        vib: '1.5 mm/s',
        psi: '210 PSI',
        load: 78
      };
    }
    if (code.includes('ROBOT')) {
      return {
        oem: 'ABB Robotics & Automation',
        model: 'IRB 6700-200 Heavy Duty',
        serial: `ABB-2024-SE-${3300 + id}`,
        power: '15 kW / 6-Axis Servo',
        hours: 2900 + id * 180,
        oee: '97.1%',
        temp: 48 + seed,
        vib: '0.8 mm/s',
        psi: '90 PSI',
        load: 52
      };
    }
    if (code.includes('COMP')) {
      return {
        oem: 'Atlas Copco Compressors',
        model: 'GA 75 VSD+ Rotary Screw',
        serial: `ATC-2021-BE-${1190 + id}`,
        power: '75 kW / 8.5 Bar',
        hours: 8900 + id * 310,
        oee: '95.6%',
        temp: 68 + seed,
        vib: '1.4 mm/s',
        psi: '124 PSI',
        load: 72
      };
    }
    return {
      oem: 'Siemens Energy AG',
      model: 'SIMATIC S7 Production Unit',
      serial: `SN-2023-DE-${5000 + id}`,
      power: '45 kW / 480V',
      hours: 4100 + id * 150,
      oee: '93.0%',
      temp: 55 + seed,
      vib: '1.1 mm/s',
      psi: '135 PSI',
      load: 60
    };
  };

  const filteredByTypeMachines = machines.filter((m) => {
    if (selectedTypeFilter === 'ALL') return true;
    return (m.type || '').toLowerCase().includes(selectedTypeFilter.toLowerCase());
  });

  const totalAssets = machines.length;
  const runningAssets = machines.filter((m) => m.status === 'RUNNING').length;
  const warningAssets = machines.filter((m) => m.status === 'WARNING').length;
  const downAssets = machines.filter((m) => m.status === 'DOWN').length;
  const availabilityPct = Math.round((runningAssets / (totalAssets || 1)) * 100);

  return (
    <div className="page-body" style={{ maxWidth: '1480px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* 1. Industrial Command Header */}
      <div style={{
        backgroundColor: '#070c1a',
        border: '1px solid rgba(56, 189, 248, 0.25)',
        borderRadius: '16px',
        padding: '22px 28px',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 0 20px rgba(14, 165, 233, 0.5)'
          }}>
            <Cpu size={26} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0, color: '#ffffff', letterSpacing: '-0.02em' }}>
                Industrial Equipment Fleet &amp; Asset Registry
              </h1>
              <span style={{
                fontSize: '0.675rem',
                fontWeight: 700,
                backgroundColor: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                border: '1px solid rgba(56, 189, 248, 0.35)',
                padding: '2px 8px',
                borderRadius: '12px'
              }}>
                SCADA / PLC SYNCHRONIZED
              </span>
            </div>
            <p style={{ fontSize: '0.825rem', color: '#94a3b8', margin: '4px 0 0 0' }}>
              Central plant machinery catalog, real-time operating parameters, ISO 10816 vibration health, and chronological maintenance audit records.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {hasRole(['SUPERVISOR', 'MANAGER']) && (
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '10px 18px',
                fontSize: '0.825rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)'
              }}
            >
              <Plus size={16} /> Register New Machine
            </button>
          )}

          <button
            type="button"
            onClick={loadMachines}
            style={{
              backgroundColor: '#0b1329',
              border: '1px solid #1e293b',
              borderRadius: '10px',
              padding: '9px 14px',
              color: '#38bdf8',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            title="Reload fleet status"
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Sync Fleet</span>
          </button>
        </div>
      </div>

      {/* 2. Top Fleet KPI Summary Ribbon */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '14px'
      }}>
        <div style={{
          backgroundColor: '#0b1329',
          border: '1px solid #1e3a8a',
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>
            <Box size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.725rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Fleet Total Assets</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff', marginTop: '2px' }}>{totalAssets} Units</div>
          </div>
        </div>

        <div style={{
          backgroundColor: '#0b1329',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399' }}>
            <Activity size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.725rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Fleet Availability</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#34d399', marginTop: '2px' }}>{availabilityPct}% Operational</div>
          </div>
        </div>

        <div style={{
          backgroundColor: '#0b1329',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fbbf24' }}>
            <AlertTriangle size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.725rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Warning Anomalies</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fbbf24', marginTop: '2px' }}>{warningAssets} Machines</div>
          </div>
        </div>

        <div style={{
          backgroundColor: '#0b1329',
          border: '1px solid rgba(239, 68, 68, 0.35)',
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171' }}>
            <ShieldAlert size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.725rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Unscheduled Downtime</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f87171', marginTop: '2px' }}>{downAssets} Offline</div>
          </div>
        </div>
      </div>

      {/* 3. Live Telemetry Diagnostic Oscilloscope & Condition Simulation */}
      <div>
        <TelemetryConsole />
      </div>

      {/* 4. Live Plant Machine Health Overview Grid (Overhauled) */}
      <PlantMachineHealthGrid
        initialMachines={machines}
        onSelectMachine={(m) => viewMachineDetail(m)}
      />

      {/* 5. Fleet Search & Deep Industrial Filters */}
      <div style={{
        backgroundColor: '#0b1329',
        border: '1px solid #1e3a8a',
        borderRadius: '14px',
        padding: '16px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
      }}>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flex: 1,
            backgroundColor: '#070c18',
            border: '1px solid #334155',
            borderRadius: '10px',
            padding: '4px 14px'
          }}>
            <Search size={18} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search by equipment code, OEM manufacturer, model, serial #, or bay..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                backgroundColor: 'transparent',
                color: '#ffffff',
                fontSize: '0.875rem',
                width: '100%',
                padding: '8px 0'
              }}
            />
          </div>

          <div style={{ width: '220px' }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '11px 14px',
                backgroundColor: '#070c18',
                border: '1px solid #334155',
                borderRadius: '10px',
                color: '#ffffff',
                fontSize: '0.85rem',
                outline: 'none'
              }}
            >
              <option value="">All Operating Statuses</option>
              <option value="RUNNING">RUNNING (Nominal)</option>
              <option value="WARNING">WARNING (Harmonics)</option>
              <option value="DOWN">DOWN (Offline)</option>
              <option value="MAINTENANCE">MAINTENANCE (LOTO)</option>
            </select>
          </div>
        </div>

        {/* Machine Type Filter Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', paddingTop: '8px', borderTop: '1px solid #1e293b' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Equipment Class:
          </span>
          {['ALL', 'Milling', 'Press', 'Robot', 'Compressor', 'Center'].map((typeKey) => {
            const isAct = selectedTypeFilter === typeKey;
            return (
              <button
                key={typeKey}
                type="button"
                onClick={() => setSelectedTypeFilter(typeKey)}
                style={{
                  backgroundColor: isAct ? 'rgba(56, 189, 248, 0.15)' : '#070c18',
                  color: isAct ? '#38bdf8' : '#94a3b8',
                  border: `1px solid ${isAct ? '#38bdf8' : '#1e293b'}`,
                  borderRadius: '16px',
                  padding: '3px 12px',
                  fontSize: '0.725rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {typeKey === 'ALL' ? 'All Classes' : `${typeKey} Assets`}
              </button>
            );
          })}
        </div>
      </div>

      {/* 6. Detailed Equipment Directory Grid */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
          Loading equipment fleet...
        </div>
      ) : filteredByTypeMachines.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          backgroundColor: '#0b1329',
          border: '1px dashed #1e293b',
          borderRadius: '14px',
          color: '#94a3b8'
        }}>
          No machinery matching your search and filter criteria.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '18px' }}>
          {filteredByTypeMachines.map((m) => {
            const oem = getOEMDetails(m);
            const isDown = m.status === 'DOWN';
            const isWarn = m.status === 'WARNING';

            return (
              <div
                key={m.id}
                style={{
                  backgroundColor: '#0b1329',
                  border: `1px solid ${isDown ? '#ef4444' : isWarn ? '#f59e0b' : '#1e3a8a'}`,
                  borderRadius: '14px',
                  padding: '18px',
                  boxShadow: '0 6px 20px rgba(0, 0, 0, 0.35)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '14px'
                }}
              >
                <div>
                  {/* Top Bar: Code, OEM Badge & Status */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: isDown ? '#ef4444' : isWarn ? '#f59e0b' : m.status === 'MAINTENANCE' ? '#a855f7' : '#10b981',
                          boxShadow: `0 0 8px ${isDown ? '#ef4444' : isWarn ? '#f59e0b' : '#10b981'}`
                        }} />
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1.1rem', color: '#ffffff' }}>
                          {m.machine_code}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.725rem', color: '#38bdf8', fontWeight: 700, marginTop: '2px' }}>
                        {oem.oem}
                      </div>
                    </div>

                    <span className={`badge badge-${m.status.toLowerCase()}`} style={{ fontSize: '0.7rem' }}>
                      {m.status}
                    </span>
                  </div>

                  {/* Name and Model */}
                  <h3 style={{ fontSize: '0.925rem', fontWeight: 700, color: '#f8fafc', margin: '0 0 4px 0' }}>
                    {m.name}
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '10px' }}>
                    Model: {oem.model} • SN: {oem.serial}
                  </div>

                  {/* Telemetry Matrix Strip */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '6px',
                    backgroundColor: '#070c18',
                    border: '1px solid #1e293b',
                    borderRadius: '8px',
                    padding: '8px',
                    marginBottom: '10px',
                    textAlign: 'center'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.625rem', color: '#94a3b8', textTransform: 'uppercase' }}>Temp</div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: oem.temp > 80 ? '#f87171' : '#34d399' }}>{oem.temp}°C</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.625rem', color: '#94a3b8', textTransform: 'uppercase' }}>Vib RMS</div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#38bdf8' }}>{oem.vib}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.625rem', color: '#94a3b8', textTransform: 'uppercase' }}>Pressure</div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#e2e8f0' }}>{oem.psi}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.625rem', color: '#94a3b8', textTransform: 'uppercase' }}>Load</div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#34d399' }}>{oem.load}%</div>
                    </div>
                  </div>

                  {/* Machine Specs Key-Value Table */}
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Department:</span> <strong style={{ color: '#cbd5e1' }}>{m.department}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Bay Location:</span> <strong style={{ color: '#cbd5e1' }}>{m.location}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Power Rating:</span> <strong style={{ color: '#cbd5e1' }}>{oem.power}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Operating Runtime:</span> <strong style={{ color: '#cbd5e1' }}>{oem.hours.toLocaleString()} hrs</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>OEE Performance:</span> <strong style={{ color: '#38bdf8' }}>{oem.oee}</strong>
                    </div>
                  </div>
                </div>

                {/* Card Action Controls */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '6px',
                  paddingTop: '12px',
                  borderTop: '1px solid #1e293b'
                }}>
                  <button
                    type="button"
                    onClick={() => viewMachineDetail(m)}
                    style={{
                      backgroundColor: '#070c18',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#ffffff',
                      padding: '6px 10px',
                      fontSize: '0.725rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <Eye size={13} /> Specs
                  </button>

                  <Link
                    to={`/documents?type=MANUAL&id=${m.id}`}
                    style={{
                      backgroundColor: '#070c18',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#94a3b8',
                      padding: '6px 10px',
                      fontSize: '0.725rem',
                      fontWeight: 600,
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <FileText size={13} /> Manual
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleLaunchAI(m)}
                    style={{
                      background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      fontSize: '0.725rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      boxShadow: '0 2px 8px rgba(2, 132, 199, 0.35)'
                    }}
                  >
                    <Sparkles size={13} /> AI Copilot
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Machine Detail & History Modal */}
      {selectedMachine && (
        <div className="modal-overlay" style={{ backgroundColor: 'rgba(5, 10, 24, 0.85)', backdropFilter: 'blur(8px)', zIndex: 1000 }}>
          <div className="modal-card" style={{ maxWidth: '820px', backgroundColor: '#0b1329', border: '1px solid #1e3a8a', color: '#f8fafc', borderRadius: '16px' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid #1e293b' }}>
              <div>
                <strong style={{ fontSize: '1.15rem', color: '#ffffff' }}>
                  {selectedMachine.machine_code} — {selectedMachine.name}
                </strong>
                <div style={{ fontSize: '0.775rem', color: '#94a3b8', marginTop: '2px' }}>
                  {selectedMachine.department} | {selectedMachine.location}
                </div>
              </div>
              <button
                onClick={() => setSelectedMachine(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#94a3b8' }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {/* Status and Specs Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
                <div style={{ backgroundColor: '#070c18', border: '1px solid #1e293b', padding: '10px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Operational State</div>
                  <div className={`badge badge-${selectedMachine.status.toLowerCase()}`} style={{ marginTop: '4px' }}>
                    {selectedMachine.status}
                  </div>
                </div>
                <div style={{ backgroundColor: '#070c18', border: '1px solid #1e293b', padding: '10px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Equipment Type</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#38bdf8', marginTop: '4px' }}>{selectedMachine.type}</div>
                </div>
                <div style={{ backgroundColor: '#070c18', border: '1px solid #1e293b', padding: '10px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Last Maintenance</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#ffffff', marginTop: '4px' }}>
                    {selectedMachine.last_maintenance ? new Date(selectedMachine.last_maintenance).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
                <div style={{ backgroundColor: '#070c18', border: '1px solid #1e293b', padding: '10px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Next Scheduled PM</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#34d399', marginTop: '4px' }}>
                    {selectedMachine.next_scheduled_maintenance ? new Date(selectedMachine.next_scheduled_maintenance).toLocaleDateString() : '14 Days'}
                  </div>
                </div>
              </div>

              {/* Modal Tabs Header */}
              <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #1e293b', marginBottom: '16px', paddingBottom: '4px' }}>
                <button
                  type="button"
                  onClick={() => setActiveModalTab('TIMELINE')}
                  style={{
                    border: 'none',
                    background: 'none',
                    borderBottom: activeModalTab === 'TIMELINE' ? '2px solid #38bdf8' : '2px solid transparent',
                    color: activeModalTab === 'TIMELINE' ? '#38bdf8' : '#94a3b8',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    padding: '6px 12px',
                    cursor: 'pointer'
                  }}
                >
                  Unified Lifecycle Timeline ({timelineData?.total_events || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModalTab('RECORDS')}
                  style={{
                    border: 'none',
                    background: 'none',
                    borderBottom: activeModalTab === 'RECORDS' ? '2px solid #38bdf8' : '2px solid transparent',
                    color: activeModalTab === 'RECORDS' ? '#38bdf8' : '#94a3b8',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    padding: '6px 12px',
                    cursor: 'pointer'
                  }}
                >
                  Verified Maintenance Records ({historyData?.maintenance_records?.length || 0})
                </button>
              </div>

              {loadingHistory ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                  <Activity size={20} className="spin" style={{ margin: '0 auto 8px auto', display: 'block' }} />
                  Retrieving chronological lifecycle logs...
                </div>
              ) : activeModalTab === 'TIMELINE' ? (
                /* Unified Chronological Timeline */
                <div style={{ maxHeight: '380px', overflowY: 'auto', paddingRight: '4px' }}>
                  {!timelineData || timelineData.timeline.length === 0 ? (
                    <div style={{ padding: '24px', backgroundColor: '#070c18', borderRadius: '8px', textAlign: 'center', color: '#94a3b8', fontSize: '0.825rem' }}>
                      No chronological lifecycle events recorded for this machine yet.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {timelineData.timeline.map((evt, idx) => {
                        const isIncident = evt.event_type.startsWith('INCIDENT');
                        const isWO = evt.event_type.startsWith('WORK_ORDER');
                        const isPart = evt.event_type === 'PART_REPLACED';
                        const isApproved = evt.event_type === 'MAINTENANCE_APPROVED';

                        const borderColor = isIncident ? '#f87171' : isWO ? '#fbbf24' : isPart ? '#34d399' : isApproved ? '#60a5fa' : '#a78bfa';

                        return (
                          <div
                            key={evt.id || idx}
                            style={{
                              border: '1px solid #1e293b',
                              borderLeft: `4px solid ${borderColor}`,
                              borderRadius: '8px',
                              padding: '12px 14px',
                              backgroundColor: '#070c18'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff' }}>
                                {evt.title}
                              </span>
                              <span style={{
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '4px',
                                backgroundColor: 'rgba(56, 189, 248, 0.15)',
                                color: '#38bdf8'
                              }}>
                                {evt.event_type.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <p style={{ fontSize: '0.785rem', color: '#cbd5e1', margin: '4px 0 8px 0', lineHeight: 1.4 }}>
                              {evt.description}
                            </p>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b' }}>
                              <span>Actor: <strong style={{ color: '#94a3b8' }}>{evt.actor}</strong></span>
                              <span>{evt.timestamp ? new Date(evt.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : ''}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                /* Official Maintenance Records */
                <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
                  {!historyData || historyData.maintenance_records.length === 0 ? (
                    <div style={{ padding: '24px', backgroundColor: '#070c18', borderRadius: '8px', textAlign: 'center', color: '#94a3b8', fontSize: '0.825rem' }}>
                      No completed maintenance records logged for this machine yet.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {historyData.maintenance_records.map((rec) => (
                        <div
                          key={rec.id}
                          style={{
                            border: '1px solid #1e293b',
                            borderRadius: '8px',
                            padding: '14px',
                            backgroundColor: '#070c18'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#38bdf8' }}>
                              {rec.problem_summary}
                            </span>
                            <span className={`badge badge-${rec.approval_status.toLowerCase()}`} style={{ fontSize: '0.65rem' }}>
                              {rec.approval_status}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '8px' }}>
                            Tech: <strong style={{ color: '#ffffff' }}>{rec.technician?.full_name}</strong> | Downtime: <strong style={{ color: '#f87171' }}>{rec.downtime_minutes}m</strong>
                          </div>
                          <div style={{ fontSize: '0.775rem', color: '#cbd5e1', marginBottom: '4px' }}>
                            <strong style={{ color: '#f59e0b' }}>Root Cause:</strong> {rec.root_cause}
                          </div>
                          <div style={{ fontSize: '0.775rem', color: '#cbd5e1' }}>
                            <strong style={{ color: '#10b981' }}>Repair Action:</strong> {rec.repair_action}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between' }}>
              <button
                type="button"
                onClick={() => {
                  const m = selectedMachine;
                  setSelectedMachine(null);
                  handleLaunchAI(m);
                }}
                style={{
                  background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Sparkles size={14} /> Launch AI Diagnostics
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedMachine(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Machine Modal */}
      {showAddModal && (
        <div className="modal-overlay" style={{ backgroundColor: 'rgba(5, 10, 24, 0.85)', backdropFilter: 'blur(8px)', zIndex: 1000 }}>
          <div className="modal-card" style={{ backgroundColor: '#0b1329', border: '1px solid #1e3a8a', color: '#f8fafc', borderRadius: '16px' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid #1e293b' }}>
              <strong style={{ fontSize: '1.05rem', color: '#ffffff' }}>Register Industrial Machine Asset</strong>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateMachine}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label" style={{ color: '#38bdf8' }}>Machine Code / Asset ID *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. CNC-05, ROBOT-02, HYD-PRESS-03"
                    value={addForm.machine_code}
                    onChange={(e) => setAddForm({ ...addForm, machine_code: e.target.value })}
                    required
                    style={{ backgroundColor: '#070c18', border: '1px solid #334155', color: '#ffffff' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ color: '#38bdf8' }}>Machine Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 5-Axis CNC Precision Milling Center"
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                    required
                    style={{ backgroundColor: '#070c18', border: '1px solid #334155', color: '#ffffff' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ color: '#38bdf8' }}>Equipment Type *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Milling Center, Hydraulic Press"
                      value={addForm.type}
                      onChange={(e) => setAddForm({ ...addForm, type: e.target.value })}
                      required
                      style={{ backgroundColor: '#070c18', border: '1px solid #334155', color: '#ffffff' }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ color: '#38bdf8' }}>Department / Cell *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Machining Dept, Assembly Cell A"
                      value={addForm.department}
                      onChange={(e) => setAddForm({ ...addForm, department: e.target.value })}
                      required
                      style={{ backgroundColor: '#070c18', border: '1px solid #334155', color: '#ffffff' }}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ color: '#38bdf8' }}>Floor Bay Location *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Bay 4 - Cell C"
                    value={addForm.location}
                    onChange={(e) => setAddForm({ ...addForm, location: e.target.value })}
                    required
                    style={{ backgroundColor: '#070c18', border: '1px solid #334155', color: '#ffffff' }}
                  />
                </div>
              </div>
              <div className="modal-footer" style={{ borderTop: '1px solid #1e293b' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingMachine}
                  className="btn btn-primary"
                  style={{ background: 'linear-gradient(135deg, #0284c7, #2563eb)', border: 'none' }}
                >
                  {savingMachine ? 'Registering...' : 'Register Machine Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Embedded AICopilotModal */}
      {copilotMachine && (
        <AICopilotModal
          isOpen={copilotOpen}
          onClose={() => setCopilotOpen(false)}
          initialMachineId={copilotMachine.id}
          initialMachineCode={copilotMachine.machine_code}
          initialQuestion={`Diagnose operational condition and immediate troubleshooting actions for machine ${copilotMachine.machine_code} (${copilotMachine.name}) located in ${copilotMachine.location || 'Production'}.`}
        />
      )}
    </div>
  );
};

export default MachinesPage;
