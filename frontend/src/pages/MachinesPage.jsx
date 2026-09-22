import React, { useState, useEffect } from 'react';
import { machinesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/ToastContainer';
import { Cpu, Search, Plus, Eye, History, CheckCircle, AlertTriangle } from 'lucide-react';

export const MachinesPage = () => {
  const { hasRole } = useAuth();
  const { addToast } = useToast();
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Machine Detail / History Modal State
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [timelineData, setTimelineData] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState('TIMELINE');

  // New Machine Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    machine_code: '',
    name: '',
    type: 'Milling Center',
    department: 'Machining Dept',
    location: 'Bay 1',
  });
  const [savingMachine, setSavingMachine] = useState(false);

  const loadMachines = async () => {
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status_filter = statusFilter;
      const res = await machinesApi.list(params);
      setMachines(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMachines();
  }, [search, statusFilter]);

  const viewMachineDetail = async (machine) => {
    setSelectedMachine(machine);
    setLoadingHistory(true);
    try {
      const [histRes, timeRes] = await Promise.all([
        machinesApi.getHistory(machine.id),
        machinesApi.getTimeline(machine.id),
      ]);
      setHistoryData(histRes.data);
      setTimelineData(timeRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleCreateMachine = async (e) => {
    e.preventDefault();
    setSavingMachine(true);
    try {
      await machinesApi.create(addForm);
      addToast({
        title: 'Machine Registered',
        message: `Equipment ${addForm.machine_code} (${addForm.name}) registered successfully.`,
        type: 'success'
      });
      setShowAddModal(false);
      setAddForm({
        machine_code: '',
        name: '',
        type: 'Milling Center',
        department: 'Machining Dept',
        location: 'Bay 1',
      });
      loadMachines();
    } catch (err) {
      addToast({
        title: 'Registration Failed',
        message: err.response?.data?.detail || 'Failed to create machine equipment record.',
        type: 'error'
      });
    } finally {
      setSavingMachine(false);
    }
  };

  return (
    <div className="page-body">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Industrial Equipment Fleet</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            Browse manufacturing plant machinery, track live operating statuses, and inspect maintenance timelines.
          </p>
        </div>
        {hasRole(['SUPERVISOR', 'MANAGER']) && (
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
            <Plus size={16} /> Register New Machine
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '14px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
            <Search size={18} color="#94a3b8" />
            <input
              type="text"
              className="form-input"
              placeholder="Search machine code, model name, or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ border: 'none', padding: '6px' }}
            />
          </div>
          <div style={{ width: '200px' }}>
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '6px 12px' }}
            >
              <option value="">All Statuses</option>
              <option value="RUNNING">RUNNING</option>
              <option value="WARNING">WARNING</option>
              <option value="DOWN">DOWN</option>
              <option value="MAINTENANCE">MAINTENANCE</option>
            </select>
          </div>
        </div>
      </div>

      {/* Machines Grid */}
      {loading ? (
        <div>Loading equipment fleet...</div>
      ) : machines.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
          No machines found matching query.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {machines.map((m) => (
            <div key={m.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>
                    {m.machine_code}
                  </span>
                  <span className={`badge badge-${m.status.toLowerCase()}`}>
                    {m.status}
                  </span>
                </div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1e293b', marginBottom: '4px' }}>
                  {m.name}
                </h3>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '2px' }}>
                  Type: <strong>{m.type}</strong>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '2px' }}>
                  Dept: <strong>{m.department}</strong>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Location: <strong>{m.location}</strong>
                </div>
              </div>

              <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                <button
                  onClick={() => viewMachineDetail(m)}
                  className="btn btn-secondary btn-sm"
                  style={{ width: '100%' }}
                >
                  <Eye size={14} /> View Specs & Maintenance History
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Machine Detail & History Modal */}
      {selectedMachine && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '750px' }}>
            <div className="modal-header">
              <div>
                <strong style={{ fontSize: '1.1rem', color: '#0f172a' }}>
                  {selectedMachine.machine_code} — {selectedMachine.name}
                </strong>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {selectedMachine.department} | {selectedMachine.location}
                </div>
              </div>
              <button
                onClick={() => setSelectedMachine(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              {/* Status and Specs Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
                <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Current Status</div>
                  <div className={`badge badge-${selectedMachine.status.toLowerCase()}`} style={{ marginTop: '4px' }}>
                    {selectedMachine.status}
                  </div>
                </div>
                <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Equipment Type</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: '4px' }}>{selectedMachine.type}</div>
                </div>
                <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Last Maintenance</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, marginTop: '4px' }}>
                    {selectedMachine.last_maintenance ? new Date(selectedMachine.last_maintenance).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
                <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Next Scheduled</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, marginTop: '4px', color: '#2563eb' }}>
                    {selectedMachine.next_scheduled_maintenance ? new Date(selectedMachine.next_scheduled_maintenance).toLocaleDateString() : 'Pending'}
                  </div>
                </div>
              </div>

              {/* Modal Tabs Header */}
              <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', marginBottom: '16px', paddingBottom: '4px' }}>
                <button
                  type="button"
                  onClick={() => setActiveModalTab('TIMELINE')}
                  style={{
                    border: 'none',
                    background: 'none',
                    borderBottom: activeModalTab === 'TIMELINE' ? '2px solid #2563eb' : '2px solid transparent',
                    color: activeModalTab === 'TIMELINE' ? '#2563eb' : '#64748b',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    padding: '6px 12px',
                    cursor: 'pointer'
                  }}
                >
                  Unified Lifecycle Timeline ({timelineData?.total_events || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModalTab('RECORDS')}
                  style={{
                    border: 'none',
                    background: 'none',
                    borderBottom: activeModalTab === 'RECORDS' ? '2px solid #2563eb' : '2px solid transparent',
                    color: activeModalTab === 'RECORDS' ? '#2563eb' : '#64748b',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    padding: '6px 12px',
                    cursor: 'pointer'
                  }}
                >
                  Official Maintenance Records ({historyData?.maintenance_records?.length || 0})
                </button>
              </div>

              {loadingHistory ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>Loading lifecycle data...</div>
              ) : activeModalTab === 'TIMELINE' ? (
                /* Unified Chronological Timeline */
                <div style={{ maxHeight: '380px', overflowY: 'auto', paddingRight: '4px' }}>
                  {!timelineData || timelineData.timeline.length === 0 ? (
                    <div style={{ padding: '24px', backgroundColor: '#f8fafc', borderRadius: '6px', textAlign: 'center', color: '#94a3b8', fontSize: '0.825rem' }}>
                      No chronological lifecycle events recorded for this machine yet.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {timelineData.timeline.map((evt, idx) => {
                        const isIncident = evt.event_type.startsWith('INCIDENT');
                        const isWO = evt.event_type.startsWith('WORK_ORDER');
                        const isPart = evt.event_type === 'PART_REPLACED';
                        const isApproved = evt.event_type === 'MAINTENANCE_APPROVED';
                        const isPM = evt.event_type === 'PREVENTIVE_MAINTENANCE';

                        const borderColor = isIncident ? '#f87171' : isWO ? '#fbbf24' : isPart ? '#34d399' : isApproved ? '#60a5fa' : '#a78bfa';
                        const bgPill = isIncident ? '#fef2f2' : isWO ? '#fffbeb' : isPart ? '#f0fdf4' : isApproved ? '#eff6ff' : '#f5f3ff';
                        const textPill = isIncident ? '#991b1b' : isWO ? '#92400e' : isPart ? '#166534' : isApproved ? '#1e40af' : '#5b21b6';

                        return (
                          <div
                            key={evt.id || idx}
                            style={{
                              border: '1px solid #e2e8f0',
                              borderLeft: `4px solid ${borderColor}`,
                              borderRadius: '6px',
                              padding: '10px 14px',
                              backgroundColor: '#ffffff'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                                {evt.title}
                              </span>
                              <span style={{
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                backgroundColor: bgPill,
                                color: textPill
                              }}>
                                {evt.event_type.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <p style={{ fontSize: '0.775rem', color: '#475569', margin: '2px 0 6px 0', lineHeight: 1.35 }}>
                              {evt.description}
                            </p>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#94a3b8' }}>
                              <span>Actor: <strong>{evt.actor}</strong></span>
                              <span>{evt.timestamp ? new Date(evt.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : ''}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                /* Official Maintenance Records */
                <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
                  {!historyData || historyData.maintenance_records.length === 0 ? (
                    <div style={{ padding: '24px', backgroundColor: '#f8fafc', borderRadius: '6px', textAlign: 'center', color: '#94a3b8', fontSize: '0.825rem' }}>
                      No completed maintenance records logged for this machine yet.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {historyData.maintenance_records.map((rec) => (
                        <div
                          key={rec.id}
                          style={{
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            padding: '12px',
                            backgroundColor: '#ffffff'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontSize: '0.825rem', fontWeight: 700, color: '#1e293b' }}>
                              {rec.problem_summary}
                            </span>
                            <span className={`badge badge-${rec.approval_status.toLowerCase()}`} style={{ fontSize: '0.65rem' }}>
                              {rec.approval_status}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '6px' }}>
                            Tech: <strong>{rec.technician?.full_name}</strong> | Approver: <strong>{rec.approver?.full_name || 'Pending'}</strong> | Downtime: <strong>{rec.downtime_minutes}m</strong>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#334155' }}>
                            <strong>Root Cause:</strong> {rec.root_cause}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#334155' }}>
                            <strong>Repair Action:</strong> {rec.repair_action}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedMachine(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Machine Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <strong style={{ fontSize: '1rem', color: '#0f172a' }}>Register Industrial Machine</strong>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleCreateMachine}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Machine Code / Asset ID *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. CNC-05, ROBOT-02"
                    value={addForm.machine_code}
                    onChange={(e) => setAddForm({ ...addForm, machine_code: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Machine Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 5-Axis CNC Milling Center"
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                    required
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Equipment Type *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Milling, Lathe, Press"
                      value={addForm.type}
                      onChange={(e) => setAddForm({ ...addForm, type: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Department *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Machining Dept"
                      value={addForm.department}
                      onChange={(e) => setAddForm({ ...addForm, department: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Shop Floor Location *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Bay 2 - Station B"
                    value={addForm.location}
                    onChange={(e) => setAddForm({ ...addForm, location: e.target.value })}
                    required
                  />
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
                  disabled={savingMachine}
                >
                  {savingMachine ? 'Saving...' : 'Register Machine'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
