import React, { useState, useEffect } from 'react';
import { workOrdersApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { ClipboardList, Eye, Clock, Wrench, Package } from 'lucide-react';

export const WorkOrdersPage = () => {
  const { user, hasRole } = useAuth();
  const { lastEvent } = useWebSocket();
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  // Work Order Detail Modal
  const [selectedWO, setSelectedWO] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const loadWorkOrders = async () => {
    try {
      const params = {};
      if (statusFilter) params.status_filter = statusFilter;
      const res = await workOrdersApi.list(params);
      setWorkOrders(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkOrders();
  }, [statusFilter, lastEvent]);

  const viewDetail = async (woId) => {
    setLoadingDetail(true);
    try {
      const res = await workOrdersApi.get(woId);
      setSelectedWO(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div className="page-body">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Maintenance Work Orders</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            Official equipment repair tickets, technician progress logs, and parts tracking.
          </p>
        </div>
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
            <option value="">All Statuses</option>
            <option value="ASSIGNED">ASSIGNED</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="RESOLVED">RESOLVED (Pending Approval)</option>
            <option value="APPROVED">APPROVED / CLOSED</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Work Order</th>
                <th>Machine</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Technician</th>
                <th>Supervisor</th>
                <th>Started At</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {workOrders.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                    No work orders found.
                  </td>
                </tr>
              ) : (
                workOrders.map((wo) => (
                  <tr key={wo.id}>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#0f172a' }}>
                        {wo.work_order_number}
                      </span>
                    </td>
                    <td>
                      <strong>{wo.machine?.machine_code}</strong>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{wo.machine?.name}</div>
                    </td>
                    <td>
                      <span className={`badge badge-${wo.priority.toLowerCase()}`}>
                        {wo.priority}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${wo.status.toLowerCase()}`}>
                        {wo.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                      {wo.assigned_technician?.full_name}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: '#475569' }}>
                      {wo.supervisor?.full_name}
                    </td>
                    <td style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {wo.started_at ? new Date(wo.started_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Pending Start'}
                    </td>
                    <td>
                      <button onClick={() => viewDetail(wo.id)} className="btn btn-secondary btn-sm">
                        <Eye size={14} /> View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Work Order Detail Modal */}
      {selectedWO && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <div>
                <strong style={{ fontSize: '1.1rem', color: '#0f172a' }}>
                  {selectedWO.work_order_number} — {selectedWO.machine?.machine_code}
                </strong>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Technician: {selectedWO.assigned_technician?.full_name} | Status: {selectedWO.status}
                </div>
              </div>
              <button
                onClick={() => setSelectedWO(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              {/* Problem notes */}
              <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Issue Summary</div>
                <div style={{ fontSize: '0.85rem', color: '#1e293b', marginTop: '4px' }}>
                  {selectedWO.incident?.description || selectedWO.notes || 'No description recorded.'}
                </div>
              </div>

              {/* Work logs */}
              <div style={{ marginBottom: '16px' }}>
                <strong style={{ fontSize: '0.85rem', color: '#0f172a', display: 'block', marginBottom: '8px' }}>
                  Diagnostics & Work Logs ({selectedWO.logs?.length || 0})
                </strong>
                {(!selectedWO.logs || selectedWO.logs.length === 0) ? (
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>No work logs recorded yet.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedWO.logs.map((log) => (
                      <div key={log.id} style={{ border: '1px solid #e2e8f0', padding: '8px 12px', borderRadius: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                          <strong style={{ color: '#1e293b' }}>{log.step_description}</strong>
                          <span style={{ color: '#94a3b8' }}>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: '#475569', margin: '4px 0 0 0' }}>{log.action_taken}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Parts used */}
              <div>
                <strong style={{ fontSize: '0.85rem', color: '#0f172a', display: 'block', marginBottom: '8px' }}>
                  Spare Parts Used ({selectedWO.parts_used?.length || 0})
                </strong>
                {(!selectedWO.parts_used || selectedWO.parts_used.length === 0) ? (
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>No spare parts replaced.</div>
                ) : (
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Part SKU</th>
                          <th>Name</th>
                          <th>Qty</th>
                          <th>Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedWO.parts_used.map((p) => (
                          <tr key={p.id}>
                            <td style={{ fontFamily: 'var(--font-mono)' }}>{p.part?.part_number}</td>
                            <td>{p.part?.name}</td>
                            <td>{p.quantity_used}</td>
                            <td style={{ color: '#059669', fontWeight: 600 }}>${p.total_cost}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedWO(null)}
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
