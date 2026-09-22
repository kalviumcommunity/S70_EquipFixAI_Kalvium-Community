import React, { useState, useEffect } from 'react';
import { maintenanceApi, machinesApi, usersApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { Calendar, Plus, Play, CheckCircle, Clock } from 'lucide-react';

export const SchedulesPage = () => {
  const { hasRole } = useAuth();
  const { addToast } = useWebSocket();
  const [schedules, setSchedules] = useState([]);
  const [machines, setMachines] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Schedule Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    machine_id: '',
    task_name: '',
    description: '',
    frequency: 'MONTHLY',
    assigned_role_or_user: 'TECHNICIAN',
    next_due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });
  const [savingSchedule, setSavingSchedule] = useState(false);

  // Generate WO State
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [assignedTechId, setAssignedTechId] = useState('');
  const [generating, setGenerating] = useState(false);

  const loadData = async () => {
    try {
      const [schedRes, machRes, techRes] = await Promise.all([
        maintenanceApi.listSchedules(),
        machinesApi.list(),
        usersApi.list({ role_name: 'TECHNICIAN' }),
      ]);
      setSchedules(schedRes.data);
      setMachines(machRes.data);
      setTechnicians(techRes.data);
      if (machRes.data.length > 0 && !scheduleForm.machine_id) {
        setScheduleForm(prev => ({ ...prev, machine_id: machRes.data[0].id }));
      }
      if (techRes.data.length > 0 && !assignedTechId) {
        setAssignedTechId(techRes.data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    setSavingSchedule(true);
    try {
      await maintenanceApi.createSchedule({
        machine_id: parseInt(scheduleForm.machine_id),
        task_name: scheduleForm.task_name,
        description: scheduleForm.description,
        frequency: scheduleForm.frequency,
        assigned_role_or_user: scheduleForm.assigned_role_or_user,
        next_due_date: new Date(scheduleForm.next_due_date).toISOString(),
      });
      addToast('Schedule Created', 'Preventive schedule registered.', 'success');
      setShowAddModal(false);
      loadData();
    } catch (err) {
      addToast('Schedule Failed', err.response?.data?.detail || 'Failed to create schedule.', 'error');
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleGenerateWO = async (e) => {
    e.preventDefault();
    if (!selectedSchedule || !assignedTechId) return;
    setGenerating(true);
    try {
      await maintenanceApi.generateWO(selectedSchedule.id, assignedTechId);
      addToast('Work Order Dispatched', `Generated PM work order for ${selectedSchedule.task_name}`, 'success');
      setSelectedSchedule(null);
      loadData();
    } catch (err) {
      addToast('Dispatch Failed', err.response?.data?.detail || 'Failed to generate work order.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="page-body">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Preventive Maintenance Schedules</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            Automated recurring inspection routines, calibration schedules, and PM work order generation foundation.
          </p>
        </div>
        {hasRole(['SUPERVISOR', 'MANAGER']) && (
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
            <Plus size={16} /> New PM Schedule
          </button>
        )}
      </div>

      {/* Schedules Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Task Name</th>
                <th>Machine</th>
                <th>Frequency</th>
                <th>Assigned Role</th>
                <th>Next Due Date</th>
                <th>Last Performed</th>
                <th>Status</th>
                {hasRole(['SUPERVISOR', 'MANAGER']) && <th>Action</th>}
              </tr>
            </thead>
            <tbody>
              {schedules.map((s) => (
                <tr key={s.id}>
                  <td>
                    <strong style={{ color: '#0f172a' }}>{s.task_name}</strong>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{s.description}</div>
                  </td>
                  <td>
                    <strong>{s.machine?.machine_code}</strong>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{s.machine?.name}</div>
                  </td>
                  <td>
                    <span className="badge badge-open" style={{ fontSize: '0.7rem' }}>
                      {s.frequency}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>{s.assigned_role_or_user}</td>
                  <td>
                    <strong style={{ color: '#2563eb', fontSize: '0.85rem' }}>
                      {new Date(s.next_due_date).toLocaleDateString()}
                    </strong>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    {s.last_performed_date ? new Date(s.last_performed_date).toLocaleDateString() : 'Never'}
                  </td>
                  <td>
                    <span className="badge badge-running">{s.status}</span>
                  </td>
                  {hasRole(['SUPERVISOR', 'MANAGER']) && (
                    <td>
                      <button
                        onClick={() => setSelectedSchedule(s)}
                        className="btn btn-secondary btn-sm"
                      >
                        <Play size={14} /> Dispatch WO
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add PM Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <strong style={{ fontSize: '1rem', color: '#0f172a' }}>Create Preventive Schedule</strong>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleCreateSchedule}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Target Equipment *</label>
                  <select
                    className="form-select"
                    value={scheduleForm.machine_id}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, machine_id: e.target.value })}
                    required
                  >
                    {machines.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.machine_code} — {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">PM Task Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Monthly Hydraulic Filter Replacement"
                    value={scheduleForm.task_name}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, task_name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Task Instructions / SOP Details</label>
                  <textarea
                    className="form-textarea"
                    rows="3"
                    placeholder="Detailed steps for inspection and maintenance..."
                    value={scheduleForm.description}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, description: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Frequency *</label>
                    <select
                      className="form-select"
                      value={scheduleForm.frequency}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, frequency: e.target.value })}
                    >
                      <option value="DAILY">DAILY</option>
                      <option value="WEEKLY">WEEKLY</option>
                      <option value="MONTHLY">MONTHLY</option>
                      <option value="QUARTERLY">QUARTERLY</option>
                      <option value="ANNUAL">ANNUAL</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Initial Due Date *</label>
                    <input
                      type="date"
                      className="form-input"
                      value={scheduleForm.next_due_date}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, next_due_date: e.target.value })}
                      required
                    />
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
                  disabled={savingSchedule}
                >
                  {savingSchedule ? 'Saving...' : 'Register Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dispatch WO Modal */}
      {selectedSchedule && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <strong style={{ fontSize: '1rem', color: '#0f172a' }}>
                Dispatch PM Work Order: {selectedSchedule.task_name}
              </strong>
              <button
                onClick={() => setSelectedSchedule(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleGenerateWO}>
              <div className="modal-body">
                <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '16px' }}>
                  Triggering this schedule generates a routine Preventive Maintenance work order for machine <strong>{selectedSchedule.machine?.machine_code}</strong> and advances the schedule due date.
                </p>

                <div className="form-group">
                  <label className="form-label">Assign Technician *</label>
                  <select
                    className="form-select"
                    value={assignedTechId}
                    onChange={(e) => setAssignedTechId(e.target.value)}
                    required
                  >
                    {technicians.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.full_name} ({t.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSelectedSchedule(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={generating}
                >
                  {generating ? 'Dispatching...' : 'Dispatch Work Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
