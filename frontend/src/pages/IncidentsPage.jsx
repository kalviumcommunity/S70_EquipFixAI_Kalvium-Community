import React, { useState, useEffect } from 'react';
import { incidentsApi, machinesApi, usersApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { AlertTriangle, Plus, Filter, UserCheck, Clock } from 'lucide-react';

export const IncidentsPage = () => {
  const { user, hasRole } = useAuth();
  const { lastEvent, addToast } = useWebSocket();
  const [incidents, setIncidents] = useState([]);
  const [machines, setMachines] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  // Report Modal State
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportForm, setReportForm] = useState({
    machine_id: '',
    description: '',
    severity: 'MEDIUM',
  });
  const [submittingReport, setSubmittingReport] = useState(false);

  // Assign Modal State
  const [assignIncident, setAssignIncident] = useState(null);
  const [selectedTechId, setSelectedTechId] = useState('');
  const [assignPriority, setAssignPriority] = useState('HIGH');
  const [estHours, setEstHours] = useState(2.0);
  const [assigning, setAssigning] = useState(false);

  const loadData = async () => {
    try {
      const params = {};
      if (statusFilter) params.status_filter = statusFilter;
      const [incRes, machRes] = await Promise.all([
        incidentsApi.list(params),
        machinesApi.list(),
      ]);
      setIncidents(incRes.data);
      setMachines(machRes.data);
      if (machRes.data.length > 0 && !reportForm.machine_id) {
        setReportForm(prev => ({ ...prev, machine_id: machRes.data[0].id }));
      }

      if (hasRole(['SUPERVISOR', 'MANAGER'])) {
        const techRes = await usersApi.list({ role_name: 'TECHNICIAN' });
        setTechnicians(techRes.data);
        if (techRes.data.length > 0 && !selectedTechId) {
          setSelectedTechId(techRes.data[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, lastEvent]);

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    setSubmittingReport(true);
    try {
      const res = await incidentsApi.report({
        machine_id: parseInt(reportForm.machine_id),
        description: reportForm.description,
        severity: reportForm.severity,
      });
      addToast('Incident Created', `Reported ${res.data.incident_number}`, 'success');
      setShowReportModal(false);
      setReportForm({
        machine_id: machines.length > 0 ? machines[0].id : '',
        description: '',
        severity: 'MEDIUM',
      });
      loadData();
    } catch (err) {
      addToast('Incident Report Failed', err.response?.data?.detail || 'Failed to report incident.', 'error');
    } finally {
      setSubmittingReport(false);
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!assignIncident || !selectedTechId) return;
    setAssigning(true);
    try {
      await incidentsApi.assign(assignIncident.id, {
        technician_id: parseInt(selectedTechId),
        priority: assignPriority,
        estimated_hours: parseFloat(estHours),
      });
      addToast('Technician Assigned', `Dispatched to ${assignIncident.incident_number}`, 'success');
      setAssignIncident(null);
      loadData();
    } catch (err) {
      addToast('Assignment Failed', err.response?.data?.detail || 'Failed to assign technician.', 'error');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="page-body">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Equipment Incidents Log</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            Track machine failure reports, operator logs, and technician dispatch assignments.
          </p>
        </div>
        <button onClick={() => setShowReportModal(true)} className="btn btn-primary">
          <Plus size={16} /> Report Problem
        </button>
      </div>

      {/* Filter bar */}
      <div className="card" style={{ padding: '12px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Filter Status:</span>
          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: '220px', padding: '6px 12px' }}
          >
            <option value="">All Incidents</option>
            <option value="OPEN">OPEN</option>
            <option value="ASSIGNED">ASSIGNED</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="RESOLVED">RESOLVED</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Incident ID</th>
                <th>Machine</th>
                <th>Description</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Reported By</th>
                <th>Assigned Tech</th>
                <th>Reported Time</th>
                {hasRole(['SUPERVISOR', 'MANAGER']) && <th>Action</th>}
              </tr>
            </thead>
            <tbody>
              {incidents.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                    No incidents matching selected filter.
                  </td>
                </tr>
              ) : (
                incidents.map((inc) => (
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
                    <td style={{ maxWidth: '280px' }}>
                      <span style={{ fontSize: '0.85rem' }}>{inc.description}</span>
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
                    <td style={{ fontSize: '0.8rem', color: '#475569' }}>
                      {inc.reported_by?.full_name}
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
                    <td style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {new Date(inc.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    {hasRole(['SUPERVISOR', 'MANAGER']) && (
                      <td>
                        {!['RESOLVED', 'CLOSED'].includes(inc.status) && (
                          <button
                            onClick={() => {
                              setAssignIncident(inc);
                              setAssignPriority(inc.priority);
                            }}
                            className="btn btn-secondary btn-sm"
                          >
                            {inc.assigned_technician ? 'Reassign' : 'Assign'}
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <strong style={{ fontSize: '1rem', color: '#0f172a' }}>Report Equipment Issue</strong>
              <button
                onClick={() => setShowReportModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleReportSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Affected Machine *</label>
                  <select
                    className="form-select"
                    value={reportForm.machine_id}
                    onChange={(e) => setReportForm({ ...reportForm, machine_id: e.target.value })}
                    required
                  >
                    {machines.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.machine_code} — {m.name} ({m.department})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Severity *</label>
                  <select
                    className="form-select"
                    value={reportForm.severity}
                    onChange={(e) => setReportForm({ ...reportForm, severity: e.target.value })}
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Problem Description *</label>
                  <textarea
                    className="form-textarea"
                    rows="4"
                    placeholder="Describe problem, vibration, noise, error alarms..."
                    value={reportForm.description}
                    onChange={(e) => setReportForm({ ...reportForm, description: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowReportModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submittingReport}
                >
                  {submittingReport ? 'Submitting...' : 'Submit Incident'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Modal */}
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
                <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '6px', marginBottom: '14px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{assignIncident.machine?.machine_code} — {assignIncident.machine?.name}</div>
                  <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '4px' }}>{assignIncident.description}</div>
                </div>

                <div className="form-group">
                  <label className="form-label">Technician *</label>
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
                    <label className="form-label">Priority</label>
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
                  {assigning ? 'Dispatching...' : 'Dispatch Work Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
