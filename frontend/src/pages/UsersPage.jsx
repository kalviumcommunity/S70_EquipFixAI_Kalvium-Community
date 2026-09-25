import React, { useState, useEffect } from 'react';
import { usersApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { Users, Plus, Shield, CheckCircle, UserCheck, History, Clock, Package, Wrench } from 'lucide-react';

export const UsersPage = () => {
  const { addToast, lastEvent } = useWebSocket();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  // New User Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [userForm, setUserForm] = useState({
    username: '',
    email: '',
    full_name: '',
    password: '',
    role_name: 'OPERATOR',
  });
  const [savingUser, setSavingUser] = useState(false);

  // Work History Modal State
  const [selectedUserHistory, setSelectedUserHistory] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadUsers = async () => {
    try {
      const [usersRes, rolesRes] = await Promise.all([
        usersApi.list(),
        usersApi.getRoles(),
      ]);
      setUsers(usersRes.data);
      setRoles(rolesRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [lastEvent]);

  const handleRoleChange = async (userId, newRole) => {
    try {
      await usersApi.updateRole(userId, { role_name: newRole });
      addToast('Role Updated', 'Employee role updated successfully.', 'success');
      loadUsers();
    } catch (err) {
      addToast('Update Failed', err.response?.data?.detail || 'Failed to update user role.', 'error');
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setSavingUser(true);
    try {
      await usersApi.create(userForm);
      addToast('User Created', `Created user ${userForm.username}.`, 'success');
      setShowAddModal(false);
      setUserForm({
        username: '',
        email: '',
        full_name: '',
        password: '',
        role_name: 'OPERATOR',
      });
      loadUsers();
    } catch (err) {
      addToast('Creation Failed', err.response?.data?.detail || 'Failed to create user.', 'error');
    } finally {
      setSavingUser(false);
    }
  };

  const viewWorkHistory = async (user) => {
    setLoadingHistory(true);
    try {
      const res = await usersApi.getWorkHistory(user.id);
      setSelectedUserHistory(res.data);
    } catch (err) {
      console.error(err);
      addToast('History Failed', 'Failed to load employee work history.', 'error');
    } finally {
      setLoadingHistory(false);
    }
  };

  return (
    <div className="page-body">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Employee Directory & Access Control</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            Manage industrial plant personnel, role permissions, and individual maintenance work histories.
          </p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
          <Plus size={16} /> Register New Employee
        </button>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Username</th>
                <th>Email</th>
                <th>System Role</th>
                <th>Status</th>
                <th>Work History</th>
                <th>Change Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: '#0f172a',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.8rem',
                        fontWeight: 700
                      }}>
                        {u.full_name[0]}
                      </div>
                      <span style={{ fontWeight: 600, color: '#1e293b' }}>{u.full_name}</span>
                    </div>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{u.username}</td>
                  <td style={{ color: '#64748b', fontSize: '0.8rem' }}>{u.email}</td>
                  <td>
                    <span className={`badge badge-${u.role?.name?.toLowerCase()}`}>
                      {u.role?.name}
                    </span>
                  </td>
                  <td>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.75rem',
                      color: u.is_active ? '#16a34a' : '#94a3b8'
                    }}>
                      <CheckCircle size={12} /> {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => viewWorkHistory(u)}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.75rem', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <History size={13} /> View History
                    </button>
                  </td>
                  <td>
                    <select
                      className="form-select"
                      value={u.role?.name}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      style={{ fontSize: '0.75rem', padding: '4px 8px', width: '130px' }}
                    >
                      <option value="OPERATOR">OPERATOR</option>
                      <option value="TECHNICIAN">TECHNICIAN</option>
                      <option value="SUPERVISOR">SUPERVISOR</option>
                      <option value="MANAGER">MANAGER</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Employee Work History Modal */}
      {selectedUserHistory && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '750px' }}>
            <div className="modal-header">
              <div>
                <strong style={{ fontSize: '1.1rem', color: '#0f172a' }}>
                  {selectedUserHistory.user.full_name} — Work History & Performance
                </strong>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Role: <strong>{selectedUserHistory.user.role}</strong> • Email: {selectedUserHistory.user.email}
                </div>
              </div>
              <button
                onClick={() => setSelectedUserHistory(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              {/* Stats KPI Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '18px' }}>
                <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '6px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Jobs Assigned</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                    {selectedUserHistory.stats.total_assigned_jobs}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#16a34a' }}>
                    {selectedUserHistory.stats.completed_jobs} completed ({selectedUserHistory.stats.completion_rate_percent}%)
                  </div>
                </div>

                <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '6px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Active Jobs</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f59e0b', marginTop: '2px' }}>
                    {selectedUserHistory.stats.active_jobs}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#64748b' }}>In progress</div>
                </div>

                <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '6px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Total Hours Logged</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#2563eb', marginTop: '2px' }}>
                    {selectedUserHistory.stats.total_hours_logged}h
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#64748b' }}>
                    MTTR: {selectedUserHistory.stats.average_resolution_hours}h avg
                  </div>
                </div>

                <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '6px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Parts Installed</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#16a34a', marginTop: '2px' }}>
                    {selectedUserHistory.stats.total_parts_installed}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#64748b' }}>
                    ${selectedUserHistory.stats.total_parts_cost} total cost
                  </div>
                </div>
              </div>

              {/* Recent Work Orders */}
              <div style={{ marginBottom: '16px' }}>
                <strong style={{ fontSize: '0.85rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <Wrench size={15} /> Recent Work Orders Assigned
                </strong>
                {selectedUserHistory.recent_work_orders.length === 0 ? (
                  <div style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '6px', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
                    No work orders assigned to this technician yet.
                  </div>
                ) : (
                  <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {selectedUserHistory.recent_work_orders.map((wo) => (
                      <div
                        key={wo.id}
                        style={{
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                          padding: '8px 12px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          backgroundColor: '#ffffff'
                        }}
                      >
                        <div>
                          <strong style={{ fontSize: '0.8rem', color: '#1e293b' }}>{wo.work_order_number}</strong>
                          <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '8px' }}>
                            Machine: {wo.machine_code || 'N/A'} • Priority: {wo.priority}
                          </span>
                        </div>
                        <span className={`badge badge-${wo.status.toLowerCase()}`} style={{ fontSize: '0.65rem' }}>
                          {wo.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Parts Installed by this technician */}
              {selectedUserHistory.parts_installed.length > 0 && (
                <div>
                  <strong style={{ fontSize: '0.85rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    <Package size={15} /> Spare Parts Installed
                  </strong>
                  <div style={{ maxHeight: '140px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {selectedUserHistory.parts_installed.map((p) => (
                      <div
                        key={p.id}
                        style={{
                          fontSize: '0.75rem',
                          padding: '6px 10px',
                          backgroundColor: '#f8fafc',
                          borderRadius: '4px',
                          display: 'flex',
                          justifyContent: 'space-between'
                        }}
                      >
                        <span>
                          <strong>{p.part_name}</strong> ({p.part_number}) — {p.quantity} units
                        </span>
                        <span style={{ color: '#16a34a', fontWeight: 600 }}>${p.total_cost}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedUserHistory(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <strong style={{ fontSize: '1rem', color: '#0f172a' }}>Register New Employee</strong>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleCreateUser}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Elena Rostova"
                    value={userForm.full_name}
                    onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Username *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. erostova"
                      value={userForm.username}
                      onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address *</label>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="e.g. elena@plant.com"
                      value={userForm.email}
                      onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Password *</label>
                    <input
                      type="password"
                      className="form-input"
                      placeholder="••••••••"
                      value={userForm.password}
                      onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Initial Role *</label>
                    <select
                      className="form-select"
                      value={userForm.role_name}
                      onChange={(e) => setUserForm({ ...userForm, role_name: e.target.value })}
                    >
                      <option value="OPERATOR">OPERATOR</option>
                      <option value="TECHNICIAN">TECHNICIAN</option>
                      <option value="SUPERVISOR">SUPERVISOR</option>
                      <option value="MANAGER">MANAGER</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingUser}
                >
                  {savingUser ? 'Creating...' : 'Register Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
