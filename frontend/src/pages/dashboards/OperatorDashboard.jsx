import React, { useState, useEffect, useRef } from 'react';
import { incidentsApi, machinesApi, uploadApi } from '../../services/api';
import { useWebSocket } from '../../context/WebSocketContext';
import {
  AlertTriangle, PlusCircle, CheckCircle, Clock, Cpu, Image as ImageIcon,
  Upload, Paperclip, Sparkles, HardHat, Shield
} from 'lucide-react';
import AICopilotPromptCard from '../../components/ai/AICopilotPromptCard';

export const OperatorDashboard = () => {
  const { lastEvent, addToast } = useWebSocket();
  const [incidents, setIncidents] = useState([]);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);

  // Problem Report Form State
  const [selectedMachine, setSelectedMachine] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('MEDIUM');
  const [imageUrl, setImageUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const fileInputRef = useRef(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const res = await uploadApi.uploadFile(file);
      setImageUrl(res.data.file_url);
      addToast('File Attached', `Uploaded ${res.data.original_filename} successfully.`, 'success');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || 'Failed to upload attachment.');
    } finally {
      setUploadingFile(false);
    }
  };

  const loadData = async () => {
    try {
      const [incRes, machRes] = await Promise.all([
        incidentsApi.list(),
        machinesApi.list(),
      ]);
      setIncidents(incRes.data);
      setMachines(machRes.data);
      if (machRes.data.length > 0 && !selectedMachine) {
        setSelectedMachine(machRes.data[0].id);
      }
    } catch (err) {
      console.error('Error loading operator data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [lastEvent]);

  const handleReportProblem = async (e) => {
    e.preventDefault();
    if (!selectedMachine || !description) return;

    setSubmitting(true);
    setSuccessMsg('');
    try {
      const payload = {
        machine_id: parseInt(selectedMachine),
        description,
        severity,
        image_url: imageUrl || null,
      };
      const res = await incidentsApi.report(payload);
      addToast('Incident Reported', `Created incident ${res.data.incident_number}`, 'success');
      setSuccessMsg(`Incident ${res.data.incident_number} successfully registered! A supervisor has been notified.`);
      setDescription('');
      setImageUrl('');
      loadData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || 'Failed to report incident.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="page-body">Loading operator workspace...</div>;
  }

  return (
    <div className="page-body">
      {/* Modern Enterprise Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 className="page-title" style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>
              Shop Floor Operator Portal
            </h1>
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              backgroundColor: '#ecfdf5',
              color: '#059669',
              border: '1px solid #a7f3d0',
              padding: '2px 8px',
              borderRadius: '12px'
            }}>
              STATION OPERATIONAL
            </span>
          </div>
          <p className="page-subtitle" style={{ fontSize: '0.95rem', color: 'var(--slate-500)', marginTop: '4px' }}>
            Report machine anomalies, query AI operating guidelines, and follow real-time maintenance dispatches.
          </p>
        </div>

        {/* Primary Role CTA Button */}
        <button
          type="button"
          onClick={() => {
            document.getElementById('report-form-section')?.scrollIntoView({ behavior: 'smooth' });
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
          <PlusCircle size={16} />
          <span>Report Equipment Problem</span>
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
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Monitored Equipment</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{machines.length}</div>
          <div style={{ fontSize: '0.7rem', color: '#059669', marginTop: '2px' }}>Operational plant cells</div>
        </div>
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Total Incidents</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#2563eb', marginTop: '4px' }}>{incidents.length}</div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>Recorded across shift</div>
        </div>
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Under Repair</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#d97706', marginTop: '4px' }}>
            {incidents.filter(i => i.status === 'IN_PROGRESS' || i.status === 'ASSIGNED').length}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#d97706', marginTop: '2px' }}>Technician dispatched</div>
        </div>
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Resolved & Closed</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#059669', marginTop: '4px' }}>
            {incidents.filter(i => i.status === 'RESOLVED' || i.status === 'CLOSED').length}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#059669', marginTop: '2px' }}>Back online</div>
        </div>
      </div>

      {/* Prominent AI Copilot Prompt Entry Card */}
      <AICopilotPromptCard
        title="EquipFix AI Operator Assistant"
        subtitle="Check standard operating procedures, alarm codes, and safety lockouts before filing a report."
      />

      <div id="report-form-section" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '24px' }}>
        {/* Left: Report Problem Form */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">
              <PlusCircle size={18} color="#2563eb" /> Report Machine Issue
            </span>
          </div>

          {successMsg && (
            <div style={{
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              color: '#065f46',
              padding: '10px 14px',
              borderRadius: '6px',
              fontSize: '0.8rem',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <CheckCircle size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleReportProblem}>
            <div className="form-group">
              <label className="form-label">Affected Machine / Station *</label>
              <select
                className="form-select"
                value={selectedMachine}
                onChange={(e) => setSelectedMachine(e.target.value)}
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
              <label className="form-label">Severity Level *</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((sev) => (
                  <button
                    key={sev}
                    type="button"
                    onClick={() => setSeverity(sev)}
                    style={{
                      padding: '8px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      border: severity === sev ? '2px solid #2563eb' : '1px solid #e2e8f0',
                      backgroundColor: severity === sev ? '#eff6ff' : '#ffffff',
                      color: severity === sev ? '#1d4ed8' : '#64748b',
                      cursor: 'pointer'
                    }}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Problem Description *</label>
              <textarea
                className="form-textarea"
                rows="4"
                placeholder="Describe symptoms, noise, error codes, temperature, or unusual vibration..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Photo / Attachment (Upload or URL)</label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".jpg,.jpeg,.png,.pdf,.txt"
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn btn-secondary btn-sm"
                  disabled={uploadingFile}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Upload size={14} />
                  {uploadingFile ? 'Uploading...' : 'Choose File / Photo'}
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                  <ImageIcon size={16} color="#94a3b8" />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Or enter image / document URL..."
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                  />
                </div>
              </div>
              {imageUrl && (
                <div style={{ fontSize: '0.75rem', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Paperclip size={12} /> Attached: {imageUrl}
                </div>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '10px' }}
              disabled={submitting}
            >
              {submitting ? 'Submitting Report...' : 'Submit Incident Report'}
            </button>
          </form>
        </div>

        {/* Right: My Reported Incidents */}
        <div>
          <div className="card">
            <div className="card-header">
              <span className="card-title">
                <Clock size={18} color="#0f172a" /> My Reported Incidents ({incidents.length})
              </span>
            </div>

            {incidents.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                You haven't reported any equipment problems yet.
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Incident ID</th>
                      <th>Machine</th>
                      <th>Problem Description</th>
                      <th>Severity</th>
                      <th>Status</th>
                      <th>Reported</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incidents.map((inc) => (
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
                        <td style={{ maxWidth: '240px' }}>
                          <span style={{ fontSize: '0.8rem' }}>{inc.description}</span>
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
                        <td style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {new Date(inc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Machine Status Overview */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">
                <Cpu size={18} color="#0f172a" /> Plant Equipment Status Overview
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
              {machines.map((m) => (
                <div
                  key={m.id}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    padding: '12px',
                    backgroundColor: '#ffffff'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <strong style={{ fontSize: '0.85rem' }}>{m.machine_code}</strong>
                    <span className={`badge badge-${m.status.toLowerCase()}`} style={{ fontSize: '0.65rem' }}>
                      {m.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{m.department}</div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{m.location}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
