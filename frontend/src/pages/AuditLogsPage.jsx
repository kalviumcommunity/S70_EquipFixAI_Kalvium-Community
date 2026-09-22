import React, { useState, useEffect } from 'react';
import { auditLogsApi } from '../services/api';
import { ShieldAlert, Filter, Search, Clock, User } from 'lucide-react';

export const AuditLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');

  const loadLogs = async () => {
    try {
      const params = {};
      if (actionFilter) params.action = actionFilter;
      if (entityFilter) params.entity_type = entityFilter;
      const res = await auditLogsApi.list(params);
      setLogs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [actionFilter, entityFilter]);

  return (
    <div className="page-body">
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>System Audit Trail & Compliance</h1>
        <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
          Immutable operational event trail tracking user logins, incident dispatches, repairs, parts deduction, and sign-offs.
        </p>
      </div>

      {/* Filter bar */}
      <div className="card" style={{ padding: '12px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Filter Action:</span>
            <select
              className="form-select"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              style={{ width: '220px', padding: '6px 10px' }}
            >
              <option value="">All Actions</option>
              <option value="LOGIN">LOGIN</option>
              <option value="INCIDENT_CREATED">INCIDENT_CREATED</option>
              <option value="TECHNICIAN_ASSIGNED">TECHNICIAN_ASSIGNED</option>
              <option value="WORK_STARTED">WORK_STARTED</option>
              <option value="PARTS_USED">PARTS_USED</option>
              <option value="WORK_COMPLETED">WORK_COMPLETED</option>
              <option value="MAINTENANCE_APPROVED">MAINTENANCE_APPROVED</option>
              <option value="PART_RESTOCKED">PART_RESTOCKED</option>
              <option value="USER_ROLE_CHANGED">USER_ROLE_CHANGED</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Entity:</span>
            <select
              className="form-select"
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              style={{ width: '180px', padding: '6px 10px' }}
            >
              <option value="">All Entities</option>
              <option value="user">User</option>
              <option value="machine">Machine</option>
              <option value="incident">Incident</option>
              <option value="work_order">Work Order</option>
              <option value="part">Part</option>
              <option value="maintenance_record">Maintenance Record</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Entity ID</th>
                <th>Previous Value</th>
                <th>New Value</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                    No audit logs found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td>
                      {log.user ? (
                        <div>
                          <strong style={{ fontSize: '0.8rem' }}>{log.user.full_name}</strong>
                          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{log.user.username}</div>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>System</span>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-open" style={{ fontSize: '0.65rem' }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                      {log.entity_type}
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                        {log.entity_id || '-'}
                      </span>
                    </td>
                    <td style={{ maxWidth: '200px', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: '#64748b' }}>
                      {log.previous_value ? log.previous_value : '-'}
                    </td>
                    <td style={{ maxWidth: '240px', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: '#0f172a' }}>
                      {log.new_value ? log.new_value : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
