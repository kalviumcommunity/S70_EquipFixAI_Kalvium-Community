import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { documentsApi, machinesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { AICopilotModal } from '../components/ai/AICopilotModal';
import {
  FileText, Plus, Search, Eye, ExternalLink, History, Sparkles,
  Shield, ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle2,
  BookOpen, Zap, Lock, Unlock, Download, Printer, ArrowRight,
  Filter, Cpu, X, FileCheck, Layers, RefreshCw, Check, Clock,
  ChevronRight, Wrench, Flame, Droplets, Wind
} from 'lucide-react';

export const DocumentsPage = () => {
  const { hasRole, user } = useAuth();
  const { addToast, lastEvent } = useWebSocket();
  const [searchParams, setSearchParams] = useSearchParams();

  // Read URL param: e.g. /documents?type=SAFETY
  const urlType = searchParams.get('type') || '';

  const [activeTab, setActiveTab] = useState(
    urlType === 'SAFETY' ? 'SAFETY' : (urlType === 'MANUAL' ? 'MANUAL' : 'MANUAL')
  );

  const [documents, setDocuments] = useState([]);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [machineFilter, setMachineFilter] = useState('');

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

  // Versions Modal State
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [ingestingId, setIngestingId] = useState(null);

  // Interactive Document Reader Modal State
  const [readerDoc, setReaderDoc] = useState(null);
  const [readerContent, setReaderContent] = useState(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [readerSearch, setReaderSearch] = useState('');
  const [activeSectionIdx, setActiveSectionIdx] = useState(0);

  // Interactive OSHA LOTO Execution Checklist Modal State
  const [lotoDoc, setLotoDoc] = useState(null);
  const [lotoSteps, setLotoSteps] = useState([]);
  const [checkedLotoSteps, setCheckedLotoSteps] = useState({});
  const [lotoSignedOff, setLotoSignedOff] = useState(false);
  const [lotoSignOffTime, setLotoSignOffTime] = useState(null);

  // AI Copilot Integration Modal State
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [copilotContext, setCopilotContext] = useState({
    machineId: null,
    machineCode: '',
    question: ''
  });

  // Sync activeTab when URL query changes
  useEffect(() => {
    if (urlType === 'SAFETY') {
      setActiveTab('SAFETY');
    } else if (urlType === 'MANUAL') {
      setActiveTab('MANUAL');
    } else if (urlType === 'SOP') {
      setActiveTab('SOP');
    } else if (urlType === 'ALL') {
      setActiveTab('ALL');
    }
  }, [urlType]);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    if (newTab === 'ALL') {
      setSearchParams({});
    } else {
      setSearchParams({ type: newTab });
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [docsRes, machRes] = await Promise.all([
        documentsApi.list({}),
        machinesApi.list(),
      ]);
      setDocuments(docsRes.data);
      setMachines(machRes.data);
    } catch (err) {
      console.error('Failed to load documentation', err);
      addToast('Error', 'Failed to load documents catalog.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [lastEvent]);

  // Handle RAG Ingestion
  const handleIngest = async (docId, docTitle) => {
    setIngestingId(docId);
    try {
      const res = await documentsApi.ingest(docId);
      addToast('RAG Ingestion Complete', res.data?.message || `"${docTitle}" indexed into vector store.`, 'success');
      loadData();
    } catch (err) {
      addToast('Ingestion Failed', err.response?.data?.detail || 'Failed to index document.', 'error');
    } finally {
      setIngestingId(null);
    }
  };

  // Open In-App Document Reader
  const handleOpenReader = async (doc) => {
    setReaderDoc(doc);
    setLoadingContent(true);
    setReaderSearch('');
    setActiveSectionIdx(0);
    try {
      const res = await documentsApi.getContent(doc.id);
      setReaderContent(res.data);
    } catch (err) {
      console.error('Failed to fetch document content', err);
      setReaderContent({
        title: doc.title,
        doc_type: doc.doc_type,
        raw_content: 'Full text content could not be loaded from backend storage.',
        sections: [{ title: 'Overview', content: 'Document content is being indexed or file path is offline.' }]
      });
    } finally {
      setLoadingContent(false);
    }
  };

  // Open OSHA LOTO Live Checklist
  const handleOpenLotoExecution = async (doc) => {
    setLotoDoc(doc);
    setCheckedLotoSteps({});
    setLotoSignedOff(false);
    setLotoSignOffTime(null);

    // Standard 7 OSHA 1910.147 Steps
    const defaultSteps = [
      {
        step_number: 1,
        title: 'Preparation & Mandatory Operator Notification',
        hazard: 'Unanticipated start-up during personnel entry',
        action: 'Notify all affected operators, floor technicians, and area supervisors that equipment is being locked out for servicing.',
        standard: 'OSHA 29 CFR 1910.147(c)(5)',
        energy_type: 'Administrative & Procedural'
      },
      {
        step_number: 2,
        title: 'Orderly Machine Shutdown & E-Stop Tripping',
        hazard: 'Kinetic inertia and mechanical jam under load',
        action: 'Depress operator console Emergency Stop (E-Stop). Complete normal machine cycle and switch main console selector to MAINTENANCE MODE.',
        standard: 'OSHA 29 CFR 1910.147(d)(2)',
        energy_type: 'Kinetic & Controls'
      },
      {
        step_number: 3,
        title: 'Hazardous Energy Source Isolation',
        hazard: '480V 3-Phase AC, 210 Bar Hydraulic, 90 PSI Pneumatic',
        action: 'Disconnect primary fused breaker MDP-3 (pull down handle to OFF), close hydraulic shutoff ball valve HV-101, and vent pneumatic regulator PV-202.',
        standard: 'OSHA 29 CFR 1910.147(d)(3)',
        energy_type: 'Electrical & Fluid Power'
      },
      {
        step_number: 4,
        title: 'Lockout & Tagout (LOTO) Hardware Application',
        hazard: 'Unauthorized re-energization by third party',
        action: 'Affix designated personal Red Safety Padlock (Keyed Different) and Master Lockout Hasp to breaker handle and ball valve lockouts. Attach standardized DANGER DO NOT OPERATE tag.',
        standard: 'OSHA 29 CFR 1910.147(c)(5)(ii)',
        energy_type: 'Physical Interlock'
      },
      {
        step_number: 5,
        title: 'Stored Energy Dissipation & Mechanical Blocking',
        hazard: 'Hydraulic accumulator residual pressure & gravity ram drop',
        action: 'Open manual needle bleed valve BV-2 to vent accumulator pressure to 0 Bar. Ground high-voltage VFD capacitors. Insert mechanical steel safety prop blocks beneath hydraulic ram.',
        standard: 'OSHA 29 CFR 1910.147(d)(5)',
        energy_type: 'Stored Energy (Hydraulic / Gravity)'
      },
      {
        step_number: 6,
        title: 'Zero-Energy Verification (NFPA 70E 3-Point Test)',
        hazard: 'Arc flash / electrocution from backfed or residual charge',
        action: 'Perform 3-point multimeter voltage verification on all phases L1-L2, L2-L3, L1-L3 and Phase-to-Ground: (1) Test known live circuit, (2) Test de-energized machine terminals (must read 0.0V), (3) Re-test known live circuit.',
        standard: 'NFPA 70E 120.5 & OSHA 1910.147(d)(6)',
        energy_type: 'Verification'
      },
      {
        step_number: 7,
        title: 'Zero-Energy Work Authorization & Clearance',
        hazard: 'Proceeding without recorded safety clearance',
        action: 'Confirm machine is in absolute Zero-Energy State (ZES). Record technician digital badge sign-off in EquipFixAI audit log and clear zone for safe mechanical overhaul.',
        standard: 'OSHA 1910.147 Audit Compliance',
        energy_type: 'Sign-Off'
      }
    ];

    try {
      const res = await documentsApi.getContent(doc.id);
      if (res.data?.loto_steps && res.data.loto_steps.length > 0) {
        // Merge backend steps with formatted fields
        const formatted = res.data.loto_steps.map((st, i) => {
          const matchDefault = defaultSteps[i] || defaultSteps[defaultSteps.length - 1];
          return {
            step_number: st.step_number || i + 1,
            title: st.description?.split(':')[0] || matchDefault.title,
            action: st.description || matchDefault.action,
            hazard: matchDefault.hazard,
            standard: matchDefault.standard,
            energy_type: matchDefault.energy_type
          };
        });
        setLotoSteps(formatted);
      } else {
        setLotoSteps(defaultSteps);
      }
    } catch {
      setLotoSteps(defaultSteps);
    }
  };

  const handleToggleLotoStep = (stepNumber) => {
    setCheckedLotoSteps((prev) => ({
      ...prev,
      [stepNumber]: !prev[stepNumber]
    }));
  };

  const handleSignOffLoto = () => {
    setLotoSignedOff(true);
    setLotoSignOffTime(new Date().toLocaleTimeString());
    addToast(
      'Zero-Energy Certified',
      `OSHA 1910.147 isolation protocol certified by ${user?.full_name || 'Technician'}!`,
      'success'
    );
  };

  // Launch AI Copilot with Manual Context
  const handleAskAIAboutDoc = (doc) => {
    const machineCode = doc.machine?.machine_code || 'General Plant Equipment';
    const initialQ = `I am reviewing the official "${doc.title}" for ${machineCode}. Provide an operational overview, critical safety steps (including OSHA LOTO), and the top 3 troubleshooting failure modes described in this manual.`;
    setCopilotContext({
      machineId: doc.machine_id,
      machineCode: doc.machine?.machine_code || '',
      question: initialQ
    });
    setCopilotOpen(true);
  };

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      // Tab filter
      if (activeTab === 'SAFETY' && doc.doc_type !== 'SAFETY') return false;
      if (activeTab === 'MANUAL' && doc.doc_type !== 'MANUAL') return false;
      if (activeTab === 'SOP' && doc.doc_type !== 'SOP') return false;

      // Machine filter
      if (machineFilter && String(doc.machine_id) !== String(machineFilter)) return false;

      // Text query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = (doc.title || '').toLowerCase().includes(q);
        const typeMatch = (doc.doc_type || '').toLowerCase().includes(q);
        const machineMatch = (doc.machine?.machine_code || '').toLowerCase().includes(q) ||
                             (doc.machine?.name || '').toLowerCase().includes(q);
        if (!titleMatch && !typeMatch && !machineMatch) return false;
      }

      return true;
    });
  }, [documents, activeTab, machineFilter, searchQuery]);

  // Counts for KPI Header
  const safetyCount = useMemo(() => documents.filter((d) => d.doc_type === 'SAFETY').length, [documents]);
  const manualCount = useMemo(() => documents.filter((d) => d.doc_type === 'MANUAL').length, [documents]);
  const sopCount = useMemo(() => documents.filter((d) => d.doc_type === 'SOP').length, [documents]);
  const indexedCount = useMemo(() => documents.filter((d) => d.indexing_status === 'INDEXED').length, [documents]);

  // Handle Upload Form
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    setSavingDoc(true);
    try {
      await documentsApi.create({
        title: docForm.title,
        doc_type: docForm.doc_type,
        machine_id: docForm.machine_id ? parseInt(docForm.machine_id) : null,
        file_url: docForm.file_url || `/docs/${docForm.title.toLowerCase().replace(/\s+/g, '_')}.txt`,
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

  const getDocTypeBadge = (docType) => {
    switch (docType) {
      case 'SAFETY':
        return (
          <span style={{
            fontSize: '0.68rem',
            fontWeight: 800,
            color: '#15803d',
            backgroundColor: '#dcfce7',
            border: '1px solid #86efac',
            padding: '3px 8px',
            borderRadius: '6px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <ShieldCheck size={12} color="#16a34a" /> OSHA 1910.147 LOTO
          </span>
        );
      case 'MANUAL':
        return (
          <span style={{
            fontSize: '0.68rem',
            fontWeight: 800,
            color: '#0369a1',
            backgroundColor: '#e0f2fe',
            border: '1px solid #7dd3fc',
            padding: '3px 8px',
            borderRadius: '6px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <BookOpen size={12} color="#0284c7" /> OEM TECHNICAL MANUAL
          </span>
        );
      case 'SOP':
        return (
          <span style={{
            fontSize: '0.68rem',
            fontWeight: 800,
            color: '#b45309',
            backgroundColor: '#fef3c7',
            border: '1px solid #fcd34d',
            padding: '3px 8px',
            borderRadius: '6px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <FileCheck size={12} color="#d97706" /> STANDARD OPERATING PROCEDURE
          </span>
        );
      default:
        return (
          <span style={{
            fontSize: '0.68rem',
            fontWeight: 800,
            color: '#6d28d9',
            backgroundColor: '#ede9fe',
            border: '1px solid #c4b5fd',
            padding: '3px 8px',
            borderRadius: '6px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <Zap size={12} color="#7c3aed" /> {docType}
          </span>
        );
    }
  };

  return (
    <div className="page-body">
      {/* Top Header Banner */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <div style={{
              backgroundColor: activeTab === 'SAFETY' ? '#166534' : '#0284c7',
              color: '#ffffff',
              padding: '8px',
              borderRadius: '10px',
              display: 'flex',
              boxShadow: activeTab === 'SAFETY'
                ? '0 0 16px rgba(22, 101, 52, 0.4)'
                : '0 0 16px rgba(2, 132, 199, 0.4)'
            }}>
              {activeTab === 'SAFETY' ? <ShieldCheck size={26} /> : <BookOpen size={26} />}
            </div>
            <div>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                {activeTab === 'SAFETY'
                  ? 'OSHA 1910.147 Hazardous Energy & LOTO Safety Standards'
                  : 'Technical Manuals & Industrial OEM Schematics'}
              </h1>
              <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '4px 0 0 0' }}>
                {activeTab === 'SAFETY'
                  ? 'Zero-energy isolation protocols, NFPA 70E Arc Flash electrical PPE requirements, and plant Lockout/Tagout procedures.'
                  : 'Central repository of machine maintenance manuals, engineering CAD blueprints, and standardized operating procedures.'}
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={() => {
              setCopilotContext({
                machineId: null,
                machineCode: '',
                question: activeTab === 'SAFETY'
                  ? 'What are the mandatory OSHA 1910.147 steps for zero energy verification on plant electrical substations and hydraulic presses?'
                  : 'Give me a summary of available machine maintenance manuals and their lubrication intervals.'
              });
              setCopilotOpen(true);
            }}
            className="btn btn-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              borderColor: '#38bdf8',
              color: '#0369a1',
              fontWeight: 700
            }}
          >
            <Sparkles size={16} color="#0284c7" /> Ask AI Diagnostics
          </button>

          {hasRole(['SUPERVISOR', 'MANAGER']) && (
            <button onClick={() => setShowUploadModal(true)} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Plus size={16} /> Upload Industrial Manual / SOP
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Highlights Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '14px',
        marginBottom: '20px'
      }}>
        <div className="card" style={{
          padding: '14px 18px',
          borderLeft: '4px solid #16a34a',
          backgroundColor: activeTab === 'SAFETY' ? '#f0fdf4' : '#ffffff'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
              OSHA LOTO Standards
            </span>
            <ShieldCheck size={18} color="#16a34a" />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>
            {safetyCount} Procedures
          </div>
          <div style={{ fontSize: '0.72rem', color: '#15803d', marginTop: '2px' }}>
            Zero-energy state certified
          </div>
        </div>

        <div className="card" style={{
          padding: '14px 18px',
          borderLeft: '4px solid #0284c7',
          backgroundColor: activeTab === 'MANUAL' ? '#f0f9ff' : '#ffffff'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0369a1', textTransform: 'uppercase' }}>
              Technical Manuals
            </span>
            <BookOpen size={18} color="#0284c7" />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>
            {manualCount} OEM Manuals
          </div>
          <div style={{ fontSize: '0.72rem', color: '#0284c7', marginTop: '2px' }}>
            Complete mechanical specs
          </div>
        </div>

        <div className="card" style={{
          padding: '14px 18px',
          borderLeft: '4px solid #d97706',
          backgroundColor: activeTab === 'SOP' ? '#fffbeb' : '#ffffff'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#b45309', textTransform: 'uppercase' }}>
              Operating SOPs
            </span>
            <FileCheck size={18} color="#d97706" />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>
            {sopCount} Procedures
          </div>
          <div style={{ fontSize: '0.72rem', color: '#b45309', marginTop: '2px' }}>
            Shift calibration & safety
          </div>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #7c3aed' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6d28d9', textTransform: 'uppercase' }}>
              Vector RAG Memory
            </span>
            <Sparkles size={18} color="#7c3aed" />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>
            {indexedCount} / {documents.length} Indexed
          </div>
          <div style={{ fontSize: '0.72rem', color: '#7c3aed', marginTop: '2px' }}>
            Multi-chunk semantic embeddings
          </div>
        </div>
      </div>

      {/* Modern Navigation Tabs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        borderBottom: '2px solid #e2e8f0',
        marginBottom: '18px',
        overflowX: 'auto',
        paddingBottom: '2px'
      }}>
        <button
          onClick={() => handleTabChange('SAFETY')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            fontSize: '0.9rem',
            fontWeight: 700,
            cursor: 'pointer',
            border: 'none',
            background: 'none',
            color: activeTab === 'SAFETY' ? '#15803d' : '#64748b',
            borderBottom: activeTab === 'SAFETY' ? '3px solid #16a34a' : '3px solid transparent',
            marginBottom: '-2px',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap'
          }}
        >
          <ShieldCheck size={18} color={activeTab === 'SAFETY' ? '#16a34a' : '#94a3b8'} />
          Safety & OSHA 1910.147 LOTO
          <span style={{
            fontSize: '0.7rem',
            fontWeight: 800,
            padding: '2px 7px',
            borderRadius: '10px',
            backgroundColor: activeTab === 'SAFETY' ? '#dcfce7' : '#f1f5f9',
            color: activeTab === 'SAFETY' ? '#15803d' : '#64748b'
          }}>
            {safetyCount}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('MANUAL')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            fontSize: '0.9rem',
            fontWeight: 700,
            cursor: 'pointer',
            border: 'none',
            background: 'none',
            color: activeTab === 'MANUAL' ? '#0369a1' : '#64748b',
            borderBottom: activeTab === 'MANUAL' ? '3px solid #0284c7' : '3px solid transparent',
            marginBottom: '-2px',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap'
          }}
        >
          <BookOpen size={18} color={activeTab === 'MANUAL' ? '#0284c7' : '#94a3b8'} />
          Technical Manuals & Schematics
          <span style={{
            fontSize: '0.7rem',
            fontWeight: 800,
            padding: '2px 7px',
            borderRadius: '10px',
            backgroundColor: activeTab === 'MANUAL' ? '#e0f2fe' : '#f1f5f9',
            color: activeTab === 'MANUAL' ? '#0369a1' : '#64748b'
          }}>
            {manualCount}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('SOP')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            fontSize: '0.9rem',
            fontWeight: 700,
            cursor: 'pointer',
            border: 'none',
            background: 'none',
            color: activeTab === 'SOP' ? '#b45309' : '#64748b',
            borderBottom: activeTab === 'SOP' ? '3px solid #d97706' : '3px solid transparent',
            marginBottom: '-2px',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap'
          }}
        >
          <FileCheck size={18} color={activeTab === 'SOP' ? '#d97706' : '#94a3b8'} />
          Standard Operating Procedures (SOP)
          <span style={{
            fontSize: '0.7rem',
            fontWeight: 800,
            padding: '2px 7px',
            borderRadius: '10px',
            backgroundColor: activeTab === 'SOP' ? '#fef3c7' : '#f1f5f9',
            color: activeTab === 'SOP' ? '#b45309' : '#64748b'
          }}>
            {sopCount}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('ALL')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            fontSize: '0.9rem',
            fontWeight: 700,
            cursor: 'pointer',
            border: 'none',
            background: 'none',
            color: activeTab === 'ALL' ? '#0f172a' : '#64748b',
            borderBottom: activeTab === 'ALL' ? '3px solid #0f172a' : '3px solid transparent',
            marginBottom: '-2px',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap'
          }}
        >
          <Layers size={18} color={activeTab === 'ALL' ? '#0f172a' : '#94a3b8'} />
          All Documents ({documents.length})
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="card" style={{ padding: '14px 20px', marginBottom: '20px' }}>
        <div style={{
          display: 'flex',
          gap: '14px',
          alignItems: 'center',
          flexWrap: 'wrap',
          justifyContent: 'space-between'
        }}>
          {/* Real-time search query input */}
          <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              className="form-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search manuals by title, machine code (e.g. CNC-04), or topic..."
              style={{ paddingLeft: '36px', width: '100%', fontSize: '0.85rem' }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94a3b8'
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Machine Filter Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
              Asset Filter:
            </span>
            <select
              className="form-select"
              value={machineFilter}
              onChange={(e) => setMachineFilter(e.target.value)}
              style={{ width: '200px', padding: '6px 12px', fontSize: '0.85rem' }}
            >
              <option value="">All Industrial Assets</option>
              {machines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.machine_code} — {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Safety Notice Callout if on SAFETY tab */}
      {activeTab === 'SAFETY' && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderLeft: '5px solid #dc2626',
          padding: '14px 18px',
          borderRadius: '8px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <ShieldAlert size={28} color="#dc2626" style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#991b1b', marginBottom: '2px' }}>
              MANDATORY OSHA 1910.147 HAZARDOUS ENERGY ISOLATION REQUIRED PRIOR TO WORK
            </div>
            <div style={{ fontSize: '0.8rem', color: '#7f1d1d', lineHeight: 1.4 }}>
              Zero-energy verification (NFPA 70E 3-point multimeter test for 480V electrical, pressure gauges for 210 Bar hydraulic / 90 PSI pneumatic) is mandatory before opening electrical enclosures or mechanical guarding. Use the <strong>Execute LOTO Protocol</strong> button below to perform real-time verification.
            </div>
          </div>
        </div>
      )}

      {/* Documents Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
          <RefreshCw size={28} className="spin" style={{ margin: '0 auto 12px auto' }} />
          <p style={{ fontWeight: 600 }}>Loading industrial manuals & safety documents...</p>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '50px 20px', color: '#64748b' }}>
          <FileText size={42} color="#cbd5e1" style={{ margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>
            No documentation matched your filter
          </h3>
          <p style={{ fontSize: '0.85rem', maxWidth: '420px', margin: '0 auto 16px auto' }}>
            Try clearing the search query or asset filter to view all plant manuals and safety standards.
          </p>
          <button
            onClick={() => { setSearchQuery(''); setMachineFilter(''); }}
            className="btn btn-secondary btn-sm"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
          {filteredDocuments.map((doc) => (
            <div
              key={doc.id}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '18px 20px',
                border: doc.doc_type === 'SAFETY' ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                boxShadow: doc.doc_type === 'SAFETY' ? '0 4px 12px rgba(22, 163, 74, 0.06)' : 'none',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease'
              }}
            >
              <div>
                {/* Header Badge Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  {getDocTypeBadge(doc.doc_type)}

                  {doc.indexing_status === 'INDEXED' ? (
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      color: '#166534',
                      backgroundColor: '#dcfce7',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <Check size={10} strokeWidth={3} /> RAG INDEXED
                    </span>
                  ) : (
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      color: '#92400e',
                      backgroundColor: '#fef3c7',
                      padding: '2px 8px',
                      borderRadius: '12px'
                    }}>
                      PENDING INDEX
                    </span>
                  )}
                </div>

                {/* Document Title */}
                <h3 style={{
                  fontSize: '1.05rem',
                  fontWeight: 800,
                  color: '#0f172a',
                  marginBottom: '8px',
                  lineHeight: 1.35
                }}>
                  {doc.title}
                </h3>

                {/* Machine / Plant Association */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.8rem',
                  color: '#475569',
                  marginBottom: '10px'
                }}>
                  <Cpu size={14} color="#64748b" />
                  <span>
                    Asset: <strong>{doc.machine ? `${doc.machine.machine_code} (${doc.machine.name})` : 'Plant-Wide Standard'}</strong>
                  </span>
                </div>

                {/* File Metadata Pill */}
                <div style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #f1f5f9',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  fontSize: '0.72rem',
                  color: '#64748b',
                  marginBottom: '14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span>Storage: {doc.file_url ? doc.file_url.split('/').pop() : 'Direct Text'}</span>
                  <span>v{doc.versions?.[0]?.version_number || '1.0'}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{
                marginTop: '12px',
                paddingTop: '12px',
                borderTop: '1px solid #f1f5f9',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                {/* Primary Button */}
                {doc.doc_type === 'SAFETY' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <button
                      onClick={() => handleOpenLotoExecution(doc)}
                      className="btn btn-primary btn-sm"
                      style={{
                        backgroundColor: '#16a34a',
                        borderColor: '#15803d',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 700
                      }}
                    >
                      <ShieldCheck size={14} /> Execute LOTO
                    </button>
                    <button
                      onClick={() => handleOpenReader(doc)}
                      className="btn btn-secondary btn-sm"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 700
                      }}
                    >
                      <Eye size={14} /> Read Protocol
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <button
                      onClick={() => handleOpenReader(doc)}
                      className="btn btn-primary btn-sm"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 700
                      }}
                    >
                      <BookOpen size={14} /> Read Manual
                    </button>
                    <button
                      onClick={() => handleAskAIAboutDoc(doc)}
                      className="btn btn-secondary btn-sm"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        fontSize: '0.78rem',
                        color: '#0369a1',
                        borderColor: '#bae6fd',
                        fontWeight: 700
                      }}
                    >
                      <Sparkles size={14} color="#0284c7" /> Ask AI Copilot
                    </button>
                  </div>
                )}

                {/* Secondary Row: Index for RAG and Version History */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    onClick={() => handleIngest(doc.id, doc.title)}
                    className="btn btn-secondary btn-sm"
                    disabled={ingestingId === doc.id}
                    style={{
                      flex: 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      fontSize: '0.72rem'
                    }}
                    title="Generate sliding-window text chunks & 384-dimensional vector embeddings"
                  >
                    <Sparkles size={12} color="#0284c7" />
                    {ingestingId === doc.id ? 'Indexing RAG...' : 'Index for RAG'}
                  </button>

                  <button
                    onClick={() => setSelectedDoc(doc)}
                    className="btn btn-secondary btn-sm"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.72rem',
                      color: '#64748b'
                    }}
                  >
                    <History size={12} /> History
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. INTERACTIVE DOCUMENT READER MODAL                                     */}
      {/* ========================================================================= */}
      {readerDoc && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-card" style={{
            maxWidth: '1040px',
            width: '95vw',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            padding: 0,
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 24px',
              backgroundColor: '#0f172a',
              color: '#ffffff',
              borderBottom: '1px solid #1e293b'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  backgroundColor: readerDoc.doc_type === 'SAFETY' ? '#166534' : '#0284c7',
                  color: '#ffffff',
                  padding: '8px',
                  borderRadius: '8px',
                  display: 'flex'
                }}>
                  {readerDoc.doc_type === 'SAFETY' ? <ShieldCheck size={20} /> : <BookOpen size={20} />}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
                    {readerDoc.title}
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', gap: '10px', marginTop: '2px' }}>
                    <span>Category: <strong>{readerDoc.doc_type}</strong></span>
                    <span>•</span>
                    <span>Asset: <strong>{readerDoc.machine ? `${readerDoc.machine.machine_code} (${readerDoc.machine.name})` : 'Plant-Wide Standard'}</strong></span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  onClick={() => {
                    handleAskAIAboutDoc(readerDoc);
                  }}
                  className="btn btn-sm"
                  style={{
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 12px'
                  }}
                >
                  <Sparkles size={14} /> Ask AI About Manual
                </button>

                <button
                  onClick={() => window.print()}
                  className="btn btn-sm btn-secondary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.75rem',
                    color: '#cbd5e1',
                    borderColor: '#334155'
                  }}
                  title="Print Manual"
                >
                  <Printer size={14} /> Print
                </button>

                <button
                  onClick={() => { setReaderDoc(null); setReaderContent(null); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94a3b8',
                    padding: '4px'
                  }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body: Left Table of Contents, Right Content Viewer */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden', height: 'calc(92vh - 70px)' }}>
              {/* Left Column: Sections & Table of Contents */}
              <div style={{
                width: '300px',
                borderRight: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
                display: 'flex',
                flexDirection: 'column',
                flexShrink: 0
              }}>
                <div style={{ padding: '14px', borderBottom: '1px solid #e2e8f0' }}>
                  <div style={{ position: 'relative' }}>
                    <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="text"
                      className="form-input"
                      value={readerSearch}
                      onChange={(e) => setReaderSearch(e.target.value)}
                      placeholder="Filter sections..."
                      style={{ paddingLeft: '32px', fontSize: '0.78rem', width: '100%' }}
                    />
                  </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', padding: '6px 8px' }}>
                    Table of Contents ({readerContent?.sections?.length || 0})
                  </div>

                  {loadingContent ? (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8' }}>
                      <RefreshCw size={20} className="spin" style={{ margin: '0 auto 8px auto' }} />
                      <div style={{ fontSize: '0.75rem' }}>Extracting sections...</div>
                    </div>
                  ) : readerContent?.sections ? (
                    readerContent.sections
                      .filter((s) => !readerSearch || s.title.toLowerCase().includes(readerSearch.toLowerCase()))
                      .map((section, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setActiveSectionIdx(idx);
                            const el = document.getElementById(`section-${idx}`);
                            if (el) el.scrollIntoView({ behavior: 'smooth' });
                          }}
                          style={{
                            width: '100%',
                            textAlign: 'left',
                            padding: '8px 10px',
                            borderRadius: '6px',
                            fontSize: '0.78rem',
                            fontWeight: activeSectionIdx === idx ? 700 : 500,
                            backgroundColor: activeSectionIdx === idx ? '#e0f2fe' : 'transparent',
                            color: activeSectionIdx === idx ? '#0369a1' : '#334155',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            marginBottom: '2px',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <ChevronRight size={13} color={activeSectionIdx === idx ? '#0284c7' : '#94a3b8'} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {section.title}
                          </span>
                        </button>
                      ))
                  ) : (
                    <div style={{ padding: '12px', fontSize: '0.75rem', color: '#94a3b8' }}>
                      No structured sections found.
                    </div>
                  )}
                </div>

                {/* Footer Metadata */}
                <div style={{
                  padding: '12px 14px',
                  borderTop: '1px solid #e2e8f0',
                  fontSize: '0.72rem',
                  color: '#64748b',
                  backgroundColor: '#ffffff'
                }}>
                  <div>Document ID: #{readerDoc.id}</div>
                  <div>Status: {readerDoc.indexing_status}</div>
                </div>
              </div>

              {/* Right Column: Full Document Reading View */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '24px 30px', backgroundColor: '#ffffff' }}>
                {loadingContent ? (
                  <div style={{ textAlign: 'center', padding: '80px 0', color: '#64748b' }}>
                    <RefreshCw size={32} className="spin" style={{ margin: '0 auto 16px auto', color: '#0284c7' }} />
                    <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>Loading Official Document Content...</h4>
                    <p style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Parsing multi-page manual and ASCII schematics from backend store</p>
                  </div>
                ) : readerContent ? (
                  <div>
                    {/* Header Banner inside reader */}
                    <div style={{
                      padding: '16px 20px',
                      backgroundColor: readerDoc.doc_type === 'SAFETY' ? '#f0fdf4' : '#f8fafc',
                      border: readerDoc.doc_type === 'SAFETY' ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                      borderRadius: '8px',
                      marginBottom: '24px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: readerDoc.doc_type === 'SAFETY' ? '#15803d' : '#0369a1', textTransform: 'uppercase' }}>
                          Official Plant Technical Documentation
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          Updated: {new Date(readerDoc.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
                        {readerContent.title}
                      </h2>
                      <div style={{ fontSize: '0.82rem', color: '#475569' }}>
                        Asset Reference: <strong>{readerDoc.machine ? `${readerDoc.machine.machine_code} — ${readerDoc.machine.name}` : 'Plant-Wide Standard'}</strong>
                      </div>
                    </div>

                    {/* Render Structured Sections */}
                    {readerContent.sections && readerContent.sections.length > 0 ? (
                      readerContent.sections.map((section, idx) => (
                        <div
                          key={idx}
                          id={`section-${idx}`}
                          style={{
                            marginBottom: '28px',
                            paddingBottom: '20px',
                            borderBottom: idx < readerContent.sections.length - 1 ? '1px solid #f1f5f9' : 'none'
                          }}
                        >
                          <h3 style={{
                            fontSize: '1.05rem',
                            fontWeight: 800,
                            color: '#0369a1',
                            margin: '0 0 12px 0',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            borderLeft: '4px solid #0284c7',
                            paddingLeft: '10px'
                          }}>
                            {section.title}
                          </h3>

                          {/* Content Paragraphs or Preformatted Diagrams */}
                          <div style={{ fontSize: '0.875rem', color: '#334155', lineHeight: 1.65 }}>
                            {section.content.split('\n\n').map((paragraph, pIdx) => {
                              const trimmed = paragraph.trim();
                              // Check if paragraph is an ASCII diagram or table
                              if (trimmed.includes('┌') || trimmed.includes('|') && trimmed.includes('+') || trimmed.includes('──') || trimmed.includes('-->') || trimmed.startsWith('[') && trimmed.includes(']')) {
                                return (
                                  <pre key={pIdx} style={{
                                    backgroundColor: '#0b1329',
                                    color: '#38bdf8',
                                    padding: '14px 18px',
                                    borderRadius: '8px',
                                    fontSize: '0.78rem',
                                    fontFamily: 'var(--font-mono, monospace)',
                                    overflowX: 'auto',
                                    margin: '12px 0',
                                    border: '1px solid #1e293b'
                                  }}>
                                    <code>{trimmed}</code>
                                  </pre>
                                );
                              }

                              // Check if safety warning
                              if (/^(warning|caution|danger|mandatory|safety notice|loto)/i.test(trimmed)) {
                                return (
                                  <div key={pIdx} style={{
                                    backgroundColor: '#fffbeb',
                                    borderLeft: '4px solid #f59e0b',
                                    border: '1px solid #fde68a',
                                    padding: '12px 16px',
                                    borderRadius: '6px',
                                    margin: '12px 0',
                                    color: '#92400e',
                                    fontSize: '0.85rem',
                                    fontWeight: 600
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                      <AlertTriangle size={16} color="#d97706" />
                                      <span>SAFETY DIRECTIVE</span>
                                    </div>
                                    <div>{trimmed}</div>
                                  </div>
                                );
                              }

                              return (
                                <p key={pIdx} style={{ margin: '0 0 12px 0', whiteSpace: 'pre-line' }}>
                                  {trimmed}
                                </p>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    ) : (
                      // Fallback: raw formatted content
                      <pre style={{
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'inherit',
                        fontSize: '0.875rem',
                        lineHeight: 1.6,
                        color: '#334155'
                      }}>
                        {readerContent.raw_content}
                      </pre>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. INTERACTIVE OSHA 1910.147 LIVE LOTO EXECUTION CHECKLIST MODAL          */}
      {/* ========================================================================= */}
      {lotoDoc && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-card" style={{
            maxWidth: '860px',
            width: '95vw',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            padding: 0,
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 24px',
              backgroundColor: '#14532d',
              color: '#ffffff',
              borderBottom: '1px solid #166534'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  backgroundColor: '#22c55e',
                  color: '#ffffff',
                  padding: '8px',
                  borderRadius: '8px',
                  display: 'flex'
                }}>
                  <ShieldCheck size={22} color="#ffffff" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#f0fdf4' }}>
                    OSHA 1910.147 Zero-Energy Isolation Protocol
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: '#bbf7d0', marginTop: '2px' }}>
                    Asset: <strong>{lotoDoc.machine ? `${lotoDoc.machine.machine_code} (${lotoDoc.machine.name})` : 'Plant Electrical Substation'}</strong> • NFPA 70E Arc Flash Compliant
                  </div>
                </div>
              </div>

              <button
                onClick={() => setLotoDoc(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#bbf7d0',
                  padding: '4px'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, backgroundColor: '#f8fafc' }}>
              {/* Isolation Energy Source Profile */}
              <div style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '14px 18px',
                marginBottom: '18px'
              }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                  Identified Hazardous Energy Sources
                </span>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '10px',
                  marginTop: '10px'
                }}>
                  <div style={{
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fde68a',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <Zap size={16} color="#d97706" />
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#92400e' }}>480V Electrical AC</div>
                      <div style={{ fontSize: '0.68rem', color: '#b45309' }}>Breaker MDP-3 / MCC-A</div>
                    </div>
                  </div>

                  <div style={{
                    backgroundColor: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <Droplets size={16} color="#2563eb" />
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e40af' }}>210 Bar Hydraulic</div>
                      <div style={{ fontSize: '0.68rem', color: '#1d4ed8' }}>Shutoff Valve HV-101</div>
                    </div>
                  </div>

                  <div style={{
                    backgroundColor: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <Wind size={16} color="#16a34a" />
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534' }}>90 PSI Pneumatics</div>
                      <div style={{ fontSize: '0.68rem', color: '#15803d' }}>Dump Valve PV-202</div>
                    </div>
                  </div>

                  <div style={{
                    backgroundColor: '#faf5ff',
                    border: '1px solid #e9d5ff',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <Wrench size={16} color="#7c3aed" />
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6d28d9' }}>Gravity Slide Ram</div>
                      <div style={{ fontSize: '0.68rem', color: '#5b21b6' }}>Safety Prop Pins</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Progress Bar */}
              <div style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '14px 18px',
                marginBottom: '18px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>
                    Zero-Energy Verification Progress:
                  </span>
                  <span style={{
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    color: Object.keys(checkedLotoSteps).filter((k) => checkedLotoSteps[k]).length === lotoSteps.length
                      ? '#16a34a'
                      : '#0284c7'
                  }}>
                    {Object.keys(checkedLotoSteps).filter((k) => checkedLotoSteps[k]).length} of {lotoSteps.length} Steps Verified ({Math.round((Object.keys(checkedLotoSteps).filter((k) => checkedLotoSteps[k]).length / (lotoSteps.length || 1)) * 100)}%)
                  </span>
                </div>

                <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    backgroundColor: Object.keys(checkedLotoSteps).filter((k) => checkedLotoSteps[k]).length === lotoSteps.length
                      ? '#16a34a'
                      : '#0284c7',
                    width: `${(Object.keys(checkedLotoSteps).filter((k) => checkedLotoSteps[k]).length / (lotoSteps.length || 1)) * 100}%`,
                    transition: 'width 0.25s ease'
                  }} />
                </div>
              </div>

              {/* 7 Interactive Verification Steps */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {lotoSteps.map((step) => {
                  const isChecked = Boolean(checkedLotoSteps[step.step_number]);
                  return (
                    <div
                      key={step.step_number}
                      onClick={() => handleToggleLotoStep(step.step_number)}
                      style={{
                        backgroundColor: isChecked ? '#f0fdf4' : '#ffffff',
                        border: isChecked ? '1px solid #86efac' : '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '14px 16px',
                        cursor: 'pointer',
                        display: 'flex',
                        gap: '14px',
                        alignItems: 'flex-start',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // Handled by parent div click
                        style={{
                          width: '18px',
                          height: '18px',
                          marginTop: '2px',
                          accentColor: '#16a34a',
                          cursor: 'pointer'
                        }}
                      />

                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: isChecked ? '#166534' : '#0f172a' }}>
                            Step {step.step_number}: {step.title}
                          </span>
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                            {step.standard}
                          </span>
                        </div>

                        <div style={{ fontSize: '0.8rem', color: '#475569', marginBottom: '4px', lineHeight: 1.45 }}>
                          {step.action}
                        </div>

                        <div style={{ fontSize: '0.72rem', color: '#991b1b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <AlertTriangle size={12} color="#dc2626" />
                          <span>Potential Hazard: {step.hazard}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Sign-Off Authorization Certificate Box */}
              {Object.keys(checkedLotoSteps).filter((k) => checkedLotoSteps[k]).length === lotoSteps.length && (
                <div style={{
                  marginTop: '20px',
                  padding: '16px 20px',
                  backgroundColor: '#f0fdf4',
                  border: '2px solid #22c55e',
                  borderRadius: '10px',
                  textAlign: 'center'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                    <CheckCircle2 size={36} color="#16a34a" />
                  </div>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#166534', margin: '0 0 4px 0' }}>
                    ZERO-ENERGY STATE CONFIRMED
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: '#15803d', maxWidth: '520px', margin: '0 auto 12px auto' }}>
                    All 7 OSHA 1910.147 hazardous energy isolation verification steps have been executed and validated. The equipment is safe for mechanical overhaul.
                  </p>

                  {lotoSignedOff ? (
                    <div style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #86efac',
                      borderRadius: '6px',
                      padding: '8px 14px',
                      display: 'inline-block',
                      fontSize: '0.8rem',
                      color: '#166534',
                      fontWeight: 700
                    }}>
                      ✓ Certified by: {user?.full_name || 'Authorized Technician'} at {lotoSignOffTime}
                    </div>
                  ) : (
                    <button
                      onClick={handleSignOffLoto}
                      className="btn btn-primary"
                      style={{
                        backgroundColor: '#16a34a',
                        borderColor: '#15803d',
                        fontWeight: 800,
                        fontSize: '0.85rem',
                        padding: '8px 20px'
                      }}
                    >
                      Authorize & Sign-Off LOTO Protocol
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '12px 24px',
              backgroundColor: '#ffffff',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Plant Safety Officer: <strong>OSHA 29 CFR 1910.147 Compliant</strong>
              </span>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setLotoDoc(null)}
              >
                Close Protocol
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. UPLOAD OPERATIONAL DOCUMENT MODAL                                     */}
      {/* ========================================================================= */}
      {showUploadModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <strong style={{ fontSize: '1rem', color: '#0f172a' }}>Register Equipment Manual or SOP</strong>
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
                    <label className="form-label">Associated Asset</label>
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
                  <label className="form-label">Storage Path / File Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="/data/documents/sample_manual.txt"
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

      {/* ========================================================================= */}
      {/* 4. VERSION HISTORY MODAL                                                  */}
      {/* ========================================================================= */}
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

      {/* ========================================================================= */}
      {/* 5. AI COPILOT DIRECT DIAGNOSTICS MODAL                                   */}
      {/* ========================================================================= */}
      <AICopilotModal
        isOpen={copilotOpen}
        onClose={() => setCopilotOpen(false)}
        initialMachineId={copilotContext.machineId}
        initialMachineCode={copilotContext.machineCode}
        initialQuestion={copilotContext.question}
      />
    </div>
  );
};
