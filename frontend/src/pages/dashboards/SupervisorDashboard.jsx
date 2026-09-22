import React, { useState, useEffect } from 'react';
import {
  incidentsApi, maintenanceApi, usersApi, machinesApi
} from '../../services/api';
import { useWebSocket } from '../../context/WebSocketContext';
import {
  ShieldAlert, UserCheck, CheckCircle, Clock, Cpu,
  Calendar, AlertTriangle, ArrowRight, Check, X, Sparkles
} from 'lucide-react';
import AICopilotPromptCard from '../../components/ai/AICopilotPromptCard';

export const SupervisorDashboard = () => {
  const { lastEvent, addToast } = useWebSocket();
  const [incidents, setIncidents] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [machines, setMachines] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  // Assign Technician Modal State
  const [assignIncident, setAssignIncident] = useState(null);
  const [selectedTechId, setSelectedTechId] = useState('');
  const [assignPriority, setAssignPriority] = useState('HIGH');
  const [estHours, setEstHours] = useState(2.5);
  const [assignNotes, setAssignNotes] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Review & Approve Modal State
  const [reviewRecord, setReviewRecord] = useState(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [processingApproval, setProcessingApproval] = useState(false);

  const loadData = async () => {
    try {
      const [incRes, mrRes, techRes, machRes, schedRes] = await Promise.all([
        incidentsApi.list(),
        maintenanceApi.listRecords({ approval_status: 'PENDING' }),
        usersApi.list({ role_name: 'TECHNICIAN' }),
        machinesApi.list(),
        maintenanceApi.listSchedules(),
      ]);

      setIncidents(incRes.data);
      setPendingApprovals(mrRes.data);
      setTechnicians(techRes.data);
      setMachines(machRes.data);
      setSchedules(schedRes.data);

      if (techRes.data.length > 0 && !selectedTechId) {
        setSelectedTechId(techRes.data[0].id);
      }
    } catch (err) {
      console.error('Error loading supervisor dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [lastEvent]);

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!assignIncident || !selectedTechId) return;

    setAssigning(true);
    try {
      await incidentsApi.assign(assignIncident.id, {
        technician_id: parseInt(selectedTechId),
        priority: assignPriority,
        estimated_hours: parseFloat(estHours),
        supervisor_notes: assignNotes,
      });
      addToast('Technician Assigned', `Assigned technician to incident ${assignIncident.incident_number}.`, 'success');
      setAssignIncident(null);
      loadData();
    } catch (err) {
      addToast('Assignment Failed', err.response?.data?.detail || 'Failed to assign technician.', 'error');
    } finally {
      setAssigning(false);
    }
  };

  const handleApprovalAction = async (approved) => {
    if (!reviewRecord) return;
    setProcessingApproval(true);
    try {
      await maintenanceApi.processApproval(reviewRecord.id, {
        approved,
        supervisor_notes: approvalNotes || (approved ? 'Approved by supervisor' : 'Rejected for revisions'),
      });
      addToast(
        approved ? 'Maintenance Approved' : 'Maintenance Returned',
        approved
          ? `Machine ${reviewRecord.machine?.machine_code} restored to RUNNING status.`
          : 'Returned back to technician for rework.',
        approved ? 'success' : 'warning'
      );
      setReviewRecord(null);
      setApprovalNotes('');
      loadData();
    } catch (err) {
      addToast('Approval Failed', err.response?.data?.detail || 'Approval action failed.', 'error');
    } finally {
      setProcessingApproval(false);
    }
  };

  const handleTriggerSchedule = async (scheduleId) => {
    if (technicians.length === 0) return;
    try {
      const techId = technicians[0].id;
      await maintenanceApi.generateWO(scheduleId, techId);
      addToast('Work Order Generated', 'Preventive Maintenance Work Order created and dispatched.', 'success');
      loadData();
    } catch (err) {
      addToast('Dispatch Failed', err.response?.data?.detail || 'Failed to generate work order.', 'error');
    }
  };

  if (loading) {
    return <div className="page-body">Loading supervisor command center...</div>;
  }

  const activeIncidents = incidents.filter(i => !['RESOLVED', 'APPROVED', 'CLOSED'].includes(i.status));

  return (
    <div className="page-body">
      {/* Enterprise Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 className="page-title" style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>
              Supervisor Operations Center
            </h1>
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              backgroundColor: '#fef3c7',
              color: '#b45309',
              border: '1px solid #fde68a',
              padding: '2px 8px',
              borderRadius: '12px'
            }}>
              DISPATCH & APPROVALS
            </span>
          </div>
          <p className="page-subtitle" style={{ fontSize: '0.95rem', color: 'var(--slate-500)', marginTop: '4px' }}>
            Assign reported faults to technicians, review completed repair records, and oversee PM schedules.
          </p>
        </div>

        {/* Primary Role CTA Button */}
        <button
          type="button"
          onClick={() => {
            const el = document.getElementById('incident-queue-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
            color: '#ffffff',
            border: 'none',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)'
          }}
        >
          <UserCheck size={16} />
          <span>Review Operations</span>
        </button>
      </div>

      {/* Top Stat Row */}
      <div className="stat-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <div className="stat-val">{activeIncidents.length}</div>
            <div className="stat-lbl">Active Incidents</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#fff7ed', color: '#ea580c' }}>
            <Clock size={24} />
          </div>
          <div>
            <div className="stat-val">{pendingApprovals.length}</div>
            <div className="stat-lbl">Pending Approvals</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>
            <UserCheck size={24} />
          </div>
          <div>
            <div className="stat-val">{technicians.length}</div>
            <div className="stat-lbl">Active Technicians</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#f5f3ff', color: '#7c3aed' }}>
            <Calendar size={24} />
          </div>
          <div>
            <div className="stat-val">{schedules.length}</div>
            <div className="stat-lbl">Preventive Schedules</div>
          </div>
        </div>
      </div>

      {/* Prominent AI Copilot Prompt Entry Card */}
      <AICopilotPromptCard
        title="EquipFix AI Supervisor Copilot"
        subtitle="Analyze maintenance trends, review historical root causes, and verify technician procedure compliance."
      />

      <div id="incident-queue-section"></div>

      {/* Pending Approvals Banner / Queue */}
      {pendingApprovals.length > 0 && (
        <div className="card" style={{ borderLeft: '4px solid #ea580c', backgroundColor: '#fffbf5' }}>
          <div className="card-header" style={{ borderColor: '#fed7aa' }}>
            <span className="card-title" style={{ color: '#c2410c' }}>
              <ShieldAlert size={20} color="#ea580c" />
              Action Required: Pending Maintenance Approvals ({pendingApprovals.length})
            </span>
          </div>
          <p style={{ fontSize: '0.825rem', color: '#9a3412', marginBottom: '16px' }}>
            Technicians have completed repairs on the following equipment. Verify root causes and repair actions before restoring machines to RUNNING status.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
            {pendingApprovals.map((mr) => (
              <div
                key={mr.id}
                style={{
                  backgroundColor: 'white',
                  border: '1px solid #fed7aa',
                  borderRadius: '8px',
                  padding: '16px',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>
                    {mr.machine?.machine_code} ({mr.machine?.name})
                  </strong>
                  <span className="badge badge-pending">PENDING</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '6px' }}>
                  Repaired by: <strong>{mr.technician?.full_name}</strong> | Downtime: <strong>{mr.downtime_minutes} mins</strong>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#334155', marginBottom: '12px' }}>
                  <strong>Root Cause:</strong> {mr.root_cause}
                </div>
                <button
                  onClick={() => setReviewRecord(mr)}
                  className="btn btn-primary btn-sm"
                  style={{ width: '100%' }}
                >
                  Review Diagnosis & Approve <ArrowRight size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid: Active Incidents Queue & Technician Workload */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1.3fr', gap: '24px' }}>
        {/* Left: Active Incidents */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">
              <AlertTriangle size={18} color="#2563eb" /> Active Incidents & Triage ({activeIncidents.length})
            </span>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Incident</th>
                  <th>Machine</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Assigned Tech</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {activeIncidents.map((inc) => (
                  <tr key={inc.id}>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#2563eb' }}>
                        {inc.incident_number}
                      </span>
                    </td>
                    <td>
                      <strong>{inc.machine?.machine_code}</strong>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{inc.machine?.name}</div>
                    </td>
                    <td>
                      <span className={`badge badge-${inc.severity.toLowerCase()}`}>
                        {inc.severity}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${inc.status.toLowerCase()}`}>
                        {inc.status}
                      </span>
                    </td>
                    <td>
                      {inc.assigned_technician ? (
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>
                          {inc.assigned_technician.full_name}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600 }}>Unassigned</span>
                      )}
                    </td>
                    <td>
                      <button
                        onClick={() => {
                          setAssignIncident(inc);
                          setAssignPriority(inc.priority);
                        }}
                        className="btn btn-secondary btn-sm"
                      >
                        {inc.assigned_technician ? 'Reassign' : 'Assign Tech'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Technician Workload & Fleet Health */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Technicians Workload Table */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">
                <UserCheck size={18} color="#0f172a" /> Technician Workload
              </span>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Technician</th>
                    <th>Role</th>
                    <th>Availability</th>
                  </tr>
                </thead>
                <tbody>
                  {technicians.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <strong>{t.full_name}</strong>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{t.email}</div>
                      </td>
                      <td>
                        <span className="badge badge-open" style={{ fontSize: '0.65rem' }}>TECHNICIAN</span>
                      </td>
                      <td>
                        <span style={{ color: '#10b981', fontWeight: 600, fontSize: '0.8rem' }}>● Ready / On Duty</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Preventive Schedules */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">
                <Calendar size={18} color="#0f172a" /> Preventive Maintenance Schedules
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {schedules.map((s) => (
                <div
                  key={s.id}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    padding: '10px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '0.85rem' }}>{s.task_name}</strong>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {s.machine?.machine_code} • {s.frequency} (Due: {new Date(s.next_due_date).toLocaleDateString()})
                    </div>
                  </div>
                  <button
                    onClick={() => handleTriggerSchedule(s.id)}
                    className="btn btn-secondary btn-sm"
                  >
                    Generate WO
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Assign Technician Modal */}
      {assignIncident && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <strong style={{ fontSize: '1rem', color: '#0f172a' }}>
                Assign Technician to {assignIncident.incident_number}
              </strong>
              <button
                onClick={() => setAssignIncident(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleAssignSubmit}>
              <div className="modal-body">
                <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Machine: <strong>{assignIncident.machine?.machine_code} ({assignIncident.machine?.name})</strong></div>
                  <div style={{ fontSize: '0.85rem', color: '#1e293b', marginTop: '4px' }}>{assignIncident.description}</div>
                </div>

                <div className="form-group">
                  <label className="form-label">Select Technician *</label>
                  <select
                    className="form-select"
                    value={selectedTechId}
                    onChange={(e) => setSelectedTechId(e.target.value)}
                    required
                  >
                    {technicians.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.full_name} ({t.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Work Order Priority</label>
                    <select
                      className="form-select"
                      value={assignPriority}
                      onChange={(e) => setAssignPriority(e.target.value)}
                    >
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                      <option value="CRITICAL">CRITICAL</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Estimated Hours</label>
                    <input
                      type="number"
                      step="0.5"
                      className="form-input"
                      value={estHours}
                      onChange={(e) => setEstHours(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Supervisor Instructions / Notes</label>
                  <textarea
                    className="form-textarea"
                    rows="3"
                    placeholder="Instructions for technician (e.g. Check spindle bearing clearance and test run at 10k RPM)..."
                    value={assignNotes}
                    onChange={(e) => setAssignNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setAssignIncident(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={assigning}
                >
                  {assigning ? 'Assigning...' : 'Confirm Assignment & Create Work Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review & Approve Maintenance Modal */}
      {reviewRecord && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <strong style={{ fontSize: '1rem', color: '#0f172a' }}>
                Review Maintenance Record #{reviewRecord.id} — {reviewRecord.machine?.machine_code}
              </strong>
              <button
                onClick={() => setReviewRecord(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '6px' }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>Machine</span>
                  <div style={{ fontWeight: 700 }}>{reviewRecord.machine?.machine_code} ({reviewRecord.machine?.name})</div>
                </div>
                <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '6px' }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>Technician</span>
                  <div style={{ fontWeight: 700 }}>{reviewRecord.technician?.full_name}</div>
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <strong style={{ fontSize: '0.8rem', color: '#475569' }}>Problem Summary:</strong>
                <p style={{ fontSize: '0.85rem', color: '#1e293b', margin: '4px 0 0 0' }}>{reviewRecord.problem_summary}</p>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <strong style={{ fontSize: '0.8rem', color: '#475569' }}>Troubleshooting Conducted:</strong>
                <p style={{ fontSize: '0.85rem', color: '#1e293b', margin: '4px 0 0 0' }}>{reviewRecord.troubleshooting_steps}</p>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <strong style={{ fontSize: '0.8rem', color: '#475569' }}>Root Cause:</strong>
                <p style={{ fontSize: '0.85rem', color: '#1e293b', margin: '4px 0 0 0' }}>{reviewRecord.root_cause}</p>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <strong style={{ fontSize: '0.8rem', color: '#475569' }}>Repair Action Taken:</strong>
                <p style={{ fontSize: '0.85rem', color: '#1e293b', margin: '4px 0 0 0' }}>{reviewRecord.repair_action}</p>
              </div>

              <div style={{ marginBottom: '16px', backgroundColor: '#ecfdf5', padding: '10px', borderRadius: '6px', color: '#065f46', fontSize: '0.85rem' }}>
                ⏱️ Total Equipment Downtime: <strong>{reviewRecord.downtime_minutes} minutes</strong>
              </div>

              <div className="form-group">
                <label className="form-label">Supervisor Approval Notes / Sign-Off Comments</label>
                <textarea
                  className="form-textarea"
                  rows="2"
                  placeholder="Verification comments (e.g. Post-repair vibration check passed with 0.005mm runout)..."
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => handleApprovalAction(false)}
                disabled={processingApproval}
              >
                <X size={16} /> Reject & Return to Tech
              </button>
              <button
                type="button"
                className="btn btn-success"
                onClick={() => handleApprovalAction(true)}
                disabled={processingApproval}
              >
                <Check size={16} /> {processingApproval ? 'Approving...' : 'Approve & Restore Machine to RUNNING'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
