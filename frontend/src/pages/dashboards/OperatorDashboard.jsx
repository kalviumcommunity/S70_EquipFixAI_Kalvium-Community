import React, { useState, useEffect, useRef } from 'react';
import {
  incidentsApi, machinesApi, documentsApi, aiApi, uploadApi, notificationsApi
} from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useWebSocket } from '../../context/WebSocketContext';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  AlertTriangle, PlusCircle, CheckCircle2, Clock, Cpu, Image as ImageIcon,
  Upload, Paperclip, Sparkles, HardHat, Shield, ShieldAlert, ShieldCheck,
  Check, Activity, RefreshCw, FileText, FileSpreadsheet, Layers, Search,
  Filter, ArrowRight, ExternalLink, ChevronRight, Info, Wrench, Package,
  UserCheck, Send, Calendar, X, Eye, HelpCircle, AlertCircle, Phone,
  History, ArrowUpRight, CheckSquare, ChevronDown
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import AICopilotPromptCard from '../../components/ai/AICopilotPromptCard';
import { PlantMachineHealthGrid } from '../../components/machines/PlantMachineHealthGrid';

const ISSUE_CATEGORIES = [
  'Spindle & Drive Motor',
  'Hydraulic & Fluid Power',
  'Bearings & Motion Guides',
  'Cooling & Thermal Unit',
  'Electrical & Sensors',
  'Tooling & Mechanical Jam',
  'Excessive Vibration / Noise',
  'General Operational Anomaly',
];

const SEVERITY_LEVELS = [
  { level: 'LOW', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
  { level: 'MEDIUM', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  { level: 'HIGH', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  { level: 'CRITICAL', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
];

export const OperatorDashboard = () => {
  const { user } = useAuth();
  const { lastEvent, addToast, connected } = useWebSocket();
  const location = useLocation();

  // Core Data
  const [incidents, setIncidents] = useState([]);
  const [machines, setMachines] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Active Navigation Tab: 'overview' | 'reports' | 'equipment' | 'ai-copilot' | 'safety-sops'
  const [activeTab, setActiveTab] = useState(() => {
    if (location.hash === '#reports') return 'reports';
    if (location.hash === '#equipment') return 'equipment';
    if (location.hash === '#ai-copilot') return 'ai-copilot';
    if (location.hash === '#safety-sops') return 'safety-sops';
    return 'overview';
  });

  // Sync activeTab when URL hash changes
  useEffect(() => {
    if (location.hash === '#reports') setActiveTab('reports');
    else if (location.hash === '#equipment') setActiveTab('equipment');
    else if (location.hash === '#ai-copilot') setActiveTab('ai-copilot');
    else if (location.hash === '#safety-sops') setActiveTab('safety-sops');
    else if (!location.hash) setActiveTab('overview');
  }, [location.hash]);

  // Report Modal State
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportMachineId, setReportMachineId] = useState('');
  const [reportCategory, setReportCategory] = useState(ISSUE_CATEGORIES[0]);
  const [reportSeverity, setReportSeverity] = useState('MEDIUM');
  const [reportErrorCode, setReportErrorCode] = useState('');
  const [reportStartTime, setReportStartTime] = useState('Just now (< 10 mins)');
  const [reportDescription, setReportDescription] = useState('');
  const [reportImageUrl, setReportImageUrl] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [submittingReport, setSubmittingReport] = useState(false);
  const fileInputRef = useRef(null);

  // Timeline / Incident Details Modal State
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [showTimelineModal, setShowTimelineModal] = useState(false);

  // Machine Specs & Safety Modal State
  const [selectedMachineSpecs, setSelectedMachineSpecs] = useState(null);
  const [showMachineModal, setShowMachineModal] = useState(false);

  // My Reports Filters
  const [reportSearch, setReportSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [machineFilter, setMachineFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');

  // Equipment Fleet Filter
  const [fleetSearch, setFleetSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');

  // AI Operations Assistant Tab State
  const [aiQuery, setAiQuery] = useState('');
  const [aiMachineId, setAiMachineId] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponses, setAiResponses] = useState([
    {
      id: 'default-welcome',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      query: 'Operator Safety & Plant SOP Guidance Active',
      response: {
        possible_causes: 'EquipFixAI is configured in Operator Safety Mode. You can query symptoms, error alarms, external visual checks, and approved operating procedures.',
        recommended_actions: [
          'Verify error code displayed on machine HMI panel.',
          'Execute approved exterior inspection without removing guards.',
          'Follow emergency stop procedure if abnormal vibration exceeds thresholds.',
          'Report equipment anomaly to maintenance for certified technician dispatch.'
        ],
        safety_warning: 'OSHA 29 CFR 1910.147 COMPLIANCE: Operators are not authorized to perform mechanical disassembly or access high-voltage enclosures. Always tag and report to maintenance.',
        citations: [
          { document_name: 'Shop Floor Safety Handbook (SOP-01)', section: 'Section 4: Lockout/Tagout (LOTO) Rules' },
          { document_name: 'Plant Operator Guidelines', section: 'Standard Operating Procedures 2026' }
        ]
      }
    }
  ]);

  // Safety SOPs Filter
  const [sopFilter, setSopFilter] = useState('ALL');
  const [sopSearch, setSopSearch] = useState('');

  // 1. Data Loader
  const loadData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const [incRes, machRes, docRes] = await Promise.all([
        incidentsApi.list(),
        machinesApi.list(),
        documentsApi.list(),
      ]);

      if (incRes?.data) setIncidents(incRes.data);
      if (machRes?.data) {
        setMachines(machRes.data);
        if (machRes.data.length > 0 && !reportMachineId) {
          setReportMachineId(machRes.data[0].id.toString());
        }
      }
      if (docRes?.data) setDocuments(docRes.data);

      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error loading operator workspace data:', err);
    } finally {
      setLoading(false);
      if (isManual) {
        setTimeout(() => setRefreshing(false), 300);
      }
    }
  };

  useEffect(() => {
    loadData();
  }, [lastEvent]);

  // Periodic auto-sync every 40 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      loadData();
    }, 40000);
    return () => clearInterval(timer);
  }, []);

  // 2. Incident Timeline Loader
  const openIncidentTimeline = async (incident) => {
    setSelectedIncident(incident);
    setShowTimelineModal(true);
    setLoadingTimeline(true);
    try {
      const res = await incidentsApi.getTimeline(incident.id);
      const events = res.data?.events || (Array.isArray(res.data) ? res.data : []);
      setTimelineEvents(events);
    } catch (err) {
      console.error('Failed to load incident timeline:', err);
      // Fallback: create basic timeline event
      setTimelineEvents([
        {
          stage: 'REPORTED',
          title: `Incident ${incident.incident_number} Registered`,
          timestamp: incident.created_at,
          actor: incident.reported_by?.full_name || 'Operator',
          role: 'OPERATOR',
          description: incident.description,
          status: 'COMPLETED',
          icon: 'AlertTriangle',
        }
      ]);
    } finally {
      setLoadingTimeline(false);
    }
  };

  // 3. File Upload Handler
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const res = await uploadApi.uploadFile(file);
      setReportImageUrl(res.data.file_url);
      addToast('File Attached', `Uploaded ${res.data.original_filename} successfully.`, 'success');
    } catch (err) {
      console.error('Upload failed:', err);
      addToast('Upload Error', err.response?.data?.detail || 'Failed to upload attachment.', 'error');
    } finally {
      setUploadingFile(false);
    }
  };

  // 4. Report Problem Submission
  const handleReportProblem = async (e) => {
    e.preventDefault();
    if (!reportMachineId || !reportDescription.trim()) {
      addToast('Form Incomplete', 'Please select a machine and enter problem details.', 'warning');
      return;
    }

    setSubmittingReport(true);
    try {
      const formattedDesc = `[Category: ${reportCategory}] [Error Code: ${reportErrorCode || 'N/A'}] [Started: ${reportStartTime}] ${reportDescription.trim()}`;
      
      const payload = {
        machine_id: parseInt(reportMachineId, 10),
        description: formattedDesc,
        severity: reportSeverity,
        image_url: reportImageUrl || null,
      };

      const res = await incidentsApi.report(payload);
      addToast('Incident Registered', `Created ${res.data.incident_number}. Supervisor alerted.`, 'success');

      // Reset form
      setReportDescription('');
      setReportErrorCode('');
      setReportImageUrl('');
      setShowReportModal(false);

      // Refresh list and open timeline
      await loadData();
      if (res.data) {
        openIncidentTimeline(res.data);
      }
    } catch (err) {
      console.error('Incident report error:', err);
      addToast('Submission Failed', err.response?.data?.detail || 'Failed to report incident.', 'error');
    } finally {
      setSubmittingReport(false);
    }
  };

  // 5. AI Query Handler
  const handleAIQuery = async (queryText, machineId = null) => {
    const textToSend = queryText || aiQuery;
    if (!textToSend.trim()) return;

    setAiLoading(true);
    const targetMachineId = machineId || (aiMachineId ? parseInt(aiMachineId, 10) : null);

    try {
      const res = await aiApi.query({
        query: textToSend.trim(),
        machine_id: targetMachineId,
        include_sources: true,
      });

      const newEntry = {
        id: 'ai-' + Date.now(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        query: textToSend.trim(),
        machine_id: targetMachineId,
        response: res.data?.response || res.data || {},
      };

      setAiResponses((prev) => [newEntry, ...prev]);
      setAiQuery('');
    } catch (err) {
      console.error('AI Query failed:', err);
      addToast('AI Service Notice', err.response?.data?.detail || 'AI query could not be completed.', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  // Quick Action to open report modal with pre-selected machine
  const triggerReportForMachine = (machine) => {
    setReportMachineId(machine.id.toString());
    setShowReportModal(true);
  };

  // Quick Action to ask AI about a specific machine
  const triggerAIForMachine = (machine) => {
    setAiMachineId(machine.id.toString());
    setActiveTab('ai-copilot');
    window.location.hash = '#ai-copilot';
    setAiQuery(`What are the safe inspection checks and standard operating limits for ${machine.machine_code}?`);
  };

  // View Machine Specs & Safety Modal
  const openMachineSpecs = (machine) => {
    setSelectedMachineSpecs(machine);
    setShowMachineModal(true);
  };

  // Statistics Calculation
  const totalMachines = machines.length;
  const runningMachines = machines.filter((m) => m.status === 'RUNNING').length;
  const warningMachines = machines.filter((m) => m.status === 'WARNING').length;
  const downMachines = machines.filter((m) => m.status === 'DOWN').length;
  const maintMachines = machines.filter((m) => m.status === 'MAINTENANCE').length;

  const activeIncidents = incidents.filter(
    (i) => !['RESOLVED', 'CLOSED', 'CANCELLED'].includes(i.status)
  );
  const underRepairIncidents = incidents.filter(
    (i) => ['IN_PROGRESS', 'ASSIGNED'].includes(i.status)
  );
  const resolvedIncidents = incidents.filter(
    (i) => ['RESOLVED', 'CLOSED'].includes(i.status)
  );

  // Machine Status Pie Data
  const machinePieData = [
    { name: 'Running', value: runningMachines, color: '#10b981' },
    { name: 'Warning', value: warningMachines, color: '#f59e0b' },
    { name: 'Down', value: downMachines, color: '#ef4444' },
    { name: 'Maintenance', value: maintMachines, color: '#8b5cf6' },
  ].filter((d) => d.value > 0);

  const availabilityPercent = totalMachines > 0
    ? Math.round((runningMachines / totalMachines) * 100)
    : 100;

  // Filtered Incidents for My Reports Tab
  const filteredIncidents = incidents.filter((inc) => {
    if (statusFilter !== 'ALL' && inc.status !== statusFilter) return false;
    if (machineFilter !== 'ALL' && inc.machine_id?.toString() !== machineFilter) return false;
    if (severityFilter !== 'ALL' && inc.severity !== severityFilter) return false;
    if (reportSearch.trim()) {
      const q = reportSearch.toLowerCase();
      const matchNum = inc.incident_number?.toLowerCase().includes(q);
      const matchDesc = inc.description?.toLowerCase().includes(q);
      const matchMach = inc.machine?.machine_code?.toLowerCase().includes(q) || inc.machine?.name?.toLowerCase().includes(q);
      if (!matchNum && !matchDesc && !matchMach) return false;
    }
    return true;
  });

  // Filtered Machines for Fleet Tab
  const departments = ['ALL', ...Array.from(new Set(machines.map((m) => m.department).filter(Boolean)))];
  const filteredMachines = machines.filter((m) => {
    if (deptFilter !== 'ALL' && m.department !== deptFilter) return false;
    if (fleetSearch.trim()) {
      const q = fleetSearch.toLowerCase();
      const matchCode = m.machine_code?.toLowerCase().includes(q);
      const matchName = m.name?.toLowerCase().includes(q);
      const matchLoc = m.location?.toLowerCase().includes(q);
      if (!matchCode && !matchName && !matchLoc) return false;
    }
    return true;
  });

  // Filtered SOPs for Safety Tab
  const filteredSops = documents.filter((doc) => {
    if (sopFilter !== 'ALL' && doc.doc_type !== sopFilter) return false;
    if (sopSearch.trim()) {
      const q = sopSearch.toLowerCase();
      const matchTitle = doc.title?.toLowerCase().includes(q);
      const matchMach = doc.machine?.machine_code?.toLowerCase().includes(q) || doc.machine?.name?.toLowerCase().includes(q);
      if (!matchTitle && !matchMach) return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="page-body" style={{ maxWidth: '1400px', margin: '0 auto', padding: '60px 20px', textAlign: 'center' }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          border: '3px solid #e2e8f0',
          borderTopColor: '#2563eb',
          animation: 'spin 0.75s linear infinite',
          margin: '0 auto 16px auto'
        }} />
        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
          Connecting to Shop Floor Workstation...
        </div>
        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
          Loading real-time equipment telemetry and incident dispatch queue.
        </div>
      </div>
    );
  }

  return (
    <div className="page-body" style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '60px' }}>
      
      {/* ==================== 1. EXECUTIVE SHOP FLOOR HEADER ==================== */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '20px',
        backgroundColor: '#ffffff',
        padding: '20px 24px',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
              Shop Floor Workstation & Operations
            </h1>
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              backgroundColor: '#ecfdf5',
              color: '#059669',
              border: '1px solid #a7f3d0',
              padding: '3px 9px',
              borderRadius: '9999px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px'
            }}>
              <Activity size={12} /> LIVE SHOP FLOOR STATION
            </span>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '6px 0 0 0', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span>Report equipment anomalies, verify OSHA safety protocols, and track technician dispatches in real time.</span>
            <span>•</span>
            <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>
              Synced: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Refresh floor data from live database"
          >
            <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Live Sync'}
          </button>

          <button
            type="button"
            onClick={() => setShowReportModal(true)}
            className="btn btn-primary btn-sm"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
              border: 'none',
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.28)',
              fontWeight: 700
            }}
          >
            <PlusCircle size={15} />
            <span>Report Equipment Issue</span>
          </button>

          <Link to="/documents" className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileText size={14} /> Safety SOPs
          </Link>
        </div>
      </div>

      {/* ==================== 2. INTERACTIVE SECTION TABS ==================== */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '22px',
        borderBottom: '1px solid #e2e8f0',
        paddingBottom: '2px',
        overflowX: 'auto'
      }}>
        {[
          { id: 'overview', label: 'Floor Overview', icon: Layers, hash: '' },
          { id: 'reports', label: `My Reported Incidents (${incidents.length})`, icon: History, hash: '#reports' },
          { id: 'equipment', label: `Equipment Fleet (${machines.length})`, icon: Cpu, hash: '#equipment' },
          { id: 'ai-copilot', label: 'AI Operations Assistant', icon: Sparkles, hash: '#ai-copilot' },
          { id: 'safety-sops', label: 'Approved Safety SOPs', icon: ShieldCheck, hash: '#safety-sops' },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                window.location.hash = tab.hash;
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                fontSize: '0.85rem',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#1d4ed8' : '#64748b',
                backgroundColor: isActive ? '#eff6ff' : 'transparent',
                border: 'none',
                borderBottom: isActive ? '3px solid #2563eb' : '3px solid transparent',
                borderRadius: '8px 8px 0 0',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              <Icon size={16} color={isActive ? '#2563eb' : '#64748b'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Prominent AI Copilot Prompt Entry Card */}
      <div style={{ marginBottom: '22px' }}>
        <AICopilotPromptCard
          title="EquipFix AI Operator Safety & Diagnostics Copilot"
          subtitle="Query machine error alarms, approved exterior checks, standard operating limits, and OSHA lockout protocols."
        />
      </div>

      {/* ==================== 3. HIGH-LEVEL KPI METRIC CARDS ==================== */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {/* Availability / Monitored Fleet */}
        <div className="card" style={{ padding: '18px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            backgroundColor: '#ecfdf5',
            color: '#059669',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Cpu size={24} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
              {runningMachines} / {totalMachines}
            </div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', marginTop: '2px' }}>
              Operational Fleet
            </div>
            <div style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 600, marginTop: '2px' }}>
              {availabilityPercent}% Plant Availability
            </div>
          </div>
        </div>

        {/* My Active Reports */}
        <div className="card" style={{ padding: '18px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            backgroundColor: activeIncidents.length > 0 ? '#fef2f2' : '#f0fdf4',
            color: activeIncidents.length > 0 ? '#dc2626' : '#16a34a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <AlertTriangle size={24} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
              {activeIncidents.length}
            </div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', marginTop: '2px' }}>
              Active Incidents
            </div>
            <div style={{ fontSize: '0.7rem', color: activeIncidents.length > 0 ? '#dc2626' : '#16a34a', fontWeight: 600, marginTop: '2px' }}>
              {activeIncidents.length > 0 ? 'Pending resolution' : 'All machines clear'}
            </div>
          </div>
        </div>

        {/* Under Active Repair */}
        <div className="card" style={{ padding: '18px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            backgroundColor: '#eff6ff',
            color: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Wrench size={24} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
              {underRepairIncidents.length}
            </div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', marginTop: '2px' }}>
              Technician Dispatched
            </div>
            <div style={{ fontSize: '0.7rem', color: '#2563eb', fontWeight: 600, marginTop: '2px' }}>
              Under active diagnostics
            </div>
          </div>
        </div>

        {/* Resolved & Verified */}
        <div className="card" style={{ padding: '18px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            backgroundColor: '#f0fdf4',
            color: '#16a34a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <CheckCircle2 size={24} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
              {resolvedIncidents.length}
            </div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', marginTop: '2px' }}>
              Resolved Incidents
            </div>
            <div style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: 600, marginTop: '2px' }}>
              Restored to production
            </div>
          </div>
        </div>
      </div>

      {/* ==================== TAB CONTENT: OVERVIEW ==================== */}
      {activeTab === 'overview' && (
        <>
          {/* Critical OSHA Safety Notice Banner */}
          <div style={{
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '12px',
            padding: '14px 18px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px'
          }}>
            <ShieldAlert size={22} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#92400e' }}>
                OSHA 29 CFR 1910.147 COMPLIANCE NOTICE: LOCKOUT/TAGOUT PROTOCOLS MANDATORY
              </div>
              <p style={{ fontSize: '0.78rem', color: '#78350f', margin: '4px 0 0 0', lineHeight: 1.4 }}>
                Plant floor operators must never remove machine enclosures, bypass interlocks, or attempt internal mechanical repairs. For motor faults, spindle noise, or hydraulic leaks, use the <strong>Report Equipment Issue</strong> action below to dispatch a certified technician.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveTab('safety-sops');
                window.location.hash = '#safety-sops';
              }}
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#b45309',
                backgroundColor: '#fef3c7',
                border: '1px solid #fcd34d',
                padding: '4px 10px',
                borderRadius: '6px',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              View LOTO SOP →
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '20px', marginBottom: '24px' }}>
            
            {/* Fleet Status Donut Chart Card */}
            <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Cpu size={18} color="#2563eb" /> Shop Floor Equipment Health
                </span>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {totalMachines} Monitored Assets
                </span>
              </div>

              <div style={{ position: 'relative', height: '180px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={machinePieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {machinePieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val, name) => [`${val} Machines`, name]}
                      contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.8rem' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center text */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none'
                }}>
                  <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>{availabilityPercent}%</span>
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Available</span>
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '8px',
                marginTop: '12px',
                paddingTop: '12px',
                borderTop: '1px solid #f1f5f9'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Running</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#10b981' }}>{runningMachines}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Warning</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#f59e0b' }}>{warningMachines}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Down</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#ef4444' }}>{downMachines}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Maint.</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#8b5cf6' }}>{maintMachines}</div>
                </div>
              </div>
            </div>

            {/* Quick Action Issue Reporter Box */}
            <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <PlusCircle size={18} color="#0284c7" /> Immediate Floor Dispatch
                  </span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#2563eb', backgroundColor: '#eff6ff', padding: '2px 8px', borderRadius: '6px' }}>
                    1-CLICK REPORT
                  </span>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 14px 0', lineHeight: 1.4 }}>
                  Notice unusual vibration, spindle squeal, coolant leak, or error alarm? Register it directly into the dispatch queue. A supervisor and technician are alerted instantly.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <select
                      className="form-select"
                      value={reportMachineId}
                      onChange={(e) => setReportMachineId(e.target.value)}
                      style={{ flex: 1, fontSize: '0.82rem' }}
                    >
                      {machines.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.machine_code} — {m.name} ({m.department})
                        </option>
                      ))}
                    </select>

                    <select
                      className="form-select"
                      value={reportSeverity}
                      onChange={(e) => setReportSeverity(e.target.value)}
                      style={{ width: '130px', fontSize: '0.82rem' }}
                    >
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                      <option value="CRITICAL">CRITICAL</option>
                    </select>
                  </div>

                  <input
                    type="text"
                    className="form-input"
                    placeholder="E.g. Spindle abnormal noise, error SP-204, vibration exceeding limits..."
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                    style={{ fontSize: '0.82rem' }}
                  />
                </div>
              </div>

              <div style={{ marginTop: '16px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={handleReportProblem}
                  disabled={submittingReport || !reportDescription.trim()}
                  className="btn btn-primary"
                  style={{
                    flex: 1,
                    background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    padding: '9px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Send size={14} />
                  {submittingReport ? 'Dispatching...' : 'Dispatch Issue Report'}
                </button>

                <button
                  type="button"
                  onClick={() => setShowReportModal(true)}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                >
                  Detailed Form...
                </button>
              </div>
            </div>
          </div>

          {/* Active Shift Incidents Table */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={18} color="#2563eb" /> Active Floor Incidents & Repair Progress
                </span>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Real-time status updates from assigned technicians and maintenance logs
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('reports');
                  window.location.hash = '#reports';
                }}
                className="btn btn-secondary btn-sm"
              >
                View All Reports ({incidents.length}) →
              </button>
            </div>

            <div className="table-container">
              {incidents.length === 0 ? (
                <div style={{ padding: '36px 20px', textAlign: 'center', color: '#94a3b8' }}>
                  No active incidents recorded for your station. All systems operating normally.
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Incident ID</th>
                      <th>Equipment Unit</th>
                      <th>Problem Summary</th>
                      <th>Severity</th>
                      <th>Current Stage</th>
                      <th>Assigned Tech</th>
                      <th>Reported</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incidents.slice(0, 6).map((inc) => (
                      <tr key={inc.id}>
                        <td>
                          <button
                            type="button"
                            onClick={() => openIncidentTimeline(inc)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#2563eb',
                              fontFamily: 'var(--font-mono)',
                              fontWeight: 700,
                              cursor: 'pointer',
                              padding: 0,
                              textDecoration: 'underline'
                            }}
                          >
                            {inc.incident_number}
                          </button>
                        </td>
                        <td>
                          <strong style={{ fontSize: '0.85rem' }}>{inc.machine?.machine_code}</strong>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{inc.machine?.name}</div>
                        </td>
                        <td style={{ maxWidth: '280px' }}>
                          <div style={{ fontSize: '0.8rem', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {inc.description}
                          </div>
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
                        <td>
                          <span style={{ fontSize: '0.78rem', color: '#334155' }}>
                            {inc.assigned_technician?.full_name || 'Pending assignment'}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {new Date(inc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => openIncidentTimeline(inc)}
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '0.72rem', padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <History size={12} /> Timeline
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {/* ==================== TAB CONTENT: MY REPORTED INCIDENTS ==================== */}
      {activeTab === 'reports' && (
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <History size={18} color="#2563eb" /> Incident Tracking & Lifecycle Records
              </span>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Click any incident to open its complete chronological lifecycle timeline
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowReportModal(true)}
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <PlusCircle size={14} /> Report New Issue
            </button>
          </div>

          {/* Filter Toolbar */}
          <div style={{
            display: 'flex',
            gap: '12px',
            padding: '14px 20px',
            backgroundColor: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            flexWrap: 'wrap',
            alignItems: 'center'
          }}>
            {/* Search Input */}
            <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
              <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                className="form-input"
                placeholder="Search by ID, machine, or symptom..."
                value={reportSearch}
                onChange={(e) => setReportSearch(e.target.value)}
                style={{ paddingLeft: '32px', fontSize: '0.8rem' }}
              />
            </div>

            {/* Status Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Status:</span>
              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ width: '130px', fontSize: '0.8rem', padding: '6px 10px' }}
              >
                <option value="ALL">All Statuses</option>
                <option value="OPEN">OPEN</option>
                <option value="ASSIGNED">ASSIGNED</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="RESOLVED">RESOLVED</option>
                <option value="CLOSED">CLOSED</option>
              </select>
            </div>

            {/* Severity Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Severity:</span>
              <select
                className="form-select"
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                style={{ width: '120px', fontSize: '0.8rem', padding: '6px 10px' }}
              >
                <option value="ALL">All Severities</option>
                <option value="CRITICAL">CRITICAL</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>
            </div>

            {/* Machine Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Machine:</span>
              <select
                className="form-select"
                value={machineFilter}
                onChange={(e) => setMachineFilter(e.target.value)}
                style={{ width: '150px', fontSize: '0.8rem', padding: '6px 10px' }}
              >
                <option value="ALL">All Machines</option>
                {machines.map((m) => (
                  <option key={m.id} value={m.id.toString()}>
                    {m.machine_code}
                  </option>
                ))}
              </select>
            </div>

            {(reportSearch || statusFilter !== 'ALL' || machineFilter !== 'ALL' || severityFilter !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setReportSearch('');
                  setStatusFilter('ALL');
                  setMachineFilter('ALL');
                  setSeverityFilter('ALL');
                }}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.75rem', padding: '4px 8px' }}
              >
                Reset Filters
              </button>
            )}
          </div>

          {/* Incidents Table */}
          <div className="table-container">
            {filteredIncidents.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8' }}>
                <Clock size={32} color="#cbd5e1" style={{ margin: '0 auto 8px auto' }} />
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155' }}>
                  No matching incidents found
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                  Try changing your search terms or filter criteria.
                </div>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Incident ID</th>
                    <th>Equipment Unit</th>
                    <th>Problem Description & Diagnostic</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th>Dispatched Tech</th>
                    <th>Supervisor</th>
                    <th>Created</th>
                    <th>Timeline</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIncidents.map((inc) => (
                    <tr
                      key={inc.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => openIncidentTimeline(inc)}
                    >
                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#2563eb' }}>
                          {inc.incident_number}
                        </span>
                      </td>
                      <td>
                        <strong style={{ fontSize: '0.85rem' }}>{inc.machine?.machine_code}</strong>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{inc.machine?.name}</div>
                      </td>
                      <td style={{ maxWidth: '300px' }}>
                        <div style={{ fontSize: '0.8rem', color: '#1e293b' }}>
                          {inc.description}
                        </div>
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
                      <td>
                        <span style={{ fontSize: '0.78rem', color: '#334155' }}>
                          {inc.assigned_technician?.full_name || 'Unassigned'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                          {inc.supervisor?.full_name || 'Plant Supervisor'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {new Date(inc.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
                        {new Date(inc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openIncidentTimeline(inc);
                          }}
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.72rem', padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <ChevronRight size={14} /> Open
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ==================== TAB CONTENT: EQUIPMENT FLEET ==================== */}
      {activeTab === 'equipment' && (
        <div>
          {/* Live Plant Machine Health Overview Grid */}
          <PlantMachineHealthGrid
            initialMachines={machines}
            onSelectMachine={(m) => triggerReportForMachine(m)}
          />

          {/* Equipment Toolbar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: 1, minWidth: '260px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Filter machines by code, name, or cell location..."
                  value={fleetSearch}
                  onChange={(e) => setFleetSearch(e.target.value)}
                  style={{ paddingLeft: '32px', fontSize: '0.8rem' }}
                />
              </div>

              <select
                className="form-select"
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                style={{ width: '170px', fontSize: '0.8rem' }}
              >
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept === 'ALL' ? 'All Departments' : dept}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Showing {filteredMachines.length} of {machines.length} units
            </div>
          </div>

          {/* Machine Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '16px'
          }}>
            {filteredMachines.map((m) => {
              const activeCount = incidents.filter(
                (i) => i.machine_id === m.id && !['RESOLVED', 'CLOSED'].includes(i.status)
              ).length;

              return (
                <div
                  key={m.id}
                  className="card"
                  style={{
                    padding: '18px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    border: activeCount > 0 ? '1px solid #fca5a5' : '1px solid #e2e8f0'
                  }}
                >
                  <div>
                    {/* Machine Card Top */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <div>
                        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                          {m.machine_code}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '2px' }}>
                          {m.name}
                        </div>
                      </div>
                      <span className={`badge badge-${m.status.toLowerCase()}`}>
                        {m.status}
                      </span>
                    </div>

                    {/* Department & Location */}
                    <div style={{
                      backgroundColor: '#f8fafc',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      color: '#64748b',
                      marginBottom: '12px',
                      display: 'flex',
                      justifyContent: 'space-between'
                    }}>
                      <span>Cell: <strong>{m.department || 'Floor Cell'}</strong></span>
                      <span>Bay: <strong>{m.location || 'Section A'}</strong></span>
                    </div>

                    {/* Operational Highlights */}
                    <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Manufacturer:</span>
                        <strong style={{ color: '#1e293b' }}>{m.manufacturer || 'OEM Industrial'}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Model Number:</span>
                        <strong style={{ color: '#1e293b' }}>{m.model_number || 'Standard Unit'}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Last Maintained:</span>
                        <strong style={{ color: '#1e293b' }}>
                          {m.last_maintenance_date ? new Date(m.last_maintenance_date).toLocaleDateString() : '18 Sep 2026'}
                        </strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Active Incidents:</span>
                        <strong style={{ color: activeCount > 0 ? '#dc2626' : '#16a34a' }}>
                          {activeCount > 0 ? `${activeCount} in progress` : 'None (Healthy)'}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                    paddingTop: '12px',
                    borderTop: '1px solid #f1f5f9'
                  }}>
                    <button
                      type="button"
                      onClick={() => triggerReportForMachine(m)}
                      className="btn btn-primary btn-sm"
                      style={{
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px'
                      }}
                    >
                      <PlusCircle size={13} /> Report Problem
                    </button>

                    <button
                      type="button"
                      onClick={() => openMachineSpecs(m)}
                      className="btn btn-secondary btn-sm"
                      style={{
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px'
                      }}
                    >
                      <Info size={13} /> Specs & SOPs
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================== TAB CONTENT: AI OPERATIONS ASSISTANT ==================== */}
      {activeTab === 'ai-copilot' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '20px' }}>
          
          {/* Main AI Interaction Panel */}
          <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <span style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={18} color="#2563eb" /> EquipFixAI Operator Safety Copilot
                </span>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Query approved symptom diagnostics, safe exterior checks, and verified citations.
                </span>
              </div>
              <span style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                color: '#059669',
                backgroundColor: '#ecfdf5',
                border: '1px solid #a7f3d0',
                padding: '2px 8px',
                borderRadius: '6px'
              }}>
                ROLE-SAFE RAG ACTIVE
              </span>
            </div>

            {/* AI Machine Select Bar */}
            <div style={{
              display: 'flex',
              gap: '10px',
              alignItems: 'center',
              backgroundColor: '#f8fafc',
              padding: '10px 12px',
              borderRadius: '8px',
              marginBottom: '14px'
            }}>
              <Cpu size={15} color="#64748b" />
              <span style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 600 }}>Target Machine:</span>
              <select
                className="form-select"
                value={aiMachineId}
                onChange={(e) => setAiMachineId(e.target.value)}
                style={{ flex: 1, fontSize: '0.8rem', padding: '4px 8px' }}
              >
                <option value="">General Plant & All Machines</option>
                {machines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.machine_code} — {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Suggestion Chips */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
              {[
                { label: 'CNC-04 Spindle Noise', query: 'What should I check if CNC-04 makes abnormal spindle noise?' },
                { label: 'Hydraulic Pressure Low', query: 'Hydraulic flow pressure drops below standard limits. What safe checks can an operator perform?' },
                { label: 'Motor Replacement Check', query: 'Can I open the electrical cabinet and replace the drive motor myself?' },
                { label: 'Vibration Exceeds 7mm/s', query: 'Excessive vibration detected on milling unit spindle. When should I press emergency stop?' },
              ].map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setAiQuery(chip.query);
                    handleAIQuery(chip.query);
                  }}
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    color: '#2563eb',
                    backgroundColor: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    padding: '4px 9px',
                    borderRadius: '9999px',
                    cursor: 'pointer'
                  }}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* AI Prompt Input Bar */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Ask about machine symptoms, error codes, safe exterior checks..."
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAIQuery();
                  }
                }}
                style={{ fontSize: '0.85rem' }}
              />
              <button
                type="button"
                onClick={() => handleAIQuery()}
                disabled={aiLoading || !aiQuery.trim()}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontWeight: 700 }}
              >
                <Send size={15} />
                {aiLoading ? 'Analyzing...' : 'Ask Copilot'}
              </button>
            </div>

            {/* AI Conversation Stream */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '520px', overflowY: 'auto' }}>
              {aiLoading && (
                <div style={{ padding: '20px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    border: '2px solid #e2e8f0',
                    borderTopColor: '#2563eb',
                    animation: 'spin 0.75s linear infinite',
                    margin: '0 auto 8px auto'
                  }} />
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Retrieving verified technical documentation and verifying operator safety rules...
                  </span>
                </div>
              )}

              {aiResponses.map((item) => {
                const resp = item.response;
                const causes = resp.possible_causes || resp.possible_cause || resp.possible_issue || (typeof resp === 'string' ? resp : '');
                const actions = resp.recommended_actions || resp.recommended_checks || resp.operator_safe_checks || [];
                const warning = (Array.isArray(resp.safety_warnings) ? resp.safety_warnings.join(' ') : resp.safety_warnings) || resp.safety_warning || resp.warning;
                const citations = resp.citations || resp.sources || [];

                const isRestricted = (warning && warning.includes('RESTRICTED')) ||
                  (typeof causes === 'string' && causes.includes('RESTRICTED'));

                return (
                  <div
                    key={item.id}
                    style={{
                      border: isRestricted ? '1px solid #fecaca' : '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '16px',
                      backgroundColor: isRestricted ? '#fff5f5' : '#ffffff',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.02)'
                    }}
                  >
                    {/* Query header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                        Q: "{item.query}"
                      </span>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                        {item.timestamp}
                      </span>
                    </div>

                    {/* Safety Alert Box (if restricted or warning present) */}
                    {warning && (
                      <div style={{
                        backgroundColor: isRestricted ? '#fee2e2' : '#fef3c7',
                        border: isRestricted ? '1px solid #fca5a5' : '1px solid #fcd34d',
                        borderRadius: '6px',
                        padding: '10px 12px',
                        marginBottom: '12px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px'
                      }}>
                        <ShieldAlert size={18} color={isRestricted ? '#b91c1c' : '#d97706'} style={{ flexShrink: 0, marginTop: '1px' }} />
                        <div style={{ fontSize: '0.78rem', color: isRestricted ? '#991b1b' : '#92400e', fontWeight: 600, lineHeight: 1.4 }}>
                          {warning}
                        </div>
                      </div>
                    )}

                    {/* Diagnostic Evaluation */}
                    {causes && (
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                          Diagnostic Evaluation & Root Cause
                        </div>
                        <div style={{ fontSize: '0.83rem', color: '#1e293b', lineHeight: 1.5 }}>
                          {causes}
                        </div>
                      </div>
                    )}

                    {/* Recommended Safe Checks */}
                    {Array.isArray(actions) && actions.length > 0 && (
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle2 size={13} /> Operator-Safe Exterior Checks
                        </div>
                        <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.8rem', color: '#334155', lineHeight: 1.5 }}>
                          {actions.map((act, i) => (
                            <li key={i} style={{ marginBottom: '4px' }}>{act}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Document Citations */}
                    {citations.length > 0 && (
                      <div style={{
                        marginTop: '12px',
                        paddingTop: '10px',
                        borderTop: '1px solid #f1f5f9',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                          Verified OEM Document Citations:
                        </span>
                        {citations.map((c, i) => (
                          <div key={i} style={{ fontSize: '0.75rem', color: '#2563eb', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <FileText size={12} />
                            <strong>{c.document_title || c.document_name || c.title || 'Technical Manual'}</strong>
                            {(c.section_title || c.section) && <span style={{ color: '#64748b' }}>— {c.section_title || c.section}</span>}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 1-Click Action to report based on this advice */}
                    <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setReportDescription(`[Copilot Advice]: ${item.query}`);
                          setShowReportModal(true);
                        }}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <PlusCircle size={12} /> Report Issue to Maintenance
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Safety Guidance Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Operator Safe vs Restricted Reference */}
            <div className="card" style={{ padding: '18px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <HardHat size={16} color="#0284c7" /> Operator Authority Matrix
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#059669', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={12} /> Permitted Operator Actions:
                </div>
                <div style={{ fontSize: '0.75rem', color: '#475569', lineHeight: 1.4, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <span>• Observe external alarms and record error codes</span>
                  <span>• Check fluid level sight glasses externally</span>
                  <span>• Perform emergency stop if safety threshold breached</span>
                  <span>• Take photos and report machine issues to dispatch</span>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#dc2626', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <AlertCircle size={12} /> Strictly Restricted Actions (Technician Only):
                </div>
                <div style={{ fontSize: '0.75rem', color: '#991b1b', lineHeight: 1.4, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <span>⛔ Opening high-voltage electrical panels</span>
                  <span>⛔ Mechanical disassembly of spindle/drive</span>
                  <span>⛔ Replacing belts, bearings, or solenoid valves</span>
                  <span>⛔ Modifying PLC parameters or safety interlocks</span>
                </div>
              </div>
            </div>

            {/* Quick Emergency Contacts */}
            <div className="card" style={{ padding: '18px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Phone size={16} color="#16a34a" /> Floor Dispatch Contacts
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px solid #f1f5f9' }}>
                  <span>Floor Supervisor:</span>
                  <strong style={{ color: '#0f172a' }}>Ext. 401 (Alex Johnson)</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px solid #f1f5f9' }}>
                  <span>Senior Technician:</span>
                  <strong style={{ color: '#0f172a' }}>Ext. 302 (Ravi Sharma)</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>E-Stop Safety Team:</span>
                  <strong style={{ color: '#dc2626' }}>Ext. 911 (Plant Operations)</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB CONTENT: APPROVED SAFETY SOPS ==================== */}
      {activeTab === 'safety-sops' && (
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={18} color="#10b981" /> Approved Plant Operating Procedures & Safety Manuals
              </span>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Authorized documentation, Lockout/Tagout (LOTO) protocols, and OEM operating limits
              </span>
            </div>
            <Link to="/documents" className="btn btn-secondary btn-sm">
              Documents Library →
            </Link>
          </div>

          {/* SOP Filter Bar */}
          <div style={{
            display: 'flex',
            gap: '12px',
            padding: '12px 20px',
            backgroundColor: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
              <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                className="form-input"
                placeholder="Search procedures by title or equipment..."
                value={sopSearch}
                onChange={(e) => setSopSearch(e.target.value)}
                style={{ paddingLeft: '32px', fontSize: '0.8rem' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Type:</span>
              <select
                className="form-select"
                value={sopFilter}
                onChange={(e) => setSopFilter(e.target.value)}
                style={{ width: '150px', fontSize: '0.8rem', padding: '6px 10px' }}
              >
                <option value="ALL">All Documents</option>
                <option value="MANUAL">OEM Manual</option>
                <option value="PROCEDURE">Operating SOP</option>
                <option value="SAFETY">Safety Protocol</option>
              </select>
            </div>
          </div>

          {/* Documents Table */}
          <div className="table-container">
            {filteredSops.length === 0 ? (
              <div style={{ padding: '36px 20px', textAlign: 'center', color: '#94a3b8' }}>
                No approved documents found matching your filter criteria.
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Document Title</th>
                    <th>Category</th>
                    <th>Target Equipment</th>
                    <th>Current Version</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSops.map((doc) => (
                    <tr key={doc.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <FileText size={16} color="#2563eb" />
                          <strong style={{ fontSize: '0.85rem' }}>{doc.title}</strong>
                        </div>
                      </td>
                      <td>
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          backgroundColor: '#eff6ff',
                          color: '#1d4ed8',
                          padding: '2px 8px',
                          borderRadius: '4px'
                        }}>
                          {doc.doc_type}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8rem', color: '#334155' }}>
                          {doc.machine ? `${doc.machine.machine_code} (${doc.machine.name})` : 'Plant-Wide Standard'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#64748b' }}>
                          v{doc.current_version?.version_number || '1.0'}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          color: '#059669',
                          backgroundColor: '#ecfdf5',
                          padding: '2px 8px',
                          borderRadius: '4px'
                        }}>
                          APPROVED
                        </span>
                      </td>
                      <td>
                        <Link
                          to="/documents"
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.72rem', padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Eye size={12} /> View Manual
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ==================== MODAL 1: REPORT EQUIPMENT ISSUE ==================== */}
      {showReportModal && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal-card" style={{ maxWidth: '640px', width: '92%' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PlusCircle size={20} color="#0284c7" />
                <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>
                  Report Equipment Problem & Dispatch
                </strong>
              </div>
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#94a3b8' }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleReportProblem}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                
                {/* Machine Selection */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>Target Machine / Station *</label>
                  <select
                    className="form-select"
                    value={reportMachineId}
                    onChange={(e) => setReportMachineId(e.target.value)}
                    required
                  >
                    {machines.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.machine_code} — {m.name} ({m.department})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category & Error Code */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>Problem Category *</label>
                    <select
                      className="form-select"
                      value={reportCategory}
                      onChange={(e) => setReportCategory(e.target.value)}
                    >
                      {ISSUE_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>HMI Error Alarm Code</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="E.g. SP-204, ERR-902"
                      value={reportErrorCode}
                      onChange={(e) => setReportErrorCode(e.target.value)}
                    />
                  </div>
                </div>

                {/* Severity Level Buttons */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>Severity Level *</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                    {SEVERITY_LEVELS.map((s) => {
                      const isSelected = reportSeverity === s.level;
                      return (
                        <button
                          key={s.level}
                          type="button"
                          onClick={() => setReportSeverity(s.level)}
                          style={{
                            padding: '8px 4px',
                            borderRadius: '6px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            border: isSelected ? `2px solid ${s.color}` : '1px solid #e2e8f0',
                            backgroundColor: isSelected ? s.bg : '#ffffff',
                            color: isSelected ? s.color : '#64748b',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {s.level}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Problem Start Time */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>When did this anomaly begin?</label>
                  <select
                    className="form-select"
                    value={reportStartTime}
                    onChange={(e) => setReportStartTime(e.target.value)}
                  >
                    <option value="Just now (< 10 mins)">Just now (under 10 minutes ago)</option>
                    <option value="Past 30-60 mins">Past 30 to 60 minutes</option>
                    <option value="Start of current shift">At the start of current shift</option>
                    <option value="Intermittent throughout day">Intermittent throughout the day</option>
                  </select>
                </div>

                {/* Description */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>Detailed Problem Description *</label>
                  <textarea
                    className="form-textarea"
                    rows="3"
                    placeholder="Describe specific symptoms: noise frequency, vibration intensity, oil leakage location, or temperature rise..."
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                    required
                  />
                </div>

                {/* Attachment Upload / URL */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>Photo / Diagnostic Evidence (Optional)</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept=".jpg,.jpeg,.png,.pdf"
                      style={{ display: 'none' }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingFile}
                      className="btn btn-secondary btn-sm"
                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Upload size={14} />
                      {uploadingFile ? 'Uploading...' : 'Upload Photo'}
                    </button>

                    <div style={{ flex: 1 }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Or enter image URL..."
                        value={reportImageUrl}
                        onChange={(e) => setReportImageUrl(e.target.value)}
                        style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                      />
                    </div>
                  </div>

                  {reportImageUrl && (
                    <div style={{ marginTop: '6px', fontSize: '0.75rem', color: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Paperclip size={12} />
                      <span>Attached: {reportImageUrl}</span>
                    </div>
                  )}
                </div>

              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', padding: '14px 20px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowReportModal(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submittingReport || !reportDescription.trim()}
                  className="btn btn-primary"
                  style={{
                    background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Send size={15} />
                  {submittingReport ? 'Creating Incident...' : 'Submit Incident & Dispatch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL 2: INCIDENT LIFECYCLE TIMELINE ==================== */}
      {showTimelineModal && selectedIncident && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal-card" style={{ maxWidth: '720px', width: '92%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            
            {/* Header */}
            <div className="modal-header" style={{ borderBottom: '1px solid #e2e8f0', padding: '16px 20px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <History size={18} color="#2563eb" />
                  <strong style={{ fontSize: '1.1rem', color: '#0f172a' }}>
                    Incident {selectedIncident.incident_number} Lifecycle Timeline
                  </strong>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                  {selectedIncident.machine?.machine_code} — {selectedIncident.machine?.name}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className={`badge badge-${selectedIncident.status?.toLowerCase()}`}>
                  {selectedIncident.status}
                </span>
                <button
                  type="button"
                  onClick={() => setShowTimelineModal(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#94a3b8' }}
                >
                  &times;
                </button>
              </div>
            </div>

            {/* Modal Body: Chronological Stepper */}
            <div className="modal-body" style={{ overflowY: 'auto', padding: '20px', flex: 1 }}>
              
              {/* Incident Header Info Card */}
              <div style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '12px 16px',
                marginBottom: '20px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '10px'
              }}>
                <div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Severity</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#dc2626' }}>{selectedIncident.severity}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Technician</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>
                    {selectedIncident.assigned_technician?.full_name || 'Awaiting Dispatch'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Supervisor</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>
                    {selectedIncident.supervisor?.full_name || 'Plant Supervisor'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Logged At</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>
                    {new Date(selectedIncident.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>

              {/* Stepper Timeline Events */}
              {loadingTimeline ? (
                <div style={{ padding: '30px', textAlign: 'center' }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    border: '2px solid #e2e8f0',
                    borderTopColor: '#2563eb',
                    animation: 'spin 0.75s linear infinite',
                    margin: '0 auto 8px auto'
                  }} />
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Loading verified chronological events from database...
                  </span>
                </div>
              ) : (
                <div style={{ position: 'relative', paddingLeft: '32px' }}>
                  {/* Vertical Line */}
                  <div style={{
                    position: 'absolute',
                    left: '11px',
                    top: '8px',
                    bottom: '8px',
                    width: '2px',
                    backgroundColor: '#e2e8f0'
                  }} />

                  {timelineEvents.map((evt, idx) => {
                    const isLast = idx === timelineEvents.length - 1;
                    return (
                      <div key={idx} style={{ position: 'relative', marginBottom: isLast ? '0' : '20px' }}>
                        {/* Dot indicator */}
                        <div style={{
                          position: 'absolute',
                          left: '-32px',
                          top: '2px',
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          backgroundColor: '#eff6ff',
                          border: '2px solid #2563eb',
                          color: '#2563eb',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 2
                        }}>
                          <Check size={12} />
                        </div>

                        {/* Event Content Box */}
                        <div style={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          padding: '12px 14px',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>
                              {evt.title}
                            </strong>
                            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                              {evt.timestamp ? new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </div>

                          <div style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.4 }}>
                            {evt.description}
                          </div>

                          <div style={{
                            display: 'flex',
                            gap: '8px',
                            marginTop: '8px',
                            fontSize: '0.7rem',
                            color: '#64748b'
                          }}>
                            <span>Actor: <strong style={{ color: '#1e293b' }}>{evt.actor}</strong></span>
                            <span>•</span>
                            <span>Role: <strong style={{ color: '#2563eb' }}>{evt.role}</strong></span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', padding: '12px 20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowTimelineModal(false)}
              >
                Close Timeline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL 3: MACHINE SPECS & SAFETY ==================== */}
      {showMachineModal && selectedMachineSpecs && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal-card" style={{ maxWidth: '640px', width: '92%' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Cpu size={20} color="#2563eb" />
                <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>
                  {selectedMachineSpecs.machine_code} Technical Specifications & Operating Guidelines
                </strong>
              </div>
              <button
                type="button"
                onClick={() => setShowMachineModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#94a3b8' }}
              >
                &times;
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                backgroundColor: '#f8fafc',
                padding: '14px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
                fontSize: '0.8rem'
              }}>
                <div>
                  <span style={{ color: '#64748b' }}>Unit Name:</span>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{selectedMachineSpecs.name}</div>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Operational Status:</span>
                  <div>
                    <span className={`badge badge-${selectedMachineSpecs.status?.toLowerCase()}`}>
                      {selectedMachineSpecs.status}
                    </span>
                  </div>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Department Cell:</span>
                  <div style={{ fontWeight: 600, color: '#1e293b' }}>{selectedMachineSpecs.department}</div>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Bay Location:</span>
                  <div style={{ fontWeight: 600, color: '#1e293b' }}>{selectedMachineSpecs.location}</div>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Manufacturer:</span>
                  <div style={{ fontWeight: 600, color: '#1e293b' }}>{selectedMachineSpecs.manufacturer || 'Industrial Automation Corp'}</div>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Model:</span>
                  <div style={{ fontWeight: 600, color: '#1e293b' }}>{selectedMachineSpecs.model_number || 'Standard Unit'}</div>
                </div>
              </div>

              {/* Safety Guidance Card */}
              <div style={{
                backgroundColor: '#fffbeb',
                border: '1px solid #fde68a',
                padding: '12px 14px',
                borderRadius: '8px'
              }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#92400e', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={16} /> Approved Operating Safety Rules
                </div>
                <div style={{ fontSize: '0.75rem', color: '#78350f', lineHeight: 1.4 }}>
                  Ensure protective safety screens are fastened prior to spindle spin-up. If vibration sensor indicates excessive runout or squealing, hit emergency stop and notify supervisor.
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', padding: '14px 20px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowMachineModal(false)}
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowMachineModal(false);
                  triggerReportForMachine(selectedMachineSpecs);
                }}
                className="btn btn-primary"
                style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <PlusCircle size={14} /> Report Issue on this Machine
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
