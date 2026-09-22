import React, { useState, useEffect } from 'react';
import { maintenanceApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { Wrench, CheckCircle, Clock, ShieldCheck, Eye, Check, X } from 'lucide-react';

export const MaintenancePage = () => {
  const { hasRole } = useAuth();
  const { lastEvent, addToast } = useWebSocket();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  // Approval Modal State
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  const loadRecords = async () => {
    try {
      const params = {};
      if (statusFilter) params.approval_status = statusFilter;
      const res = await maintenanceApi.listRecords(params);
      setRecords(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, [statusFilter, lastEvent]);

  const handleApprovalAction = async (approved) => {
    if (!selectedRecord) return;
    setProcessing(true);
    try {
      await maintenanceApi.processApproval(selectedRecord.id, {
        approved,
        supervisor_notes: approvalNotes || (approved ? 'Approved' : 'Rejected'),
      });
      addToast(
        approved ? 'Maintenance Approved' : 'Maintenance Rejected',
        approved
          ? `Machine ${selectedRecord.machine?.machine_code} restored to RUNNING.`
          : 'Record returned to technician.',
        approved ? 'success' : 'warning'
      );
      setSelectedRecord(null);
      setApprovalNotes('');
      loadRecords();
    } catch (err) {
      addToast('Review Action Failed', err.response?.data?.detail || 'Approval action failed.', 'error');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="page-body">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Official Maintenance Records</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            Permanent historical log of equipment repairs, root cause analyses, downtime records, and supervisor sign-offs.
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="card" style={{ padding: '12px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Approval Status:</span>
          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: '220px', padding: '6px 12px' }}
          >
            <option value="">All Records</option>
            <option value="APPROVED">APPROVED (Official)</option>
            <option value="PENDING">PENDING (Awaiting Review)</option>
            <option value="REJECTED">REJECTED (Returned)</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Record #</th>
                <th>Machine</th>
                <th>Problem Summary</th>
                <th>Root Cause</th>
                <th>Technician</th>
                <th>Downtime</th>
                <th>Status</th>
                <th>Approved By</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                    No maintenance records found.
                  </td>
                </tr>
              ) : (
                records.map((rec) => (
                  <tr key={rec.id}>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#2563eb' }}>
                        MR-{rec.id.toString().padStart(4, '0')}
                      </span>
                    </td>
                    <td>
                      <strong>{rec.machine?.machine_code}</strong>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{rec.machine?.name}</div>
                    </td>
                    <td style={{ maxWidth: '240px' }}>
                      <span style={{ fontSize: '0.825rem' }}>{rec.problem_summary}</span>
                    </td>
                    <td style={{ maxWidth: '200px' }}>
                      <span style={{ fontSize: '0.825rem', color: '#334155' }}>{rec.root_cause}</span>
                    </td>
                    <td style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                      {rec.technician?.full_name}
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: '#c2410c' }}>{rec.downtime_minutes}m</span>
                    </td>
                    <td>
                      <span className={`badge badge-${rec.approval_status.toLowerCase()}`}>
                        {rec.approval_status}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {rec.approver ? rec.approver.full_name : <span style={{ color: '#ea580c' }}>Pending</span>}
                    </td>
                    <td>
                      <button
                        onClick={() => setSelectedRecord(rec)}
                        className="btn btn-secondary btn-sm"
                      >
                        <Eye size={14} /> Review
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Modal */}
      {selectedRecord && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <div>
                <strong style={{ fontSize: '1.1rem', color: '#0f172a' }}>
                  Maintenance Record MR-{selectedRecord.id.toString().padStart(4, '0')}
                </strong>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Machine: {selectedRecord.machine?.machine_code} ({selectedRecord.machine?.name})
                </div>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
                <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Technician</div>
                  <strong style={{ fontSize: '0.85rem' }}>{selectedRecord.technician?.full_name}</strong>
                </div>
                <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Downtime</div>
                  <strong style={{ fontSize: '0.85rem', color: '#c2410c' }}>{selectedRecord.downtime_minutes} minutes</strong>
                </div>
                <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Status</div>
                  <span className={`badge badge-${selectedRecord.approval_status.toLowerCase()}`} style={{ marginTop: '4px' }}>
                    {selectedRecord.approval_status}
                  </span>
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <strong style={{ fontSize: '0.8rem', color: '#475569' }}>Problem Summary:</strong>
                <p style={{ fontSize: '0.85rem', color: '#1e293b', margin: '4px 0 0 0' }}>{selectedRecord.problem_summary}</p>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <strong style={{ fontSize: '0.8rem', color: '#475569' }}>Diagnostics & Troubleshooting:</strong>
                <p style={{ fontSize: '0.85rem', color: '#1e293b', margin: '4px 0 0 0' }}>{selectedRecord.troubleshooting_steps}</p>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <strong style={{ fontSize: '0.8rem', color: '#475569' }}>Root Cause:</strong>
                <p style={{ fontSize: '0.85rem', color: '#1e293b', margin: '4px 0 0 0' }}>{selectedRecord.root_cause}</p>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <strong style={{ fontSize: '0.8rem', color: '#475569' }}>Repair Action Taken:</strong>
                <p style={{ fontSize: '0.85rem', color: '#1e293b', margin: '4px 0 0 0' }}>{selectedRecord.repair_action}</p>
              </div>

              {selectedRecord.supervisor_notes && (
                <div style={{ backgroundColor: '#eff6ff', padding: '10px', borderRadius: '6px', border: '1px solid #bfdbfe', marginTop: '12px' }}>
                  <strong style={{ fontSize: '0.75rem', color: '#1e40af' }}>Supervisor Notes:</strong>
                  <p style={{ fontSize: '0.8rem', color: '#1e3a8a', margin: '4px 0 0 0' }}>{selectedRecord.supervisor_notes}</p>
                </div>
              )}

              {/* Action buttons for Supervisor/Manager if PENDING */}
              {hasRole(['SUPERVISOR', 'MANAGER']) && selectedRecord.approval_status === 'PENDING' && (
                <div style={{ marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Supervisor Sign-Off / Approval Comments</label>
                    <textarea
                      className="form-textarea"
                      rows="2"
                      placeholder="Verification comments..."
                      value={approvalNotes}
                      onChange={(e) => setApprovalNotes(e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button
                      onClick={() => handleApprovalAction(false)}
                      className="btn btn-danger btn-sm"
                      disabled={processing}
                    >
                      <X size={14} /> Reject
                    </button>
                    <button
                      onClick={() => handleApprovalAction(true)}
                      className="btn btn-success btn-sm"
                      disabled={processing}
                    >
                      <Check size={14} /> Approve & Restore Machine to RUNNING
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedRecord(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
