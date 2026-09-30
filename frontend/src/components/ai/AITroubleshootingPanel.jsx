import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles, Wrench, AlertTriangle, Shield, Check, Copy, ThumbsUp, ThumbsDown,
  Paperclip, Mic, MicOff, Send, X, ExternalLink, Download, Layers, MoreVertical,
  BookOpen, Trash2, ChevronRight, FileText, ChevronDown, CheckCircle2,
  Clock, ArrowRight, RotateCw, Search, Cpu, Pin, HardHat, Eye, RefreshCw
} from 'lucide-react';
import { aiApi, machinesApi, documentsApi, workOrdersApi } from '../../services/api';
import {
  getAIConfig, saveAIConfig, askEquipFixCopilot, generateIndustrialImage
} from '../../services/aiCopilotService';
import AIKeyConfigModal from './AIKeyConfigModal';

// ─────────────────────────────────────────────────────────────────────────────
// LIGHT THEMED RICH HTML RESPONSE STYLES (MATCHING REFERENCE DESIGN)
// ─────────────────────────────────────────────────────────────────────────────
const AI_RESPONSE_STYLES = `
  .ai-response-root {
    font-family: inherit;
    color: #0f172a;
    font-size: 0.885rem;
    line-height: 1.7;
    word-break: break-word;
  }
  .ai-section {
    font-size: 0.95rem;
    font-weight: 800;
    color: #0284c7;
    margin: 16px 0 10px 0;
    padding: 8px 14px 8px 14px;
    border-left: 3px solid #0284c7;
    background: #f0f9ff;
    border-radius: 0 8px 8px 0;
    display: flex;
    align-items: center;
    gap: 8px;
    letter-spacing: -0.01em;
  }
  .ai-section:first-child { margin-top: 2px; }
  .ai-kv {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 7px 12px;
    margin: 5px 0;
    background: #f8fafc;
    border-radius: 6px;
    border: 1px solid #e2e8f0;
    flex-wrap: wrap;
  }
  .ai-key {
    font-weight: 700;
    color: #64748b;
    font-size: 0.775rem;
    min-width: 140px;
    flex-shrink: 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding-top: 2px;
  }
  .ai-val {
    color: #0f172a;
    font-size: 0.885rem;
    flex: 1;
    line-height: 1.55;
    font-weight: 500;
  }
  .ai-steps {
    margin: 10px 0;
    padding: 0;
    list-style: none;
    counter-reset: step-counter;
  }
  .ai-steps li {
    counter-increment: step-counter;
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin: 8px 0;
    font-size: 0.885rem;
    color: #1e293b;
    line-height: 1.6;
    padding: 9px 13px;
    background: #ffffff;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
  }
  .ai-steps li::before {
    content: counter(step-counter);
    background: #2563eb;
    color: #ffffff;
    font-weight: 900;
    font-size: 0.72rem;
    min-width: 22px;
    height: 22px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 1px;
    box-shadow: 0 1px 3px rgba(37, 99, 235, 0.3);
  }
  .ai-facts { margin: 10px 0; padding: 0; list-style: none; }
  .ai-facts li {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin: 6px 0;
    font-size: 0.885rem;
    color: #1e293b;
    line-height: 1.6;
    padding: 4px 0;
    border-bottom: 1px solid #f1f5f9;
  }
  .ai-facts li:last-child { border-bottom: none; }
  .ai-facts li::before {
    content: "▸";
    color: #2563eb;
    font-weight: 900;
    font-size: 0.85rem;
    flex-shrink: 0;
    margin-top: 1px;
  }
  .ai-warn {
    background: #fffbeb;
    border: 1px solid #fde68a;
    border-left: 4px solid #f59e0b;
    border-radius: 8px;
    padding: 12px 16px;
    margin: 12px 0;
    color: #92400e;
    font-size: 0.875rem;
    font-weight: 600;
    line-height: 1.6;
  }
  .ai-badge {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 5px;
    font-size: 0.72rem;
    font-weight: 700;
    margin: 2px 4px 2px 0;
    background: #eff6ff;
    color: #1d4ed8;
    border: 1px solid #bfdbfe;
  }
  .ai-code, code {
    background: #f1f5f9;
    color: #0369a1;
    padding: 2px 7px;
    border-radius: 5px;
    font-family: 'JetBrains Mono', Menlo, Consolas, monospace;
    font-size: 0.84rem;
    border: 1px solid #e2e8f0;
  }
  .ai-table {
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0;
    font-size: 0.84rem;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid #e2e8f0;
    background: #ffffff;
    display: block;
    overflow-x: auto;
  }
  .ai-table th {
    color: #1e293b;
    font-weight: 800;
    padding: 9px 12px;
    text-align: left;
    border-bottom: 2px solid #2563eb;
    font-size: 0.76rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    white-space: nowrap;
    background: #f8fafc;
  }
  .ai-table td {
    padding: 8px 12px;
    border-bottom: 1px solid #f1f5f9;
    color: #1e293b;
    vertical-align: top;
    line-height: 1.5;
  }
  .ai-table tbody tr:hover td { background: #f0f9ff; }
`;

let _styleInjected = false;
function injectAIStyles() {
  if (_styleInjected || typeof document === 'undefined') return;
  _styleInjected = true;
  const el = document.createElement('style');
  el.setAttribute('data-ai-styles', '1');
  el.textContent = AI_RESPONSE_STYLES;
  document.head.appendChild(el);
}

export const FormattedAIMessage = ({ content }) => {
  useEffect(() => { injectAIStyles(); }, []);
  if (!content) return null;

  const sanitized = content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/javascript:/gi, '');

  const isHtml = /<(h[1-6]|div|ul|ol|li|table|span|p|code|pre)\b/i.test(sanitized);

  if (isHtml) {
    return (
      <div
        className="ai-response-root"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: sanitized }}
      />
    );
  }

  const lines = content.split('\n');
  const elements = [];

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) {
      elements.push(<div key={`br-${idx}`} style={{ height: '8px' }} />);
      return;
    }
    if (trimmed.startsWith('### ')) {
      elements.push(<h4 key={`h-${idx}`} className="ai-section">{trimmed.slice(4)}</h4>);
      return;
    }
    if (trimmed.startsWith('## ')) {
      elements.push(<h3 key={`h-${idx}`} className="ai-section">{trimmed.slice(3)}</h3>);
      return;
    }
    if (/^(warning|caution|danger|safety notice|loto|notice)/i.test(trimmed)) {
      elements.push(<div key={`warn-${idx}`} className="ai-warn">⚠️ {trimmed}</div>);
      return;
    }
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
      elements.push(
        <div key={`b-${idx}`} style={{ display: 'flex', gap: '8px', margin: '5px 0', fontSize: '0.885rem', color: '#1e293b' }}>
          <span style={{ color: '#2563eb', fontWeight: 900 }}>•</span>
          <div style={{ flex: 1 }}>{trimmed.replace(/^[\*\-•]\s+/, '')}</div>
        </div>
      );
      return;
    }
    const nm = trimmed.match(/^(\d+)[\.\)]\s+(.*)/);
    if (nm) {
      elements.push(
        <div key={`n-${idx}`} style={{ display: 'flex', gap: '10px', margin: '6px 0', fontSize: '0.885rem', color: '#1e293b' }}>
          <span style={{ background: '#2563eb', color: '#ffffff', fontWeight: 800, fontSize: '0.72rem', padding: '2px 7px', borderRadius: '6px', flexShrink: 0 }}>
            {nm[1]}
          </span>
          <div style={{ flex: 1 }}>{nm[2]}</div>
        </div>
      );
      return;
    }
    elements.push(<p key={`p-${idx}`} style={{ margin: '5px 0', fontSize: '0.885rem', color: '#1e293b', lineHeight: 1.65 }}>{trimmed}</p>);
  });

  return <div style={{ wordBreak: 'break-word' }}>{elements}</div>;
};

// ─────────────────────────────────────────────────────────────────────────────
// AITROUBLESHOOTINGPANEL - IMPLEMENTING EXACT USER REFERENCE SPECIFICATION
// ─────────────────────────────────────────────────────────────────────────────
export const AITroubleshootingPanel = ({
  machineId = null,
  workOrderId = null,
  machineCode = 'CNC-042',
  incidentSummary = '',
  isFullPage = false
}) => {
  // Equipment Context
  const [activeMachineCode, setActiveMachineCode] = useState(machineCode || 'CNC-042');
  const [activeMachineData, setActiveMachineData] = useState({
    id: 1,
    machine_code: 'CNC-042',
    name: '5-Axis Precision CNC Milling Station',
    model: 'XYZ-500',
    manufacturer: 'TechNation',
    location: 'Production Line 1',
    status: 'Warning',
    alarm: 'Alarm: E-204',
    last_maintenance: '24 Sep 2026'
  });
  const [showMachineModal, setShowMachineModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Right Sidebar State
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const [rightTab, setRightTab] = useState('sources'); // 'sources' | 'equipment' | 'history' | 'related'

  // Chat Messages State
  const [messages, setMessages] = useState([
    {
      id: 'msg-1',
      role: 'user',
      content: 'Why is the CNC-042 showing alarm E-204? What should I check first?',
      timestamp: '10:24 AM',
      author: 'JD'
    }
  ]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(true);
  const [analyzingStep, setAnalyzingStep] = useState(3); // 0 to 8
  const [copiedId, setCopiedId] = useState(null);
  const [feedback, setFeedback] = useState({});
  const [diagrams, setDiagrams] = useState({});

  // Voice & Attachments
  const [isListening, setIsListening] = useState(false);
  const [attachedImage, setAttachedImage] = useState(null);
  const [attachedImageBase64, setAttachedImageBase64] = useState(null);
  const fileInputRef = useRef(null);

  // Key Config Modal
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [aiConfig, setAiConfig] = useState(getAIConfig());

  // Domestic Refs
  const chatScrollRef = useRef(null);
  const recognitionRef = useRef(null);

  // Checklist steps in analyzing card
  const CHECKLIST_STEPS = [
    'Understanding your request',
    'Identifying equipment context',
    'Extracting symptoms and error codes',
    'Searching equipment documentation',
    'Finding relevant maintenance procedures',
    'Comparing possible causes',
    'Checking safety requirements',
    'Reviewing maintenance history',
    'Preparing recommendation'
  ];

  // Right sidebar data matching reference design
  const SOURCES_LIST = [
    {
      id: 1,
      title: 'CNC-500 Manual',
      section: 'Section 8.3 - Spindle Drive Faults',
      relevance: '95%'
    },
    {
      id: 2,
      title: 'Maintenance Procedure',
      section: 'Spindle Drive Troubleshooting',
      relevance: '82%'
    },
    {
      id: 3,
      title: 'Electrical Safety SOP',
      section: 'Isolation Procedure',
      relevance: '76%'
    }
  ];

  const MAINTENANCE_HISTORY = [
    { date: '12 Sep 2026', title: 'Spindle Drive Alarm E-204', status: 'Resolved', type: 'success' },
    { date: '28 Aug 2026', title: 'Routine Maintenance', status: 'Completed', type: 'success' },
    { date: '14 Jul 2026', title: 'Spindle Drive Inspection', status: 'Completed', type: 'neutral' }
  ];

  const RELATED_WORK_ORDERS = [
    { id: 'WO-1045', title: 'Spindle drive fault investigation', status: 'Open', type: 'warning' },
    { id: 'WO-0987', title: 'CNC-042 maintenance', status: 'Closed', type: 'neutral' },
    { id: 'WO-0871', title: 'Electrical system check', status: 'Closed', type: 'neutral' }
  ];

  // Listen to Recent Chats selection & New Chat from left sidebar
  useEffect(() => {
    const handleNewChat = () => {
      setMessages([]);
      setLoading(false);
      setQuestion('');
    };

    const handleSelectChat = (e) => {
      const chat = e.detail;
      if (!chat) return;
      setActiveMachineCode(chat.machineCode || 'CNC-042');
      setActiveMachineData((prev) => ({
        ...prev,
        machine_code: chat.machineCode || 'CNC-042',
        alarm: `Alarm: ${chat.alarm || 'E-204'}`,
        name: chat.title || prev.name
      }));
      setLoading(false);
      setMessages([
        {
          id: `msg-${chat.id}`,
          role: 'user',
          content: `Why is ${chat.title} reporting ${chat.alarm || 'an issue'}? What should I check first?`,
          timestamp: chat.time || '10:24 AM',
          author: 'JD'
        },
        {
          id: `asst-${chat.id}`,
          role: 'assistant',
          timestamp: '10:25 AM',
          content: `<h4 class="ai-section">🔍 Diagnostics Protocol — ${chat.title}</h4>
<div class="ai-kv"><span class="ai-key">Equipment Unit</span><span class="ai-val">${chat.machineCode || 'Industrial Asset'}</span></div>
<div class="ai-kv"><span class="ai-key">Focus Area</span><span class="ai-val">${chat.subtitle}</span></div>
<div class="ai-warn">⚠️ <strong>Notice:</strong> Verify isolation lockouts prior to hands-on component verification.</div>
<h4 class="ai-section">📋 Recommended Actions</h4>
<ol class="ai-steps">
  <li>Check physical tolerances, electrical bus readings, and connector integrity.</li>
  <li>Compare real-time sensor feedback against standard specification bounds.</li>
  <li>Refer to OEM documentation before clearing active fault indicators.</li>
</ol>`
        }
      ]);
    };

    window.addEventListener('equipfix:new-chat', handleNewChat);
    window.addEventListener('equipfix:select-chat', handleSelectChat);
    return () => {
      window.removeEventListener('equipfix:new-chat', handleNewChat);
      window.removeEventListener('equipfix:select-chat', handleSelectChat);
    };
  }, []);

  // Simulate initial analysis progression then generate answer if initial message present
  useEffect(() => {
    let timer;
    if (loading && analyzingStep < 4) {
      timer = setTimeout(() => {
        setAnalyzingStep((prev) => prev + 1);
      }, 700);
    } else if (loading && analyzingStep >= 4 && messages.length === 1) {
      // Produce final grounded answer matching reference
      timer = setTimeout(() => {
        setLoading(false);
        setMessages((prev) => [
          ...prev,
          {
            id: 'msg-2',
            role: 'assistant',
            timestamp: '10:25 AM',
            content: `<h4 class="ai-section">🔍 Root Cause Diagnosis — Alarm E-204 (Spindle Drive Inverter Overcurrent)</h4>
<div class="ai-kv"><span class="ai-key">Affected Subsystem</span><span class="ai-val">Main Spindle Inverter Drive Module (Axis-S)</span></div>
<div class="ai-kv"><span class="ai-key">Criticality Level</span><span class="ai-val"><span class="ai-badge">HIGH PRIORITY</span><span class="ai-badge">OSHA LOTO REQUIRED</span></span></div>
<div class="ai-warn">⚠️ <strong>Safety Warning:</strong> Discharge DC bus capacitors (minimum 5-minute wait after main breaker isolation) before opening drive cabinet. Measure residual bus voltage &lt; 24VDC with calibrated multimeter.</div>
<ul class="ai-facts">
  <li><strong>Fault Code Definition:</strong> Alarm E-204 indicates instantaneous overcurrent or thermal overload trip on the spindle variable frequency drive (VFD).</li>
  <li><strong>Observed Historical Correlation:</strong> CNC-042 previously logged Alarm E-204 on 12 Sep 2026 due to coolant contamination inside the rear encoder harness connector.</li>
</ul>
<h4 class="ai-section">📋 Immediate Verification Procedure</h4>
<ol class="ai-steps">
  <li><strong>Check Spindle Mechanical Freedom:</strong> Manually rotate the spindle tool-holder taper by hand. Ensure zero mechanical binding, bearing roughness, or gear mesh lockup.</li>
  <li><strong>Inspect Drive Chiller Circuit:</strong> Verify spindle coolant flow rate is ≥ 6.2 L/min and chiller temperature reads between 18°C–22°C.</li>
  <li><strong>Measure Motor Winding Insulation:</strong> Perform 500VDC megger test on phases U, V, W to ground. Resistance must exceed 10 MΩ.</li>
  <li><strong>Inspect Encoder Cables:</strong> Check connector CN2 on drive amplifier for ingress of cutting fluid or loose pin retention.</li>
</ol>`
          }
        ]);
      }, 1200);
    }
    return () => clearTimeout(timer);
  }, [loading, analyzingStep, messages.length]);

  // Scoped smooth scroll inside chat feed only
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTo({
        top: chatScrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, loading]);

  // Voice Recognition
  const toggleVoiceInput = () => {
    const SpeechRec = window.webkitSpeechRecognition || window.SpeechRecognition;
    if (!SpeechRec) {
      alert('Voice dictation is not supported by your current browser.');
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const rec = new SpeechRec();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';
      rec.onstart = () => setIsListening(true);
      rec.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        if (transcript) setQuestion((prev) => (prev ? `${prev} ${transcript}` : transcript));
      };
      rec.onerror = () => setIsListening(false);
      rec.onend = () => setIsListening(false);
      recognitionRef.current = rec;
      rec.start();
    } catch (e) {
      setIsListening(false);
    }
  };

  // Image Upload
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachedImage(file);
    const reader = new FileReader();
    reader.onloadend = () => setAttachedImageBase64(reader.result);
    reader.readAsDataURL(file);
  };

  // Submit Prompt
  const handleSendPrompt = async (overridePrompt = null) => {
    const p = (overridePrompt || question).trim();
    if (!p && !attachedImageBase64) return;
    if (loading) return;

    setQuestion('');
    const userMsg = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: p,
      author: 'JD',
      image: attachedImageBase64 || null,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setAttachedImage(null);
    setAttachedImageBase64(null);
    setLoading(true);
    setAnalyzingStep(0);

    try {
      const historyList = messages.map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
      }));

      const res = await askEquipFixCopilot({
        prompt: p,
        history: historyList,
        context: {
          machineCode: activeMachineCode,
          alarm: activeMachineData.alarm
        }
      });

      setLoading(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `asst-${Date.now()}`,
          role: 'assistant',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          content: res?.answer || res?.content || 'Diagnostic analysis complete.'
        }
      ]);
    } catch (err) {
      setLoading(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          content: `<div class="ai-warn">⚠️ <strong>Diagnostic Notice:</strong> ${err.message || 'Unable to execute query. Check API configuration.'}</div>`
        }
      ]);
    }
  };

  // Copy handler
  const handleCopy = (text, id) => {
    const clean = text.replace(/<[^>]*>/g, '').trim();
    navigator.clipboard.writeText(clean);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Clear Chat
  const handleClear = () => {
    setMessages([]);
    setLoading(false);
  };

  return (
    <div style={{
      display: 'flex',
      flex: 1,
      height: '100%',
      backgroundColor: '#f8fafc',
      overflow: 'hidden',
      fontFamily: 'var(--font-sans)',
      position: 'relative'
    }}>
      {/* ─────────────────────────────────────────────────────────────────────
          MAIN CHAT PANEL (LIGHT THEME MATCHING REFERENCE IMAGE)
          ───────────────────────────────────────────────────────────────────── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderRight: showRightSidebar ? '1px solid #e2e8f0' : 'none'
      }}>
        {/* 1. Header Bar: EquipFixAI Copilot */}
        <div style={{
          padding: '16px 24px',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              backgroundColor: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)'
            }}>
              <Wrench size={20} color="#ffffff" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                EquipFixAI Copilot
              </h2>
              <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>
                Your AI maintenance assistant
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setShowRightSidebar(!showRightSidebar)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: showRightSidebar ? '#eff6ff' : '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '0.78rem',
                fontWeight: 600,
                color: showRightSidebar ? '#2563eb' : '#475569',
                cursor: 'pointer'
              }}
            >
              <FileText size={15} color={showRightSidebar ? '#2563eb' : '#64748b'} />
              <span>Sources</span>
            </button>

            <button
              type="button"
              onClick={handleClear}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '0.78rem',
                fontWeight: 600,
                color: '#475569',
                cursor: 'pointer'
              }}
            >
              <Trash2 size={15} color="#64748b" />
              <span>Clear Chat</span>
            </button>

            <button
              type="button"
              onClick={() => setShowConfigModal(true)}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '7px 8px',
                color: '#475569',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="API Configuration"
            >
              <MoreVertical size={16} />
            </button>
          </div>
        </div>

        {/* 2. Scrollable Body */}
        <div
          ref={chatScrollRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          {/* Current Equipment Context Banner Card */}
          <div style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
          }}>
            {/* Left: Thumbnail & Details */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              {/* Machine thumbnail illustration */}
              <div style={{
                width: '64px',
                height: '52px',
                borderRadius: '8px',
                backgroundColor: '#f1f5f9',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                flexShrink: 0
              }}>
                <svg width="56" height="46" viewBox="0 0 56 46" fill="none">
                  <rect x="4" y="6" width="48" height="34" rx="4" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1.5" />
                  <rect x="8" y="10" width="22" height="26" rx="2" fill="#334155" />
                  <rect x="34" y="10" width="14" height="12" rx="2" fill="#e2e8f0" />
                  <circle cx="41" cy="30" r="4" fill="#eab308" />
                  <circle cx="19" cy="23" r="6" fill="#38bdf8" />
                </svg>
              </div>

              <div>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>
                  Current Equipment
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
                    {activeMachineData.machine_code}
                  </span>

                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    backgroundColor: '#fef9c3',
                    color: '#854d0e',
                    border: '1px solid #fde047',
                    padding: '2px 8px',
                    borderRadius: '6px'
                  }}>
                    <span>⚡</span> {activeMachineData.status}
                  </span>

                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    backgroundColor: '#fee2e2',
                    color: '#991b1b',
                    border: '1px solid #fca5a5',
                    padding: '2px 8px',
                    borderRadius: '6px'
                  }}>
                    <span>⚠️</span> {activeMachineData.alarm}
                  </span>
                </div>

                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                  Model: {activeMachineData.model} &nbsp;|&nbsp; Location: {activeMachineData.location}
                </div>
              </div>
            </div>

            {/* Right: Last maintenance & View Details */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>Last Maintenance</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  📅 {activeMachineData.last_maintenance}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowDetailsModal(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2563eb',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span>View Details</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {/* User Message Bubble */}
          {messages.filter((m) => m.role === 'user').map((m) => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <div style={{
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px 14px 2px 14px',
                  padding: '12px 16px',
                  color: '#0f172a',
                  fontSize: '0.885rem',
                  lineHeight: 1.55,
                  maxWidth: '560px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                }}>
                  {m.content}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>{m.timestamp}</span>
                  <span style={{ color: '#2563eb' }}>✓</span>
                </div>
              </div>

              {/* JD Avatar */}
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: 700,
                flexShrink: 0
              }}>
                JD
              </div>
            </div>
          ))}

          {/* Assistant Live Analyzing / Checklist Card (MATCHING SCREENSHOT) */}
          {loading && (
            <div style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '18px 20px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={18} color="#2563eb" />
                  <span style={{ fontSize: '0.885rem', fontWeight: 700, color: '#0f172a' }}>
                    EquipFixAI Copilot <span style={{ fontWeight: 500, color: '#64748b' }}>is analyzing your request...</span>
                  </span>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '20px',
                  padding: '2px 10px',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  color: '#2563eb'
                }}>
                  <RotateCw size={11} className="spin" style={{ animation: 'spin 1.5s linear infinite' }} />
                  <span>Analyzing...</span>
                </div>
              </div>

              {/* 2 Columns: Checklist & Graphic */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', alignItems: 'center' }}>
                {/* Left Column: 9 Checklist Steps */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {CHECKLIST_STEPS.map((step, idx) => {
                    const isDone = idx < analyzingStep;
                    const isCurrent = idx === analyzingStep;

                    return (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem' }}>
                        {isDone ? (
                          <div style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            backgroundColor: '#22c55e',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.65rem',
                            fontWeight: 900
                          }}>
                            ✓
                          </div>
                        ) : isCurrent ? (
                          <div style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            border: '2px solid #2563eb',
                            borderTopColor: 'transparent',
                            animation: 'spin 1s linear infinite'
                          }} />
                        ) : (
                          <div style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            border: '2px solid #cbd5e1'
                          }} />
                        )}

                        <span style={{
                          color: isDone ? '#0f172a' : isCurrent ? '#2563eb' : '#94a3b8',
                          fontWeight: isDone || isCurrent ? 600 : 400
                        }}>
                          {step}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Right Column: Search Illustration Graphic */}
                <div style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '24px 20px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center'
                }}>
                  {/* Clipboard & Magnifying Glass Graphic */}
                  <div style={{
                    width: '110px',
                    height: '100px',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '10px'
                  }}>
                    <svg width="76" height="90" viewBox="0 0 76 90" fill="none">
                      <rect x="10" y="12" width="56" height="74" rx="8" fill="#eff6ff" stroke="#bfdbfe" strokeWidth="2" />
                      <rect x="24" y="6" width="28" height="12" rx="4" fill="#dbeafe" stroke="#93c5fd" strokeWidth="2" />
                      <circle cx="38" cy="12" r="2.5" fill="#2563eb" />
                      <line x1="20" y1="32" x2="56" y2="32" stroke="#93c5fd" strokeWidth="3" strokeLinecap="round" />
                      <line x1="20" y1="44" x2="50" y2="44" stroke="#93c5fd" strokeWidth="3" strokeLinecap="round" />
                      <line x1="20" y1="56" x2="44" y2="56" stroke="#93c5fd" strokeWidth="3" strokeLinecap="round" />
                      <line x1="20" y1="68" x2="52" y2="68" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
                    </svg>

                    <div style={{
                      position: 'absolute',
                      bottom: '4px',
                      right: '10px',
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      backgroundColor: '#2563eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)'
                    }}>
                      <Search size={18} color="#ffffff" strokeWidth={2.5} />
                    </div>
                  </div>

                  <div style={{ fontSize: '0.885rem', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                    Searching relevant documentation...
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: 1.45, maxWidth: '240px' }}>
                    Looking for information about alarm E-204 in CNC-042 equipment manuals and SOPs.
                  </div>
                </div>
              </div>

              {/* Bottom: Searching in document category pills */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                paddingTop: '12px',
                borderTop: '1px solid #f1f5f9',
                flexWrap: 'wrap'
              }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Searching in:</span>
                {[
                  { label: 'Equipment Manuals', icon: FileText },
                  { label: 'Maintenance Procedures', icon: Wrench },
                  { label: 'Safety Documents', icon: Shield },
                  { label: 'Maintenance History', icon: Clock }
                ].map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        color: '#334155'
                      }}
                    >
                      <Icon size={12} color="#64748b" />
                      <span>{item.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Assistant Generated Response Messages */}
          {messages.filter((m) => m.role === 'assistant').map((m) => (
            <div
              key={m.id}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '20px 22px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    backgroundColor: '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff'
                  }}>
                    <Wrench size={14} color="#ffffff" />
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>EquipFixAI Copilot</span>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>• {m.timestamp}</span>
                </div>

                <span style={{ fontSize: '0.675rem', fontWeight: 700, backgroundColor: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '5px' }}>
                  ✦ GROUNDED ANALYSIS
                </span>
              </div>

              {/* RENDER RICH HTML RESPONSE CONTENT */}
              <FormattedAIMessage content={m.content} />

              {/* Actions row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid #f1f5f9', marginTop: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setFeedback((prev) => ({ ...prev, [m.id]: 'helpful' }))}
                    style={{
                      background: feedback[m.id] === 'helpful' ? '#dcfce7' : '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      color: feedback[m.id] === 'helpful' ? '#15803d' : '#64748b',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <ThumbsUp size={12} />
                    <span>Helpful</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFeedback((prev) => ({ ...prev, [m.id]: 'unhelpful' }))}
                    style={{
                      background: feedback[m.id] === 'unhelpful' ? '#fee2e2' : '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      color: feedback[m.id] === 'unhelpful' ? '#991b1b' : '#64748b',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <ThumbsDown size={12} />
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => handleCopy(m.content, m.id)}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      color: copiedId === m.id ? '#15803d' : '#64748b',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {copiedId === m.id ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copiedId === m.id ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 3. Bottom Controls Area (Matching Reference Image) */}
        <div style={{
          padding: '12px 24px 20px 24px',
          backgroundColor: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          {/* Quick Action Button Pills Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', paddingBottom: '2px' }}>
            {[
              { label: 'Diagnose Issue', icon: '⚡', prompt: `Diagnose abnormal behavior and symptoms on ${activeMachineCode}` },
              { label: 'Search Manuals', icon: '📖', prompt: `Search OEM manual specs, tolerances, and calibration limits for ${activeMachineCode}` },
              { label: 'Troubleshoot', icon: '⚙️', prompt: `Provide step-by-step troubleshooting guide for ${activeMachineCode}` },
              { label: 'Maintenance History', icon: '🕒', prompt: `Review recent maintenance history and recurring repairs on ${activeMachineCode}` },
              { label: 'Safety Check', icon: '🛡️', prompt: `Verify OSHA 1910.147 LOTO and electrical safety checklist for ${activeMachineCode}` }
            ].map((qa, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendPrompt(qa.prompt)}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '20px',
                  padding: '6px 14px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#334155',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.color = '#2563eb'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#334155'; }}
              >
                <span>{qa.icon}</span>
                <span>{qa.label}</span>
              </button>
            ))}
          </div>

          {/* Floating Input Box Card */}
          <div style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '12px 16px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendPrompt();
                }
              }}
              placeholder="Ask EquipFixAI about this equipment..."
              rows={1}
              style={{
                width: '100%',
                border: 'none',
                outline: 'none',
                fontSize: '0.9rem',
                color: '#0f172a',
                resize: 'none',
                fontFamily: 'inherit',
                backgroundColor: 'transparent'
              }}
            />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleImageChange}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: attachedImage ? '#2563eb' : '#64748b',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: 0
                  }}
                >
                  <Paperclip size={14} />
                  <span>Attach</span>
                </button>

                <button
                  type="button"
                  onClick={toggleVoiceInput}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: isListening ? '#ef4444' : '#64748b',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: 0
                  }}
                >
                  {isListening ? <MicOff size={14} /> : <Mic size={14} />}
                  <span>Voice</span>
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleSendPrompt()}
                  disabled={loading || (!question.trim() && !attachedImageBase64)}
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '8px',
                    backgroundColor: loading || (!question.trim() && !attachedImageBase64) ? '#94a3b8' : '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    cursor: loading || (!question.trim() && !attachedImageBase64) ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 6px rgba(37, 99, 235, 0.35)'
                  }}
                >
                  <Send size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────
          RIGHT SIDEBAR: SOURCES, EQUIPMENT INFO, HISTORY & WORK ORDERS
          (MATCHING REFERENCE IMAGE)
          ───────────────────────────────────────────────────────────────────── */}
      {showRightSidebar && (
        <aside style={{
          width: '340px',
          backgroundColor: '#ffffff',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0
        }}>
          {/* Top Tabs */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            borderBottom: '1px solid #e2e8f0',
            padding: '0 12px',
            backgroundColor: '#ffffff',
            position: 'sticky',
            top: 0,
            zIndex: 10
          }}>
            {[
              { id: 'sources', label: 'Sources (3)' },
              { id: 'equipment', label: 'Equipment Info' },
              { id: 'history', label: 'History' },
              { id: 'related', label: 'Related' }
            ].map((t) => {
              const isActive = rightTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setRightTab(t.id)}
                  style={{
                    padding: '12px 10px',
                    border: 'none',
                    background: 'none',
                    color: isActive ? '#2563eb' : '#64748b',
                    fontSize: '0.78rem',
                    fontWeight: isActive ? 700 : 500,
                    cursor: 'pointer',
                    borderBottom: isActive ? '2px solid #2563eb' : '2px solid transparent',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {t.label}
                </button>
              );
            })}
            <div style={{ padding: '0 6px', color: '#94a3b8', fontSize: '0.8rem' }}>›</div>
          </div>

          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* SECTION 1: SOURCES (3) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {SOURCES_LIST.map((src) => (
                <div
                  key={src.id}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    backgroundColor: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      backgroundColor: '#eff6ff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#2563eb',
                      flexShrink: 0
                    }}>
                      <FileText size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#0f172a' }}>
                        {src.title}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                        {src.section}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: 600, marginTop: '3px' }}>
                        Relevance: {src.relevance}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => alert(`Opening ${src.title} (${src.section})`)}
                    style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: '#2563eb',
                      cursor: 'pointer'
                    }}
                  >
                    View
                  </button>
                </div>
              ))}
            </div>

            {/* SECTION 2: EQUIPMENT INFORMATION */}
            <div style={{
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '14px',
              backgroundColor: '#ffffff'
            }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', margin: '0 0 12px 0' }}>
                Equipment Information
              </h3>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <div style={{
                  width: '46px',
                  height: '38px',
                  borderRadius: '6px',
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Cpu size={22} color="#64748b" />
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                    CNC Machine ({activeMachineData.machine_code})
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Model</span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{activeMachineData.model}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Manufacturer</span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{activeMachineData.manufacturer}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Status</span>
                  <span style={{ fontWeight: 600, color: '#ca8a04', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    🟡 {activeMachineData.status}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Current Alarm</span>
                  <span style={{ fontWeight: 600, color: '#dc2626' }}>E-204</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Location</span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{activeMachineData.location}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Last Maintenance</span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{activeMachineData.last_maintenance}</span>
                </div>
              </div>
            </div>

            {/* SECTION 3: MAINTENANCE HISTORY */}
            <div style={{
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '14px',
              backgroundColor: '#ffffff'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Maintenance History
                </h3>
                <span style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: 700, cursor: 'pointer' }}>
                  View All
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {MAINTENANCE_HISTORY.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Wrench size={12} color="#64748b" />
                      <div>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{item.date}</div>
                        <div style={{ color: '#64748b', fontSize: '0.68rem' }}>{item.title}</div>
                      </div>
                    </div>
                    <span style={{
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      backgroundColor: item.type === 'success' ? '#dcfce7' : '#f1f5f9',
                      color: item.type === 'success' ? '#16a34a' : '#475569'
                    }}>
                      {item.type === 'success' && '✦ '} {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION 4: RELATED WORK ORDERS */}
            <div style={{
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '14px',
              backgroundColor: '#ffffff'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Related Work Orders
                </h3>
                <span style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: 700, cursor: 'pointer' }}>
                  View All
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {RELATED_WORK_ORDERS.map((wo, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FileText size={12} color="#64748b" />
                      <div>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{wo.id}</div>
                        <div style={{ color: '#64748b', fontSize: '0.68rem' }}>{wo.title}</div>
                      </div>
                    </div>
                    <span style={{
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      backgroundColor: wo.type === 'warning' ? '#ffedd5' : '#f1f5f9',
                      color: wo.type === 'warning' ? '#c2410c' : '#475569'
                    }}>
                      {wo.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* ─────────────────────────────────────────────────────────────────────
          MODALS
          ───────────────────────────────────────────────────────────────────── */}
      {/* API Key Modal */}
      {showConfigModal && (
        <AIKeyConfigModal
          isOpen={showConfigModal}
          onClose={() => setShowConfigModal(false)}
          onConfigSaved={(cfg) => setAiConfig(cfg)}
        />
      )}

      {/* Machine Details Modal */}
      {showDetailsModal && (
        <div
          onClick={() => setShowDetailsModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '16px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '520px',
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              padding: '22px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.18)',
              border: '1px solid #e2e8f0'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {activeMachineData.machine_code} — Technical Specifications
              </h3>
              <button
                type="button"
                onClick={() => setShowDetailsModal(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.825rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b' }}>Machine Name:</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{activeMachineData.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b' }}>Model:</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{activeMachineData.model}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b' }}>Manufacturer:</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{activeMachineData.manufacturer}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b' }}>Location:</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{activeMachineData.location}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b' }}>Current Status:</span>
                <span style={{ fontWeight: 700, color: '#854d0e', backgroundColor: '#fef9c3', padding: '2px 8px', borderRadius: '4px' }}>
                  {activeMachineData.status} ({activeMachineData.alarm})
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                <span style={{ color: '#64748b' }}>Last Maintenance:</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{activeMachineData.last_maintenance}</span>
              </div>
            </div>

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowDetailsModal(false)}
                style={{
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
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

export default AITroubleshootingPanel;
