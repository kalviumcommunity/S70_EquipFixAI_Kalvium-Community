import React, { useState, useEffect } from 'react';
import { usersApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import {
  Users, Plus, Shield, CheckCircle, UserCheck, History, Clock,
  Package, Wrench, Lock, RefreshCw, AlertCircle, AlertTriangle,
  FileText, Activity, CheckSquare, Sparkles, ChevronDown, ChevronUp,
  ShieldCheck, ShieldAlert, ArrowRight, X
} from 'lucide-react';

export const UsersPage = () => {
  const { user: currentUser, hasRole } = useAuth();
  const { addToast, lastEvent } = useWebSocket();
  const isManager = Boolean(currentUser?.role?.name === 'MANAGER' || hasRole('MANAGER'));

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  // New User Modal State (Strict Manager Only)
  const [showAddModal, setShowAddModal] = useState(false);
  const [userForm, setUserForm] = useState({
    username: '',
    email: '',
    full_name: '',
    password: '',
    role_name: 'OPERATOR',
  });
  const [savingUser, setSavingUser] = useState(false);

  // Real-Time Inline Telemetry & Drawer State
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [expandedUserData, setExpandedUserData] = useState({}); // userId -> history object
  const [loadingExpandedUser, setLoadingExpandedUser] = useState(false);
  const [inlineTab, setInlineTab] = useState('orders'); // 'orders' | 'logs' | 'incidents' | 'parts'

  // Full Work History Modal State
  const [selectedUserHistory, setSelectedUserHistory] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(new Date().toLocaleTimeString());
  const [activeHistoryTab, setActiveHistoryTab] = useState('orders');

  // Strict Access Control Role Change Modal State
  const [roleChangeTarget, setRoleChangeTarget] = useState(null); // { user, newRole }
  const [updatingRole, setUpdatingRole] = useState(false);

  const loadUsers = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        usersApi.list(),
        usersApi.getRoles(),
      ]);
      setUsers(usersRes.data);
      setRoles(rolesRes.data);
      setLastSyncTime(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Re-fetch users on initial mount and when WebSocket events occur
  useEffect(() => {
    loadUsers();
  }, [lastEvent]);

  // Real-Time 5-second polling interval for live work history telemetry
  useEffect(() => {
    const interval = setInterval(() => {
      loadUsers(true);
      // Also refresh expanded drawer if open
      if (expandedUserId) {
        fetchExpandedUserHistory(expandedUserId, true);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [expandedUserId]);

  // Fetch full work history for inline drawer or modal
  const fetchExpandedUserHistory = async (userId, silent = false) => {
    if (!silent) setLoadingExpandedUser(true);
    try {
      const res = await usersApi.getWorkHistory(userId);
      setExpandedUserData((prev) => ({ ...prev, [userId]: res.data }));
      setLastSyncTime(new Date().toLocaleTimeString());
    } catch (err) {
      if (!silent) {
        console.error('Work history load error:', err);
        addToast('History Failed', 'Failed to load employee live telemetry.', 'error');
      }
    } finally {
      if (!silent) setLoadingExpandedUser(false);
    }
  };

  const toggleInlineExpand = (userId) => {
    if (expandedUserId === userId) {
      setExpandedUserId(null);
    } else {
      setExpandedUserId(userId);
      setInlineTab('orders');
      if (!expandedUserData[userId]) {
        fetchExpandedUserHistory(userId);
      }
    }
  };

  const openFullModal = async (user) => {
    setLoadingHistory(true);
    setActiveHistoryTab('orders');
    try {
      const res = await usersApi.getWorkHistory(user.id);
      setSelectedUserHistory(res.data);
      setLastSyncTime(new Date().toLocaleTimeString());
    } catch (err) {
      addToast('History Failed', 'Failed to load employee work history.', 'error');
    } finally {
      setLoadingHistory(false);
    }
  };

  // Prompt Strict Access Control Confirmation
  const promptRoleChange = (targetUser, newRole) => {
    if (!isManager) {
      addToast(
        'Access Denied',
        'Strict Access Control: Only Plant Operations Managers have clearance to change employee roles.',
        'error'
      );
      return;
    }

    if (targetUser.id === currentUser?.id && newRole !== 'MANAGER') {
      addToast(
        'Action Prohibited',
        'Strict Access Control: Plant Managers cannot demote their own account to prevent administrative lockout.',
        'error'
      );
      return;
    }

    if (targetUser.role?.name === newRole) return;

    setRoleChangeTarget({
      user: targetUser,
      newRole,
    });
  };

  // Execute Confirmed Role Change (Strict Manager Only)
  const executeRoleChange = async () => {
    if (!roleChangeTarget) return;
    const { user: targetUser, newRole } = roleChangeTarget;

    setUpdatingRole(true);
    try {
      await usersApi.updateRole(targetUser.id, { role_name: newRole });
      addToast(
        'Role Clearance Updated',
        `Employee role for ${targetUser.full_name} updated to ${newRole}. Plant audit log recorded.`,
        'success'
      );
      setRoleChangeTarget(null);
      loadUsers(true);
      if (expandedUserId === targetUser.id) {
        fetchExpandedUserHistory(targetUser.id, true);
      }
      if (selectedUserHistory && selectedUserHistory.user.id === targetUser.id) {
        openFullModal(targetUser);
      }
    } catch (err) {
      const detail = err.response?.data?.detail || 'Failed to update employee role.';
      addToast('Update Failed', detail, 'error');
    } finally {
      setUpdatingRole(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!isManager) {
      addToast('Access Denied', 'Only Managers can register new employee accounts.', 'error');
      return;
    }

    setSavingUser(true);
    try {
      await usersApi.create(userForm);
      addToast(
        'User Created',
        `Created employee account for ${userForm.full_name} (${userForm.username}).`,
        'success'
      );
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
      addToast('Creation Failed', err.response?.data?.detail || 'Failed to create employee account.', 'error');
    } finally {
      setSavingUser(false);
    }
  };

  // Aggregate Plant KPI metrics from users' live work_summary
  const totalEmployees = users.length;
  const activeWorkOrdersCount = users.reduce((acc, u) => acc + (u.work_summary?.active_jobs || 0), 0);
  const totalCompletedCount = users.reduce((acc, u) => acc + (u.work_summary?.completed_jobs || 0), 0);
  const totalPlantHours = users.reduce((acc, u) => acc + (u.work_summary?.hours_logged || 0), 0);

  return (
    <div className="page-body">
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Employee Directory & Access Control
            </h1>
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '12px',
              backgroundColor: isManager ? '#f0fdf4' : '#eff6ff',
              color: isManager ? '#15803d' : '#1d4ed8',
              border: `1px solid ${isManager ? '#bbf7d0' : '#bfdbfe'}`,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              {isManager ? <ShieldCheck size={13} color="#15803d" /> : <Lock size={12} color="#1d4ed8" />}
              {isManager ? 'MANAGER ACCESS: STRICT CONTROL ACTIVE' : 'READ-ONLY ACCESS: SUPERVISOR'}
            </span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px', marginBottom: 0 }}>
            Strict role-based clearance governance, employee station assignments, and live real-time maintenance work history.
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => loadUsers(false)}
            className="btn btn-secondary"
            style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Refresh employee data and live work history"
          >
            <RefreshCw size={13} className={loading ? 'spin' : ''} /> Refresh Live Telemetry
          </button>

          {isManager ? (
            <button onClick={() => setShowAddModal(true)} className="btn btn-primary" style={{ fontSize: '0.8rem' }}>
              <Plus size={16} /> Register New Employee
            </button>
          ) : (
            <div style={{
              fontSize: '0.75rem',
              color: '#64748b',
              backgroundColor: '#f1f5f9',
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Lock size={13} color="#94a3b8" /> Staff Creation Restricted (Manager Only)
            </div>
          )}
        </div>
      </div>

      {/* Security Banner for Non-Managers */}
      {!isManager && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          color: '#1e40af',
          padding: '10px 16px',
          borderRadius: '8px',
          marginBottom: '16px',
          fontSize: '0.85rem'
        }}>
          <Lock size={16} color="#2563eb" style={{ flexShrink: 0 }} />
          <div>
            <strong>Strict Access Control Enforced:</strong> Logged in as <strong>{currentUser?.role?.name || 'Supervisor'}</strong>. Role alterations, privilege promotions, and account provisioning are strictly restricted to <strong>Plant Operations Manager</strong> clearance.
          </div>
        </div>
      )}

      {/* Live Plant Telemetry Bar */}
      <div style={{
        backgroundColor: '#070c1a',
        border: '1px solid #1e293b',
        borderRadius: '12px',
        padding: '14px 18px',
        marginBottom: '20px',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            padding: '4px 10px',
            borderRadius: '20px',
            fontSize: '0.725rem',
            fontWeight: 700,
            color: '#34d399'
          }}>
            <span style={{
              display: 'inline-block',
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: '#10b981',
              boxShadow: '0 0 8px #10b981'
            }} />
            REAL-TIME WORK HISTORY SYNC ACTIVE
          </div>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            Auto-polling every 5s • Last Synced: <strong>{lastSyncTime}</strong>
          </span>
        </div>

        {/* Quick KPI stats */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div>
            <span style={{ fontSize: '0.675rem', color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Staff</span>
            <strong style={{ fontSize: '0.95rem', color: '#f8fafc' }}>{totalEmployees} Registered</strong>
          </div>
          <div style={{ width: '1px', height: '24px', backgroundColor: '#1e293b' }} />
          <div>
            <span style={{ fontSize: '0.675rem', color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Active Tasks</span>
            <strong style={{ fontSize: '0.95rem', color: '#38bdf8' }}>{activeWorkOrdersCount} In Progress</strong>
          </div>
          <div style={{ width: '1px', height: '24px', backgroundColor: '#1e293b' }} />
          <div>
            <span style={{ fontSize: '0.675rem', color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Jobs Resolved</span>
            <strong style={{ fontSize: '0.95rem', color: '#34d399' }}>{totalCompletedCount} Completed</strong>
          </div>
          <div style={{ width: '1px', height: '24px', backgroundColor: '#1e293b' }} />
          <div>
            <span style={{ fontSize: '0.675rem', color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Total Hours</span>
            <strong style={{ fontSize: '0.95rem', color: '#fbbf24' }}>{totalPlantHours.toFixed(1)} hrs</strong>
          </div>
        </div>
      </div>

      {/* Employee Directory Table with Directly Visible Real-Time Work History */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="table-container">
          <table className="data-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ minWidth: '180px' }}>Employee</th>
                <th>Role & Clearance</th>
                <th style={{ minWidth: '200px' }}>Current Live Task</th>
                <th>Active Jobs</th>
                <th>Completed</th>
                <th>Hours Logged</th>
                <th>Parts Used</th>
                <th>Last Active</th>
                <th style={{ textAlign: 'center' }}>Live Work History</th>
                <th style={{ minWidth: '160px' }}>Access Control</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isCurrent = u.id === currentUser?.id;
                const summary = u.work_summary || {};
                const isExpanded = expandedUserId === u.id;
                const roleLower = (u.role?.name || 'operator').toLowerCase();

                // Clearance details
                let clearanceBadge = { text: 'Level 1: Operator', color: '#64748b', bg: '#f1f5f9' };
                if (u.role?.name === 'MANAGER') clearanceBadge = { text: 'Level 4: Manager', color: '#7c3aed', bg: '#f5f3ff' };
                else if (u.role?.name === 'SUPERVISOR') clearanceBadge = { text: 'Level 3: Supervisor', color: '#0284c7', bg: '#f0f9ff' };
                else if (u.role?.name === 'TECHNICIAN') clearanceBadge = { text: 'Level 2: Technician', color: '#059669', bg: '#ecfdf5' };

                return (
                  <React.Fragment key={u.id}>
                    <tr style={{ backgroundColor: isExpanded ? '#f8fafc' : undefined }}>
                      {/* 1. Employee Identity */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '50%',
                            backgroundColor: '#0f172a',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            flexShrink: 0
                          }}>
                            {u.full_name ? u.full_name[0] : 'U'}
                          </div>
                          <div>
                            <span style={{ fontWeight: 700, color: '#0f172a', display: 'block', fontSize: '0.85rem' }}>
                              {u.full_name}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#64748b' }}>
                              <span>@{u.username}</span>
                              {isCurrent && (
                                <span style={{ color: '#2563eb', fontWeight: 700 }}>
                                  ● (You)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. System Role & Clearance Level */}
                      <td>
                        <span className={`badge badge-${roleLower}`} style={{ fontWeight: 700, display: 'inline-block', marginBottom: '2px' }}>
                          {u.role?.name}
                        </span>
                        <div style={{ fontSize: '0.65rem', color: clearanceBadge.color, fontWeight: 600 }}>
                          {clearanceBadge.text}
                        </div>
                      </td>

                      {/* 3. Current Live Task / Station Status */}
                      <td>
                        {summary.current_task ? (
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            backgroundColor: '#ecfdf5',
                            border: '1px solid #a7f3d0',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            color: '#065f46',
                            fontWeight: 600,
                            maxWidth: '220px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }} title={summary.current_task}>
                            <span style={{
                              display: 'inline-block',
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              backgroundColor: '#10b981',
                              boxShadow: '0 0 6px #10b981'
                            }} />
                            <span>{summary.current_task}</span>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>
                            ⚪ Idle / Standby
                          </span>
                        )}
                      </td>

                      {/* 4. Active Jobs count */}
                      <td>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '10px',
                          backgroundColor: (summary.active_jobs || 0) > 0 ? '#fef3c7' : '#f1f5f9',
                          color: (summary.active_jobs || 0) > 0 ? '#92400e' : '#64748b'
                        }}>
                          {summary.active_jobs || 0} active
                        </span>
                      </td>

                      {/* 5. Completed Jobs count */}
                      <td>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '10px',
                          backgroundColor: '#ecfdf5',
                          color: '#047857'
                        }}>
                          {summary.completed_jobs || 0} closed
                        </span>
                      </td>

                      {/* 6. Hours Logged & MTTR */}
                      <td>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1e293b' }}>
                          {summary.hours_logged || 0} hrs
                        </div>
                        <div style={{ fontSize: '0.675rem', color: '#64748b' }}>
                          MTTR: {summary.mttr_hours || 0}h
                        </div>
                      </td>

                      {/* 7. Parts Installed */}
                      <td>
                        <div style={{ fontSize: '0.775rem', color: '#334155', fontWeight: 600 }}>
                          {summary.parts_installed || 0} units
                        </div>
                        <div style={{ fontSize: '0.675rem', color: '#16a34a' }}>
                          ${summary.total_parts_cost || 0}
                        </div>
                      </td>

                      {/* 8. Last Active timestamp */}
                      <td>
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '0.725rem',
                          color: '#15803d',
                          fontWeight: 600
                        }}>
                          <span style={{
                            display: 'inline-block',
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            backgroundColor: '#16a34a',
                            boxShadow: '0 0 5px #16a34a'
                          }} />
                          <span>Live Now</span>
                        </div>
                      </td>

                      {/* 9. Live Work History Toggle / Modal */}
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                          <button
                            type="button"
                            onClick={() => toggleInlineExpand(u.id)}
                            className="btn btn-secondary btn-sm"
                            style={{
                              fontSize: '0.725rem',
                              padding: '4px 8px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              backgroundColor: isExpanded ? '#0284c7' : undefined,
                              color: isExpanded ? '#ffffff' : undefined
                            }}
                            title="Expand live work history telemetry right here in the table"
                          >
                            <History size={12} />
                            <span>Telemetry</span>
                            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          </button>

                          <button
                            type="button"
                            onClick={() => openFullModal(u)}
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '0.7rem', padding: '4px 6px' }}
                            title="Open maximized view"
                          >
                            Full View
                          </button>
                        </div>
                      </td>

                      {/* 10. Strict Access Control (Role Modification) */}
                      <td>
                        {!isManager ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{
                              fontSize: '0.72rem',
                              color: '#991b1b',
                              backgroundColor: '#fef2f2',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              border: '1px solid #fecaca',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontWeight: 600
                            }}>
                              <Lock size={11} color="#dc2626" /> Locked
                            </span>
                          </div>
                        ) : isCurrent ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span className="badge badge-manager" style={{ fontWeight: 700, fontSize: '0.7rem' }}>
                              MANAGER
                            </span>
                            <span style={{ fontSize: '0.675rem', color: '#16a34a', fontWeight: 700 }} title="Self-demotion lockout prevention">
                              (Protected)
                            </span>
                          </div>
                        ) : (
                          <select
                            className="form-select"
                            value={u.role?.name}
                            onChange={(e) => promptRoleChange(u, e.target.value)}
                            style={{
                              fontSize: '0.75rem',
                              padding: '4px 8px',
                              width: '135px',
                              borderColor: '#cbd5e1',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            <option value="OPERATOR">OPERATOR</option>
                            <option value="TECHNICIAN">TECHNICIAN</option>
                            <option value="SUPERVISOR">SUPERVISOR</option>
                            <option value="MANAGER">MANAGER</option>
                          </select>
                        )}
                      </td>
                    </tr>

                    {/* Inline Expandable Work History Telemetry Drawer */}
                    {isExpanded && (
                      <tr key={`${u.id}-expanded-drawer`}>
                        <td colSpan={10} style={{ padding: 0, backgroundColor: '#0b1329', borderBottom: '2px solid #0284c7' }}>
                          <div style={{ padding: '20px 24px', color: '#f8fafc' }}>
                            {/* Drawer Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '6px',
                                  backgroundColor: '#0284c7',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}>
                                  <Activity size={16} color="#ffffff" />
                                </div>
                                <div>
                                  <strong style={{ fontSize: '0.95rem', color: '#ffffff' }}>
                                    {u.full_name} — Live Work History Telemetry
                                  </strong>
                                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginLeft: '10px' }}>
                                    Active Station Role: <strong style={{ color: '#38bdf8' }}>{u.role?.name}</strong>
                                  </span>
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <button
                                  type="button"
                                  onClick={() => fetchExpandedUserHistory(u.id)}
                                  className="btn btn-secondary btn-sm"
                                  style={{
                                    fontSize: '0.72rem',
                                    padding: '3px 8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    backgroundColor: 'rgba(255,255,255,0.08)',
                                    color: '#ffffff',
                                    border: '1px solid rgba(255,255,255,0.15)'
                                  }}
                                >
                                  <RefreshCw size={11} className={loadingExpandedUser ? 'spin' : ''} /> Refresh Stream
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setExpandedUserId(null)}
                                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            </div>

                            {/* Drawer Navigation Tabs */}
                            <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid #1e293b', marginBottom: '14px' }}>
                              <button
                                type="button"
                                onClick={() => setInlineTab('orders')}
                                style={{
                                  padding: '8px 14px',
                                  fontSize: '0.775rem',
                                  fontWeight: inlineTab === 'orders' ? 700 : 500,
                                  color: inlineTab === 'orders' ? '#38bdf8' : '#94a3b8',
                                  borderBottom: inlineTab === 'orders' ? '2px solid #38bdf8' : '2px solid transparent',
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer'
                                }}
                              >
                                Assigned Work Orders ({expandedUserData[u.id]?.recent_work_orders?.length || 0})
                              </button>
                              <button
                                type="button"
                                onClick={() => setInlineTab('logs')}
                                style={{
                                  padding: '8px 14px',
                                  fontSize: '0.775rem',
                                  fontWeight: inlineTab === 'logs' ? 700 : 500,
                                  color: inlineTab === 'logs' ? '#38bdf8' : '#94a3b8',
                                  borderBottom: inlineTab === 'logs' ? '2px solid #38bdf8' : '2px solid transparent',
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer'
                                }}
                              >
                                Technician Work Logs ({expandedUserData[u.id]?.work_logs?.length || 0})
                              </button>
                              <button
                                type="button"
                                onClick={() => setInlineTab('incidents')}
                                style={{
                                  padding: '8px 14px',
                                  fontSize: '0.775rem',
                                  fontWeight: inlineTab === 'incidents' ? 700 : 500,
                                  color: inlineTab === 'incidents' ? '#38bdf8' : '#94a3b8',
                                  borderBottom: inlineTab === 'incidents' ? '2px solid #38bdf8' : '2px solid transparent',
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer'
                                }}
                              >
                                Reported Incidents ({expandedUserData[u.id]?.reported_incidents?.length || 0})
                              </button>
                              <button
                                type="button"
                                onClick={() => setInlineTab('parts')}
                                style={{
                                  padding: '8px 14px',
                                  fontSize: '0.775rem',
                                  fontWeight: inlineTab === 'parts' ? 700 : 500,
                                  color: inlineTab === 'parts' ? '#38bdf8' : '#94a3b8',
                                  borderBottom: inlineTab === 'parts' ? '2px solid #38bdf8' : '2px solid transparent',
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer'
                                }}
                              >
                                Spare Parts Used ({expandedUserData[u.id]?.parts_installed?.length || 0})
                              </button>
                            </div>

                            {/* Drawer Content */}
                            {loadingExpandedUser && !expandedUserData[u.id] ? (
                              <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
                                <RefreshCw size={18} className="spin" style={{ margin: '0 auto 8px auto', display: 'block' }} />
                                Loading real-time employee work history...
                              </div>
                            ) : (
                              <div>
                                {/* Inline Tab 1: Work Orders */}
                                {inlineTab === 'orders' && (
                                  <div>
                                    {(!expandedUserData[u.id]?.recent_work_orders || expandedUserData[u.id].recent_work_orders.length === 0) ? (
                                      <div style={{ padding: '16px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '6px', textAlign: 'center', color: '#94a3b8', fontSize: '0.775rem' }}>
                                        No work orders assigned to this employee.
                                      </div>
                                    ) : (
                                      <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        {expandedUserData[u.id].recent_work_orders.map((wo) => (
                                          <div
                                            key={wo.id}
                                            style={{
                                              backgroundColor: 'rgba(15, 23, 42, 0.7)',
                                              border: '1px solid #1e293b',
                                              borderRadius: '6px',
                                              padding: '8px 12px',
                                              display: 'flex',
                                              justifyContent: 'space-between',
                                              alignItems: 'center'
                                            }}
                                          >
                                            <div>
                                              <strong style={{ fontSize: '0.82rem', color: '#38bdf8' }}>{wo.work_order_number}</strong>
                                              <span style={{ fontSize: '0.725rem', color: '#cbd5e1', marginLeft: '8px' }}>
                                                Machine: <strong>{wo.machine_code || 'Machinery'}</strong> ({wo.machine_name || 'Standard'}) • Priority: {wo.priority}
                                              </span>
                                              <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>
                                                Actual Hours: {wo.actual_hours || '0.0'}h {wo.notes ? `• "${wo.notes}"` : ''}
                                              </div>
                                            </div>
                                            <span className={`badge badge-${wo.status.toLowerCase()}`} style={{ fontSize: '0.675rem' }}>
                                              {wo.status}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Inline Tab 2: Work Logs */}
                                {inlineTab === 'logs' && (
                                  <div>
                                    {(!expandedUserData[u.id]?.work_logs || expandedUserData[u.id].work_logs.length === 0) ? (
                                      <div style={{ padding: '16px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '6px', textAlign: 'center', color: '#94a3b8', fontSize: '0.775rem' }}>
                                        No work logs recorded by this technician yet.
                                      </div>
                                    ) : (
                                      <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        {expandedUserData[u.id].work_logs.map((wl) => (
                                          <div
                                            key={wl.id}
                                            style={{
                                              backgroundColor: 'rgba(15, 23, 42, 0.7)',
                                              border: '1px solid #1e293b',
                                              borderRadius: '6px',
                                              padding: '8px 12px'
                                            }}
                                          >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                              <strong style={{ fontSize: '0.8rem', color: '#38bdf8' }}>{wl.step_description}</strong>
                                              <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                                                {wl.timestamp ? new Date(wl.timestamp).toLocaleTimeString() : ''}
                                              </span>
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: '#e2e8f0', marginTop: '3px' }}>
                                              {wl.action_taken}
                                            </div>
                                            <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '3px' }}>
                                              WO: {wl.work_order_number} • Machine: {wl.machine_code || 'N/A'}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Inline Tab 3: Incidents */}
                                {inlineTab === 'incidents' && (
                                  <div>
                                    {(!expandedUserData[u.id]?.reported_incidents || expandedUserData[u.id].reported_incidents.length === 0) ? (
                                      <div style={{ padding: '16px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '6px', textAlign: 'center', color: '#94a3b8', fontSize: '0.775rem' }}>
                                        No machine incidents reported by this user.
                                      </div>
                                    ) : (
                                      <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        {expandedUserData[u.id].reported_incidents.map((inc) => (
                                          <div
                                            key={inc.id}
                                            style={{
                                              backgroundColor: 'rgba(15, 23, 42, 0.7)',
                                              border: '1px solid #1e293b',
                                              borderRadius: '6px',
                                              padding: '8px 12px',
                                              display: 'flex',
                                              justifyContent: 'space-between',
                                              alignItems: 'center'
                                            }}
                                          >
                                            <div>
                                              <strong style={{ fontSize: '0.8rem', color: '#f87171' }}>{inc.incident_number}</strong>
                                              <span style={{ fontSize: '0.725rem', color: '#cbd5e1', marginLeft: '8px' }}>
                                                {inc.description}
                                              </span>
                                              <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '2px' }}>
                                                Machine: {inc.machine_code || 'N/A'} • Severity: {inc.severity}
                                              </div>
                                            </div>
                                            <span className={`badge badge-${inc.status.toLowerCase()}`} style={{ fontSize: '0.675rem' }}>
                                              {inc.status}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Inline Tab 4: Parts */}
                                {inlineTab === 'parts' && (
                                  <div>
                                    {(!expandedUserData[u.id]?.parts_installed || expandedUserData[u.id].parts_installed.length === 0) ? (
                                      <div style={{ padding: '16px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '6px', textAlign: 'center', color: '#94a3b8', fontSize: '0.775rem' }}>
                                        No spare parts consumption logged for this technician.
                                      </div>
                                    ) : (
                                      <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        {expandedUserData[u.id].parts_installed.map((p) => (
                                          <div
                                            key={p.id}
                                            style={{
                                              backgroundColor: 'rgba(15, 23, 42, 0.7)',
                                              border: '1px solid #1e293b',
                                              borderRadius: '6px',
                                              padding: '8px 12px',
                                              display: 'flex',
                                              justifyContent: 'space-between',
                                              alignItems: 'center'
                                            }}
                                          >
                                            <div>
                                              <strong style={{ fontSize: '0.8rem', color: '#38bdf8' }}>{p.part_name}</strong>
                                              <span style={{ fontSize: '0.725rem', color: '#cbd5e1', marginLeft: '6px' }}>
                                                ({p.part_number}) — {p.quantity} units
                                              </span>
                                              <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '2px' }}>
                                                Work Order #{p.work_order_id}
                                              </div>
                                            </div>
                                            <span style={{ color: '#34d399', fontWeight: 700, fontSize: '0.8rem' }}>
                                              ${p.total_cost}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Strict Access Control Confirmation Modal (Manager Only) */}
      {roleChangeTarget && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '520px' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid #fee2e2', backgroundColor: '#fff5f5' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={20} color="#dc2626" />
                <strong style={{ fontSize: '1.05rem', color: '#991b1b' }}>
                  Strict Access Control Clearance Authorization
                </strong>
              </div>
              <button
                onClick={() => setRoleChangeTarget(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#991b1b' }}
              >
                &times;
              </button>
            </div>

            <div className="modal-body" style={{ padding: '20px' }}>
              <p style={{ fontSize: '0.875rem', color: '#334155', lineHeight: 1.5, marginTop: 0 }}>
                You are about to modify the system authorization clearance for employee{' '}
                <strong>{roleChangeTarget.user.full_name}</strong> (<code>{roleChangeTarget.user.username}</code>).
              </p>

              <div style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '14px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-around'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>Current Role</span>
                  <div style={{ marginTop: '4px' }}>
                    <span className={`badge badge-${roleChangeTarget.user.role?.name?.toLowerCase()}`}>
                      {roleChangeTarget.user.role?.name}
                    </span>
                  </div>
                </div>

                <ArrowRight size={20} color="#94a3b8" />

                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>New Target Role</span>
                  <div style={{ marginTop: '4px' }}>
                    <span className={`badge badge-${roleChangeTarget.newRole.toLowerCase()}`} style={{ fontWeight: 800 }}>
                      {roleChangeTarget.newRole}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{
                backgroundColor: '#fffbeb',
                border: '1px solid #fef3c7',
                padding: '10px 14px',
                borderRadius: '6px',
                fontSize: '0.785rem',
                color: '#92400e',
                lineHeight: 1.45,
                marginBottom: '14px'
              }}>
                ⚠️ <strong>Compliance & Security Protocol:</strong> Changing user clearance will immediately grant or revoke operational privileges across work order dispatch, inventory movements, and safety checklists. This action is permanently logged to the plant audit trail.
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setRoleChangeTarget(null)}
                disabled={updatingRole}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={executeRoleChange}
                disabled={updatingRole}
                style={{ backgroundColor: '#dc2626', borderColor: '#b91c1c' }}
              >
                {updatingRole ? 'Updating Clearance...' : 'Confirm Role Clearance Change'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Maximized Full Work History Modal */}
      {selectedUserHistory && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '850px' }}>
            <div className="modal-header" style={{ alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <strong style={{ fontSize: '1.15rem', color: '#0f172a' }}>
                    {selectedUserHistory.user.full_name} — Live Work History
                  </strong>
                  <span className={`badge badge-${selectedUserHistory.user.role.toLowerCase()}`}>
                    {selectedUserHistory.user.role}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px', fontSize: '0.75rem', color: '#64748b' }}>
                  <span>Username: <strong>{selectedUserHistory.user.username}</strong></span>
                  <span>•</span>
                  <span>Email: <strong>{selectedUserHistory.user.email}</strong></span>
                  <span>•</span>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    color: '#15803d',
                    backgroundColor: '#dcfce7',
                    border: '1px solid #86efac',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontWeight: 700
                  }}>
                    <span style={{
                      display: 'inline-block',
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: '#16a34a'
                    }} />
                    LIVE REAL-TIME SYNC
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedUserHistory(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.4rem', color: '#94a3b8' }}
              >
                &times;
              </button>
            </div>

            <div className="modal-body">
              {/* KPIs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '18px' }}>
                <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '6px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Jobs / Incidents</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                    {selectedUserHistory.stats.total_assigned_jobs || selectedUserHistory.stats.total_reported_incidents || 0}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#16a34a' }}>
                    {selectedUserHistory.stats.completed_jobs || 0} completed
                  </div>
                </div>

                <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '6px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Active in Progress</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f59e0b', marginTop: '2px' }}>
                    {selectedUserHistory.stats.active_jobs || selectedUserHistory.stats.open_reported_incidents || 0}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Real-time active</div>
                </div>

                <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '6px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Logged Repair Time</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#2563eb', marginTop: '2px' }}>
                    {selectedUserHistory.stats.total_hours_logged || 0}h
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#64748b' }}>
                    MTTR: {selectedUserHistory.stats.average_resolution_hours || 0}h avg
                  </div>
                </div>

                <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '6px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Parts Installed</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#16a34a', marginTop: '2px' }}>
                    {selectedUserHistory.stats.total_parts_installed || 0}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#64748b' }}>
                    ${selectedUserHistory.stats.total_parts_cost || 0} cost
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', marginBottom: '14px' }}>
                <button
                  type="button"
                  onClick={() => setActiveHistoryTab('orders')}
                  style={{
                    padding: '8px 14px',
                    fontSize: '0.8rem',
                    fontWeight: activeHistoryTab === 'orders' ? 700 : 500,
                    color: activeHistoryTab === 'orders' ? '#0284c7' : '#64748b',
                    borderBottom: activeHistoryTab === 'orders' ? '2px solid #0284c7' : '2px solid transparent',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Work Orders ({selectedUserHistory.recent_work_orders?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveHistoryTab('logs')}
                  style={{
                    padding: '8px 14px',
                    fontSize: '0.8rem',
                    fontWeight: activeHistoryTab === 'logs' ? 700 : 500,
                    color: activeHistoryTab === 'logs' ? '#0284c7' : '#64748b',
                    borderBottom: activeHistoryTab === 'logs' ? '2px solid #0284c7' : '2px solid transparent',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Diagnostic Work Logs ({selectedUserHistory.work_logs?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveHistoryTab('incidents')}
                  style={{
                    padding: '8px 14px',
                    fontSize: '0.8rem',
                    fontWeight: activeHistoryTab === 'incidents' ? 700 : 500,
                    color: activeHistoryTab === 'incidents' ? '#0284c7' : '#64748b',
                    borderBottom: activeHistoryTab === 'incidents' ? '2px solid #0284c7' : '2px solid transparent',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Reported Incidents ({selectedUserHistory.reported_incidents?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveHistoryTab('parts')}
                  style={{
                    padding: '8px 14px',
                    fontSize: '0.8rem',
                    fontWeight: activeHistoryTab === 'parts' ? 700 : 500,
                    color: activeHistoryTab === 'parts' ? '#0284c7' : '#64748b',
                    borderBottom: activeHistoryTab === 'parts' ? '2px solid #0284c7' : '2px solid transparent',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Parts Consumed ({selectedUserHistory.parts_installed?.length || 0})
                </button>
              </div>

              {/* Work Orders List */}
              {activeHistoryTab === 'orders' && (
                <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedUserHistory.recent_work_orders?.map((wo) => (
                    <div
                      key={wo.id}
                      style={{
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        padding: '10px 14px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: '#ffffff'
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: '0.85rem', color: '#1e293b' }}>{wo.work_order_number}</strong>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '8px' }}>
                          Machine: <strong>{wo.machine_code || 'N/A'}</strong> ({wo.machine_name || 'Machine'}) • Priority: {wo.priority}
                        </span>
                        <div style={{ fontSize: '0.725rem', color: '#64748b', marginTop: '2px' }}>
                          Hours Logged: {wo.actual_hours || '0.0'}h {wo.notes ? `• "${wo.notes}"` : ''}
                        </div>
                      </div>
                      <span className={`badge badge-${wo.status.toLowerCase()}`} style={{ fontSize: '0.7rem' }}>
                        {wo.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedUserHistory(null)}
              >
                Close Work History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Register New Employee Modal (Manager Only) */}
      {showAddModal && isManager && (
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
                    <label className="form-label">Initial Role Clearance *</label>
                    <select
                      className="form-select"
                      value={userForm.role_name}
                      onChange={(e) => setUserForm({ ...userForm, role_name: e.target.value })}
                    >
                      <option value="OPERATOR">OPERATOR (Machine reports & safe diagnostics)</option>
                      <option value="TECHNICIAN">TECHNICIAN (Work orders & repairs)</option>
                      <option value="SUPERVISOR">SUPERVISOR (Assigning & approvals)</option>
                      <option value="MANAGER">MANAGER (Operations & admin)</option>
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
