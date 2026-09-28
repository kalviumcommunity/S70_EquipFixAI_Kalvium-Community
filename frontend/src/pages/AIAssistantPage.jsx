import React, { useState, useEffect } from 'react';
import { machinesApi, workOrdersApi, aiApi } from '../services/api';
import { AITroubleshootingPanel } from '../components/ai/AITroubleshootingPanel';
import {
  Sparkles, Bot, Wrench, Shield, Database,
  Cpu, Activity, CheckCircle2, Search, ArrowRight,
  AlertTriangle, Package, History, Info, X, Zap, RefreshCw
} from 'lucide-react';

export const AIAssistantPage = () => {
  const [machines, setMachines] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [selectedMachineId, setSelectedMachineId] = useState('');
  const [selectedWOId, setSelectedWOId] = useState('');
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [loading, setLoading] = useState(true);

  // Structured diagnostic tool testing
  const [toolResults, setToolResults] = useState(null);
  const [runningTool, setRunningTool] = useState(false);
  const [activeToolName, setActiveToolName] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [machRes, woRes] = await Promise.all([
          machinesApi.list(),
          workOrdersApi.list()
        ]);
        setMachines(machRes.data || []);
        setWorkOrders(woRes.data || []);
        if (machRes.data && machRes.data.length > 0) {
          setSelectedMachineId(String(machRes.data[0].id));
          setSelectedMachine(machRes.data[0]);
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
    setToolResults(null);
  };

  const handleRunDiagnosticTool = async (toolName, params, label) => {
    setRunningTool(true);
    setActiveToolName(toolName);
    setToolResults(null);
    try {
      const res = await aiApi.executeTool({ tool_name: toolName, parameters: params });
      setToolResults({ tool: toolName, label, data: res.data.result });
    } catch (err) {
      setToolResults({ tool: toolName, label, error: err.response?.data?.detail || 'Execution failed.' });
    } finally {
      setRunningTool(false);
      setActiveToolName(null);
    }
  };

  const activeWorkOrdersForMachine = workOrders.filter(
    (wo) => selectedMachineId && String(wo.machine_id) === String(selectedMachineId)
  );

  const selectedWorkOrder = workOrders.find((w) => String(w.id) === String(selectedWOId));

  // Render nicely formatted diagnostic tool cards instead of raw JSON dump
  const renderDiagnosticData = (results) => {
    if (!results) return null;
    const { tool, label, data, error } = results;

    if (error) {
      return (
        <div style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px', padding: '12px' }}>
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      );
    }

    if (!data) {
      return <div style={{ color: '#94a3b8', padding: '12px' }}>No records returned by database.</div>;
    }

    // Machine Status Result
    if (tool === 'get_machine_status') {
      const m = data;
      return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', padding: '8px 0' }}>
          <div style={{ backgroundColor: '#0f172a', padding: '10px 14px', borderRadius: '8px', border: '1px solid #1e293b' }}>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Machine Identifier</span>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#38bdf8', marginTop: '2px' }}>{m.machine_code || selectedMachine?.machine_code}</div>
          </div>
          <div style={{ backgroundColor: '#0f172a', padding: '10px 14px', borderRadius: '8px', border: '1px solid #1e293b' }}>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Operational State</span>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: m.status === 'RUNNING' ? '#34d399' : m.status === 'WARNING' ? '#fbbf24' : '#f87171', marginTop: '2px' }}>
              {m.status || selectedMachine?.status}
            </div>
          </div>
          <div style={{ backgroundColor: '#0f172a', padding: '10px 14px', borderRadius: '8px', border: '1px solid #1e293b' }}>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Department / Line</span>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#e2e8f0', marginTop: '2px' }}>{m.department || selectedMachine?.department}</div>
          </div>
          <div style={{ backgroundColor: '#0f172a', padding: '10px 14px', borderRadius: '8px', border: '1px solid #1e293b' }}>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Bay Location</span>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#e2e8f0', marginTop: '2px' }}>{m.location || selectedMachine?.location}</div>
          </div>
        </div>
      );
    }

    // Active Incidents / Alarms Result
    if (tool === 'get_open_incidents') {
      const incidents = Array.isArray(data) ? data : (data.incidents || []);
      if (incidents.length === 0) {
        return (
          <div style={{ padding: '14px', color: '#34d399', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} />
            <span>Zero active alarms or open incident tickets logged for this asset. Machine nominal.</span>
          </div>
        );
      }
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px 0' }}>
          {incidents.map((inc, i) => (
            <div key={i} style={{ backgroundColor: '#0f172a', padding: '10px 14px', borderRadius: '8px', border: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 800, color: '#f87171', fontSize: '0.85rem' }}>{inc.incident_number || `INC-#${inc.id || i + 1}`}</span>
                  <span style={{ fontSize: '0.7rem', backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#f87171', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                    {inc.priority || 'HIGH'}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#cbd5e1', marginTop: '4px' }}>{inc.description || 'Alarm state reported'}</div>
              </div>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{inc.status || 'OPEN'}</span>
            </div>
          ))}
        </div>
      );
    }

    // Historical Verified Repairs
    if (tool === 'get_machine_history') {
      const history = Array.isArray(data) ? data : (data.history || data.records || []);
      if (history.length === 0) {
        return <div style={{ padding: '14px', color: '#94a3b8' }}>No recorded historical repairs on file for this machine.</div>;
      }
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px 0' }}>
          {history.slice(0, 5).map((rec, i) => (
            <div key={i} style={{ backgroundColor: '#0f172a', padding: '10px 14px', borderRadius: '8px', border: '1px solid #1e293b' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <strong style={{ color: '#38bdf8', fontSize: '0.825rem' }}>{rec.problem_summary || rec.work_order_number || `Repair #${i + 1}`}</strong>
                <span style={{ fontSize: '0.7rem', color: '#34d399', fontWeight: 600 }}>{rec.approval_status || 'VERIFIED RESOLUTION'}</span>
              </div>
              <div style={{ fontSize: '0.775rem', color: '#94a3b8' }}>
                <strong>Root Cause:</strong> {rec.root_cause || rec.resolution_notes || 'Standard maintenance procedure applied.'}
              </div>
            </div>
          ))}
        </div>
      );
    }

    // Compatible Spare Parts Stock
    if (tool === 'get_parts_inventory') {
      const parts = Array.isArray(data) ? data : (data.parts || []);
      if (parts.length === 0) {
        return <div style={{ padding: '14px', color: '#94a3b8' }}>No spare parts matching this machine type found in plant stock.</div>;
      }
      return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', padding: '8px 0' }}>
          {parts.slice(0, 6).map((p, i) => (
            <div key={i} style={{ backgroundColor: '#0f172a', padding: '10px 12px', borderRadius: '8px', border: '1px solid #1e293b' }}>
              <div style={{ fontSize: '0.7rem', color: '#38bdf8', fontWeight: 700 }}>{p.part_number}</div>
              <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#f8fafc', margin: '2px 0 4px 0' }}>{p.name}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.725rem', color: '#94a3b8' }}>
                <span>In Stock: <strong style={{ color: p.quantity <= (p.min_quantity || 2) ? '#f87171' : '#34d399' }}>{p.quantity} {p.unit || 'units'}</strong></span>
                <span>${parseFloat(p.unit_cost || 0).toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      );
    }

    // Generic fallback for any other tool
    return (
      <pre style={{ margin: 0, padding: '10px', backgroundColor: '#0f172a', color: '#38bdf8', borderRadius: '6px', fontSize: '0.75rem', overflowX: 'auto', fontFamily: 'monospace' }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    );
  };

  return (
    <div style={{ maxWidth: '1480px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* 1. Header & Live Intelligence Capabilities */}
      <div style={{
        backgroundColor: '#070c1a',
        border: '1px solid rgba(56, 189, 248, 0.25)',
        borderRadius: '14px',
        padding: '18px 24px',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #0284c7 0%, #6366f1 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 0 20px rgba(14, 165, 233, 0.5)'
          }}>
            <Bot size={26} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: '#ffffff' }}>
                EquipFixAI Copilot &amp; Diagnostic Engine
              </h1>
              <span style={{
                fontSize: '0.675rem',
                fontWeight: 700,
                backgroundColor: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                padding: '2px 8px',
                borderRadius: '12px',
                letterSpacing: '0.04em'
              }}>
                RAG + MULTIMODAL VISION
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '4px 0 0 0' }}>
              Grounded multi-source reasoning across OEM service manuals, verified repair records, OSHA 1910.147 LOTO protocols, and real-time machine telemetry.
            </p>
          </div>
        </div>

        {/* Compact capability indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            padding: '5px 10px',
            borderRadius: '20px',
            fontSize: '0.72rem',
            color: '#34d399',
            fontWeight: 700
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981', boxShadow: '0 0 8px #10b981' }} />
            Vector RAG Grounded
          </div>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'rgba(56, 189, 248, 0.12)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            padding: '5px 10px',
            borderRadius: '20px',
            fontSize: '0.72rem',
            color: '#38bdf8',
            fontWeight: 700
          }}>
            <Cpu size={12} />
            PostgreSQL Tools Layer
          </div>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'rgba(251, 191, 36, 0.12)',
            border: '1px solid rgba(251, 191, 36, 0.3)',
            padding: '5px 10px',
            borderRadius: '20px',
            fontSize: '0.72rem',
            color: '#fbbf24',
            fontWeight: 700
          }}>
            <Shield size={12} />
            OSHA LOTO Priority
          </div>
        </div>
      </div>

      {/* 2. Structured Asset Context & Live Telemetry Selector Bar */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '14px 18px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          {/* Machine & Work Order Selectors */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', flex: '1' }}>
            <div style={{ minWidth: '240px', flex: '1' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                Operational Asset Context
              </label>
              <select
                className="form-select"
                value={selectedMachineId}
                onChange={(e) => handleMachineChange(e.target.value)}
                style={{ fontSize: '0.85rem', fontWeight: 600, padding: '7px 12px' }}
              >
                {machines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.machine_code} — {m.name} ({m.status})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ minWidth: '240px', flex: '1' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                Active Work Order (Optional)
              </label>
              <select
                className="form-select"
                value={selectedWOId}
                onChange={(e) => setSelectedWOId(e.target.value)}
                style={{ fontSize: '0.85rem', padding: '7px 12px' }}
              >
                <option value="">None (General Asset Diagnostics)</option>
                {activeWorkOrdersForMachine.map((wo) => (
                  <option key={wo.id} value={wo.id}>
                    {wo.work_order_number} ({wo.priority} • {wo.status})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Machine Live Badge Pill */}
          {selectedMachine && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '6px 14px'
            }}>
              <div>
                <span style={{ fontSize: '0.675rem', color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Department</span>
                <strong style={{ fontSize: '0.825rem', color: '#0f172a' }}>{selectedMachine.department || 'Production'}</strong>
              </div>
              <div style={{ height: '24px', width: '1px', backgroundColor: '#e2e8f0' }} />
              <div>
                <span style={{ fontSize: '0.675rem', color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Bay Location</span>
                <strong style={{ fontSize: '0.825rem', color: '#0f172a' }}>{selectedMachine.location || 'Cell A'}</strong>
              </div>
              <div style={{ height: '24px', width: '1px', backgroundColor: '#e2e8f0' }} />
              <div>
                <span style={{ fontSize: '0.675rem', color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Live State</span>
                <span className={`badge badge-${(selectedMachine.status || 'RUNNING').toLowerCase()}`} style={{ fontSize: '0.725rem' }}>
                  {selectedMachine.status}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Structured Database Diagnostic Action Buttons */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          paddingTop: '8px',
          borderTop: '1px solid #f1f5f9'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Direct DB Tools:
            </span>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={runningTool || !selectedMachine}
              onClick={() => handleRunDiagnosticTool('get_machine_status', { identifier: selectedMachine?.machine_code }, 'Machine Telemetry & Specs')}
              style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Activity size={13} color="#0284c7" />
              <span>{activeToolName === 'get_machine_status' ? 'Inspecting...' : 'Machine Telemetry'}</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={runningTool}
              onClick={() => handleRunDiagnosticTool('get_open_incidents', { machine_id: selectedMachine?.id }, 'Active Alarms & Incidents')}
              style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <AlertTriangle size={13} color="#f59e0b" />
              <span>{activeToolName === 'get_open_incidents' ? 'Querying...' : 'Active Alarms'}</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={runningTool}
              onClick={() => handleRunDiagnosticTool('get_parts_inventory', { search: selectedMachine?.type }, 'Compatible Spare Parts Stock')}
              style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Package size={13} color="#10b981" />
              <span>{activeToolName === 'get_parts_inventory' ? 'Searching...' : 'Spare Parts Stock'}</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={runningTool || !selectedMachine}
              onClick={() => handleRunDiagnosticTool('get_machine_history', { machine_id: selectedMachine?.id, limit: 5 }, 'Historical Verified Repairs')}
              style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <History size={13} color="#8b5cf6" />
              <span>{activeToolName === 'get_machine_history' ? 'Retrieving...' : 'Historical Repairs'}</span>
            </button>
          </div>

          {selectedWorkOrder && (
            <div style={{ fontSize: '0.75rem', color: '#0284c7', backgroundColor: '#f0f9ff', padding: '3px 10px', borderRadius: '6px', border: '1px solid #bae6fd' }}>
              Targeting Work Order: <strong>{selectedWorkOrder.work_order_number}</strong>
            </div>
          )}
        </div>

        {/* 3. Formatted Diagnostic Tool Results Section */}
        {toolResults && (
          <div style={{
            backgroundColor: '#070c1a',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: '10px',
            padding: '14px 16px',
            marginTop: '4px',
            color: '#f8fafc',
            animation: 'fadeIn 0.2s ease-in'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '1px solid #1e293b', paddingBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={15} color="#38bdf8" />
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#38bdf8' }}>
                  Authoritative DB Query Output: {toolResults.label || toolResults.tool}
                </span>
                <span style={{ fontSize: '0.675rem', color: '#64748b' }}>• Real-time relational database record</span>
              </div>
              <button
                type="button"
                onClick={() => setToolResults(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="Dismiss"
              >
                <X size={16} />
              </button>
            </div>

            {renderDiagnosticData(toolResults)}
          </div>
        )}
      </div>

      {/* 4. Full-Width Responsive AI Copilot Interactive Panel */}
      <div style={{ minHeight: '680px' }}>
        <AITroubleshootingPanel
          machineId={selectedMachine?.id}
          workOrderId={selectedWOId ? parseInt(selectedWOId) : null}
          machineCode={selectedMachine?.machine_code}
          incidentSummary={
            selectedWorkOrder?.incident?.description || ''
          }
        />
      </div>
    </div>
  );
};
