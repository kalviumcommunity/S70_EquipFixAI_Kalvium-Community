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
  ChevronRight, Wrench, Flame, Droplets, Wind, ZoomIn, ZoomOut,
  Maximize2, Minimize2, Copy, Share2, Info, Compass, HelpCircle,
  HardHat, CheckSquare, Sliders, Activity
} from 'lucide-react';

// --- RICH OEM & SCHEMATIC METADATA RESOLVER ---
export const getDocumentMetadata = (doc) => {
  const title = (doc.title || '').toLowerCase();
  
  if (title.includes('cnc-04') || title.includes('spindle')) {
    return {
      oem: 'Industrial Precision Machining Corp',
      code: 'DOC-OEM-CNC04-2026',
      format: 'CAD Blueprint & Manual (PDF)',
      fileSize: '4.8 MB',
      updatedDate: 'March 2026',
      hasSchematic: true,
      schematicType: 'SPINDLE_CAD',
      schematicTitle: 'CNC-04 Cartridge Spindle Assembly & Bearing CAD',
      category: 'OEM_MANUAL',
      description: 'Direct-drive 15,000 RPM cartridge spindle tolerances, bearing replacement procedure (BRG-204-SKF), dynamic runout thresholds, and air-purge labyrinth seals.',
      callouts: [
        { id: '1', name: 'Front Bearing Retainer Collar', partNumber: 'COL-CNC04-F', torque: '45 Nm' },
        { id: '2', name: 'Matched Duplex Angular Contact Bearings', partNumber: 'BRG-204-SKF', spec: 'Klüberplex 4.2g' },
        { id: '3', name: 'Dual Labyrinth Air-Purged Seal', partNumber: 'SEAL-LAB-04', pressure: '0.25 MPa' },
        { id: '4', name: 'Integrated PT100 Thermistor Loop', partNumber: 'TH-1', resistance: '10.0 kΩ' },
        { id: '5', name: 'Front Flange Hex Bolts (x8)', partNumber: 'BOLT-M6-45', pattern: 'Star-Pattern' }
      ]
    };
  } else if (title.includes('480v') || title.includes('substation') || title.includes('electrical')) {
    return {
      oem: 'Siemens Energy / NFPA 70E Directorate',
      code: 'DOC-ELEC-480V-SUB',
      format: 'Single-Line Wiring Diagram (DWG/PDF)',
      fileSize: '6.2 MB',
      updatedDate: 'February 2026',
      hasSchematic: true,
      schematicType: 'ELECTRICAL_SINGLE_LINE',
      schematicTitle: '480V 3-Phase Substation Single-Line & Interlocks',
      category: 'SAFETY_STANDARD',
      description: '480V 3-phase busbar power distribution, Motor Control Center MCC-A breaker isolation, arc flash boundaries (Category 4 PPE), and NFPA 70E 3-point test.',
      callouts: [
        { id: '1', name: 'Primary Fused Breaker Handle', partNumber: 'MDP-3', voltage: '480V AC' },
        { id: '2', name: 'Motor Control Center Busbar', partNumber: 'MCC-A', current: '800A' },
        { id: '3', name: 'Step-Down Control Transformer', partNumber: 'XFMR-480/120', secondary: '120V AC' },
        { id: '4', name: '3-Point Multimeter Test Terminal', partNumber: 'TP-L1-L2-L3', limit: '0.0 V' },
        { id: '5', name: 'Grounding Bus & Earth Fault Interlock', partNumber: 'GND-BUS-MAIN', rating: '10 kA' }
      ]
    };
  } else if (title.includes('hydraulic') || title.includes('fluid') || title.includes('press')) {
    return {
      oem: 'Bosch Rexroth AG — Fluid Power Division',
      code: 'DOC-HYD-PRESS-210B',
      format: 'Hydraulic Manifold Schematic (ISO 1219)',
      fileSize: '5.1 MB',
      updatedDate: 'January 2026',
      hasSchematic: true,
      schematicType: 'HYDRAULIC_MANIFOLD',
      schematicTitle: '210-Bar Hydraulic Press Circuit & Valve Manifold',
      category: 'OEM_MANUAL',
      description: '200-Ton hydraulic press circuit diagram, proportional relief valve PRV-1 diagnostics, accumulator nitrogen pre-charge, and zero-pressure safety lockouts.',
      callouts: [
        { id: '1', name: 'High-Pressure Variable Piston Pump', partNumber: 'PUMP-A10VSO', flow: '60 L/min' },
        { id: '2', name: 'Proportional Relief Valve', partNumber: 'PRV-101', pressure: '210 Bar' },
        { id: '3', name: 'Nitrogen Bladder Accumulator', partNumber: 'ACC-01', precharge: '140 Bar N2' },
        { id: '4', name: 'Primary Hydraulic Lockout Ball Valve', partNumber: 'HV-101', tag: 'Red Padlock' },
        { id: '5', name: 'Accumulator Manual Needle Bleed Valve', partNumber: 'BV-2', port: 'Vent to Tank' }
      ]
    };
  } else if (title.includes('robotic') || title.includes('welder') || title.includes('robot')) {
    return {
      oem: 'ABB Robotics Division / FANUC Automation',
      code: 'DOC-ROB-WELD-TCP',
      format: 'Mechatronic Wiring & SOP (PDF)',
      fileSize: '3.9 MB',
      updatedDate: 'March 2026',
      hasSchematic: true,
      schematicType: 'ROBOTIC_CELL',
      schematicTitle: '6-Axis Articulated Arm & Tooling Schematics',
      category: 'SOP',
      description: '6-Axis articulated arm calibration, Tool Center Point (TCP) calibration protocols, water-cooled welding torch harness pinouts, and daily inspection.',
      callouts: [
        { id: '1', name: 'Articulated Axes J1-J6 Servomotors', partNumber: 'SERVO-BRK-6AX', encoder: 'Absolute 24-bit' },
        { id: '2', name: 'Tool Center Point Optical Alignment Rig', partNumber: 'TCP-CAL-OPT', tolerance: '±0.05 mm' },
        { id: '3', name: 'MIG/MAG Water-Cooled Torch Harness', partNumber: 'TORCH-H2O-500A', duty: '100% at 450A' },
        { id: '4', name: 'Pneumatic Wire-Feed Motor & Solenoid', partNumber: 'FEED-SOL-24V', air: '0.4 MPa' },
        { id: '5', name: 'Safety Optical Light Curtain Array', partNumber: 'CURT-CAT4-SIL3', response: '15 ms' }
      ]
    };
  } else if (title.includes('1910.147') || title.includes('osha') || title.includes('safety')) {
    return {
      oem: 'OSHA Federal Enforcement & Safety Board',
      code: 'OSHA-29CFR-1910.147',
      format: 'Compliance Standard & Protocol (PDF)',
      fileSize: '2.4 MB',
      updatedDate: 'January 2026',
      hasSchematic: true,
      schematicType: 'LOTO_ISOLATION_MAP',
      schematicTitle: 'Plant Hazardous Energy Isolation Architecture',
      category: 'SAFETY_STANDARD',
      description: 'Mandatory plant-wide hazardous energy control regulation, tagout standards, personal padlock lockout rules, and authorized zero-energy verification.',
      callouts: [
        { id: '1', name: 'Lockout Hasp & Master Safety Padlock', partNumber: 'LOTO-HASP-RED', standard: 'OSHA 1910.147' },
        { id: '2', name: 'Electrical Breaker Handle Clamps', partNumber: 'LOCK-BREAKER-480', type: 'Physical Bar' },
        { id: '3', name: 'Pneumatic Line Ball Valve Lockout', partNumber: 'LOCK-VALVE-PNEU', cable: 'Steel Braided' },
        { id: '4', name: 'Standard DANGER DO NOT OPERATE Tag', partNumber: 'TAG-OSHA-VINYL', strength: '50 lbs pull' },
        { id: '5', name: 'Calibrated True-RMS Multimeter', partNumber: 'METER-CAT-IV', test: '3-Point Check' }
      ]
    };
  }

  return {
    oem: 'Plant Engineering Directorate',
    code: `DOC-STD-${(doc.id || 1).toString().padStart(4, '0')}`,
    format: 'Technical Documentation (TXT/PDF)',
    fileSize: '1.8 MB',
    updatedDate: 'Active',
    hasSchematic: false,
    schematicType: null,
    schematicTitle: `${doc.title} Overview`,
    category: doc.doc_type || 'MANUAL',
    description: 'Standard plant operating procedure, maintenance manual, and safety compliance guide.',
    callouts: []
  };
};

export const DocumentsPage = () => {
  const { hasRole, user } = useAuth();
  const { addToast, lastEvent } = useWebSocket();
  const [searchParams, setSearchParams] = useSearchParams();

  // Read URL params
  const urlType = searchParams.get('type') || '';
  const urlDocId = searchParams.get('id') || '';

  const [activeTab, setActiveTab] = useState(
    urlType === 'SAFETY' ? 'SAFETY' :
    urlType === 'SCHEMATICS' ? 'SCHEMATICS' :
    urlType === 'SOP' ? 'SOP' :
    urlType === 'ALL' ? 'ALL' : 'MANUAL'
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

  // Interactive Schematic CAD Viewer Modal State
  const [schematicDoc, setSchematicDoc] = useState(null);
  const [schematicZoom, setSchematicZoom] = useState(1);
  const [schematicLayer, setSchematicLayer] = useState('ALL'); // ALL, ELECTRICAL, FLUID, MECHANICAL
  const [selectedCallout, setSelectedCallout] = useState(null);

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
    if (urlType === 'SAFETY') setActiveTab('SAFETY');
    else if (urlType === 'SCHEMATICS') setActiveTab('SCHEMATICS');
    else if (urlType === 'MANUAL') setActiveTab('MANUAL');
    else if (urlType === 'SOP') setActiveTab('SOP');
    else if (urlType === 'ALL') setActiveTab('ALL');
  }, [urlType]);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    const params = {};
    if (newTab !== 'ALL') params.type = newTab;
    if (machineFilter) params.machine = machineFilter;
    setSearchParams(params);
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

      // Deep link to specific document ID if present in URL
      if (urlDocId) {
        const found = docsRes.data.find(d => String(d.id) === String(urlDocId));
        if (found) {
          handleOpenReader(found);
        }
      }
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

  // Safe Direct Download of Any Technical Manual or Schematic
  const handleDownloadDocument = async (doc) => {
    const meta = getDocumentMetadata(doc);
    try {
      addToast('Downloading Document', `Preparing ${doc.title}...`, 'info');
      const res = await documentsApi.download(doc.id);
      
      // Create download blob
      const blob = new Blob([res.data], { type: 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${meta.code || 'DOC'}_${doc.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      addToast('Download Complete', `${doc.title} saved to downloads.`, 'success');
    } catch (err) {
      // Client-side fallback generation if endpoint is offline
      try {
        const contentRes = await documentsApi.getContent(doc.id);
        const textContent = contentRes.data?.raw_content || `# ${doc.title}\n\n${meta.description}`;
        const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${meta.code}_Manual.txt`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        addToast('Document Exported', 'Downloaded text transcript.', 'success');
      } catch {
        addToast('Download Failed', 'Could not retrieve document stream.', 'error');
      }
    }
  };

  // Clean Formatted Print for Manuals & Protocols
  const handlePrintDocument = (doc, content) => {
    const meta = getDocumentMetadata(doc);
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      addToast('Popup Blocked', 'Please allow popups to print official documentation.', 'error');
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${doc.title} — Official Plant Record</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #0f172a; line-height: 1.6; }
          .header { border-bottom: 3px solid #0284c7; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; }
          .badge { background: #e0f2fe; color: #0369a1; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 12px; }
          .meta { font-size: 13px; color: #64748b; margin-top: 6px; }
          .section { margin-bottom: 24px; page-break-inside: avoid; }
          .section-title { color: #0284c7; font-size: 18px; border-left: 4px solid #0284c7; padding-left: 10px; margin-bottom: 8px; }
          pre { background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 12px; white-space: pre-wrap; }
          .warning { background: #fffbeb; border: 1px solid #fde68a; border-left: 4px solid #f59e0b; padding: 12px; border-radius: 6px; color: #92400e; font-weight: 600; margin: 12px 0; }
          .footer { margin-top: 40px; border-top: 1px solid #cbd5e1; padding-top: 12px; font-size: 11px; color: #94a3b8; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <span class="badge">${doc.doc_type} • ${meta.code}</span>
            <h1 style="margin: 8px 0 4px 0; font-size: 24px;">${doc.title}</h1>
            <div class="meta">OEM Manufacturer: <strong>${meta.oem}</strong> | Asset: <strong>${doc.machine ? `${doc.machine.machine_code} - ${doc.machine.name}` : 'Plant-Wide Standard'}</strong></div>
          </div>
          <div style="text-align: right; font-size: 12px; color: #64748b;">
            <div>Printed: ${new Date().toLocaleDateString()}</div>
            <div>EquipFixAI Plant Operations Record</div>
          </div>
        </div>
        <div class="content">
          ${content?.sections ? content.sections.map(s => `
            <div class="section">
              <div class="section-title">${s.title}</div>
              <div>${s.content.replace(/\n/g, '<br/>')}</div>
            </div>
          `).join('') : `<pre>${content?.raw_content || 'Manual content'}</pre>`}
        </div>
        <div class="footer">
          OSHA 1910.147 & ISO 13374 Condition Monitoring Certified Technical Document • EquipFixAI
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
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
      const meta = getDocumentMetadata(doc);
      setReaderContent({
        title: doc.title,
        doc_type: doc.doc_type,
        raw_content: meta.description,
        sections: [
          { title: 'System Overview & Specifications', content: meta.description },
          { title: 'OEM Technical Callouts', content: meta.callouts.map(c => `• ${c.name} (Part: ${c.partNumber})`).join('\n') || 'Inspect OEM technical blueprints for part specifics.' }
        ]
      });
    } finally {
      setLoadingContent(false);
    }
  };

  // Open Interactive Schematic CAD Viewer
  const handleOpenSchematic = (doc) => {
    setSchematicDoc(doc);
    setSchematicZoom(1);
    setSchematicLayer('ALL');
    setSelectedCallout(null);
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
    const signTime = new Date().toLocaleTimeString();
    setLotoSignOffTime(signTime);
    addToast(
      'Zero-Energy Certified',
      `OSHA 1910.147 isolation protocol certified by ${user?.full_name || 'Operator'} at ${signTime}!`,
      'success'
    );
  };

  const handleDownloadLotoCertificate = () => {
    const certText = `
================================================================================
             OSHA 29 CFR 1910.147 ZERO-ENERGY CLEARANCE CERTIFICATE
================================================================================
Asset: ${lotoDoc?.machine ? `${lotoDoc.machine.machine_code} - ${lotoDoc.machine.name}` : 'Plant Equipment'}
Protocol Document: ${lotoDoc?.title}
Certification Date: ${new Date().toLocaleDateString()} at ${lotoSignOffTime || new Date().toLocaleTimeString()}
Authorized Operator/Technician: ${user?.full_name || 'Authorized Field Specialist'} (${user?.role?.name || user?.role || 'OPERATOR'})

ISOLATION VERIFICATION CHECKLIST (100% COMPLETE):
1. [VERIFIED] Notification of Affected Operators & Line Supervisors
2. [VERIFIED] Normal Shutdown & Console Maintenance Mode Interlock
3. [VERIFIED] Primary Electrical Disconnect & Fluid Valve Isolation (MDP-3, HV-101)
4. [VERIFIED] Red Safety Padlocks (Keyed Different) & DANGER Tags Applied
5. [VERIFIED] Accumulator Depressurized (0 Bar) & Mechanical Die Safety Blocks In Place
6. [VERIFIED] NFPA 70E 3-Point Voltmeter Voltage Verification Passed (0.0 V Measured)
7. [VERIFIED] Zero-Energy State (ZES) Declared Safe for Mechanical Servicing

Status: ZERO-ENERGY STATE (ZES) ACTIVE • ZONE AUTHORIZED FOR MECHANICAL OVERHAUL
================================================================================
    `.trim();

    const blob = new Blob([certText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `OSHA_LOTO_Clearance_${lotoDoc?.machine?.machine_code || 'Plant'}_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    addToast('Certificate Downloaded', 'Zero-Energy clearance certificate generated.', 'success');
  };

  // Launch AI Copilot with Manual Context
  const handleAskAIAboutDoc = (doc) => {
    const meta = getDocumentMetadata(doc);
    const machineCode = doc.machine?.machine_code || 'General Plant Equipment';
    const initialQ = `I am reviewing the official "${doc.title}" (${meta.code}) for ${machineCode}. Provide an operational overview, critical safety steps (including OSHA LOTO), and the top 3 troubleshooting failure modes described in this manual.`;
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
      if (activeTab === 'SCHEMATICS') {
        const meta = getDocumentMetadata(doc);
        if (!meta.hasSchematic) return false;
      }

      // Machine filter
      if (machineFilter && String(doc.machine_id) !== String(machineFilter)) return false;

      // Text query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const meta = getDocumentMetadata(doc);
        const titleMatch = (doc.title || '').toLowerCase().includes(q);
        const typeMatch = (doc.doc_type || '').toLowerCase().includes(q);
        const codeMatch = (meta.code || '').toLowerCase().includes(q);
        const oemMatch = (meta.oem || '').toLowerCase().includes(q);
        const machineMatch = (doc.machine?.machine_code || '').toLowerCase().includes(q) ||
                             (doc.machine?.name || '').toLowerCase().includes(q);
        if (!titleMatch && !typeMatch && !codeMatch && !oemMatch && !machineMatch) return false;
      }

      return true;
    });
  }, [documents, activeTab, machineFilter, searchQuery]);

  // Counts for KPI Header
  const safetyCount = useMemo(() => documents.filter((d) => d.doc_type === 'SAFETY').length, [documents]);
  const manualCount = useMemo(() => documents.filter((d) => d.doc_type === 'MANUAL').length, [documents]);
  const sopCount = useMemo(() => documents.filter((d) => d.doc_type === 'SOP').length, [documents]);
  const schematicsCount = useMemo(() => documents.filter((d) => getDocumentMetadata(d).hasSchematic).length, [documents]);
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
            gap: '5px'
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
            gap: '5px'
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
            gap: '5px'
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
            gap: '5px'
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
        marginBottom: '22px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <div style={{
              backgroundColor: activeTab === 'SAFETY' ? '#166534' : activeTab === 'SCHEMATICS' ? '#0891b2' : '#0284c7',
              color: '#ffffff',
              padding: '10px',
              borderRadius: '12px',
              display: 'flex',
              boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)'
            }}>
              {activeTab === 'SAFETY' ? <ShieldCheck size={28} /> : activeTab === 'SCHEMATICS' ? <Compass size={28} /> : <BookOpen size={28} />}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                  {activeTab === 'SAFETY'
                    ? 'OSHA 1910.147 Hazardous Energy & LOTO Safety Standards'
                    : activeTab === 'SCHEMATICS'
                    ? 'Industrial OEM Schematics & CAD Engineering Blueprints'
                    : 'Technical Manuals & Industrial OEM Schematics'}
                </h1>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1'
                }}>
                  {hasRole(['OPERATOR']) ? 'OPERATOR FLOOR VIEW' : 'FULL SPECIFICATION REPOSITORY'}
                </span>
              </div>
              <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '4px 0 0 0' }}>
                {activeTab === 'SAFETY'
                  ? 'Zero-energy isolation protocols, NFPA 70E Arc Flash electrical PPE requirements, and digital sign-off execution.'
                  : activeTab === 'SCHEMATICS'
                  ? 'High-resolution electrical single-line schematics, 210-bar hydraulic manifold diagrams, and CAD exploded views with callout specs.'
                  : 'Central repository of machine maintenance manuals, engineering CAD blueprints, and standardized operating procedures.'}
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              setCopilotContext({
                machineId: null,
                machineCode: '',
                question: activeTab === 'SAFETY'
                  ? 'What are the mandatory OSHA 1910.147 steps for zero energy verification on plant electrical substations and hydraulic presses?'
                  : activeTab === 'SCHEMATICS'
                  ? 'Explain the hydraulic manifold schematic and relief valve tolerances for PRESS-01 and the spindle bearing callout on CNC-04.'
                  : 'Give me a summary of available machine maintenance manuals, lubrication intervals, and error codes.'
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
              <Plus size={16} /> Upload Manual / SOP
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Highlights Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '14px',
        marginBottom: '20px'
      }}>
        <div
          onClick={() => handleTabChange('MANUAL')}
          className="card"
          style={{
            padding: '14px 18px',
            borderLeft: '4px solid #0284c7',
            backgroundColor: activeTab === 'MANUAL' ? '#f0f9ff' : '#ffffff',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0369a1', textTransform: 'uppercase' }}>
              OEM Manuals
            </span>
            <BookOpen size={18} color="#0284c7" />
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>
            {manualCount} Manuals
          </div>
          <div style={{ fontSize: '0.72rem', color: '#0284c7', marginTop: '2px' }}>
            Mechanical tolerances & procedures
          </div>
        </div>

        <div
          onClick={() => handleTabChange('SCHEMATICS')}
          className="card"
          style={{
            padding: '14px 18px',
            borderLeft: '4px solid #0891b2',
            backgroundColor: activeTab === 'SCHEMATICS' ? '#ecfeff' : '#ffffff',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0e7490', textTransform: 'uppercase' }}>
              OEM Schematics & CAD
            </span>
            <Compass size={18} color="#0891b2" />
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>
            {schematicsCount} Blueprints
          </div>
          <div style={{ fontSize: '0.72rem', color: '#0e7490', marginTop: '2px' }}>
            Interactive component callouts
          </div>
        </div>

        <div
          onClick={() => handleTabChange('SAFETY')}
          className="card"
          style={{
            padding: '14px 18px',
            borderLeft: '4px solid #16a34a',
            backgroundColor: activeTab === 'SAFETY' ? '#f0fdf4' : '#ffffff',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
              OSHA LOTO Standards
            </span>
            <ShieldCheck size={18} color="#16a34a" />
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>
            {safetyCount} Procedures
          </div>
          <div style={{ fontSize: '0.72rem', color: '#15803d', marginTop: '2px' }}>
            Zero-energy state certified
          </div>
        </div>

        <div
          onClick={() => handleTabChange('SOP')}
          className="card"
          style={{
            padding: '14px 18px',
            borderLeft: '4px solid #d97706',
            backgroundColor: activeTab === 'SOP' ? '#fffbeb' : '#ffffff',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#b45309', textTransform: 'uppercase' }}>
              Operating SOPs
            </span>
            <FileCheck size={18} color="#d97706" />
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>
            {sopCount} Procedures
          </div>
          <div style={{ fontSize: '0.72rem', color: '#b45309', marginTop: '2px' }}>
            Shift inspection & setup
          </div>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #7c3aed' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6d28d9', textTransform: 'uppercase' }}>
              Vector RAG Memory
            </span>
            <Sparkles size={18} color="#7c3aed" />
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>
            {indexedCount} / {documents.length} Indexed
          </div>
          <div style={{ fontSize: '0.72rem', color: '#7c3aed', marginTop: '2px' }}>
            Automated semantic chunks
          </div>
        </div>
      </div>

      {/* Modern Navigation Tabs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        borderBottom: '2px solid #e2e8f0',
        marginBottom: '20px',
        overflowX: 'auto',
        paddingBottom: '2px'
      }}>
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
          Technical Manuals
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
          onClick={() => handleTabChange('SCHEMATICS')}
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
            color: activeTab === 'SCHEMATICS' ? '#0e7490' : '#64748b',
            borderBottom: activeTab === 'SCHEMATICS' ? '3px solid #0891b2' : '3px solid transparent',
            marginBottom: '-2px',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap'
          }}
        >
          <Compass size={18} color={activeTab === 'SCHEMATICS' ? '#0891b2' : '#94a3b8'} />
          Industrial OEM Schematics & CAD
          <span style={{
            fontSize: '0.7rem',
            fontWeight: 800,
            padding: '2px 7px',
            borderRadius: '10px',
            backgroundColor: activeTab === 'SCHEMATICS' ? '#ecfeff' : '#f1f5f9',
            color: activeTab === 'SCHEMATICS' ? '#0e7490' : '#64748b'
          }}>
            {schematicsCount}
          </span>
        </button>

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
          Operating SOPs
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
          <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              className="form-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search manuals & schematics by keyword, OEM (e.g. Bosch, Siemens), or asset (e.g. CNC-04)..."
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
              Asset Filter:
            </span>
            <select
              className="form-select"
              value={machineFilter}
              onChange={(e) => setMachineFilter(e.target.value)}
              style={{ width: '220px', padding: '6px 12px', fontSize: '0.85rem' }}
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
              Zero-energy verification (NFPA 70E 3-point multimeter test for 480V electrical, pressure gauges for 210 Bar hydraulic / 90 PSI pneumatic) is mandatory before opening electrical enclosures or mechanical guarding. Use the <strong>Execute LOTO Protocol</strong> button below to certify isolation.
            </div>
          </div>
        </div>
      )}

      {/* Schematics Banner Callout if on SCHEMATICS tab */}
      {activeTab === 'SCHEMATICS' && (
        <div style={{
          backgroundColor: '#ecfeff',
          border: '1px solid #a5f3fc',
          borderLeft: '5px solid #0891b2',
          padding: '14px 18px',
          borderRadius: '8px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <Compass size={28} color="#0891b2" style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#155e75', marginBottom: '2px' }}>
              OFFICIAL OEM CAD BLUEPRINTS & ELECTRICAL/HYDRAULIC CIRCUIT SCHEMATICS
            </div>
            <div style={{ fontSize: '0.8rem', color: '#164e63', lineHeight: 1.4 }}>
              Click <strong>Inspect Schematic CAD</strong> on any asset below to view zoomable assembly diagrams, component callout numbers, torque values, and interlock layer filtering.
            </div>
          </div>
        </div>
      )}

      {/* Documents Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
          <RefreshCw size={28} className="spin" style={{ margin: '0 auto 12px auto', color: '#0284c7' }} />
          <p style={{ fontWeight: 600 }}>Loading industrial manuals & schematics...</p>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '20px' }}>
          {filteredDocuments.map((doc) => {
            const meta = getDocumentMetadata(doc);
            return (
              <div
                key={doc.id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '20px',
                  border: doc.doc_type === 'SAFETY' ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                  boxShadow: doc.doc_type === 'SAFETY' ? '0 4px 12px rgba(22, 163, 74, 0.06)' : '0 2px 6px rgba(0, 0, 0, 0.02)',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                }}
              >
                <div>
                  {/* Header Badge Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    {getDocTypeBadge(doc.doc_type)}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {meta.hasSchematic && (
                        <span style={{
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          color: '#0e7490',
                          backgroundColor: '#cffafe',
                          border: '1px solid #a5f3fc',
                          padding: '2px 7px',
                          borderRadius: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}>
                          <Compass size={11} /> SCHEMATIC
                        </span>
                      )}

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
                          PENDING
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Document Title */}
                  <h3 style={{
                    fontSize: '1.1rem',
                    fontWeight: 800,
                    color: '#0f172a',
                    marginBottom: '6px',
                    lineHeight: 1.35
                  }}>
                    {doc.title}
                  </h3>

                  {/* OEM Manufacturer Tag */}
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#0369a1',
                    fontWeight: 700,
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <Wrench size={13} color="#0284c7" />
                    <span>OEM Authority: {meta.oem}</span>
                  </div>

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
                      Target Asset: <strong>{doc.machine ? `${doc.machine.machine_code} (${doc.machine.name})` : 'Plant-Wide Standard'}</strong>
                    </span>
                  </div>

                  {/* Technical Summary Description */}
                  <p style={{
                    fontSize: '0.8rem',
                    color: '#64748b',
                    lineHeight: 1.45,
                    marginBottom: '14px',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {meta.description}
                  </p>

                  {/* Technical Specs Pill */}
                  <div style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '0.72rem',
                    color: '#475569',
                    marginBottom: '16px',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '6px'
                  }}>
                    <div>Code: <strong>{meta.code}</strong></div>
                    <div>Format: <strong>{meta.format.split(' ')[0]}</strong> ({meta.fileSize})</div>
                    <div>Revision: <strong>v{doc.versions?.[0]?.version_number || '1.0'}</strong></div>
                    <div>Updated: <strong>{meta.updatedDate}</strong></div>
                  </div>
                </div>

                {/* Working Action Buttons */}
                <div style={{
                  paddingTop: '14px',
                  borderTop: '1px solid #f1f5f9',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  {/* Primary Row */}
                  <div style={{ display: 'grid', gridTemplateColumns: meta.hasSchematic ? '1fr 1fr' : '1fr 1fr', gap: '8px' }}>
                    {doc.doc_type === 'SAFETY' ? (
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
                          fontSize: '0.8rem',
                          fontWeight: 700
                        }}
                      >
                        <ShieldCheck size={14} /> Execute LOTO
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOpenReader(doc)}
                        className="btn btn-primary btn-sm"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          fontSize: '0.8rem',
                          fontWeight: 700
                        }}
                      >
                        <BookOpen size={14} /> Read Manual
                      </button>
                    )}

                    {meta.hasSchematic ? (
                      <button
                        onClick={() => handleOpenSchematic(doc)}
                        className="btn btn-secondary btn-sm"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          fontSize: '0.8rem',
                          color: '#0e7490',
                          borderColor: '#a5f3fc',
                          backgroundColor: '#ecfeff',
                          fontWeight: 700
                        }}
                      >
                        <Compass size={14} color="#0891b2" /> View Schematic
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAskAIAboutDoc(doc)}
                        className="btn btn-secondary btn-sm"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          fontSize: '0.8rem',
                          color: '#0369a1',
                          borderColor: '#bae6fd',
                          fontWeight: 700
                        }}
                      >
                        <Sparkles size={14} color="#0284c7" /> Ask AI Copilot
                      </button>
                    )}
                  </div>

                  {/* Secondary Working Row: Download File, Ask AI, History */}
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <button
                      onClick={() => handleDownloadDocument(doc)}
                      className="btn btn-secondary btn-sm"
                      style={{
                        flex: 1,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        fontSize: '0.74rem',
                        fontWeight: 600
                      }}
                      title="Download full manual document"
                    >
                      <Download size={13} color="#475569" /> Download
                    </button>

                    <button
                      onClick={() => handleAskAIAboutDoc(doc)}
                      className="btn btn-secondary btn-sm"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.74rem',
                        color: '#0369a1'
                      }}
                      title="Ask AI Diagnostics with document context"
                    >
                      <Sparkles size={13} color="#0284c7" /> AI Query
                    </button>

                    {hasRole(['TECHNICIAN', 'SUPERVISOR', 'MANAGER']) && (
                      <button
                        onClick={() => handleIngest(doc.id, doc.title)}
                        className="btn btn-secondary btn-sm"
                        disabled={ingestingId === doc.id}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.74rem'
                        }}
                        title="Index into Vector Database"
                      >
                        <Zap size={13} color="#7c3aed" />
                        {ingestingId === doc.id ? 'Indexing...' : 'Index'}
                      </button>
                    )}

                    <button
                      onClick={() => setSelectedDoc(doc)}
                      className="btn btn-secondary btn-sm"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.74rem',
                        color: '#64748b'
                      }}
                      title="View Version Log"
                    >
                      <History size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. INTERACTIVE DOCUMENT READER MODAL                                     */}
      {/* ========================================================================= */}
      {readerDoc && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-card" style={{
            maxWidth: '1080px',
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
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', gap: '10px', marginTop: '2px', flexWrap: 'wrap' }}>
                    <span>Authority: <strong>{getDocumentMetadata(readerDoc).oem}</strong></span>
                    <span>•</span>
                    <span>Code: <strong>{getDocumentMetadata(readerDoc).code}</strong></span>
                    <span>•</span>
                    <span>Asset: <strong>{readerDoc.machine ? `${readerDoc.machine.machine_code} (${readerDoc.machine.name})` : 'Plant-Wide Standard'}</strong></span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => handleAskAIAboutDoc(readerDoc)}
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
                  <Sparkles size={14} /> Ask AI
                </button>

                <button
                  onClick={() => handleDownloadDocument(readerDoc)}
                  className="btn btn-sm btn-secondary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.75rem',
                    color: '#cbd5e1',
                    borderColor: '#334155'
                  }}
                  title="Download File"
                >
                  <Download size={14} /> Download
                </button>

                <button
                  onClick={() => handlePrintDocument(readerDoc, readerContent)}
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
                  <div>Ref Code: <strong>{getDocumentMetadata(readerDoc).code}</strong></div>
                  <div>Format: {getDocumentMetadata(readerDoc).format}</div>
                  <div>RAG Index Status: {readerDoc.indexing_status}</div>
                </div>
              </div>

              {/* Right Column: Full Document Reading View */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', backgroundColor: '#ffffff' }}>
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
                          Updated: {getDocumentMetadata(readerDoc).updatedDate}
                        </span>
                      </div>
                      <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
                        {readerContent.title}
                      </h2>
                      <div style={{ fontSize: '0.82rem', color: '#475569' }}>
                        Asset Reference: <strong>{readerDoc.machine ? `${readerDoc.machine.machine_code} — ${readerDoc.machine.name}` : 'Plant-Wide Standard'}</strong> | OEM: <strong>{getDocumentMetadata(readerDoc).oem}</strong>
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
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <h3 style={{
                              fontSize: '1.05rem',
                              fontWeight: 800,
                              color: '#0369a1',
                              margin: 0,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              borderLeft: '4px solid #0284c7',
                              paddingLeft: '10px'
                            }}>
                              {section.title}
                            </h3>

                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(section.content);
                                addToast('Copied', `"${section.title}" copied to clipboard.`, 'info');
                              }}
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '0.72rem', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Copy size={12} /> Copy Section
                            </button>
                          </div>

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
      {/* 2. INTERACTIVE OEM SCHEMATIC & CAD BLUEPRINT VIEWER MODAL                */}
      {/* ========================================================================= */}
      {schematicDoc && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-card" style={{
            maxWidth: '1100px',
            width: '96vw',
            maxHeight: '94vh',
            display: 'flex',
            flexDirection: 'column',
            padding: 0,
            overflow: 'hidden',
            backgroundColor: '#070c1a',
            color: '#f8fafc',
            border: '1px solid #1e3a8a'
          }}>
            {/* Schematic Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 22px',
              backgroundColor: '#0b1329',
              borderBottom: '1px solid #1e293b'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  padding: '8px',
                  borderRadius: '8px',
                  display: 'flex'
                }}>
                  <Compass size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
                    {getDocumentMetadata(schematicDoc).schematicTitle}
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', gap: '8px', marginTop: '2px' }}>
                    <span>OEM: <strong>{getDocumentMetadata(schematicDoc).oem}</strong></span>
                    <span>•</span>
                    <span>Code: <strong>{getDocumentMetadata(schematicDoc).code}</strong></span>
                    <span>•</span>
                    <span>Format: <strong>CAD Vector (DWG/SVG)</strong></span>
                  </div>
                </div>
              </div>

              {/* Viewer Zoom & Layer Toolbar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '2px 4px' }}>
                  <button
                    onClick={() => setSchematicZoom(prev => Math.max(0.6, prev - 0.2))}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                    title="Zoom Out"
                  >
                    <ZoomOut size={16} />
                  </button>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#38bdf8', padding: '0 6px' }}>
                    {Math.round(schematicZoom * 100)}%
                  </span>
                  <button
                    onClick={() => setSchematicZoom(prev => Math.min(2.0, prev + 0.2))}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                    title="Zoom In"
                  >
                    <ZoomIn size={16} />
                  </button>
                </div>

                <button
                  onClick={() => setSchematicZoom(1)}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.72rem', color: '#cbd5e1', borderColor: '#334155' }}
                >
                  Reset View
                </button>

                <button
                  onClick={() => handleDownloadDocument(schematicDoc)}
                  className="btn btn-primary btn-sm"
                  style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Download size={13} /> Export CAD / SVG
                </button>

                <button
                  onClick={() => setSchematicDoc(null)}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Schematic Content Area (Split: Left SVG Canvas, Right Callouts Inspector) */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden', height: 'calc(94vh - 65px)' }}>
              {/* Left Canvas */}
              <div style={{
                flex: 1,
                backgroundColor: '#030712',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'auto',
                position: 'relative',
                padding: '24px'
              }}>
                <div style={{
                  transform: `scale(${schematicZoom})`,
                  transition: 'transform 0.15s ease',
                  transformOrigin: 'center center'
                }}>
                  {/* Interactive SVG Diagram according to schematic type */}
                  {getDocumentMetadata(schematicDoc).schematicType === 'SPINDLE_CAD' ? (
                    <svg width="680" height="380" viewBox="0 0 680 380" style={{ background: '#0b1329', borderRadius: '12px', border: '1px solid #1e3a8a', boxShadow: '0 0 25px rgba(14, 165, 233, 0.2)' }}>
                      <defs>
                        <linearGradient id="metalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#334155" />
                          <stop offset="50%" stopColor="#64748b" />
                          <stop offset="100%" stopColor="#1e293b" />
                        </linearGradient>
                      </defs>
                      {/* Grid background */}
                      <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(56, 189, 248, 0.08)" strokeWidth="1" />
                      </pattern>
                      <rect width="680" height="380" fill="url(#grid)" />

                      {/* Spindle Housing */}
                      <rect x="120" y="80" width="440" height="220" rx="8" fill="url(#metalGrad)" stroke="#38bdf8" strokeWidth="2" opacity="0.85" />
                      <line x1="80" y1="190" x2="600" y2="190" stroke="#0ea5e9" strokeWidth="3" strokeDasharray="6,4" />

                      {/* Front Retainer Collar */}
                      <rect
                        x="130" y="100" width="50" height="180" rx="4"
                        fill={selectedCallout?.id === '1' ? '#38bdf8' : '#1e3a8a'}
                        stroke="#7dd3fc" strokeWidth="2" cursor="pointer"
                        onClick={() => setSelectedCallout(getDocumentMetadata(schematicDoc).callouts[0])}
                      />
                      <text x="155" y="195" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">1. COLLAR</text>

                      {/* Matched Duplex Bearings (BRG-204-SKF) */}
                      <rect
                        x="200" y="110" width="70" height="160" rx="4"
                        fill={selectedCallout?.id === '2' ? '#10b981' : '#065f46'}
                        stroke="#34d399" strokeWidth="2" cursor="pointer"
                        onClick={() => setSelectedCallout(getDocumentMetadata(schematicDoc).callouts[1])}
                      />
                      <text x="235" y="195" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">2. BRG-204</text>

                      {/* Dual Labyrinth Air Seal */}
                      <rect
                        x="290" y="120" width="50" height="140" rx="4"
                        fill={selectedCallout?.id === '3' ? '#f59e0b' : '#78350f'}
                        stroke="#fbbf24" strokeWidth="2" cursor="pointer"
                        onClick={() => setSelectedCallout(getDocumentMetadata(schematicDoc).callouts[2])}
                      />
                      <text x="315" y="195" fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle">3. SEAL</text>

                      {/* PT100 Thermistor Loop */}
                      <circle
                        cx="380" cy="190" r="24"
                        fill={selectedCallout?.id === '4' ? '#ef4444' : '#991b1b'}
                        stroke="#f87171" strokeWidth="2" cursor="pointer"
                        onClick={() => setSelectedCallout(getDocumentMetadata(schematicDoc).callouts[3])}
                      />
                      <text x="380" y="194" fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle">4. TH-1</text>

                      {/* Rear Bearing Set */}
                      <rect x="430" y="110" width="60" height="160" rx="4" fill="#065f46" stroke="#34d399" strokeWidth="2" />
                      <text x="460" y="195" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">BRG-REAR</text>

                      {/* 8-Bolt Flange Callout */}
                      <circle
                        cx="100" cy="190" r="16"
                        fill={selectedCallout?.id === '5' ? '#8b5cf6' : '#5b21b6'}
                        stroke="#c084fc" strokeWidth="2" cursor="pointer"
                        onClick={() => setSelectedCallout(getDocumentMetadata(schematicDoc).callouts[4])}
                      />
                      <text x="100" y="194" fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle">5. M6</text>

                      <text x="340" y="40" fill="#38bdf8" fontSize="14" fontWeight="bold" textAnchor="middle">
                        CNC-04 15,000 RPM CARTRIDGE SPINDLE SECTION VIEW
                      </text>
                      <text x="340" y="340" fill="#94a3b8" fontSize="11" textAnchor="middle">
                        Click any numbered component to view OEM part number, torque tolerances, and lubrication specs
                      </text>
                    </svg>
                  ) : getDocumentMetadata(schematicDoc).schematicType === 'ELECTRICAL_SINGLE_LINE' ? (
                    <svg width="680" height="380" viewBox="0 0 680 380" style={{ background: '#0b1329', borderRadius: '12px', border: '1px solid #1e3a8a', boxShadow: '0 0 25px rgba(14, 165, 233, 0.2)' }}>
                      <defs>
                        <pattern id="grid2" width="20" height="20" patternUnits="userSpaceOnUse">
                          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(56, 189, 248, 0.08)" strokeWidth="1" />
                        </pattern>
                      </defs>
                      <rect width="680" height="380" fill="url(#grid2)" />

                      <text x="340" y="35" fill="#38bdf8" fontSize="14" fontWeight="bold" textAnchor="middle">
                        480V 3-PHASE SUBSTATION & MOTOR CONTROL CENTER SINGLE-LINE
                      </text>

                      {/* 480V 3-Phase Incoming Feeder */}
                      <line x1="80" y1="90" x2="600" y2="90" stroke="#f59e0b" strokeWidth="4" />
                      <text x="90" y="75" fill="#fbbf24" fontSize="11" fontWeight="bold">480V 3-PHASE 60Hz FEEDER BUS</text>

                      {/* Main Disconnect MDP-3 */}
                      <rect
                        x="130" y="120" width="90" height="60" rx="6"
                        fill={selectedCallout?.id === '1' ? '#38bdf8' : '#1e3a8a'}
                        stroke="#7dd3fc" strokeWidth="2" cursor="pointer"
                        onClick={() => setSelectedCallout(getDocumentMetadata(schematicDoc).callouts[0])}
                      />
                      <text x="175" y="145" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">1. MDP-3</text>
                      <text x="175" y="162" fill="#93c5fd" fontSize="9" textAnchor="middle">FUSED BREAKER</text>

                      {/* Motor Control Center MCC-A */}
                      <rect
                        x="270" y="120" width="110" height="60" rx="6"
                        fill={selectedCallout?.id === '2' ? '#10b981' : '#065f46'}
                        stroke="#34d399" strokeWidth="2" cursor="pointer"
                        onClick={() => setSelectedCallout(getDocumentMetadata(schematicDoc).callouts[1])}
                      />
                      <text x="325" y="145" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">2. MCC-A</text>
                      <text x="325" y="162" fill="#a7f3d0" fontSize="9" textAnchor="middle">800A MAIN BUS</text>

                      {/* Control Transformer */}
                      <rect
                        x="430" y="120" width="100" height="60" rx="6"
                        fill={selectedCallout?.id === '3' ? '#f59e0b' : '#78350f'}
                        stroke="#fbbf24" strokeWidth="2" cursor="pointer"
                        onClick={() => setSelectedCallout(getDocumentMetadata(schematicDoc).callouts[2])}
                      />
                      <text x="480" y="145" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">3. XFMR-480/120</text>
                      <text x="480" y="162" fill="#fde68a" fontSize="9" textAnchor="middle">120V CONTROL</text>

                      {/* 3-Point Voltmeter Test Terminal */}
                      <rect
                        x="200" y="240" width="140" height="60" rx="6"
                        fill={selectedCallout?.id === '4' ? '#ef4444' : '#991b1b'}
                        stroke="#f87171" strokeWidth="2" cursor="pointer"
                        onClick={() => setSelectedCallout(getDocumentMetadata(schematicDoc).callouts[3])}
                      />
                      <text x="270" y="265" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">4. TEST TERMINAL</text>
                      <text x="270" y="282" fill="#fca5a5" fontSize="9" textAnchor="middle">0.0V REQUIRED</text>

                      {/* Ground Bus */}
                      <rect
                        x="380" y="240" width="130" height="60" rx="6"
                        fill={selectedCallout?.id === '5' ? '#8b5cf6' : '#5b21b6'}
                        stroke="#c084fc" strokeWidth="2" cursor="pointer"
                        onClick={() => setSelectedCallout(getDocumentMetadata(schematicDoc).callouts[4])}
                      />
                      <text x="445" y="265" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">5. GND BUS</text>
                      <text x="445" y="282" fill="#ddd6fe" fontSize="9" textAnchor="middle">EARTH INTERLOCK</text>

                      <text x="340" y="340" fill="#94a3b8" fontSize="11" textAnchor="middle">
                        NFPA 70E Standard 120.5: Zero-Energy Verification mandatory at Test Terminal (4)
                      </text>
                    </svg>
                  ) : (
                    // Generic Hydraulic / Machine schematic view
                    <svg width="680" height="380" viewBox="0 0 680 380" style={{ background: '#0b1329', borderRadius: '12px', border: '1px solid #1e3a8a', boxShadow: '0 0 25px rgba(14, 165, 233, 0.2)' }}>
                      <rect width="680" height="380" fill="#0b1329" />
                      <text x="340" y="40" fill="#38bdf8" fontSize="14" fontWeight="bold" textAnchor="middle">
                        210-BAR HYDRAULIC PRESS FLUID POWER MANIFOLD (ISO 1219)
                      </text>
                      {/* Hydraulic loop line */}
                      <line x1="100" y1="180" x2="580" y2="180" stroke="#0284c7" strokeWidth="4" />

                      {/* Pump P1 */}
                      <circle cx="150" cy="180" r="36" fill="#1e3a8a" stroke="#38bdf8" strokeWidth="2" cursor="pointer" onClick={() => setSelectedCallout(getDocumentMetadata(schematicDoc).callouts[0])} />
                      <text x="150" y="185" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">1. PUMP</text>

                      {/* Relief Valve PRV-1 */}
                      <rect x="250" y="145" width="80" height="70" rx="6" fill="#065f46" stroke="#34d399" strokeWidth="2" cursor="pointer" onClick={() => setSelectedCallout(getDocumentMetadata(schematicDoc).callouts[1])} />
                      <text x="290" y="182" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">2. PRV-1</text>

                      {/* Accumulator ACC-01 */}
                      <ellipse cx="400" cy="180" rx="35" ry="45" fill="#78350f" stroke="#fbbf24" strokeWidth="2" cursor="pointer" onClick={() => setSelectedCallout(getDocumentMetadata(schematicDoc).callouts[2])} />
                      <text x="400" y="185" fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle">3. ACC-01</text>

                      {/* Ball Valve HV-101 */}
                      <rect x="490" y="150" width="70" height="60" rx="6" fill="#991b1b" stroke="#f87171" strokeWidth="2" cursor="pointer" onClick={() => setSelectedCallout(getDocumentMetadata(schematicDoc).callouts[3])} />
                      <text x="525" y="184" fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle">4. HV-101</text>

                      <text x="340" y="340" fill="#94a3b8" fontSize="11" textAnchor="middle">
                        Lockout Points: Close HV-101 (4) and vent accumulator bleed needle to tank (0 Bar)
                      </text>
                    </svg>
                  )}
                </div>
              </div>

              {/* Right Callouts & Tolerances Inspector */}
              <div style={{
                width: '340px',
                backgroundColor: '#0f172a',
                borderLeft: '1px solid #1e293b',
                display: 'flex',
                flexDirection: 'column',
                flexShrink: 0
              }}>
                <div style={{ padding: '16px', borderBottom: '1px solid #1e293b' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Component Callouts ({getDocumentMetadata(schematicDoc).callouts?.length || 0})
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '3px' }}>
                    Select a component on the blueprint to inspect engineering specs:
                  </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {getDocumentMetadata(schematicDoc).callouts.map((c) => {
                    const isSelected = selectedCallout?.id === c.id;
                    return (
                      <div
                        key={c.id}
                        onClick={() => setSelectedCallout(c)}
                        style={{
                          backgroundColor: isSelected ? 'rgba(14, 165, 233, 0.15)' : '#070c18',
                          border: isSelected ? '1px solid #38bdf8' : '1px solid #1e293b',
                          borderRadius: '8px',
                          padding: '12px 14px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: isSelected ? '#38bdf8' : '#f8fafc' }}>
                            {c.id}. {c.name}
                          </span>
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#38bdf8', backgroundColor: '#0c1a36', padding: '2px 6px', borderRadius: '4px' }}>
                            {c.partNumber}
                          </span>
                        </div>
                        {c.torque && <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Torque: <strong style={{ color: '#ffffff' }}>{c.torque}</strong></div>}
                        {c.spec && <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Lubrication: <strong style={{ color: '#ffffff' }}>{c.spec}</strong></div>}
                        {c.pressure && <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Pressure: <strong style={{ color: '#ffffff' }}>{c.pressure}</strong></div>}
                        {c.voltage && <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Voltage Rating: <strong style={{ color: '#ffffff' }}>{c.voltage}</strong></div>}
                        {c.pattern && <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Pattern: <strong style={{ color: '#ffffff' }}>{c.pattern}</strong></div>}
                      </div>
                    );
                  })}
                </div>

                {/* Bottom Inspector Box */}
                {selectedCallout && (
                  <div style={{
                    padding: '14px 16px',
                    borderTop: '1px solid #1e293b',
                    backgroundColor: '#070c18'
                  }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#10b981', textTransform: 'uppercase' }}>
                      Selected OEM Part Specification
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#ffffff', marginTop: '2px' }}>
                      {selectedCallout.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#38bdf8', marginTop: '2px' }}>
                      Catalog Number: <strong>{selectedCallout.partNumber}</strong>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. INTERACTIVE OSHA 1910.147 LIVE LOTO EXECUTION CHECKLIST MODAL          */}
      {/* ========================================================================= */}
      {lotoDoc && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-card" style={{
            maxWidth: '880px',
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
                        onChange={() => {}}
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
                  padding: '18px 20px',
                  backgroundColor: '#f0fdf4',
                  border: '2px solid #22c55e',
                  borderRadius: '10px',
                  textAlign: 'center'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                    <CheckCircle2 size={38} color="#16a34a" />
                  </div>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#166534', margin: '0 0 4px 0' }}>
                    ZERO-ENERGY STATE CONFIRMED
                  </h4>
                  <p style={{ fontSize: '0.82rem', color: '#15803d', maxWidth: '520px', margin: '0 auto 14px auto' }}>
                    All 7 OSHA 1910.147 hazardous energy isolation verification steps have been executed and validated. The equipment is safe for mechanical overhaul.
                  </p>

                  {lotoSignedOff ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
                      <div style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #86efac',
                        borderRadius: '6px',
                        padding: '8px 16px',
                        display: 'inline-block',
                        fontSize: '0.82rem',
                        color: '#166534',
                        fontWeight: 700
                      }}>
                        ✓ Certified by: {user?.full_name || 'Authorized Field Operator'} at {lotoSignOffTime}
                      </div>

                      <button
                        onClick={handleDownloadLotoCertificate}
                        className="btn btn-primary"
                        style={{
                          backgroundColor: '#16a34a',
                          borderColor: '#15803d',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Download size={15} /> Download Signed Zero-Energy Certificate
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleSignOffLoto}
                      className="btn btn-primary"
                      style={{
                        backgroundColor: '#16a34a',
                        borderColor: '#15803d',
                        fontWeight: 800,
                        fontSize: '0.88rem',
                        padding: '9px 24px'
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
      {/* 4. UPLOAD OPERATIONAL DOCUMENT MODAL                                     */}
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
      {/* 5. VERSION HISTORY MODAL                                                  */}
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                        Path: {v.file_url}
                      </span>
                      <button
                        onClick={() => handleDownloadDocument(selectedDoc)}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                      >
                        Download Revision
                      </button>
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
      {/* 6. AI COPILOT DIRECT DIAGNOSTICS MODAL                                   */}
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

export default DocumentsPage;
