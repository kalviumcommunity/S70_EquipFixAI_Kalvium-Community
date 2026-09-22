import React, { useState, useEffect } from 'react';
import { documentsApi, machinesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { FileText, Plus, Search, Eye, ExternalLink, History, Sparkles } from 'lucide-react';

export const DocumentsPage = () => {
  const { hasRole } = useAuth();
  const { addToast } = useWebSocket();
  const [documents, setDocuments] = useState([]);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');

  // Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [docForm, setDocForm] = useState({
    title: '',
    doc_type: 'MANUAL',
    machine_id: '',
    file_url: '',
    version_number: '1.0',
    changelog: 'Initial documentation release',
  });
  const [savingDoc, setSavingDoc] = useState(false);

  // Versions Modal
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [ingestingId, setIngestingId] = useState(null);

  const handleIngest = async (docId) => {
    setIngestingId(docId);
    try {
      const res = await documentsApi.ingest(docId);
      addToast('RAG Ingestion Complete', res.data?.message || 'Document indexed into vector store.', 'success');
      loadData();
    } catch (err) {
      addToast('Ingestion Failed', err.response?.data?.detail || 'Failed to index document.', 'error');
    } finally {
      setIngestingId(null);
    }
  };

  const loadData = async () => {
    try {
      const params = {};
      if (typeFilter) params.doc_type = typeFilter;
      const [docsRes, machRes] = await Promise.all([
        documentsApi.list(params),
        machinesApi.list(),
      ]);
      setDocuments(docsRes.data);
      setMachines(machRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [typeFilter]);

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    setSavingDoc(true);
    try {
      await documentsApi.create({
        title: docForm.title,
        doc_type: docForm.doc_type,
        machine_id: docForm.machine_id ? parseInt(docForm.machine_id) : null,
        file_url: docForm.file_url || `/docs/${docForm.title.toLowerCase().replace(/\s+/g, '_')}.pdf`,
        version_number: docForm.version_number,
        changelog: docForm.changelog,
      });
      addToast('Document Uploaded', `Registered ${docForm.title}`, 'success');
      setShowUploadModal(false);
      setDocForm({
        title: '',
        doc_type: 'MANUAL',
        machine_id: '',
        file_url: '',
        version_number: '1.0',
        changelog: 'Initial documentation release',
      });
      loadData();
    } catch (err) {
      addToast('Upload Failed', err.response?.data?.detail || 'Failed to upload equipment document.', 'error');
    } finally {
      setSavingDoc(false);
    }
  };

  return (
    <div className="page-body">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Equipment Manuals & SOPs</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            Central repository of OEM operating manuals, safety protocols, and standard operating procedures.
          </p>
        </div>
        {hasRole(['SUPERVISOR', 'MANAGER']) && (
          <button onClick={() => setShowUploadModal(true)} className="btn btn-primary">
            <Plus size={16} /> Upload Document / SOP
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div className="card" style={{ padding: '12px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Document Type:</span>
          <select
            className="form-select"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{ width: '220px', padding: '6px 12px' }}
          >
            <option value="">All Document Types</option>
            <option value="MANUAL">Equipment Manuals</option>
            <option value="SOP">Standard Operating Procedures (SOP)</option>
            <option value="SAFETY">Safety Procedures (LOTO)</option>
            <option value="TROUBLESHOOTING">Troubleshooting Matrices</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
        {documents.map((doc) => (
          <div key={doc.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="badge badge-open" style={{ fontSize: '0.65rem' }}>
                    {doc.doc_type}
                  </span>
                  {doc.indexing_status === 'INDEXED' ? (
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      color: '#166534',
                      backgroundColor: '#dcfce7',
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}>
                      ✓ RAG INDEXED
                    </span>
                  ) : (
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      color: '#92400e',
                      backgroundColor: '#fef3c7',
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}>
                      PENDING INDEX
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {doc.versions?.length || 1} versions
                </span>
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                {doc.title}
              </h3>
              <div style={{ fontSize: '0.8rem', color: '#475569', marginBottom: '4px' }}>
                Associated Asset: <strong>{doc.machine ? `${doc.machine.machine_code} (${doc.machine.name})` : 'Plant-Wide'}</strong>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Updated: {new Date(doc.updated_at).toLocaleDateString()}
              </div>
            </div>

            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={() => handleIngest(doc.id)}
                className="btn btn-secondary btn-sm"
                disabled={ingestingId === doc.id}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}
                title="Extract pages, generate sliding-window chunks, and compute 384-d semantic embeddings"
              >
                <Sparkles size={13} color="#0284c7" /> {ingestingId === doc.id ? 'Indexing...' : 'Index for RAG'}
              </button>
              <button
                onClick={() => setSelectedDoc(doc)}
                className="btn btn-secondary btn-sm"
                style={{ flex: 1, fontSize: '0.75rem' }}
              >
                <History size={13} /> History
              </button>
              <a
                href={doc.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none', fontSize: '0.75rem' }}
              >
                <ExternalLink size={13} /> View
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <strong style={{ fontSize: '1rem', color: '#0f172a' }}>Upload Operational Document</strong>
              <button
                onClick={() => setShowUploadModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleUploadSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Document Title *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. CNC-04 High Speed Spindle Maintenance Manual"
                    value={docForm.title}
                    onChange={(e) => setDocForm({ ...docForm, title: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Document Category *</label>
                    <select
                      className="form-select"
                      value={docForm.doc_type}
                      onChange={(e) => setDocForm({ ...docForm, doc_type: e.target.value })}
                    >
                      <option value="MANUAL">Equipment Manual</option>
                      <option value="SOP">Standard Operating Procedure</option>
                      <option value="SAFETY">Safety Procedure (LOTO)</option>
                      <option value="TROUBLESHOOTING">Troubleshooting Guide</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Associated Machine (Optional)</label>
                    <select
                      className="form-select"
                      value={docForm.machine_id}
                      onChange={(e) => setDocForm({ ...docForm, machine_id: e.target.value })}
                    >
                      <option value="">Plant-Wide / General</option>
                      {machines.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.machine_code} — {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Document / PDF Storage Path or URL</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="/docs/manuals/sample_manual.pdf"
                    value={docForm.file_url}
                    onChange={(e) => setDocForm({ ...docForm, file_url: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Version *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={docForm.version_number}
                      onChange={(e) => setDocForm({ ...docForm, version_number: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Release Notes</label>
                    <input
                      type="text"
                      className="form-input"
                      value={docForm.changelog}
                      onChange={(e) => setDocForm({ ...docForm, changelog: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowUploadModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingDoc}
                >
                  {savingDoc ? 'Registering...' : 'Register Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Version History Modal */}
      {selectedDoc && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <strong style={{ fontSize: '1rem', color: '#0f172a' }}>
                Version History: {selectedDoc.title}
              </strong>
              <button
                onClick={() => setSelectedDoc(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {selectedDoc.versions?.map((v) => (
                  <div key={v.id} style={{ border: '1px solid #e2e8f0', padding: '12px', borderRadius: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>Version {v.version_number}</strong>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{new Date(v.created_at).toLocaleDateString()}</span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: '#475569', margin: '4px 0 0 0' }}>
                      {v.changelog || 'No changelog recorded.'}
                    </p>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '6px' }}>
                      Path: {v.file_url}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedDoc(null)}
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
