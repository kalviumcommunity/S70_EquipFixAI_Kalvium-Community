import React, { useState, useEffect } from 'react';
import { machinesApi, workOrdersApi, aiApi } from '../services/api';
import { AITroubleshootingPanel } from '../components/ai/AITroubleshootingPanel';
import {
  Sparkles, Bot, Wrench, Shield, Database,
  Cpu, Activity, CheckCircle2, Search, ArrowRight,
  AlertTriangle, Package, History, Info, X, Zap, RefreshCw,
  MessageSquare, Eye, Palette, ChevronRight, Layers, Sliders
} from 'lucide-react';

export const AIAssistantPage = () => {
  const [machines, setMachines] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [selectedMachineId, setSelectedMachineId] = useState('');
  const [selectedWOId, setSelectedWOId] = useState('');
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [loading, setLoading] = useState(true);

  // Active Main Navigation View: 'CHAT' | 'DB_TOOLS' | 'VISION' | 'IMAGE_GEN'
  const [activeView, setActiveView] = useState('CHAT');

  // Mobile detection
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth <= 768 : false);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Structured diagnostic tool states
  const [dbToolLoading, setDbToolLoading] = useState({});
  const [dbToolData, setDbToolData] = useState({
    status: null,
    incidents: null,
    parts: null,
    history: null
  });
  const [dbToolErrors, setDbToolErrors] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [machRes, woRes] = await Promise.all([
          machinesApi.list(),
          workOrdersApi.list()
        ]);
        const machs = machRes.data || [];
        setMachines(machs);
        setWorkOrders(woRes.data || []);
        if (machs.length > 0) {
          setSelectedMachineId(String(machs[0].id));
          setSelectedMachine(machs[0]);
        }
      } catch (err) {
        console.error('Failed to load assets for AI Copilot', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleMachineChange = (id) => {
    setSelectedMachineId(id);
    const m = machines.find((mach) => String(mach.id) === String(id));
    setSelectedMachine(m || null);
    setSelectedWOId('');
    // Clear out tool caches for new machine
    setDbToolData({ status: null, incidents: null, parts: null, history: null });
    setDbToolErrors({});
  };

  // Run a specific DB diagnostic tool
  const handleRunTool = async (key, toolName, params) => {
    setDbToolLoading(prev => ({ ...prev, [key]: true }));
    setDbToolErrors(prev => ({ ...prev, [key]: null }));
    try {
      const res = await aiApi.executeTool({ tool_name: toolName, parameters: params });
      setDbToolData(prev => ({ ...prev, [key]: res.data?.result || res.data }));
    } catch (err) {
      setDbToolErrors(prev => ({
        ...prev,
        [key]: err.response?.data?.detail || err.message || 'Query execution failed.'
      }));
    } finally {
      setDbToolLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  // Run all 4 direct DB diagnostic tools in parallel
  const handleRunAllDiagnosticTools = async () => {
    if (!selectedMachine) return;
    handleRunTool('status', 'get_machine_status', { identifier: selectedMachine.machine_code });
    handleRunTool('incidents', 'get_open_incidents', { machine_id: selectedMachine.id });
    handleRunTool('parts', 'get_parts_inventory', { search: selectedMachine.type });
    handleRunTool('history', 'get_machine_history', { machine_id: selectedMachine.id, limit: 5 });
  };

  // Trigger running queries when entering DB_TOOLS if not yet populated
  useEffect(() => {
    if (activeView === 'DB_TOOLS' && selectedMachine && !dbToolData.status && !dbToolLoading.status) {
      handleRunAllDiagnosticTools();
    }
  }, [activeView, selectedMachineId]);

  const activeWorkOrdersForMachine = workOrders.filter(
    (wo) => selectedMachineId && String(wo.machine_id) === String(selectedMachineId)
  );

  const selectedWorkOrder = workOrders.find((w) => String(w.id) === String(selectedWOId));

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      flex: 1,
      minHeight: 0,
      overflow: 'hidden',
      color: '#f8fafc',
      backgroundColor: '#030712'
    }}>
      {/* ─────────────────────────────────────────────────────────────
          1. TOP COMMAND BAR: ASSET CONTEXT + NAVIGATION VIEW SELECTOR
          ───────────────────────────────────────────────────────────── */}
      <header style={{
        backgroundColor: '#070d1e',
        borderBottom: '1px solid #1e3a8a',
        padding: isMobile ? '8px 12px' : '10px 18px',
        display: 'flex',
        alignItems: isMobile ? 'stretch' : 'center',
        justifyContent: 'space-between',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? '8px' : '12px',
        flexShrink: 0,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
        zIndex: 20
      }}>
        {/* Row 1 on mobile: Branding & Grounding Badges */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: isMobile ? '32px' : '38px',
              height: isMobile ? '32px' : '38px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #0284c7 0%, #6366f1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 0 14px rgba(14, 165, 233, 0.45)',
              flexShrink: 0
            }}>
              <Bot size={isMobile ? 18 : 22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <h1 style={{ fontSize: isMobile ? '0.98rem' : '1.1rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: '#ffffff' }}>
                  EquipFix<span style={{ color: '#38bdf8' }}>AI</span> Copilot
                </h1>
                <span style={{
                  fontSize: '0.6rem',
                  fontWeight: 800,
                  backgroundColor: 'rgba(56, 189, 248, 0.15)',
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.4)',
                  padding: '1px 6px',
                  borderRadius: '10px'
                }}>
                  RAG
                </span>
                {!isMobile && (
                  <span style={{
                    fontSize: '0.62rem',
                    fontWeight: 800,
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    color: '#34d399',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    padding: '2px 7px',
                    borderRadius: '10px'
                  }}>
                    OSHA 1910.147
                  </span>
                )}
              </div>
              {!isMobile && (
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '1px' }}>
                  Industrial Reliability Diagnostics • Multimodal Vision • Real-Time Telemetry
                </div>
              )}
            </div>
          </div>

          {/* Machine State Pill on mobile row 1 */}
          {isMobile && selectedMachine && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '2px 8px',
              borderRadius: '14px',
              fontSize: '0.68rem',
              fontWeight: 800,
              backgroundColor: selectedMachine.status === 'RUNNING'
                ? 'rgba(16, 185, 129, 0.15)'
                : 'rgba(245, 158, 11, 0.15)',
              color: selectedMachine.status === 'RUNNING' ? '#34d399' : '#fbbf24',
              border: '1px solid rgba(56, 189, 248, 0.3)'
            }}>
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: selectedMachine.status === 'RUNNING' ? '#10b981' : '#f59e0b'
              }} />
              <span>{selectedMachine.machine_code}</span>
            </div>
          )}
        </div>

        {/* Center: Target Asset Context Selector */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? '6px' : '10px',
          flexWrap: isMobile ? 'nowrap' : 'wrap',
          width: isMobile ? '100%' : 'auto'
        }}>
          {/* Machine Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: isMobile ? '1' : undefined, minWidth: 0 }}>
            {!isMobile && <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Asset:</span>}
            <select
              value={selectedMachineId}
              onChange={(e) => handleMachineChange(e.target.value)}
              style={{
                fontSize: isMobile ? '14px' : '0.82rem',
                fontWeight: 700,
                padding: isMobile ? '6px 8px' : '6px 12px',
                backgroundColor: '#030712',
                color: '#ffffff',
                border: '1px solid #334155',
                borderRadius: '8px',
                outline: 'none',
                width: isMobile ? '100%' : 'auto',
                minWidth: isMobile ? '0' : '220px',
                cursor: 'pointer'
              }}
            >
              {machines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.machine_code} — {m.name} {isMobile ? '' : `(${m.status})`}
                </option>
              ))}
            </select>
          </div>

          {/* Work Order Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: isMobile ? '1' : undefined, minWidth: 0 }}>
            {!isMobile && <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>WO:</span>}
            <select
              value={selectedWOId}
              onChange={(e) => setSelectedWOId(e.target.value)}
              style={{
                fontSize: isMobile ? '14px' : '0.82rem',
                fontWeight: 600,
                padding: isMobile ? '6px 8px' : '6px 12px',
                backgroundColor: '#030712',
                color: '#ffffff',
                border: '1px solid #334155',
                borderRadius: '8px',
                outline: 'none',
                width: isMobile ? '100%' : 'auto',
                minWidth: isMobile ? '0' : '160px',
                cursor: 'pointer'
              }}
            >
              <option value="">{isMobile ? 'General WO' : 'General Fleet Diagnosis'}</option>
              {activeWorkOrdersForMachine.map((wo) => (
                <option key={wo.id} value={wo.id}>
                  {wo.work_order_number} ({wo.priority})
                </option>
              ))}
            </select>
          </div>

          {/* Machine State Pill (Desktop only) */}
          {!isMobile && selectedMachine && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '0.72rem',
              fontWeight: 800,
              backgroundColor: selectedMachine.status === 'RUNNING'
                ? 'rgba(16, 185, 129, 0.15)'
                : selectedMachine.status === 'WARNING'
                  ? 'rgba(245, 158, 11, 0.15)'
                  : 'rgba(239, 68, 68, 0.15)',
              color: selectedMachine.status === 'RUNNING'
                ? '#34d399'
                : selectedMachine.status === 'WARNING'
                  ? '#fbbf24'
                  : '#f87171',
              border: `1px solid ${
                selectedMachine.status === 'RUNNING'
                  ? 'rgba(16, 185, 129, 0.4)'
                  : selectedMachine.status === 'WARNING'
                    ? 'rgba(245, 158, 11, 0.4)'
                    : 'rgba(239, 68, 68, 0.4)'
              }`
            }}>
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: selectedMachine.status === 'RUNNING' ? '#10b981' : '#f59e0b',
                boxShadow: `0 0 6px ${selectedMachine.status === 'RUNNING' ? '#10b981' : '#f59e0b'}`
              }} />
              <span>{selectedMachine.status}</span>
              <span style={{ color: '#64748b' }}>•</span>
              <span style={{ color: '#cbd5e1' }}>{selectedMachine.location || 'Bay 1'}</span>
            </div>
          )}
        </div>

        {/* Mode Navigation Switcher */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: '#030712',
          padding: '2px',
          borderRadius: '10px',
          border: '1px solid #1e293b',
          overflowX: isMobile ? 'auto' : 'visible',
          whiteSpace: 'nowrap',
          WebkitOverflowScrolling: 'touch',
          width: isMobile ? '100%' : 'auto'
        }}>
          <button
            type="button"
            onClick={() => setActiveView('CHAT')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: isMobile ? '6px 10px' : '6px 12px',
              borderRadius: '7px',
              border: 'none',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              flex: isMobile ? '1' : undefined,
              justifyContent: 'center',
              backgroundColor: activeView === 'CHAT' ? '#0284c7' : 'transparent',
              color: activeView === 'CHAT' ? '#ffffff' : '#94a3b8',
              transition: 'all 0.15s ease'
            }}
          >
            <MessageSquare size={13} />
            <span>Chat</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('DB_TOOLS')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: isMobile ? '6px 10px' : '6px 12px',
              borderRadius: '7px',
              border: 'none',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              flex: isMobile ? '1' : undefined,
              justifyContent: 'center',
              backgroundColor: activeView === 'DB_TOOLS' ? '#0284c7' : 'transparent',
              color: activeView === 'DB_TOOLS' ? '#ffffff' : '#94a3b8',
              transition: 'all 0.15s ease'
            }}
          >
            <Database size={13} />
            <span>DB Tools</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('VISION')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: isMobile ? '6px 10px' : '6px 12px',
              borderRadius: '7px',
              border: 'none',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              flex: isMobile ? '1' : undefined,
              justifyContent: 'center',
              backgroundColor: activeView === 'VISION' ? '#0284c7' : 'transparent',
              color: activeView === 'VISION' ? '#ffffff' : '#94a3b8',
              transition: 'all 0.15s ease'
            }}
          >
            <Eye size={13} />
            <span>Vision</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('IMAGE_GEN')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: isMobile ? '6px 10px' : '6px 12px',
              borderRadius: '7px',
              border: 'none',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              flex: isMobile ? '1' : undefined,
              justifyContent: 'center',
              backgroundColor: activeView === 'IMAGE_GEN' ? '#0284c7' : 'transparent',
              color: activeView === 'IMAGE_GEN' ? '#ffffff' : '#94a3b8',
              transition: 'all 0.15s ease'
            }}
          >
            <Palette size={13} />
            <span>CAD</span>
          </button>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          2. MAIN WORKSPACE CONTAINER (FLEX: 1, ZERO WINDOW JUMP)
          ───────────────────────────────────────────────────────────── */}
      <main style={{
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }}>
        {/* VIEW 1: COPILOT CHAT / VISION / IMAGE_GEN (AITroubleshootingPanel) */}
        {activeView !== 'DB_TOOLS' && (
          <div style={{ flex: 1, minHeight: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <AITroubleshootingPanel
              machineId={selectedMachine?.id}
              workOrderId={selectedWOId ? parseInt(selectedWOId) : null}
              machineCode={selectedMachine?.machine_code}
              incidentSummary={selectedWorkOrder?.incident?.description || ''}
              hideTopHeader={true}
              customHeight="100%"
              onMachineChange={handleMachineChange}
              externalTab={activeView === 'CHAT' ? 'DIAGNOSTICS' : activeView}
              onTabChange={(tab) => {
                if (tab === 'DIAGNOSTICS') setActiveView('CHAT');
                else setActiveView(tab);
              }}
            />
          </div>
        )}

        {/* VIEW 2: DIRECT RELATIONAL DATABASE TOOLS CONSOLE */}
        {activeView === 'DB_TOOLS' && (
          <div style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px'
          }}>
            {/* Header Action Banner */}
            <div style={{
              backgroundColor: '#070d1e',
              border: '1px solid #1e3a8a',
              borderRadius: '12px',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '14px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Database size={18} color="#38bdf8" />
                  <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
                    Authoritative Database Inspection Engine
                  </h2>
                </div>
                <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '4px 0 0 0' }}>
                  Inspect real-time telemetry, open alarms, spare inventory, and repair history directly from PostgreSQL records.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={handleRunAllDiagnosticTools}
                  disabled={Object.values(dbToolLoading).some(Boolean)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                    color: '#ffffff',
                    border: '1px solid rgba(56, 189, 248, 0.4)',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 0 14px rgba(14, 165, 233, 0.3)'
                  }}
                >
                  <RefreshCw size={14} className={Object.values(dbToolLoading).some(Boolean) ? 'spin' : ''} />
                  <span>Refresh All Queries</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveView('CHAT')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    backgroundColor: '#0f172a',
                    color: '#38bdf8',
                    border: '1px solid #1e3a8a',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <Sparkles size={14} color="#38bdf8" />
                  <span>Open in Copilot Chat</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>

            {/* 4-Panel Database Diagnostics Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
              gap: '16px'
            }}>
              {/* Card 1: Machine Telemetry & Operational State */}
              <div style={{
                backgroundColor: '#070d1e',
                border: '1px solid #1e3a8a',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: '0 4px 14px rgba(0,0,0,0.3)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Activity size={16} color="#38bdf8" />
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#f8fafc' }}>
                      1. Machine Telemetry &amp; Specs
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRunTool('status', 'get_machine_status', { identifier: selectedMachine?.machine_code })}
                    disabled={dbToolLoading.status}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#38bdf8',
                      cursor: 'pointer',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <RefreshCw size={12} className={dbToolLoading.status ? 'spin' : ''} />
                    <span>Run Query</span>
                  </button>
                </div>

                {dbToolLoading.status ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
                    <RefreshCw size={18} className="spin" style={{ margin: '0 auto 8px auto' }} />
                    Querying machine telemetry from database...
                  </div>
                ) : dbToolErrors.status ? (
                  <div style={{ color: '#f87171', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle size={15} />
                    <span>{dbToolErrors.status}</span>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div style={{ backgroundColor: '#030712', padding: '10px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                      <span style={{ fontSize: '0.67rem', color: '#94a3b8', textTransform: 'uppercase' }}>Identifier</span>
                      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#38bdf8', marginTop: '2px' }}>
                        {selectedMachine?.machine_code || 'N/A'}
                      </div>
                    </div>
                    <div style={{ backgroundColor: '#030712', padding: '10px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                      <span style={{ fontSize: '0.67rem', color: '#94a3b8', textTransform: 'uppercase' }}>Operating Status</span>
                      <div style={{
                        fontSize: '0.9rem',
                        fontWeight: 800,
                        color: selectedMachine?.status === 'RUNNING' ? '#34d399' : selectedMachine?.status === 'WARNING' ? '#fbbf24' : '#f87171',
                        marginTop: '2px'
                      }}>
                        {selectedMachine?.status || 'UNKNOWN'}
                      </div>
                    </div>
                    <div style={{ backgroundColor: '#030712', padding: '10px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                      <span style={{ fontSize: '0.67rem', color: '#94a3b8', textTransform: 'uppercase' }}>Department</span>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc', marginTop: '2px' }}>
                        {selectedMachine?.department || 'Production'}
                      </div>
                    </div>
                    <div style={{ backgroundColor: '#030712', padding: '10px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                      <span style={{ fontSize: '0.67rem', color: '#94a3b8', textTransform: 'uppercase' }}>Bay Location</span>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc', marginTop: '2px' }}>
                        {selectedMachine?.location || 'Bay 1'}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Card 2: Active Alarms & Open Incidents */}
              <div style={{
                backgroundColor: '#070d1e',
                border: '1px solid #1e3a8a',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: '0 4px 14px rgba(0,0,0,0.3)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertTriangle size={16} color="#f59e0b" />
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#f8fafc' }}>
                      2. Active Alarms &amp; Incidents
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRunTool('incidents', 'get_open_incidents', { machine_id: selectedMachine?.id })}
                    disabled={dbToolLoading.incidents}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#f59e0b',
                      cursor: 'pointer',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <RefreshCw size={12} className={dbToolLoading.incidents ? 'spin' : ''} />
                    <span>Run Query</span>
                  </button>
                </div>

                {dbToolLoading.incidents ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
                    <RefreshCw size={18} className="spin" style={{ margin: '0 auto 8px auto' }} />
                    Scanning active incident tickets...
                  </div>
                ) : dbToolErrors.incidents ? (
                  <div style={{ color: '#f87171', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle size={15} />
                    <span>{dbToolErrors.incidents}</span>
                  </div>
                ) : (() => {
                  const incs = Array.isArray(dbToolData.incidents)
                    ? dbToolData.incidents
                    : (dbToolData.incidents?.incidents || []);
                  if (incs.length === 0) {
                    return (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#34d399', backgroundColor: 'rgba(16, 185, 129, 0.08)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                        <CheckCircle2 size={24} style={{ margin: '0 auto 6px auto', display: 'block' }} />
                        <strong style={{ fontSize: '0.82rem' }}>Zero Active Alarms</strong>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>Asset operating within standard parameters.</div>
                      </div>
                    );
                  }
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                      {incs.map((inc, i) => (
                        <div key={i} style={{ backgroundColor: '#030712', padding: '10px 12px', borderRadius: '8px', border: '1px solid #334155' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 800, color: '#f87171', fontSize: '0.8rem' }}>{inc.incident_number || `INC-${inc.id || i + 1}`}</span>
                            <span style={{ fontSize: '0.65rem', backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#f87171', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
                              {inc.priority || 'HIGH'}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#cbd5e1', marginTop: '4px' }}>{inc.description || 'Active alarm logged'}</div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Card 3: Spare Parts Inventory */}
              <div style={{
                backgroundColor: '#070d1e',
                border: '1px solid #1e3a8a',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: '0 4px 14px rgba(0,0,0,0.3)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Package size={16} color="#10b981" />
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#f8fafc' }}>
                      3. Compatible Spare Parts Stock
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRunTool('parts', 'get_parts_inventory', { search: selectedMachine?.type })}
                    disabled={dbToolLoading.parts}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#10b981',
                      cursor: 'pointer',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <RefreshCw size={12} className={dbToolLoading.parts ? 'spin' : ''} />
                    <span>Run Query</span>
                  </button>
                </div>

                {dbToolLoading.parts ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
                    <RefreshCw size={18} className="spin" style={{ margin: '0 auto 8px auto' }} />
                    Querying warehouse inventory...
                  </div>
                ) : dbToolErrors.parts ? (
                  <div style={{ color: '#f87171', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle size={15} />
                    <span>{dbToolErrors.parts}</span>
                  </div>
                ) : (() => {
                  const parts = Array.isArray(dbToolData.parts)
                    ? dbToolData.parts
                    : (dbToolData.parts?.parts || []);
                  if (parts.length === 0) {
                    return (
                      <div style={{ padding: '16px', color: '#94a3b8', fontSize: '0.78rem', textAlign: 'center' }}>
                        No spare parts catalog matching this machine type found in stock.
                      </div>
                    );
                  }
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                      {parts.slice(0, 5).map((p, i) => (
                        <div key={i} style={{ backgroundColor: '#030712', padding: '8px 12px', borderRadius: '8px', border: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <span style={{ fontSize: '0.68rem', color: '#38bdf8', fontWeight: 800 }}>{p.part_number}</span>
                            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f8fafc' }}>{p.name}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: p.quantity <= (p.min_quantity || 2) ? '#f87171' : '#34d399' }}>
                              {p.quantity} {p.unit || 'units'}
                            </span>
                            <div style={{ fontSize: '0.68rem', color: '#64748b' }}>${parseFloat(p.unit_cost || 0).toFixed(2)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Card 4: Historical Verified Repairs */}
              <div style={{
                backgroundColor: '#070d1e',
                border: '1px solid #1e3a8a',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: '0 4px 14px rgba(0,0,0,0.3)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <History size={16} color="#8b5cf6" />
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#f8fafc' }}>
                      4. Historical Verified Repairs
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRunTool('history', 'get_machine_history', { machine_id: selectedMachine?.id, limit: 5 })}
                    disabled={dbToolLoading.history}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#8b5cf6',
                      cursor: 'pointer',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <RefreshCw size={12} className={dbToolLoading.history ? 'spin' : ''} />
                    <span>Run Query</span>
                  </button>
                </div>

                {dbToolLoading.history ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
                    <RefreshCw size={18} className="spin" style={{ margin: '0 auto 8px auto' }} />
                    Retrieving verified repair logs...
                  </div>
                ) : dbToolErrors.history ? (
                  <div style={{ color: '#f87171', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle size={15} />
                    <span>{dbToolErrors.history}</span>
                  </div>
                ) : (() => {
                  const records = Array.isArray(dbToolData.history)
                    ? dbToolData.history
                    : (dbToolData.history?.history || dbToolData.history?.records || []);
                  if (records.length === 0) {
                    return (
                      <div style={{ padding: '16px', color: '#94a3b8', fontSize: '0.78rem', textAlign: 'center' }}>
                        No past verified repair tickets logged for this machine.
                      </div>
                    );
                  }
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                      {records.slice(0, 4).map((rec, i) => (
                        <div key={i} style={{ backgroundColor: '#030712', padding: '10px 12px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                            <strong style={{ color: '#38bdf8', fontSize: '0.78rem' }}>
                              {rec.problem_summary || rec.work_order_number || `Repair #${i + 1}`}
                            </strong>
                            <span style={{ fontSize: '0.65rem', color: '#34d399', fontWeight: 700 }}>
                              {rec.approval_status || 'VERIFIED'}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8', lineHeight: 1.4 }}>
                            {rec.root_cause || rec.resolution_notes || 'Standard overhaul completed.'}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AIAssistantPage;
