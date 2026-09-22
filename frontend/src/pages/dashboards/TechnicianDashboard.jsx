import React, { useState, useEffect } from 'react';
import { workOrdersApi, partsApi, machinesApi } from '../../services/api';
import { useWebSocket } from '../../context/WebSocketContext';
import {
  Wrench, Play, CheckCircle2, Plus, Package, History,
  Sparkles, AlertCircle, Clock, FileText, Send, Zap, ShieldCheck, Activity
} from 'lucide-react';
import { AITroubleshootingPanel } from '../../components/ai/AITroubleshootingPanel';
import AICopilotPromptCard from '../../components/ai/AICopilotPromptCard';

export const TechnicianDashboard = () => {
  const { lastEvent, addToast } = useWebSocket();
  const [workOrders, setWorkOrders] = useState([]);
  const [selectedWO, setSelectedWO] = useState(null);
  const [machineHistory, setMachineHistory] = useState(null);
  const [spareParts, setSpareParts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Work Log form state
  const [logStep, setLogStep] = useState('');
  const [logAction, setLogAction] = useState('');
  const [submittingLog, setSubmittingLog] = useState(false);

  // Part Usage state
  const [selectedPartId, setSelectedPartId] = useState('');
  const [partQty, setPartQty] = useState(1);
  const [recordingPart, setRecordingPart] = useState(false);

  // Complete WO Modal State
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completionForm, setCompletionForm] = useState({
    problem_summary: '',
    troubleshooting_steps: '',
    root_cause: '',
    repair_action: '',
    downtime_minutes: 60,
    actual_hours: 2.0,
  });
  const [completing, setCompleting] = useState(false);

  const loadData = async () => {
    try {
      const [woRes, partsRes] = await Promise.all([
        workOrdersApi.list(),
        partsApi.list(),
      ]);
      setWorkOrders(woRes.data);
      setSpareParts(partsRes.data);
      if (partsRes.data.length > 0 && !selectedPartId) {
        setSelectedPartId(partsRes.data[0].id);
      }

      // If active work order exists, re-fetch its detail
      if (selectedWO) {
        const detail = await workOrdersApi.get(selectedWO.id);
        setSelectedWO(detail.data);
      } else if (woRes.data.length > 0) {
        // Default to first active work order
        const detail = await workOrdersApi.get(woRes.data[0].id);
        setSelectedWO(detail.data);
      }
    } catch (err) {
      console.error('Error loading technician data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [lastEvent]);

  // Load machine history when selected WO changes
  useEffect(() => {
    if (selectedWO?.machine_id) {
      machinesApi.getHistory(selectedWO.machine_id)
        .then((res) => setMachineHistory(res.data))
        .catch((err) => console.error(err));
    }
  }, [selectedWO?.id]);

  const selectWorkOrder = async (woId) => {
    try {
      const res = await workOrdersApi.get(woId);
      setSelectedWO(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartWork = async () => {
    if (!selectedWO) return;
    try {
      await workOrdersApi.updateStatus(selectedWO.id, {
        status: 'IN_PROGRESS',
        notes: 'Technician accepted job and initiated diagnostics.',
      });
      addToast('Work Started', `Work order ${selectedWO.work_order_number} is now in progress.`, 'info');
      selectWorkOrder(selectedWO.id);
    } catch (err) {
      addToast('Action Failed', err.response?.data?.detail || 'Failed to start work order.', 'error');
    }
  };

  const handleAddLog = async (e) => {
    e.preventDefault();
    if (!logStep || !logAction || !selectedWO) return;

    setSubmittingLog(true);
    try {
      await workOrdersApi.addLog(selectedWO.id, {
        step_description: logStep,
        action_taken: logAction,
        status_snapshot: selectedWO.status,
      });
      addToast('Log Recorded', 'Diagnostics log added.', 'success');
      setLogStep('');
      setLogAction('');
      selectWorkOrder(selectedWO.id);
    } catch (err) {
      addToast('Log Failed', err.response?.data?.detail || 'Failed to add log.', 'error');
    } finally {
      setSubmittingLog(false);
    }
  };

  const handleUsePart = async (e) => {
    e.preventDefault();
    if (!selectedPartId || partQty <= 0 || !selectedWO) return;

    setRecordingPart(true);
    try {
      await workOrdersApi.usePart(selectedWO.id, {
        part_id: parseInt(selectedPartId),
        quantity_used: parseInt(partQty),
      });
      addToast('Part Recorded', 'Inventory stock decremented.', 'success');
      setPartQty(1);
      // Reload parts and selected WO
      loadData();
    } catch (err) {
      addToast('Part Record Failed', err.response?.data?.detail || 'Failed to record part usage.', 'error');
    } finally {
      setRecordingPart(false);
    }
  };

  const handleCompleteWorkOrder = async (e) => {
    e.preventDefault();
    if (!selectedWO) return;

    setCompleting(true);
    try {
      await workOrdersApi.complete(selectedWO.id, completionForm);
      addToast('Work Order Completed', 'Submitted for supervisor review & approval.', 'success');
      setShowCompleteModal(false);
      loadData();
    } catch (err) {
      addToast('Completion Failed', err.response?.data?.detail || 'Failed to complete work order.', 'error');
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return <div className="page-body">Loading technician workspace...</div>;
  }

  const activeWorkOrders = workOrders.filter(w => !['APPROVED', 'CLOSED'].includes(w.status));
  const completedHistory = workOrders.filter(w => ['APPROVED', 'CLOSED'].includes(w.status));

  return (
    <div className="page-body">
      {/* Enterprise Industrial AI Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 className="page-title" style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>
              Technician Operations Center
            </h1>
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              backgroundColor: '#eff6ff',
              color: '#2563eb',
              border: '1px solid #bfdbfe',
              padding: '2px 8px',
              borderRadius: '12px'
            }}>
              FIELD RELIABILITY
            </span>
          </div>
          <p className="page-subtitle" style={{ fontSize: '0.95rem', color: 'var(--slate-500)', marginTop: '4px' }}>
            Source-grounded RAG troubleshooting, telemetry monitoring, parts allocation, and verified maintenance execution.
          </p>
        </div>

        {/* Primary Role CTA Button */}
        <button
          type="button"
          onClick={handleStartWork}
          disabled={!selectedWO || selectedWO.status === 'IN_PROGRESS'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '10px',
            background: selectedWO?.status === 'IN_PROGRESS'
              ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
              : 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
            color: '#ffffff',
            border: 'none',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: (!selectedWO || selectedWO.status === 'IN_PROGRESS') ? 'default' : 'pointer',
            boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
            opacity: (!selectedWO) ? 0.6 : 1
          }}
        >
          {selectedWO?.status === 'IN_PROGRESS' ? (
            <>
              <Activity size={16} />
              <span>Work Order #{selectedWO?.work_order_number} In Progress</span>
            </>
          ) : (
            <>
              <Play size={16} />
              <span>Start Work Order</span>
            </>
          )}
        </button>
      </div>

      {/* KPI Stats Metric Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '14px',
        marginBottom: '24px'
      }}>
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Active Assignments</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{activeWorkOrders.length}</div>
          <div style={{ fontSize: '0.7rem', color: '#0284c7', marginTop: '2px' }}>In your technician queue</div>
        </div>
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>In Progress</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#2563eb', marginTop: '4px' }}>
            {workOrders.filter(w => w.status === 'IN_PROGRESS').length}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>Diagnostics underway</div>
        </div>
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>First-Time Fix Rate</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#059669', marginTop: '4px' }}>94.2%</div>
          <div style={{ fontSize: '0.7rem', color: '#059669', marginTop: '2px' }}>+3.8% with AI guidance</div>
        </div>
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Mean Time to Repair</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#7c3aed', marginTop: '4px' }}>1.8 hrs</div>
          <div style={{ fontSize: '0.7rem', color: '#7c3aed', marginTop: '2px' }}>Target: &lt; 2.5 hrs</div>
        </div>
      </div>

      {/* Prominent AI Copilot Prompt Entry Card */}
      <AICopilotPromptCard
        defaultMachineCode={selectedWO?.machine?.machine_code || ''}
        title="EquipFix AI Diagnostics Copilot"
        subtitle="Search OEM manuals, safety SOPs, and past verified repair history to resolve work orders."
      />

      {/* Two Column Active Work Order Execution Workspace */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px' }}>
        {/* Left Column: Assigned Work Orders Queue */}
        <div>
          <div className="card" style={{ padding: '16px' }}>
            <div className="card-header" style={{ marginBottom: '12px' }}>
              <span className="card-title" style={{ fontSize: '0.95rem' }}>
                <Clock size={16} color="#2563eb" /> Active Assignments ({activeWorkOrders.length})
              </span>
            </div>

            {activeWorkOrders.length === 0 ? (
              <div style={{ padding: '24px 12px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                No active work orders assigned to you.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {activeWorkOrders.map((wo) => {
                  const isSelected = selectedWO?.id === wo.id;
                  return (
                    <div
                      key={wo.id}
                      onClick={() => selectWorkOrder(wo.id)}
                      style={{
                        padding: '12px',
                        borderRadius: '6px',
                        border: `1px solid ${isSelected ? '#2563eb' : '#e2e8f0'}`,
                        backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>
                          {wo.work_order_number}
                        </span>
                        <span className={`badge badge-${wo.status.toLowerCase()}`} style={{ fontSize: '0.65rem' }}>
                          {wo.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>
                        {wo.machine?.machine_code} — {wo.machine?.name}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.725rem', color: '#64748b' }}>
                        <span>Priority: <strong className={`badge badge-${wo.priority.toLowerCase()}`} style={{ fontSize: '0.6rem', padding: '1px 5px' }}>{wo.priority}</strong></span>
                        <span>Est: {wo.estimated_hours}h</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Active RAG Troubleshooting Engine Card */}
          <div className="card" style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Sparkles size={18} color="#16a34a" />
              <strong style={{ fontSize: '0.85rem', color: '#166534' }}>RAG Engine Active</strong>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#14532d', marginBottom: '10px' }}>
              Indexed equipment manuals, safety SOPs, and approved historical repair records are actively available.
            </p>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '6px',
              border: '1px solid #dcfce7',
              padding: '8px',
              fontSize: '0.725rem',
              color: '#15803d',
              fontWeight: 600
            }}>
              ⚡ Semantic cosine similarity + safety-first ranking enabled.
            </div>
          </div>
        </div>

        {/* Right Column: Active Work Order Execution Workspace */}
        {selectedWO ? (
          <div>
            <div className="card">
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                      {selectedWO.work_order_number}
                    </h2>
                    <span className={`badge badge-${selectedWO.status.toLowerCase()}`}>
                      {selectedWO.status}
                    </span>
                    <span className={`badge badge-${selectedWO.priority.toLowerCase()}`}>
                      {selectedWO.priority} Priority
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>
                    Machine: <strong>{selectedWO.machine?.machine_code}</strong> ({selectedWO.machine?.name}) — {selectedWO.machine?.location}
                  </div>
                </div>

                {/* Status action buttons */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  {selectedWO.status === 'ASSIGNED' && (
                    <button onClick={handleStartWork} className="btn btn-primary">
                      <Play size={16} /> Accept & Start Work
                    </button>
                  )}
                  {selectedWO.status === 'IN_PROGRESS' && (
                    <button
                      onClick={() => setShowCompleteModal(true)}
                      className="btn btn-success"
                    >
                      <CheckCircle2 size={16} /> Complete & Submit for Approval
                    </button>
                  )}
                </div>
              </div>

              {/* Problem Description Callout */}
              <div style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '12px 16px',
                marginBottom: '20px'
              }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Incident Description / Symptoms
                </div>
                <div style={{ fontSize: '0.875rem', color: '#1e293b' }}>
                  {selectedWO.incident?.description || selectedWO.notes || 'No description provided.'}
                </div>
              </div>

              {/* Phase 2: RAG AI Troubleshooting Engine Workspace */}
              <AITroubleshootingPanel
                machineId={selectedWO.machine_id}
                workOrderId={selectedWO.id}
                machineCode={selectedWO.machine?.machine_code}
                incidentSummary={selectedWO.incident?.description || selectedWO.notes}
                onCopyToLog={(step, action) => {
                  setLogStep(step);
                  setLogAction(action);
                }}
                onCopyToCompletion={(data) => {
                  setCompletionForm(prev => ({
                    ...prev,
                    root_cause: data.root_cause || prev.root_cause,
                    repair_action: data.repair_action || prev.repair_action,
                    troubleshooting_steps: data.troubleshooting_steps || prev.troubleshooting_steps
                  }));
                  setShowCompleteModal(true);
                }}
              />

              {/* 3-Tab Section: 1. Work Logs | 2. Parts Used | 3. Machine History */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                {/* Work Logs Section */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', backgroundColor: '#ffffff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <strong style={{ fontSize: '0.875rem', color: '#0f172a' }}>Troubleshooting & Work Logs</strong>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{selectedWO.logs?.length || 0} entries</span>
                  </div>

                  {/* Add log form */}
                  {selectedWO.status === 'IN_PROGRESS' && (
                    <form onSubmit={handleAddLog} style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <div className="form-group" style={{ marginBottom: '8px' }}>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Investigation step (e.g. Measured vibration)"
                          value={logStep}
                          onChange={(e) => setLogStep(e.target.value)}
                          required
                          style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: '8px' }}>
                        <textarea
                          className="form-textarea"
                          rows="2"
                          placeholder="Action taken / findings..."
                          value={logAction}
                          onChange={(e) => setLogAction(e.target.value)}
                          required
                          style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                        />
                      </div>
                      <button
                        type="submit"
                        className="btn btn-primary btn-sm"
                        disabled={submittingLog}
                      >
                        <Plus size={14} /> Add Work Log
                      </button>
                    </form>
                  )}

                  {/* Log list */}
                  <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {(!selectedWO.logs || selectedWO.logs.length === 0) ? (
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center', padding: '12px' }}>
                        No logs recorded yet.
                      </div>
                    ) : (
                      selectedWO.logs.map((log) => (
                        <div key={log.id} style={{ borderBottom: '1px solid #f1f5f9', padding: '8px 0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                            <strong style={{ color: '#1e293b' }}>{log.step_description}</strong>
                            <span style={{ color: '#94a3b8' }}>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p style={{ fontSize: '0.75rem', color: '#475569', margin: '4px 0 0 0' }}>{log.action_taken}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Spare Parts Usage Section */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', backgroundColor: '#ffffff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <strong style={{ fontSize: '0.875rem', color: '#0f172a' }}>Spare Parts Replaced</strong>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{selectedWO.parts_used?.length || 0} items</span>
                  </div>

                  {/* Record part form */}
                  {selectedWO.status === 'IN_PROGRESS' && (
                    <form onSubmit={handleUsePart} style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                        <select
                          className="form-select"
                          value={selectedPartId}
                          onChange={(e) => setSelectedPartId(e.target.value)}
                          style={{ fontSize: '0.8rem', padding: '6px 10px', flex: 2 }}
                        >
                          {spareParts.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.part_number}) — Stock: {p.quantity} (${p.unit_cost})
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          className="form-input"
                          min="1"
                          value={partQty}
                          onChange={(e) => setPartQty(e.target.value)}
                          style={{ fontSize: '0.8rem', padding: '6px 10px', flex: 1 }}
                        />
                      </div>
                      <button
                        type="submit"
                        className="btn btn-secondary btn-sm"
                        disabled={recordingPart}
                      >
                        <Package size={14} /> Record Part Used (Deduct Stock)
                      </button>
                    </form>
                  )}

                  {/* Parts used list */}
                  <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {(!selectedWO.parts_used || selectedWO.parts_used.length === 0) ? (
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center', padding: '12px' }}>
                        No spare parts recorded for this repair.
                      </div>
                    ) : (
                      selectedWO.parts_used.map((pu) => (
                        <div key={pu.id} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', padding: '6px 0', fontSize: '0.75rem' }}>
                          <span><strong>{pu.part?.name || 'Part'}</strong> ({pu.quantity_used} pcs)</span>
                          <span style={{ color: '#059669', fontWeight: 600 }}>${pu.total_cost}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Machine History Timeline */}
              {machineHistory && (
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', backgroundColor: '#f8fafc' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <History size={16} color="#475569" />
                    <strong style={{ fontSize: '0.85rem', color: '#1e293b' }}>
                      Historical Maintenance Records on {selectedWO.machine?.machine_code}
                    </strong>
                  </div>
                  {machineHistory.maintenance_records.length === 0 ? (
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>No prior maintenance history recorded for this machine.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {machineHistory.maintenance_records.slice(0, 3).map((rec) => (
                        <div key={rec.id} style={{ backgroundColor: 'white', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
                            <strong>Root Cause: {rec.root_cause}</strong>
                            <span style={{ color: '#64748b' }}>{new Date(rec.completion_time).toLocaleDateString()}</span>
                          </div>
                          <p style={{ fontSize: '0.75rem', color: '#475569', margin: 0 }}>
                            Repair Action: {rec.repair_action} (Downtime: {rec.downtime_minutes}m)
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', color: '#94a3b8' }}>
            Select a work order from the queue to start diagnostics.
          </div>
        )}
      </div>

      {/* Complete Work Order Modal */}
      {showCompleteModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <strong style={{ fontSize: '1rem', color: '#0f172a' }}>
                Complete Work Order & Submit Maintenance Record
              </strong>
              <button
                onClick={() => setShowCompleteModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleCompleteWorkOrder}>
              <div className="modal-body">
                <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '16px' }}>
                  Please summarize the failure diagnosis and repair. Once submitted, this record will be queued for Supervisor review and approval.
                </p>

                <div className="form-group">
                  <label className="form-label">Problem Summary *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Brief problem diagnosis..."
                    value={completionForm.problem_summary}
                    onChange={(e) => setCompletionForm({ ...completionForm, problem_summary: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Troubleshooting Steps Conducted *</label>
                  <textarea
                    className="form-textarea"
                    rows="2"
                    placeholder="Diagnostics, multimeter checks, dial runout..."
                    value={completionForm.troubleshooting_steps}
                    onChange={(e) => setCompletionForm({ ...completionForm, troubleshooting_steps: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Identified Root Cause *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Bearing race fatigue and loss of lubrication"
                    value={completionForm.root_cause}
                    onChange={(e) => setCompletionForm({ ...completionForm, root_cause: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Repair Action Taken *</label>
                  <textarea
                    className="form-textarea"
                    rows="2"
                    placeholder="Replaced bearing BRG-204, cleaned housing, calibrated runout..."
                    value={completionForm.repair_action}
                    onChange={(e) => setCompletionForm({ ...completionForm, repair_action: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Total Equipment Downtime (Minutes) *</label>
                    <input
                      type="number"
                      className="form-input"
                      min="0"
                      value={completionForm.downtime_minutes}
                      onChange={(e) => setCompletionForm({ ...completionForm, downtime_minutes: parseInt(e.target.value) || 0 })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Actual Labor Hours *</label>
                    <input
                      type="number"
                      step="0.25"
                      className="form-input"
                      min="0"
                      value={completionForm.actual_hours}
                      onChange={(e) => setCompletionForm({ ...completionForm, actual_hours: parseFloat(e.target.value) || 0 })}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCompleteModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-success"
                  disabled={completing}
                >
                  {completing ? 'Submitting...' : 'Submit for Supervisor Approval'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
