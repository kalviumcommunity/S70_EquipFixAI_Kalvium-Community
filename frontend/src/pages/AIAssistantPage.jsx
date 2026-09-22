import React, { useState, useEffect } from 'react';
import { machinesApi, workOrdersApi, aiApi } from '../services/api';
import { AITroubleshootingPanel } from '../components/ai/AITroubleshootingPanel';
import {
  Sparkles, Bot, Wrench, Shield, Database,
  Cpu, Activity, CheckCircle2, Search, ArrowRight
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [machRes, woRes] = await Promise.all([
          machinesApi.list(),
          workOrdersApi.list()
        ]);
        setMachines(machRes.data);
        setWorkOrders(woRes.data);
        if (machRes.data.length > 0) {
          setSelectedMachineId(String(machRes.data[0].id));
          setSelectedMachine(machRes.data[0]);
        }
      } catch (err) {
        console.error('Failed to load assets', err);
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
  };

  const handleRunDiagnosticTool = async (toolName, params) => {
    setRunningTool(true);
    setToolResults(null);
    try {
      const res = await aiApi.executeTool({ tool_name: toolName, parameters: params });
      setToolResults({ tool: toolName, data: res.data.result });
    } catch (err) {
      setToolResults({ tool: toolName, error: err.response?.data?.detail || 'Execution failed.' });
    } finally {
      setRunningTool(false);
    }
  };

  const activeWorkOrdersForMachine = workOrders.filter(
    (wo) => selectedMachineId && String(wo.machine_id) === String(selectedMachineId)
  );

  return (
    <div>
      {/* Page Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <div style={{
            backgroundColor: '#0f172a',
            color: '#38bdf8',
            padding: '8px',
            borderRadius: '8px',
            display: 'flex'
          }}>
            <Bot size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              EquipFixAI Diagnostic & RAG Troubleshooting Engine
            </h1>
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '2px 0 0 0' }}>
              Multi-source grounded reasoning engine combining equipment manuals, safety SOPs, verified repair history, and real-time database facts.
            </p>
          </div>
        </div>
      </div>

      {/* RAG Knowledge Architecture Status Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Database size={16} color="#0284c7" />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              Vector Knowledge Base
            </span>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
            Relational Cosine Index
          </div>
          <div style={{ fontSize: '0.725rem', color: '#059669', marginTop: '4px', fontWeight: 600 }}>
            ✓ 384-Dim Normalized Dense Embeddings
          </div>
        </div>

        <div className="card" style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Shield size={16} color="#d97706" />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              Safety Prioritization
            </span>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
            LOTO (SP-12) & OSHA
          </div>
          <div style={{ fontSize: '0.725rem', color: '#b45309', marginTop: '4px', fontWeight: 600 }}>
            ⚠️ +0.15 Safety Boost Over Manuals
          </div>
        </div>

        <div className="card" style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <CheckCircle2 size={16} color="#16a34a" />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              Approval Verification
            </span>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
            Supervisor-Approved Only
          </div>
          <div style={{ fontSize: '0.725rem', color: '#15803d', marginTop: '4px', fontWeight: 600 }}>
            ✓ Draft/Pending Records Excluded
          </div>
        </div>

        <div className="card" style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Cpu size={16} color="#7c3aed" />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              PostgreSQL Tools Layer
            </span>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
            Fact Direct Query
          </div>
          <div style={{ fontSize: '0.725rem', color: '#7c3aed', marginTop: '4px', fontWeight: 600 }}>
            ⚡ Zero Hallucination Machine Status
          </div>
        </div>
      </div>

      {/* Main Grid: Left Context Selector & Diagnostics, Right AI Interactive Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '24px' }}>
        {/* Left Column: Context Binding & Direct Tool Runner */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Target Asset Selection Card */}
          <div className="card">
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>
              Operational Asset Context
            </h3>

            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="form-label" style={{ fontSize: '0.75rem' }}>Selected Machine</label>
              <select
                className="form-select"
                value={selectedMachineId}
                onChange={(e) => handleMachineChange(e.target.value)}
                style={{ fontSize: '0.8rem' }}
              >
                {machines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.machine_code} — {m.name} ({m.status})
                  </option>
                ))}
              </select>
            </div>

            {selectedMachine && (
              <div style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '10px 12px',
                fontSize: '0.75rem',
                color: '#334155',
                marginBottom: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>Type / Department:</span>
                  <strong>{selectedMachine.type} / {selectedMachine.department}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>Location:</span>
                  <strong>{selectedMachine.location}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Operational Status:</span>
                  <span className={`badge badge-${selectedMachine.status.toLowerCase()}`}>
                    {selectedMachine.status}
                  </span>
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.75rem' }}>Active Work Order (Optional)</label>
              <select
                className="form-select"
                value={selectedWOId}
                onChange={(e) => setSelectedWOId(e.target.value)}
                style={{ fontSize: '0.8rem' }}
              >
                <option value="">None (General Machine Query)</option>
                {activeWorkOrdersForMachine.map((wo) => (
                  <option key={wo.id} value={wo.id}>
                    {wo.work_order_number} ({wo.priority} - {wo.status})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Direct PostgreSQL Diagnostic Tools Card */}
          <div className="card">
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
              Structured Database Tools
            </h3>
            <p style={{ fontSize: '0.725rem', color: '#64748b', marginBottom: '12px' }}>
              Query authoritative relational tables directly without vector approximation.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={runningTool || !selectedMachine}
                onClick={() => handleRunDiagnosticTool('get_machine_status', { identifier: selectedMachine?.machine_code })}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span>📊 Inspect Machine Status</span>
                <ArrowRight size={14} />
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={runningTool || !selectedMachine}
                onClick={() => handleRunDiagnosticTool('get_machine_history', { machine_id: selectedMachine?.id, limit: 5 })}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span>📜 Historical Verified Repairs</span>
                <ArrowRight size={14} />
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={runningTool}
                onClick={() => handleRunDiagnosticTool('get_open_incidents', { machine_id: selectedMachine?.id })}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span>🚨 Active Machine Alarms</span>
                <ArrowRight size={14} />
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={runningTool}
                onClick={() => handleRunDiagnosticTool('get_parts_inventory', { search: selectedMachine?.type })}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span>📦 Compatible Spare Parts Stock</span>
                <ArrowRight size={14} />
              </button>
            </div>

            {/* Diagnostic Tool Results Modal / Display */}
            {toolResults && (
              <div style={{
                marginTop: '14px',
                backgroundColor: '#0f172a',
                color: '#f8fafc',
                borderRadius: '6px',
                padding: '10px 12px',
                fontSize: '0.7rem',
                maxHeight: '220px',
                overflowY: 'auto'
              }}>
                <div style={{ color: '#38bdf8', fontWeight: 700, marginBottom: '4px' }}>
                  Tool Output: {toolResults.tool}
                </div>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                  {JSON.stringify(toolResults.data || toolResults.error, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Interactive RAG Troubleshooting Assistant */}
        <div>
          <AITroubleshootingPanel
            machineId={selectedMachine?.id}
            workOrderId={selectedWOId ? parseInt(selectedWOId) : null}
            machineCode={selectedMachine?.machine_code}
            incidentSummary={
              selectedWOId
                ? workOrders.find((w) => String(w.id) === String(selectedWOId))?.incident?.description
                : ''
            }
          />
        </div>
      </div>
    </div>
  );
};
