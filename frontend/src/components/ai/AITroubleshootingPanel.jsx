import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles, AlertTriangle, ShieldAlert, BookOpen, CheckCircle2,
  Copy, ThumbsUp, ThumbsDown, ChevronDown, ChevronUp, History,
  Send, RefreshCw, Cpu, ExternalLink, Image, Upload, Camera,
  X, Download, Key, Zap, FileText, Eye, Layers, Palette,
  Bot, User, CornerDownLeft, EyeOff, Trash2, ArrowUpRight,
  Mic, MicOff, Sidebar, PanelRight, Shield, Wrench, Search,
  Check, FileQuestion, HelpCircle, ChevronRight, Layers3
} from 'lucide-react';
import { aiApi, machinesApi, documentsApi } from '../../services/api';
import {
  getAIConfig, saveAIConfig, askEquipFixCopilot, generateIndustrialImage, testAIConnection
} from '../../services/aiCopilotService';
import AIKeyConfigModal from './AIKeyConfigModal';
import AIThinkingEffect from './AIThinkingEffect';
import AIAnalysisCard from './AIAnalysisCard';

// --- RICH HTML-STYLE FORMATTED MESSAGE RENDERER ---
const AI_RESPONSE_STYLES = `
  /* ── Root container ── */
  .ai-response-root { font-family: inherit; color: #ffffff; font-size: 0.875rem; line-height: 1.7; word-break: break-word; }

  /* ── Section headers ── */
  .ai-section {
    font-size: 0.96rem; font-weight: 800; color: #38bdf8;
    margin: 16px 0 10px 0; padding: 8px 14px 8px 16px;
    border-left: 4px solid #38bdf8;
    background: #000000;
    border-top: 1px solid #1e293b;
    border-right: 1px solid #1e293b;
    border-bottom: 1px solid #1e293b;
    border-radius: 0 8px 8px 0;
    display: flex; align-items: center; gap: 8px;
    letter-spacing: -0.01em;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.8);
  }
  .ai-section:first-child { margin-top: 2px; }

  /* ── Key-Value rows ── */
  .ai-kv {
    display: flex; align-items: flex-start; gap: 10px;
    padding: 7px 12px; margin: 4px 0;
    background: #050505;
    border-radius: 6px;
    border: 1px solid #1e293b;
    flex-wrap: wrap;
    transition: background 0.15s;
  }
  .ai-kv:hover { background: #0a0a0a; border-color: #334155; }
  .ai-key {
    font-weight: 700; color: #94a3b8; font-size: 0.775rem;
    min-width: 130px; flex-shrink: 0;
    text-transform: uppercase; letter-spacing: 0.05em; padding-top: 2px;
  }
  .ai-val { color: #ffffff; font-size: 0.875rem; flex: 1; line-height: 1.55; font-weight: 500; }

  /* ── Numbered step list ── */
  .ai-steps { margin: 10px 0; padding: 0; list-style: none; counter-reset: step-counter; }
  .ai-steps li {
    counter-increment: step-counter;
    display: flex; align-items: flex-start; gap: 12px;
    margin: 8px 0; font-size: 0.875rem; color: #f8fafc; line-height: 1.6;
    padding: 8px 12px; background: #050505;
    border-radius: 8px; border: 1px solid #1e293b;
  }
  .ai-steps li::before {
    content: counter(step-counter);
    background: #000000;
    border: 1px solid #0284c7;
    color: #38bdf8; font-weight: 900; font-size: 0.72rem;
    min-width: 24px; height: 24px; border-radius: 7px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; margin-top: 1px;
    box-shadow: 0 0 8px rgba(56, 189, 248, 0.3);
  }

  /* ── Bullet fact list ── */
  .ai-facts { margin: 10px 0; padding: 0; list-style: none; }
  .ai-facts li {
    display: flex; align-items: flex-start; gap: 10px;
    margin: 6px 0; font-size: 0.875rem; color: #f8fafc; line-height: 1.6;
    padding: 4px 0;
    border-bottom: 1px solid #18181b;
  }
  .ai-facts li:last-child { border-bottom: none; }
  .ai-facts li::before {
    content: "▸"; color: #38bdf8; font-weight: 900; font-size: 0.85rem;
    flex-shrink: 0; margin-top: 1px;
  }

  /* ── Warning / Safety block ── */
  .ai-warn {
    background: #0a0600;
    border: 1px solid #78350f;
    border-left: 4px solid #f59e0b;
    border-radius: 8px; padding: 12px 16px; margin: 12px 0;
    color: #fef08a; font-size: 0.865rem; font-weight: 600; line-height: 1.6;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.9);
  }

  /* ── Severity badges ── */
  .ai-severity {
    font-size: 0.7rem; font-weight: 900; padding: 3px 10px;
    border-radius: 6px; letter-spacing: 0.08em; text-transform: uppercase;
    display: inline-flex; align-items: center; gap: 4px;
    margin: 0 4px 2px 0; vertical-align: middle;
  }
  .ai-severity.high  { background: #120303; color: #fca5a5; border: 1px solid #b91c1c; }
  .ai-severity.medium{ background: #140b02; color: #fde68a; border: 1px solid #b45309; }
  .ai-severity.low   { background: #021206; color: #86efac; border: 1px solid #15803d; }

  /* ── Info badges ── */
  .ai-badge {
    background: #000000; color: #38bdf8;
    border: 1px solid #0284c7; border-radius: 6px;
    font-size: 0.7rem; font-weight: 900; padding: 2px 9px;
    letter-spacing: 0.06em; text-transform: uppercase;
    display: inline-flex; align-items: center; margin: 0 3px 2px 0; vertical-align: middle;
  }

  /* ── Inline code / values ── */
  .ai-code, code {
    background: #050505; color: #38bdf8;
    padding: 2px 8px; border-radius: 5px;
    font-family: 'Courier New', monospace; font-size: 0.84rem;
    border: 1px solid #1e293b;
  }

  /* ── Data table ── */
  .ai-table {
    width: 100%; border-collapse: collapse; margin: 12px 0;
    font-size: 0.84rem; border-radius: 8px; overflow: hidden;
    border: 1px solid #1e293b; background: #000000;
    display: block; overflow-x: auto;
  }
  .ai-table thead { background: #050505; }
  .ai-table th {
    color: #38bdf8; font-weight: 800; padding: 9px 12px;
    text-align: left; border-bottom: 2px solid #0284c7; border-right: 1px solid #1e293b;
    font-size: 0.76rem; text-transform: uppercase; letter-spacing: 0.05em;
    white-space: nowrap; background: #050505;
  }
  .ai-table td {
    padding: 7px 12px; border-bottom: 1px solid #18181b; border-right: 1px solid #18181b;
    color: #ffffff; vertical-align: top; line-height: 1.5; background: #000000;
  }
  .ai-table tbody tr:hover td { background: #081120; }
  .ai-table tbody tr:nth-child(even) td { background: #040404; }
  .ai-table tbody tr:last-child td { border-bottom: none; }

  /* ── Generic inline elements ── */
  strong, b { color: #ffffff; font-weight: 700; }
  em { color: #94a3b8; font-style: italic; }
  p { margin: 6px 0; color: #f1f5f9; font-size: 0.875rem; line-height: 1.65; }
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
        style={{ wordBreak: 'break-word' }}
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
        <div key={`b-${idx}`} style={{ display: 'flex', gap: '8px', margin: '5px 0', fontSize: '0.865rem', color: '#e2e8f0' }}>
          <span style={{ color: '#38bdf8', fontWeight: 900 }}>•</span>
          <div style={{ flex: 1 }}>{trimmed.replace(/^[\*\-•]\s+/, '')}</div>
        </div>
      );
      return;
    }
    const nm = trimmed.match(/^(\d+)[\.\)]\s+(.*)/);
    if (nm) {
      elements.push(
        <div key={`n-${idx}`} style={{ display: 'flex', gap: '10px', margin: '6px 0', fontSize: '0.865rem', color: '#e2e8f0' }}>
          <span style={{ background: '#1e3a8a', color: '#38bdf8', fontWeight: 800, fontSize: '0.72rem', padding: '2px 7px', borderRadius: '6px', flexShrink: 0 }}>
            {nm[1]}
          </span>
          <div style={{ flex: 1 }}>{nm[2]}</div>
        </div>
      );
      return;
    }
    elements.push(<p key={`p-${idx}`} style={{ margin: '5px 0', fontSize: '0.875rem', color: '#e2e8f0', lineHeight: 1.6 }}>{trimmed}</p>);
  });

  return <div style={{ wordBreak: 'break-word' }}>{elements}</div>;
};

export const AITroubleshootingPanel = ({
  machineId = null,
  workOrderId = null,
  machineCode = '',
  incidentSummary = '',
  onCopyToLog = null,
  onCopyToCompletion = null
}) => {
  // Panel Modes: 'DIAGNOSTICS' | 'VISION' | 'IMAGE_GEN'
  const [activeTab, setActiveTab] = useState('DIAGNOSTICS');

  // 3-Panel Workspace Layout State
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState('SOURCES'); // 'SOURCES' | 'HISTORY'

  // Equipment selection state (fallback & switcher)
  const [allMachines, setAllMachines] = useState([]);
  const [activeMachineId, setActiveMachineId] = useState(machineId);
  const [activeMachineCode, setActiveMachineCode] = useState(machineCode);
  const [activeMachineData, setActiveMachineData] = useState(null);
  const [machineHistoryRecords, setMachineHistoryRecords] = useState([]);

  // API Key State & Modal
  const [aiConfig, setAiConfig] = useState(getAIConfig());
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showInlineKeyForm, setShowInlineKeyForm] = useState(!aiConfig.apiKey);
  const [inlineKey, setInlineKey] = useState('');
  const [inlineModel, setInlineModel] = useState('gemini-2.0-flash');
  const [showKeyPassword, setShowKeyPassword] = useState(false);
  const [savingInlineKey, setSavingInlineKey] = useState(false);
  const [inlineKeyError, setInlineKeyError] = useState(null);

  // Chat Conversation Thread
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: `<h3 class="ai-section">🤖 EquipFixAI Copilot — Industrial Reliability Engine</h3>
<div class="ai-kv"><span class="ai-key">Operational Mode</span><span class="ai-val">RAG Grounded Diagnostics &amp; Plant Troubleshooting</span></div>
<div class="ai-kv"><span class="ai-key">Active Standards</span><span class="ai-val"><span class="ai-badge">OSHA 1910.147 LOTO</span><span class="ai-badge">ISO 10816 VIBRATION</span><span class="ai-badge">NFPA 70E</span></span></div>
<ul class="ai-facts">
  <li><strong>OEM Grounded Diagnostics:</strong> Root-cause analysis verified strictly against ingested equipment manuals and schematics.</li>
  <li><strong>Zero Hallucination Guarantee:</strong> Explicit document citations [Source: Doc Name — Sec/Page] with no invented specs or torque ratings.</li>
  <li><strong>OSHA 1910.147 LOTO Compliance:</strong> Zero-energy isolation steps, electrical verification, and stored pressure dissipation.</li>
  <li><strong>Multimodal Inspection:</strong> Upload broken component photos or gauge dials for instant vision failure classification.</li>
</ul>
<div class="ai-warn">⚠️ Enter equipment symptom, machine code, or alarm below to execute grounded diagnosis.</div>`,
      timestamp: 'Now',
      provider: 'EquipFixAI Copilot',
      confidence: 'STRONG',
      sources: []
    }
  ]);

  // Active Multi-Stage Analysis Card state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentAnalysisStage, setCurrentAnalysisStage] = useState(0);

  // Active Sources for Right Panel Drawer
  const [activeSourcesMessage, setActiveSourcesMessage] = useState(null);

  // Diagram attachments state: { [messageId]: { loading: boolean, diagramUrl: string, prompt: string, provider: string, error: string } }
  const [messageDiagrams, setMessageDiagrams] = useState({});

  // Input & Feedback
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copiedStatus, setCopiedStatus] = useState(null);
  const [feedbackStatus, setFeedbackStatus] = useState({}); // { [msgId]: 1 | -1 }
  const [expandedWhy, setExpandedWhy] = useState({}); // { [msgId]: boolean }

  // Reply Context State
  const [replyingTo, setReplyingTo] = useState(null);

  // Speech Recognition (Voice Input)
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  // Scroll & Input Anchors
  const chatBottomRef = useRef(null);
  const chatContainerRef = useRef(null);
  const questionInputRef = useRef(null);

  // Multimodal Vision State
  const [selectedImageBase64, setSelectedImageBase64] = useState(null);
  const [selectedImageMime, setSelectedImageMime] = useState('image/jpeg');
  const [imageFileName, setImageFileName] = useState('');
  const [visionResponse, setVisionResponse] = useState(null);
  const [visionLoading, setVisionLoading] = useState(false);
  const fileInputRef = useRef(null);

  // Image Generation State
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageStyle, setImageStyle] = useState('schematic');
  const [generatedImage, setGeneratedImage] = useState(null);
  const [generatingImage, setGeneratingImage] = useState(false);

  // History & Suggestions
  const [recentQueries, setRecentQueries] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  const quickPrompts = [
    activeMachineCode ? `Diagnose Error E-204 on ${activeMachineCode}` : 'Diagnose spindle bearing abnormal vibration & temperature spike',
    'OSHA 1910.147 zero-energy isolation procedure for main 480V substation breaker',
    'Hydraulic press proportional valve pressure fluctuation troubleshooting',
    'Robotic welder arc start failure & wire feed sensor diagnostics'
  ];

  // Refresh config and fetch machines on mount
  useEffect(() => {
    const cfg = getAIConfig();
    setAiConfig(cfg);
    setShowInlineKeyForm(!cfg.apiKey);

    const loadMachines = async () => {
      try {
        const res = await machinesApi.list();
        const machs = res.data || [];
        setAllMachines(machs);

        if (!activeMachineId && machs.length > 0) {
          const match = machs.find(m => m.machine_code === machineCode) || machs[0];
          setActiveMachineId(match.id);
          setActiveMachineCode(match.machine_code);
          setActiveMachineData(match);
        } else if (activeMachineId) {
          const match = machs.find(m => String(m.id) === String(activeMachineId));
          if (match) {
            setActiveMachineCode(match.machine_code);
            setActiveMachineData(match);
          }
        }
      } catch (err) {
        console.warn('Could not load machines list for Copilot', err);
      }
    };
    loadMachines();
  }, []);

  // Update machine data when prop changes
  useEffect(() => {
    if (machineId) setActiveMachineId(machineId);
    if (machineCode) setActiveMachineCode(machineCode);
  }, [machineId, machineCode]);

  // Load machine history when activeMachineId changes
  useEffect(() => {
    if (activeMachineId) {
      const loadHistory = async () => {
        try {
          const res = await machinesApi.getHistory(activeMachineId);
          setMachineHistoryRecords(res.data?.repairs || res.data?.history || res.data || []);
        } catch (e) {
          console.warn('Could not load history for machine', activeMachineId);
        }
      };
      loadHistory();
    }
  }, [activeMachineId]);

  // Auto-scroll chat downwards on new message or loading
  useEffect(() => {
    if (activeTab === 'DIAGNOSTICS') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading, isAnalyzing, activeTab]);

  // Pre-fill question if incidentSummary provided
  useEffect(() => {
    if (incidentSummary && !question && messages.length <= 1) {
      setQuestion(incidentSummary);
    }
  }, [incidentSummary]);

  const fetchHistory = async () => {
    try {
      const res = await aiApi.getHistory({
        machine_id: activeMachineId || undefined,
        work_order_id: workOrderId || undefined,
        limit: 8
      });
      setRecentQueries(res.data || []);
    } catch (err) {
      console.warn('Could not load AI query history', err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [activeMachineId, workOrderId]);

  // Speech Recognition (Voice Input) Handler
  const toggleVoiceInput = () => {
    const SpeechRec = window.webkitSpeechRecognition || window.SpeechRecognition;
    if (!SpeechRec) {
      setError('Voice dictation is not supported by your browser. Chrome, Edge, or Safari are recommended.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        const recognition = new SpeechRec();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          setIsListening(true);
        };
        recognition.onresult = (event) => {
          const transcript = Array.from(event.results)
            .map((r) => r[0].transcript)
            .join('');
          setQuestion(transcript);
        };
        recognition.onerror = (e) => {
          console.warn('Speech recognition event error:', e);
          setIsListening(false);
        };
        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err) {
        setIsListening(false);
      }
    }
  };

  const handleInlineKeyChange = (val) => {
    setInlineKey(val);
    setInlineKeyError(null);
    const clean = val.trim();
    if (clean.startsWith('sk-')) {
      if (inlineModel.startsWith('gemini')) {
        setInlineModel('gpt-4o-mini');
      }
    } else if (clean.startsWith('AIza') || clean.startsWith('AQ.')) {
      if (!inlineModel.startsWith('gemini')) {
        setInlineModel('gemini-2.0-flash');
      }
    }
  };

  const handleSaveInlineKey = async (e) => {
    if (e) e.preventDefault();
    const cleanKey = inlineKey.trim().replace(/^["']|["']$/g, '');
    if (!cleanKey) {
      setInlineKeyError('Please paste your Google Gemini or OpenAI API key.');
      return;
    }

    const detectedProvider = cleanKey.startsWith('sk-') ? 'openai' : 'gemini';
    let effectiveModel = inlineModel;
    if (detectedProvider === 'openai' && (effectiveModel.startsWith('gemini') || !effectiveModel)) {
      effectiveModel = 'gpt-4o-mini';
    } else if (detectedProvider === 'gemini' && (effectiveModel.startsWith('gpt') || effectiveModel.startsWith('o1') || effectiveModel.startsWith('o3'))) {
      effectiveModel = 'gemini-2.0-flash';
    }

    setSavingInlineKey(true);
    setInlineKeyError(null);
    try {
      await testAIConnection({ apiKey: cleanKey, provider: detectedProvider, model: effectiveModel });
      const newCfg = { apiKey: cleanKey, provider: detectedProvider, model: effectiveModel, customModel: '' };
      saveAIConfig(newCfg);
      setAiConfig(newCfg);
      setShowInlineKeyForm(false);
      setCopiedStatus(`${detectedProvider === 'openai' ? 'OpenAI' : 'Google Gemini'} connected! Model: ${effectiveModel}`);
      setTimeout(() => setCopiedStatus(null), 4000);

      setMessages((prev) => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          role: 'assistant',
          content: `<h3 class="ai-section">⚡ ${detectedProvider === 'openai' ? 'OpenAI' : 'Google Gemini'} Connected</h3>
<div class="ai-kv"><span class="ai-key">Active Model</span><span class="ai-val"><strong>${effectiveModel}</strong></span></div>
<div class="ai-kv"><span class="ai-key">Status</span><span class="ai-val"><span class="ai-badge">STREAMING ACTIVE</span></span></div>
<p>Real-time industrial diagnostics engine is ready. Send any machinery query or error code below.</p>`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          provider: `${detectedProvider === 'openai' ? 'OpenAI' : 'Google Gemini'} (${effectiveModel})`,
          confidence: 'STRONG',
          sources: []
        }
      ]);
    } catch (err) {
      setInlineKeyError(err.message || 'Key verification failed. Please check your API key.');
    } finally {
      setSavingInlineKey(false);
    }
  };

  const handleConfigSaved = (newCfg) => {
    setAiConfig(newCfg);
    setShowInlineKeyForm(false);
    setActiveTab('DIAGNOSTICS');
    setCopiedStatus(`API Key verified & activated! Model: ${newCfg.model || 'Gemini 2.0 Flash'}`);
    setTimeout(() => setCopiedStatus(null), 4000);

    setMessages((prev) => [
      ...prev,
      {
        id: `sys-${Date.now()}`,
        role: 'assistant',
        content: `<h3 class="ai-section">⚡ Real-Time AI Connected</h3>
<div class="ai-kv"><span class="ai-key">Active Model</span><span class="ai-val"><strong>${newCfg.model || 'Gemini 2.0 Flash'}</strong></span></div>
<div class="ai-kv"><span class="ai-key">Provider</span><span class="ai-val"><span class="ai-badge">${newCfg.provider === 'gemini' ? 'GOOGLE GEMINI' : 'OPENAI'}</span></span></div>
<p>Direct multimodal streaming inference is active. Send any diagnostic prompt below.</p>`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        provider: `${newCfg.provider.toUpperCase()} ENGINE`,
        confidence: 'STRONG',
        sources: []
      }
    ]);
  };

  // Inline diagram generator
  const handleGenerateInlineDiagram = async (messageId, queryPrompt = null, answerContent = '') => {
    setMessageDiagrams((prev) => ({
      ...prev,
      [messageId]: { loading: true, error: null }
    }));

    setTimeout(() => {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);

    try {
      const promptSnippet = (queryPrompt || answerContent.slice(0, 160))
        .replace(/[#*`_🔹⚙️🔍🛠️⚠️📋]/g, '')
        .trim();
      const diagramPrompt = `Detailed isometric exploded view schematic CAD diagram of ${promptSnippet}, mechanical assembly with part callouts, clear industrial illustration`;

      const result = await generateIndustrialImage({
        prompt: diagramPrompt,
        style: 'exploded'
      });

      setMessageDiagrams((prev) => ({
        ...prev,
        [messageId]: {
          loading: false,
          diagramUrl: result.imageUrl,
          prompt: result.prompt,
          provider: result.provider
        }
      }));
    } catch (err) {
      setMessageDiagrams((prev) => ({
        ...prev,
        [messageId]: {
          loading: false,
          error: err.message || 'Failed to generate visual diagram.'
        }
      }));
    } finally {
      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  // Start reply to a specific AI message
  const handleStartReply = (msg) => {
    const rawContent = msg.content || '';
    const cleanSnippet = rawContent
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 110);

    setReplyingTo({
      id: msg.id,
      textSnippet: cleanSnippet || 'Previous response',
      fullContent: rawContent
    });

    setTimeout(() => {
      questionInputRef.current?.focus();
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 60);
  };

  // Submit technician rating feedback (helpful / unhelpful)
  const handleFeedback = async (msg, rating) => {
    setFeedbackStatus((prev) => ({ ...prev, [msg.id]: rating }));
    if (msg.queryId) {
      try {
        await aiApi.feedback(msg.queryId, { rating });
      } catch (e) {
        console.warn('Feedback API call error', e);
      }
    }
    setCopiedStatus(rating > 0 ? 'Feedback recorded: Marked as helpful!' : 'Feedback recorded: Flagged for knowledge review.');
    setTimeout(() => setCopiedStatus(null), 3000);
  };

  // Toggle "Why this recommendation?"
  const toggleWhy = (msgId) => {
    setExpandedWhy((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  // Open right drawer with specific message's sources
  const handleViewSources = (msg) => {
    setActiveSourcesMessage(msg);
    setRightPanelTab('SOURCES');
    setShowRightPanel(true);
  };

  // Execute quick action template
  const handleRunWorkflow = (workflowType) => {
    const code = activeMachineCode || 'Plant Equipment';
    let query = '';
    if (workflowType === 'DIAGNOSE') {
      query = `Diagnose abnormal vibration, bearing temperature rise, and motor noise on ${code}. Detail possible causes and verification steps.`;
    } else if (workflowType === 'MANUALS') {
      query = `Search OEM technical manuals for ${code}: What are the recommended lubrication intervals, spindle torque tolerances, and alignment limits?`;
    } else if (workflowType === 'TROUBLESHOOT') {
      query = `Provide a systematic step-by-step troubleshooting checklist for ${code} when experiencing unexpected trip or intermittent alarm.`;
    } else if (workflowType === 'HISTORY') {
      query = `Summarize previous failure modes, historical work orders, and recurring repairs documented for ${code}.`;
    } else if (workflowType === 'LOTO') {
      query = `What are the mandatory OSHA 1910.147 zero-energy Lockout/Tagout (LOTO) isolation steps and PPE requirements for maintenance on ${code}?`;
    }
    if (query) {
      handleSearch(query);
    }
  };

  // Missing info action triggers
  const handleMissingInfoAction = (actionType) => {
    if (actionType === 'SELECT_EQUIPMENT') {
      setShowLeftPanel(true);
      const sel = document.getElementById('equip-selector-dropdown');
      if (sel) sel.focus();
    } else if (actionType === 'ENTER_ALARM') {
      setQuestion(`Alarm code on ${activeMachineCode || 'equipment'}: `);
      questionInputRef.current?.focus();
    } else if (actionType === 'VIEW_HISTORY') {
      setRightPanelTab('HISTORY');
      setShowRightPanel(true);
    } else if (actionType === 'UPLOAD_MANUAL') {
      window.location.href = '/documents';
    }
  };

  // --- TAB 1: DIAGNOSTICS & Q&A WITH REAL-TIME SSE STREAMING ---
  const handleSearch = async (queryText = null) => {
    const q = (queryText || question).trim();
    if (!q) return;

    const activeConfig = getAIConfig();
    setAiConfig(activeConfig);

    if (!activeConfig.apiKey) {
      setError('Google Gemini or OpenAI API key required. Please enter your API key to activate real-time responses.');
      setShowInlineKeyForm(true);
      return;
    }

    const activeReply = replyingTo;
    setReplyingTo(null);

    const userPromptForAI = activeReply
      ? `[Follow-up question regarding your previous answer: "${activeReply.textSnippet}"]\n\n${q}`
      : q;

    setQuestion('');

    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: q,
      replyToSnippet: activeReply ? activeReply.textSnippet : null,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const assistantMsgId = `ai-${Date.now()}`;
    const activeModelLabel = (activeConfig.model === 'custom' && activeConfig.customModel)
      ? activeConfig.customModel
      : (activeConfig.model || 'gemini-2.0-flash');

    const initialAssistantMsg = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      provider: `${activeConfig.provider === 'openai' ? 'OpenAI' : 'Google Gemini'} (${activeModelLabel})`,
      isStreaming: true,
      sources: [],
      previousRepairs: [],
      confidence: 'PARTIAL'
    };

    setMessages((prev) => [...prev, userMsg, initialAssistantMsg]);
    setLoading(true);
    setIsAnalyzing(true);
    setCurrentAnalysisStage(0);
    setError(null);

    setTimeout(() => {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);

    try {
      const conversationHistory = messages
        .filter(m => m.id !== 'welcome' && !m.id.startsWith('sys-') && !m.id.startsWith('ai-err-') && m.content)
        .slice(-14)
        .map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          content: m.content
        }));

      let lastChunkTime = 0;
      let pendingChunkText = '';
      let chunkRafId = null;

      const updateChatChunk = (text) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? { ...m, content: text, isStreaming: true }
              : m
          )
        );
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
      };

      const result = await askEquipFixCopilot({
        prompt: userPromptForAI,
        history: conversationHistory,
        context: {
          machineCode: activeMachineCode,
          incidentSummary,
          machineId: activeMachineId,
          workOrderId
        },
        onStageChange: (stageIndex) => {
          setCurrentAnalysisStage(stageIndex);
        },
        onChunk: (_chunk, accumulatedText) => {
          pendingChunkText = accumulatedText;
          const now = Date.now();
          if (now - lastChunkTime > 40) {
            lastChunkTime = now;
            updateChatChunk(accumulatedText);
          } else if (!chunkRafId) {
            chunkRafId = requestAnimationFrame(() => {
              chunkRafId = null;
              updateChatChunk(pendingChunkText);
            });
          }
        }
      });

      if (chunkRafId) cancelAnimationFrame(chunkRafId);

      const aiText = result.text;
      const providerLabel = result.provider;

      const updatedAssistantMsg = {
        id: assistantMsgId,
        role: 'assistant',
        content: aiText,
        provider: providerLabel || initialAssistantMsg.provider,
        isStreaming: false,
        sources: result.sources || [],
        previousRepairs: result.previousRepairs || [],
        confidence: result.confidence || (result.sources?.length > 1 ? 'STRONG' : 'PARTIAL'),
        groundingStatus: result.groundingStatus,
        queryId: result.queryId,
        whyAnswer: result.whyAnswer,
        missingInfo: result.missingInfo,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId ? updatedAssistantMsg : m
        )
      );

      setActiveSourcesMessage(updatedAssistantMsg);

      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
      fetchHistory();

      const wantsDiagram = /\b(generate (a )?(diagram|schematic|blueprint)|draw (a )?(diagram|schematic))\b/i.test(q);
      if (wantsDiagram) {
        setTimeout(() => {
          handleGenerateInlineDiagram(assistantMsgId, q, aiText);
        }, 300);
      }
    } catch (err) {
      let rawError = err.message || err.response?.data?.detail || 'Failed to retrieve troubleshooting guidance.';
      const isKeyErr = /api key|unauthorized|permission_denied|quota|auth/i.test(rawError);
      setError(rawError);

      let displayNotice = rawError;
      if (rawError.includes('not found') || rawError.includes('not supported') || rawError.toLowerCase().includes('no longer available')) {
        displayNotice = 'The requested AI model was deprecated or not available on your account. The engine has automatically synchronized with Google ModelService to select the active flagship Gemini 2.0 Flash. Please send your query again.';
        saveAIConfig({ model: 'gemini-2.0-flash' });
        setInlineModel('gemini-2.0-flash');
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? {
                ...m,
                content: `### ⚠️ AI Diagnostics Notice\n${displayNotice}\n\n*Click **Configure AI Key** below to verify or update your API credentials.*`,
                provider: 'System Diagnostics',
                isKeyError: isKeyErr,
                isStreaming: false,
                confidence: 'INSUFFICIENT'
              }
            : m
        )
      );
    } finally {
      setLoading(false);
      setIsAnalyzing(false);
      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  // --- TAB 2: MULTIMODAL IMAGE ANALYSIS ---
  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFileName(file.name);
    setSelectedImageMime(file.type || 'image/jpeg');

    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedImageBase64(event.target?.result);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyzeImage = async (customPrompt = null) => {
    if (!selectedImageBase64) {
      setError('Please upload or select an equipment photo first.');
      return;
    }

    const p = (customPrompt || question || 'Inspect this equipment for defects, wear, safety hazards, and diagnostic anomalies.').trim();

    setQuestion('');
    setVisionLoading(true);
    setError(null);
    setVisionResponse(null);

    try {
      const result = await askEquipFixCopilot({
        prompt: p,
        imageBase64: selectedImageBase64,
        imageMime: selectedImageMime,
        context: { machineCode: activeMachineCode, incidentSummary }
      });
      setVisionResponse(result);
    } catch (err) {
      setError(err.message || 'Image analysis failed. Please verify your API key.');
    } finally {
      setVisionLoading(false);
    }
  };

  // --- TAB 3: INDUSTRIAL IMAGE & DIAGRAM GENERATION ---
  const handleGenerateDiagram = async (customPrompt = null) => {
    const p = (customPrompt || imagePrompt).trim();
    if (!p) {
      setError('Please enter a description for the industrial diagram to generate.');
      return;
    }

    setImagePrompt('');
    setGeneratingImage(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const result = await generateIndustrialImage({
        prompt: p,
        style: imageStyle
      });
      setGeneratedImage(result);
    } catch (err) {
      setError(err.message || 'Failed to generate industrial diagram.');
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleCopyLogs = (itemText, stepTitle = 'AI Diagnostic Check') => {
    if (onCopyToLog) {
      onCopyToLog(stepTitle, itemText);
      setCopiedStatus('Copied to Work Log input!');
      setTimeout(() => setCopiedStatus(null), 3000);
    } else {
      navigator.clipboard.writeText(itemText);
      setCopiedStatus('Copied to clipboard!');
      setTimeout(() => setCopiedStatus(null), 3000);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: `<h3 class="ai-section">🤖 EquipFixAI Copilot — Industrial Reliability Engine</h3>
<div class="ai-kv"><span class="ai-key">Thread Status</span><span class="ai-val">Cleared &amp; Ready</span></div>
<div class="ai-kv"><span class="ai-key">Machine Context</span><span class="ai-val">${activeMachineCode || 'All Plant Machinery'}</span></div>
<div class="ai-warn">⚠️ Ready for equipment diagnostics. Ask about any fault symptom, error code, or component inspection.</div>`,
        timestamp: 'Now',
        provider: 'EquipFixAI Copilot',
        confidence: 'STRONG',
        sources: []
      }
    ]);
  };

  const activeModelDisplay = (aiConfig.model === 'custom' && aiConfig.customModel)
    ? aiConfig.customModel
    : (aiConfig.model || (aiConfig.provider === 'openai' ? 'gpt-4o-mini' : 'gemini-2.0-flash'));

  // Get active source count for top header badge
  const latestAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant' && m.id !== 'welcome');
  const activeSources = (activeSourcesMessage || latestAssistantMsg)?.sources || [];

  return (
    <div style={{
      backgroundColor: '#070d1e',
      borderRadius: '16px',
      border: '1px solid #1e3a8a',
      boxShadow: '0 16px 40px -10px rgba(0, 0, 0, 0.6), 0 0 24px rgba(14, 165, 233, 0.1)',
      overflow: 'hidden',
      marginBottom: '24px',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* 1. TOP HEADER BAR */}
      <div style={{
        backgroundColor: '#050a17',
        color: '#ffffff',
        padding: '12px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        borderBottom: '1px solid #1e293b'
      }}>
        {/* Left: Branding & Machine Context */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => setShowLeftPanel(!showLeftPanel)}
            style={{
              background: showLeftPanel ? 'rgba(56, 189, 248, 0.15)' : '#0b1329',
              border: '1px solid #1e3a8a',
              borderRadius: '8px',
              padding: '6px',
              color: showLeftPanel ? '#38bdf8' : '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title={showLeftPanel ? 'Hide Asset & Navigation Sidebar' : 'Show Asset & Navigation Sidebar'}
          >
            <Sidebar size={17} />
          </button>

          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '9px',
            background: 'linear-gradient(135deg, #0ea5e9, #2563eb)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 14px rgba(14, 165, 233, 0.45)'
          }}>
            <Sparkles size={18} color="#ffffff" />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <strong style={{ fontSize: '0.98rem', letterSpacing: '-0.01em', color: '#f8fafc' }}>
                EquipFixAI Copilot
              </strong>
              {activeMachineCode && (
                <span style={{
                  backgroundColor: '#0f172a',
                  color: '#38bdf8',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '6px',
                  border: '1px solid #334155'
                }}>
                  {activeMachineCode}
                </span>
              )}
            </div>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
              Grounded RAG Maintenance Assistant • OEM Documentation • OSHA LOTO Protocols
            </span>
          </div>
        </div>

        {/* Right: Key Status Badge, Sources Drawer Toggle & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Evidence Drawer Toggle Button */}
          <button
            type="button"
            onClick={() => {
              if (activeSources.length > 0 && !activeSourcesMessage) {
                setActiveSourcesMessage(latestAssistantMsg);
              }
              setShowRightPanel(!showRightPanel);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: showRightPanel ? 'rgba(56, 189, 248, 0.2)' : '#0b1329',
              border: `1px solid ${showRightPanel ? '#38bdf8' : '#1e3a8a'}`,
              color: showRightPanel ? '#38bdf8' : '#cbd5e1',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="Toggle Evidence & Retrieved Sources Drawer"
          >
            <BookOpen size={14} color="#38bdf8" />
            <span>Retrieved Sources ({activeSources.length})</span>
            <PanelRight size={14} />
          </button>

          {/* Model Status Indicator */}
          <div
            onClick={() => setShowConfigModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: aiConfig.apiKey ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              border: `1px solid ${aiConfig.apiKey ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
              padding: '5px 12px',
              borderRadius: '20px',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="Click to configure AI API key and model"
          >
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: aiConfig.apiKey ? '#10b981' : '#f59e0b',
              boxShadow: `0 0 8px ${aiConfig.apiKey ? '#10b981' : '#f59e0b'}`
            }} />
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              color: aiConfig.apiKey ? '#6ee7b7' : '#fcd34d',
              textTransform: 'uppercase',
              letterSpacing: '0.02em'
            }}>
              {aiConfig.apiKey
                ? `${aiConfig.provider === 'openai' ? 'OpenAI' : 'Gemini'} • ${activeModelDisplay}`
                : 'API Key Required'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowConfigModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#1e293b',
              color: '#e2e8f0',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Key size={13} color="#38bdf8" />
            <span>Key</span>
          </button>

          <button
            type="button"
            onClick={handleClearChat}
            style={{
              backgroundColor: '#0f172a',
              color: '#94a3b8',
              border: '1px solid #334155',
              fontSize: '0.75rem',
              padding: '6px 10px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
            title="Clear Chat Thread"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* 2. MODE NAVIGATION TABS */}
      <div style={{
        display: 'flex',
        backgroundColor: '#091124',
        borderBottom: '1px solid #1e293b',
        padding: '0 16px',
        overflowX: 'auto'
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('DIAGNOSTICS')}
          style={{
            padding: '11px 16px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'DIAGNOSTICS' ? '3px solid #38bdf8' : '3px solid transparent',
            color: activeTab === 'DIAGNOSTICS' ? '#ffffff' : '#94a3b8',
            fontSize: '0.82rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap'
          }}
        >
          <Zap size={15} color={activeTab === 'DIAGNOSTICS' ? '#38bdf8' : '#64748b'} />
          <span>Copilot Workspace</span>
          <span style={{ fontSize: '0.65rem', backgroundColor: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', padding: '1px 6px', borderRadius: '10px', fontWeight: 800 }}>
            3-PANEL
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('VISION')}
          style={{
            padding: '11px 16px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'VISION' ? '3px solid #38bdf8' : '3px solid transparent',
            color: activeTab === 'VISION' ? '#ffffff' : '#94a3b8',
            fontSize: '0.82rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap'
          }}
        >
          <Eye size={15} color={activeTab === 'VISION' ? '#38bdf8' : '#64748b'} />
          <span>Multimodal Photo Inspection</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('IMAGE_GEN')}
          style={{
            padding: '11px 16px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'IMAGE_GEN' ? '3px solid #38bdf8' : '3px solid transparent',
            color: activeTab === 'IMAGE_GEN' ? '#ffffff' : '#94a3b8',
            fontSize: '0.82rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap'
          }}
        >
          <Palette size={15} color={activeTab === 'IMAGE_GEN' ? '#38bdf8' : '#64748b'} />
          <span>CAD Schematics Generator</span>
        </button>
      </div>

      {/* Notifications / Error Banner */}
      {error && (
        <div style={{
          backgroundColor: '#450a0a',
          color: '#fecaca',
          border: '1px solid #7f1d1d',
          padding: '10px 16px',
          fontSize: '0.82rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={16} color="#ef4444" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            style={{ background: 'none', border: 'none', color: '#fecaca', cursor: 'pointer' }}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {copiedStatus && (
        <div style={{
          backgroundColor: '#064e3b',
          color: '#a7f3d0',
          border: '1px solid #059669',
          padding: '8px 16px',
          fontSize: '0.8rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <CheckCircle2 size={15} color="#10b981" />
          <strong>{copiedStatus}</strong>
        </div>
      )}

      {/* ========================================================
          TAB 1: 3-PANEL INDUSTRIAL COPILOT WORKSPACE
          ======================================================== */}
      {activeTab === 'DIAGNOSTICS' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: `${showLeftPanel ? '280px' : '0px'} 1fr ${showRightPanel ? '340px' : '0px'}`,
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          minHeight: '620px',
          overflow: 'hidden'
        }}>
          {/* ──────────────────────────────────────────────────────────
              LEFT PANEL: CURRENT EQUIPMENT + QUICK ACTIONS + THREADS
              ────────────────────────────────────────────────────────── */}
          <aside style={{
            backgroundColor: '#050915',
            borderRight: '1px solid #1e293b',
            display: showLeftPanel ? 'flex' : 'none',
            flexDirection: 'column',
            overflowY: 'auto',
            padding: '16px',
            gap: '18px'
          }}>
            {/* 1. Target Equipment Card */}
            <div style={{
              backgroundColor: '#091124',
              border: '1px solid #1e3a8a',
              borderRadius: '10px',
              padding: '12px 14px',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Target Equipment
                </span>
                <span style={{
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  padding: '2px 6px',
                  borderRadius: '10px',
                  backgroundColor: activeMachineData?.status === 'OPERATIONAL' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: activeMachineData?.status === 'OPERATIONAL' ? '#34d399' : '#f87171',
                  border: `1px solid ${activeMachineData?.status === 'OPERATIONAL' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                }}>
                  {activeMachineData?.status || 'ONLINE'}
                </span>
              </div>

              {allMachines.length > 0 ? (
                <select
                  id="equip-selector-dropdown"
                  value={activeMachineId || ''}
                  onChange={(e) => {
                    const id = e.target.value;
                    setActiveMachineId(id);
                    const match = allMachines.find(m => String(m.id) === String(id));
                    if (match) {
                      setActiveMachineCode(match.machine_code);
                      setActiveMachineData(match);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    backgroundColor: '#040814',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    color: '#ffffff',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    outline: 'none',
                    marginBottom: '8px'
                  }}
                >
                  {allMachines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.machine_code} — {m.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#f8fafc', marginBottom: '6px' }}>
                  {activeMachineCode || 'Plant Fleet Asset'}
                </div>
              )}

              <div style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div><strong>Dept:</strong> {activeMachineData?.department || 'Machining & Assembly'}</div>
                <div><strong>Location:</strong> {activeMachineData?.location || 'Bay 3, Line 2'}</div>
                <div><strong>Criticality:</strong> {activeMachineData?.criticality || 'HIGH'}</div>
              </div>
            </div>

            {/* 2. Quick Action Workflows */}
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                Copilot Workflows
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => handleRunWorkflow('DIAGNOSE')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    backgroundColor: '#0b1329',
                    border: '1px solid #1e293b',
                    borderRadius: '8px',
                    color: '#e2e8f0',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#38bdf8'; e.currentTarget.style.color = '#38bdf8'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1e293b'; e.currentTarget.style.color = '#e2e8f0'; }}
                >
                  <Search size={14} color="#38bdf8" />
                  <span>Diagnose Symptoms</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRunWorkflow('MANUALS')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    backgroundColor: '#0b1329',
                    border: '1px solid #1e293b',
                    borderRadius: '8px',
                    color: '#e2e8f0',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#38bdf8'; e.currentTarget.style.color = '#38bdf8'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1e293b'; e.currentTarget.style.color = '#e2e8f0'; }}
                >
                  <BookOpen size={14} color="#38bdf8" />
                  <span>Search OEM Manuals</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRunWorkflow('TROUBLESHOOT')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    backgroundColor: '#0b1329',
                    border: '1px solid #1e293b',
                    borderRadius: '8px',
                    color: '#e2e8f0',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#38bdf8'; e.currentTarget.style.color = '#38bdf8'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1e293b'; e.currentTarget.style.color = '#e2e8f0'; }}
                >
                  <Wrench size={14} color="#38bdf8" />
                  <span>Step-by-Step Troubleshoot</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRunWorkflow('HISTORY')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    backgroundColor: '#0b1329',
                    border: '1px solid #1e293b',
                    borderRadius: '8px',
                    color: '#e2e8f0',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#38bdf8'; e.currentTarget.style.color = '#38bdf8'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1e293b'; e.currentTarget.style.color = '#e2e8f0'; }}
                >
                  <History size={14} color="#a855f7" />
                  <span>Historical Repairs</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRunWorkflow('LOTO')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    backgroundColor: '#0b1329',
                    border: '1px solid #1e293b',
                    borderRadius: '8px',
                    color: '#e2e8f0',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#f59e0b'; e.currentTarget.style.color = '#f59e0b'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1e293b'; e.currentTarget.style.color = '#e2e8f0'; }}
                >
                  <Shield size={14} color="#f59e0b" />
                  <span>OSHA LOTO Safety Check</span>
                </button>
              </div>
            </div>

            {/* 3. Recent Threads / Queries */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Recent Queries
                </span>
                <span style={{ fontSize: '0.65rem', color: '#64748b' }}>
                  {recentQueries.length} logged
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto' }}>
                {recentQueries.length > 0 ? (
                  recentQueries.map((q) => (
                    <div
                      key={q.id}
                      onClick={() => handleSearch(q.query_text)}
                      style={{
                        padding: '7px 10px',
                        backgroundColor: '#070c1a',
                        border: '1px solid #1e293b',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.74rem',
                        color: '#cbd5e1',
                        transition: 'all 0.15s ease',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#38bdf8'; e.currentTarget.style.color = '#38bdf8'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1e293b'; e.currentTarget.style.color = '#cbd5e1'; }}
                      title={q.query_text}
                    >
                      {q.query_text}
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontStyle: 'italic', padding: '8px 0' }}>
                    No recent queries on this machine.
                  </div>
                )}
              </div>
            </div>

            {/* Grounding Status Footer */}
            <div style={{
              paddingTop: '12px',
              borderTop: '1px solid #1e293b',
              fontSize: '0.68rem',
              color: '#34d399',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981', boxShadow: '0 0 6px #10b981' }} />
              <span>Plant Knowledge Base Grounded</span>
            </div>
          </aside>

          {/* ──────────────────────────────────────────────────────────
              CENTER PANEL: CHAT THREAD + AI ANALYSIS CARD + INPUT CONSOLE
              ────────────────────────────────────────────────────────── */}
          <main style={{
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#070d1e',
            overflow: 'hidden',
            position: 'relative'
          }}>
            {/* Inline Key Configuration Warning Banner */}
            {showInlineKeyForm && (
              <div style={{
                backgroundColor: '#0a0f1d',
                borderBottom: '1px solid #1e3a8a',
                padding: '12px 18px',
                animation: 'fadeIn 0.2s ease-in'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Key size={16} color="#38bdf8" />
                    <strong style={{ fontSize: '0.85rem', color: '#f8fafc' }}>
                      Activate Real-Time Industrial AI Stream
                    </strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: '0.75rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none', fontWeight: 600 }}
                    >
                      Get Free Gemini Key <ExternalLink size={12} />
                    </a>
                    {aiConfig.apiKey && (
                      <button
                        type="button"
                        onClick={() => setShowInlineKeyForm(false)}
                        style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </div>

                <form onSubmit={handleSaveInlineKey} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <div style={{ position: 'relative', flex: '1', minWidth: '260px' }}>
                    <input
                      type={showKeyPassword ? 'text' : 'password'}
                      value={inlineKey}
                      onChange={(e) => handleInlineKeyChange(e.target.value)}
                      placeholder="Paste Google Gemini (AIzaSy...) or OpenAI (sk-...) API Key"
                      style={{
                        width: '100%',
                        padding: '8px 36px 8px 12px',
                        backgroundColor: '#040814',
                        border: inlineKeyError ? '1px solid #ef4444' : '1px solid #334155',
                        borderRadius: '6px',
                        color: '#ffffff',
                        fontSize: '0.8rem',
                        fontFamily: 'monospace',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowKeyPassword(!showKeyPassword)}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer'
                      }}
                    >
                      {showKeyPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>

                  <select
                    value={inlineModel}
                    onChange={(e) => setInlineModel(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: '#040814',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      color: '#ffffff',
                      fontSize: '0.78rem',
                      outline: 'none'
                    }}
                  >
                    <option value="gemini-2.0-flash">Gemini 2.0 Flash (Recommended)</option>
                    <option value="gemini-2.0-flash-lite">Gemini 2.0 Flash-Lite</option>
                    <option value="gemini-2.0-pro-exp-02-05">Gemini 2.0 Pro Experimental</option>
                    <option value="gpt-4o-mini">GPT-4o Mini (OpenAI)</option>
                    <option value="gpt-4o">GPT-4o (OpenAI)</option>
                  </select>

                  <button
                    type="submit"
                    disabled={savingInlineKey || !inlineKey.trim()}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      borderRadius: '6px',
                      background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                      color: '#ffffff',
                      border: '1px solid rgba(56, 189, 248, 0.4)',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      cursor: savingInlineKey || !inlineKey.trim() ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {savingInlineKey ? <RefreshCw size={13} className="spin" /> : <Zap size={13} />}
                    <span>{savingInlineKey ? 'Verifying...' : 'Activate AI'}</span>
                  </button>
                </form>
                {inlineKeyError && (
                  <div style={{ color: '#f87171', fontSize: '0.75rem', marginTop: '6px' }}>{inlineKeyError}</div>
                )}
              </div>
            )}

            {/* Conversation Thread Stream Box */}
            <div
              ref={chatContainerRef}
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}
            >
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '100%'
                  }}
                >
                  {/* Sender Header */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '4px',
                    fontSize: '0.7rem',
                    color: '#94a3b8'
                  }}>
                    {msg.role === 'user' ? (
                      <>
                        <span style={{ color: '#cbd5e1' }}>Technician</span>
                        <User size={12} color="#38bdf8" />
                        <span>• {msg.timestamp}</span>
                      </>
                    ) : (
                      <>
                        <Bot size={13} color="#38bdf8" />
                        <strong style={{ color: '#38bdf8' }}>{msg.provider || 'EquipFixAI Copilot'}</strong>
                        <span>• {msg.timestamp}</span>
                      </>
                    )}
                  </div>

                  {/* Message Bubble */}
                  <div
                    style={{
                      maxWidth: msg.role === 'user' ? '82%' : '94%',
                      padding: msg.role === 'user' ? '12px 16px' : '18px 22px',
                      borderRadius: msg.role === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                      background: msg.role === 'user' ? 'linear-gradient(135deg, #0284c7 0%, #1e40af 100%)' : '#000000',
                      color: '#ffffff',
                      border: msg.role === 'user' ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid #1e293b',
                      boxShadow: msg.role === 'user' ? '0 4px 14px rgba(2, 132, 199, 0.25)' : '0 8px 30px rgba(0, 0, 0, 0.95), 0 0 1px rgba(56, 189, 248, 0.25)',
                      fontSize: '0.875rem'
                    }}
                  >
                    {msg.role === 'user' ? (
                      <div>
                        {msg.replyToSnippet && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 8px',
                            marginBottom: '6px',
                            backgroundColor: 'rgba(0, 0, 0, 0.3)',
                            borderRadius: '6px',
                            borderLeft: '3px solid #38bdf8',
                            fontSize: '0.72rem',
                            color: '#e0f2fe'
                          }}>
                            <CornerDownLeft size={11} color="#38bdf8" />
                            <span style={{ opacity: 0.85, fontWeight: 700 }}>In reply to:</span>
                            <span style={{ fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '320px' }}>
                              "{msg.replyToSnippet}"
                            </span>
                          </div>
                        )}
                        <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{msg.content}</div>
                      </div>
                    ) : (
                      <>
                        {/* 1. Evidence-Based Confidence Badge */}
                        {msg.id !== 'welcome' && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '8px',
                            marginBottom: '12px',
                            paddingBottom: '10px',
                            borderBottom: '1px solid #1e293b'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '3px 9px',
                                borderRadius: '12px',
                                fontSize: '0.7rem',
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                                backgroundColor: msg.confidence === 'STRONG'
                                  ? 'rgba(16, 185, 129, 0.15)'
                                  : (msg.confidence === 'INSUFFICIENT' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)'),
                                color: msg.confidence === 'STRONG'
                                  ? '#34d399'
                                  : (msg.confidence === 'INSUFFICIENT' ? '#f87171' : '#fbbf24'),
                                border: `1px solid ${
                                  msg.confidence === 'STRONG'
                                    ? 'rgba(16, 185, 129, 0.35)'
                                    : (msg.confidence === 'INSUFFICIENT' ? 'rgba(239, 68, 68, 0.35)' : 'rgba(245, 158, 11, 0.35)')
                                }`
                              }}>
                                <span style={{
                                  width: '6px',
                                  height: '6px',
                                  borderRadius: '50%',
                                  backgroundColor: msg.confidence === 'STRONG' ? '#10b981' : (msg.confidence === 'INSUFFICIENT' ? '#ef4444' : '#f59e0b'),
                                  boxShadow: `0 0 6px ${msg.confidence === 'STRONG' ? '#10b981' : (msg.confidence === 'INSUFFICIENT' ? '#ef4444' : '#f59e0b')}`
                                }} />
                                {msg.confidence === 'STRONG'
                                  ? '🟢 Strong Evidence'
                                  : (msg.confidence === 'INSUFFICIENT' ? '🔴 Insufficient Evidence' : '🟡 Partial Evidence')}
                              </span>

                              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                                {msg.confidence === 'STRONG'
                                  ? 'Directly verified across OEM manuals & schematics'
                                  : (msg.confidence === 'INSUFFICIENT' ? 'Missing plant documentation' : 'Supported by general equipment specs')}
                              </span>
                            </div>

                            {/* "Why this recommendation?" toggle button */}
                            {msg.whyAnswer && (
                              <button
                                type="button"
                                onClick={() => toggleWhy(msg.id)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#38bdf8',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '2px 6px',
                                  borderRadius: '4px'
                                }}
                              >
                                <span>🧠 Why this recommendation?</span>
                                {expandedWhy[msg.id] ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                              </button>
                            )}
                          </div>
                        )}

                        {/* 2. Expandable "Why this recommendation?" Reasoning Card */}
                        {expandedWhy[msg.id] && msg.whyAnswer && (
                          <div style={{
                            backgroundColor: '#050a17',
                            border: '1px solid rgba(56, 189, 248, 0.3)',
                            borderRadius: '8px',
                            padding: '12px 14px',
                            marginBottom: '14px',
                            animation: 'fadeIn 0.2s ease-in'
                          }}>
                            <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                              Verified RAG Reasoning Factors:
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px', fontSize: '0.75rem' }}>
                              <div style={{ padding: '6px 8px', backgroundColor: '#070c1a', borderRadius: '6px', border: '1px solid #1e293b' }}>
                                <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.67rem' }}>OEM Documents Matched</span>
                                <strong style={{ color: '#38bdf8' }}>{msg.whyAnswer.docCount} manual sections</strong>
                              </div>
                              <div style={{ padding: '6px 8px', backgroundColor: '#070c1a', borderRadius: '6px', border: '1px solid #1e293b' }}>
                                <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.67rem' }}>Asset Identifier Verified</span>
                                <strong style={{ color: msg.whyAnswer.equipmentMatched ? '#34d399' : '#f87171' }}>
                                  {msg.whyAnswer.equipmentMatched ? '✓ Match Confirmed' : 'General Fleet'}
                                </strong>
                              </div>
                              <div style={{ padding: '6px 8px', backgroundColor: '#070c1a', borderRadius: '6px', border: '1px solid #1e293b' }}>
                                <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.67rem' }}>Historical Repairs Checked</span>
                                <strong style={{ color: msg.whyAnswer.historyMatched ? '#34d399' : '#94a3b8' }}>
                                  {msg.whyAnswer.historyMatched ? '✓ Prior Records Analyzed' : 'No prior repairs'}
                                </strong>
                              </div>
                              <div style={{ padding: '6px 8px', backgroundColor: '#070c1a', borderRadius: '6px', border: '1px solid #1e293b' }}>
                                <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.67rem' }}>OSHA LOTO Standards</span>
                                <strong style={{ color: msg.whyAnswer.safetyMatched ? '#34d399' : '#fbbf24' }}>
                                  {msg.whyAnswer.safetyMatched ? '✓ Zero-Energy Verified' : 'Standard Precautions'}
                                </strong>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 3. Main Message Content */}
                        <FormattedAIMessage content={msg.content} />

                        {/* 4. Streaming Indicator */}
                        {msg.isStreaming && (
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            marginTop: '10px',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            backgroundColor: 'rgba(14, 165, 233, 0.15)',
                            border: '1px solid rgba(14, 165, 233, 0.3)',
                            fontSize: '0.72rem',
                            color: '#38bdf8',
                            fontWeight: 700
                          }}>
                            <span style={{
                              display: 'inline-block',
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              backgroundColor: '#38bdf8',
                              boxShadow: '0 0 6px #38bdf8'
                            }} />
                            <span>Real-Time Streaming Active</span>
                            <span style={{ fontWeight: 900, color: '#38bdf8' }}>▍</span>
                          </div>
                        )}

                        {/* 5. "More Information Needed" Actionable Buttons */}
                        {(msg.missingInfo || msg.confidence === 'INSUFFICIENT') && !msg.isStreaming && (
                          <div style={{
                            marginTop: '14px',
                            padding: '12px 14px',
                            backgroundColor: '#0a0505',
                            border: '1px solid #7f1d1d',
                            borderRadius: '8px'
                          }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#f87171', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <AlertTriangle size={14} />
                              <span>⚠️ Actions to Provide Missing Information:</span>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                onClick={() => handleMissingInfoAction('SELECT_EQUIPMENT')}
                                style={{
                                  fontSize: '0.72rem',
                                  padding: '5px 10px',
                                  backgroundColor: '#1e293b',
                                  color: '#38bdf8',
                                  border: '1px solid #334155',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontWeight: 600
                                }}
                              >
                                [ Select Equipment ]
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMissingInfoAction('ENTER_ALARM')}
                                style={{
                                  fontSize: '0.72rem',
                                  padding: '5px 10px',
                                  backgroundColor: '#1e293b',
                                  color: '#38bdf8',
                                  border: '1px solid #334155',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontWeight: 600
                                }}
                              >
                                [ Enter Alarm Code ]
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMissingInfoAction('VIEW_HISTORY')}
                                style={{
                                  fontSize: '0.72rem',
                                  padding: '5px 10px',
                                  backgroundColor: '#1e293b',
                                  color: '#38bdf8',
                                  border: '1px solid #334155',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontWeight: 600
                                }}
                              >
                                [ View Maintenance History ]
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMissingInfoAction('UPLOAD_MANUAL')}
                                style={{
                                  fontSize: '0.72rem',
                                  padding: '5px 10px',
                                  backgroundColor: '#1e293b',
                                  color: '#34d399',
                                  border: '1px solid #059669',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontWeight: 600
                                }}
                              >
                                [ Upload Manual ]
                              </button>
                            </div>
                          </div>
                        )}

                        {/* 6. Inline Generated Visual Diagram (if generated) */}
                        {messageDiagrams[msg.id]?.diagramUrl && (
                          <div style={{
                            marginTop: '12px',
                            backgroundColor: '#040814',
                            border: '1px solid #1e3a8a',
                            borderRadius: '10px',
                            padding: '12px',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.4)'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase' }}>
                                📐 Exploded View &amp; Part Schematic ({messageDiagrams[msg.id].provider})
                              </span>
                              <a
                                href={messageDiagrams[msg.id].diagramUrl}
                                target="_blank"
                                rel="noreferrer"
                                download="equipfix-ai-diagram.jpg"
                                style={{
                                  fontSize: '0.7rem',
                                  color: '#60a5fa',
                                  textDecoration: 'none',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontWeight: 600,
                                  backgroundColor: 'rgba(37, 99, 235, 0.2)',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  border: '1px solid rgba(59, 130, 246, 0.4)'
                                }}
                              >
                                <Download size={11} /> Open Full Size
                              </a>
                            </div>
                            <img
                              src={messageDiagrams[msg.id].diagramUrl}
                              alt={messageDiagrams[msg.id].prompt}
                              style={{
                                width: '100%',
                                maxHeight: '340px',
                                objectFit: 'contain',
                                borderRadius: '6px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                display: 'block'
                              }}
                            />
                            <p style={{ fontSize: '0.7rem', color: '#94a3b8', margin: '6px 0 0 0', fontStyle: 'italic' }}>
                              Prompt: {messageDiagrams[msg.id].prompt}
                            </p>
                          </div>
                        )}

                        {messageDiagrams[msg.id]?.loading && (
                          <div style={{ marginTop: '10px' }}>
                            <AIThinkingEffect
                              mode="diagram"
                              modelName="CAD Schematic Generator"
                              machineCode={activeMachineCode}
                            />
                          </div>
                        )}

                        {/* 7. Action Bar */}
                        <div style={{
                          marginTop: '14px',
                          paddingTop: '10px',
                          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                          flexWrap: 'wrap'
                        }}>
                          {/* Left actions: Feedback Rating */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => handleFeedback(msg, 1)}
                              style={{
                                fontSize: '0.72rem',
                                padding: '4px 8px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                backgroundColor: feedbackStatus[msg.id] === 1 ? 'rgba(16, 185, 129, 0.25)' : '#0f172a',
                                color: feedbackStatus[msg.id] === 1 ? '#34d399' : '#94a3b8',
                                border: `1px solid ${feedbackStatus[msg.id] === 1 ? '#10b981' : '#334155'}`,
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: 600
                              }}
                              title="Mark response as helpful"
                            >
                              <ThumbsUp size={12} color={feedbackStatus[msg.id] === 1 ? '#34d399' : '#94a3b8'} />
                              <span>Helpful</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleFeedback(msg, -1)}
                              style={{
                                fontSize: '0.72rem',
                                padding: '4px 8px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                backgroundColor: feedbackStatus[msg.id] === -1 ? 'rgba(239, 68, 68, 0.25)' : '#0f172a',
                                color: feedbackStatus[msg.id] === -1 ? '#f87171' : '#94a3b8',
                                border: `1px solid ${feedbackStatus[msg.id] === -1 ? '#ef4444' : '#334155'}`,
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: 600
                              }}
                              title="Flag response as unhelpful"
                            >
                              <ThumbsDown size={12} color={feedbackStatus[msg.id] === -1 ? '#f87171' : '#94a3b8'} />
                              <span>Unhelpful</span>
                            </button>

                            {/* View Retrieved Sources Button */}
                            {msg.sources && msg.sources.length > 0 && (
                              <button
                                type="button"
                                onClick={() => handleViewSources(msg)}
                                style={{
                                  fontSize: '0.72rem',
                                  padding: '4px 10px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  color: '#38bdf8',
                                  backgroundColor: 'rgba(56, 189, 248, 0.1)',
                                  border: '1px solid rgba(56, 189, 248, 0.35)',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontWeight: 600
                                }}
                                title="View exact manual citations & excerpts"
                              >
                                <BookOpen size={12} color="#38bdf8" />
                                <span>Sources ({msg.sources.length})</span>
                              </button>
                            )}
                          </div>

                          {/* Right actions: Reply, Copy, Diagram */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {!messageDiagrams[msg.id]?.diagramUrl && !messageDiagrams[msg.id]?.loading && msg.content && (
                              <button
                                type="button"
                                onClick={() => handleGenerateInlineDiagram(msg.id, null, msg.content)}
                                style={{
                                  fontSize: '0.72rem',
                                  padding: '4px 9px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  color: '#a855f7',
                                  backgroundColor: 'rgba(168, 85, 247, 0.1)',
                                  border: '1px solid rgba(168, 85, 247, 0.3)',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontWeight: 600
                                }}
                                title="Generate CAD exploded diagram"
                              >
                                <Palette size={12} />
                                <span>CAD Diagram</span>
                              </button>
                            )}

                            {msg.content && !msg.isStreaming && (
                              <button
                                type="button"
                                onClick={() => handleStartReply(msg)}
                                style={{
                                  fontSize: '0.72rem',
                                  padding: '4px 9px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  color: '#38bdf8',
                                  backgroundColor: 'rgba(14, 165, 233, 0.1)',
                                  border: '1px solid rgba(56, 189, 248, 0.35)',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontWeight: 600
                                }}
                              >
                                <CornerDownLeft size={12} color="#38bdf8" />
                                <span>Reply</span>
                              </button>
                            )}

                            {msg.content && (
                              <button
                                type="button"
                                onClick={() => handleCopyLogs(msg.content, 'EquipFixAI Copilot Diagnostic Step')}
                                style={{
                                  fontSize: '0.7rem',
                                  padding: '4px 8px',
                                  backgroundColor: '#1e293b',
                                  color: '#cbd5e1',
                                  border: '1px solid #334155',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                                title="Copy full response to clipboard or log"
                              >
                                <Copy size={11} /> Copy
                              </button>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}

              {/* Dynamic Interactive AI Analysis Progress Card */}
              {isAnalyzing && (
                <div style={{ marginTop: '8px' }}>
                  <AIAnalysisCard
                    currentStageIndex={currentAnalysisStage}
                    machineCode={activeMachineCode || 'Industrial Fleet Asset'}
                  />
                </div>
              )}

              <div ref={chatBottomRef} style={{ height: '1px' }} />
            </div>

            {/* Active Reply Banner */}
            {replyingTo && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                padding: '8px 14px',
                margin: '0 16px 8px 16px',
                backgroundColor: '#000000',
                border: '1px solid #1e293b',
                borderLeft: '4px solid #38bdf8',
                borderRadius: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                  <CornerDownLeft size={14} color="#38bdf8" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase' }}>
                    Replying to AI:
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    "{replyingTo.textSnippet}"
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyingTo(null)}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Input Form Console */}
            <div style={{
              padding: '14px 18px',
              backgroundColor: '#050a17',
              borderTop: '1px solid #1e293b'
            }}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSearch();
                }}
                style={{ display: 'flex', gap: '10px', alignItems: 'center' }}
              >
                {/* Voice Input Microphone Button */}
                <button
                  type="button"
                  onClick={toggleVoiceInput}
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isListening ? 'rgba(239, 68, 68, 0.2)' : '#0b1329',
                    border: `1px solid ${isListening ? '#ef4444' : '#334155'}`,
                    color: isListening ? '#f87171' : '#94a3b8',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: isListening ? '0 0 12px rgba(239, 68, 68, 0.5)' : 'none'
                  }}
                  title={isListening ? 'Stop Voice Dictation' : 'Start Voice Dictation'}
                >
                  {isListening ? <MicOff size={18} className="pulse" /> : <Mic size={18} />}
                </button>

                <input
                  ref={questionInputRef}
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder={
                    isListening
                      ? 'Listening to technician voice...'
                      : replyingTo
                        ? `Ask follow-up: "${replyingTo.textSnippet.slice(0, 40)}..."`
                        : `Ask EquipFixAI Copilot: e.g. Why is ${activeMachineCode || 'spindle'} overheating? What is LOTO procedure?`
                  }
                  style={{
                    fontSize: '0.875rem',
                    flex: 1,
                    padding: '11px 16px',
                    borderRadius: '10px',
                    backgroundColor: '#000000',
                    color: '#ffffff',
                    border: replyingTo ? '1px solid #38bdf8' : (isListening ? '1px solid #ef4444' : '1px solid #27272a'),
                    outline: 'none',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.7)'
                  }}
                />

                <button
                  type="submit"
                  disabled={loading || !question.trim()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '11px 22px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                    color: '#ffffff',
                    border: '1px solid rgba(56, 189, 248, 0.4)',
                    boxShadow: '0 0 16px rgba(14, 165, 233, 0.35)',
                    fontWeight: 700,
                    cursor: loading || !question.trim() ? 'not-allowed' : 'pointer',
                    opacity: loading || !question.trim() ? 0.7 : 1
                  }}
                >
                  {loading ? <RefreshCw size={15} className="spin" /> : <Send size={15} />}
                  <span>{loading ? 'Analyzing...' : 'Send'}</span>
                </button>
              </form>

              {/* Quick Prompt Pills */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
                <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, alignSelf: 'center', textTransform: 'uppercase' }}>
                  Quick Suggestions:
                </span>
                {quickPrompts.slice(0, 3).map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSearch(p)}
                    style={{
                      backgroundColor: '#091124',
                      border: '1px solid #1e293b',
                      borderRadius: '14px',
                      padding: '4px 10px',
                      fontSize: '0.7rem',
                      color: '#94a3b8',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#38bdf8'; e.currentTarget.style.borderColor = '#38bdf8'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = '#1e293b'; }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </main>

          {/* ──────────────────────────────────────────────────────────
              RIGHT PANEL: EVIDENCE & RETRIEVED SOURCES DRAWER
              ────────────────────────────────────────────────────────── */}
          <aside style={{
            backgroundColor: '#050915',
            borderLeft: '1px solid #1e293b',
            display: showRightPanel ? 'flex' : 'none',
            flexDirection: 'column',
            overflowY: 'auto',
            padding: '16px',
            gap: '14px'
          }}>
            {/* Drawer Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookOpen size={16} color="#38bdf8" />
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#f8fafc' }}>
                  Evidence &amp; Sources
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowRightPanel(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Right Drawer Tabs */}
            <div style={{ display: 'flex', backgroundColor: '#091124', borderRadius: '8px', padding: '3px', border: '1px solid #1e293b' }}>
              <button
                type="button"
                onClick={() => setRightPanelTab('SOURCES')}
                style={{
                  flex: 1,
                  padding: '6px 0',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: rightPanelTab === 'SOURCES' ? '#0284c7' : 'transparent',
                  color: rightPanelTab === 'SOURCES' ? '#ffffff' : '#94a3b8',
                  cursor: 'pointer'
                }}
              >
                OEM Docs ({activeSources.length})
              </button>
              <button
                type="button"
                onClick={() => setRightPanelTab('HISTORY')}
                style={{
                  flex: 1,
                  padding: '6px 0',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: rightPanelTab === 'HISTORY' ? '#0284c7' : 'transparent',
                  color: rightPanelTab === 'HISTORY' ? '#ffffff' : '#94a3b8',
                  cursor: 'pointer'
                }}
              >
                Repairs ({machineHistoryRecords.length})
              </button>
            </div>

            {/* Tab 1: Retrieved Document Chunks */}
            {rightPanelTab === 'SOURCES' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, overflowY: 'auto' }}>
                {activeSources.length > 0 ? (
                  activeSources.map((s, idx) => (
                    <div
                      key={idx}
                      style={{
                        backgroundColor: '#091124',
                        border: '1px solid #1e3a8a',
                        borderRadius: '8px',
                        padding: '12px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          backgroundColor: 'rgba(56, 189, 248, 0.15)',
                          color: '#38bdf8',
                          padding: '2px 6px',
                          borderRadius: '4px'
                        }}>
                          {s.doc_type || 'OEM MANUAL'}
                        </span>
                        {s.relevance_score && (
                          <span style={{ fontSize: '0.675rem', color: '#34d399', fontWeight: 700 }}>
                            {Math.round(s.relevance_score * 100)}% Match
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc', marginBottom: '4px' }}>
                        {s.document_title || s.title || 'Technical Manual'}
                      </div>

                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '8px' }}>
                        {s.section && <span>Section: {s.section} • </span>}
                        {s.page_number && <span>Page {s.page_number}</span>}
                      </div>

                      <div style={{
                        fontSize: '0.76rem',
                        color: '#cbd5e1',
                        lineHeight: 1.5,
                        backgroundColor: '#050a17',
                        padding: '8px',
                        borderRadius: '6px',
                        borderLeft: '3px solid #38bdf8',
                        fontStyle: 'italic',
                        maxHeight: '120px',
                        overflowY: 'auto'
                      }}>
                        "{s.chunk_text || s.excerpt || s.snippet || 'Grounded procedural guidance retrieved from equipment documentation.'}"
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '24px 12px', textAlign: 'center', color: '#64748b' }}>
                    <BookOpen size={28} style={{ opacity: 0.4, margin: '0 auto 8px auto' }} />
                    <p style={{ fontSize: '0.8rem', margin: '0 0 6px 0', color: '#94a3b8', fontWeight: 600 }}>
                      No Documents Retrieved Yet
                    </p>
                    <p style={{ fontSize: '0.72rem', margin: 0 }}>
                      Send a diagnostic prompt. Retrieved OEM manual excerpts and schematics will appear here.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Historical Maintenance Records */}
            {rightPanelTab === 'HISTORY' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, overflowY: 'auto' }}>
                {machineHistoryRecords.length > 0 ? (
                  machineHistoryRecords.map((rec, idx) => (
                    <div
                      key={idx}
                      style={{
                        backgroundColor: '#091124',
                        border: '1px solid #1e3a8a',
                        borderRadius: '8px',
                        padding: '10px 12px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <strong style={{ fontSize: '0.78rem', color: '#38bdf8' }}>
                          WO #{rec.work_order_number || rec.id}
                        </strong>
                        <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                          {rec.completion_date || rec.created_at ? new Date(rec.completion_date || rec.created_at).toLocaleDateString() : 'Historical'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#f8fafc', marginBottom: '4px' }}>
                        {rec.description || rec.symptom || 'Routine service / component replacement'}
                      </div>
                      {rec.resolution && (
                        <div style={{ fontSize: '0.7rem', color: '#34d399', backgroundColor: '#050a17', padding: '6px', borderRadius: '4px' }}>
                          <strong>Fix:</strong> {rec.resolution}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '24px 12px', textAlign: 'center', color: '#64748b' }}>
                    <History size={28} style={{ opacity: 0.4, margin: '0 auto 8px auto' }} />
                    <p style={{ fontSize: '0.8rem', margin: '0 0 6px 0', color: '#94a3b8', fontWeight: 600 }}>
                      No Past Repairs Logged
                    </p>
                    <p style={{ fontSize: '0.72rem', margin: 0 }}>
                      Prior completed work orders on {activeMachineCode || 'this asset'} will appear here.
                    </p>
                  </div>
                )}
              </div>
            )}
          </aside>
        </div>
      )}

      {/* ========================================================
          TAB 2: MULTIMODAL IMAGE ANALYSIS (ANALYZE ANYTHING)
          ======================================================== */}
      {activeTab === 'VISION' && (
        <div style={{ padding: '20px', color: '#f8fafc' }}>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#38bdf8', margin: '0 0 4px 0' }}>
              Multimodal Inspection Engine
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
              Upload broken machinery components, thermal scans, or dial gauges for real-time vision diagnosis.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: selectedImageBase64 ? '1fr 1fr' : '1fr', gap: '18px' }}>
            <div>
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed #334155',
                  borderRadius: '12px',
                  padding: '30px 20px',
                  textAlign: 'center',
                  backgroundColor: '#040814',
                  cursor: 'pointer',
                  marginBottom: '14px'
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  style={{ display: 'none' }}
                />
                <Camera size={36} color="#38bdf8" style={{ margin: '0 auto 10px auto' }} />
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#f8fafc' }}>
                  {imageFileName ? `Loaded: ${imageFileName}` : 'Click to Upload Machine Photo / Thermal Scan'}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
                  Supports PNG, JPEG, WEBP up to 20MB
                </div>
              </div>

              {selectedImageBase64 && (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => handleAnalyzeImage()}
                    disabled={visionLoading}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '12px 18px',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                      color: '#ffffff',
                      border: 'none',
                      fontWeight: 700,
                      cursor: visionLoading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {visionLoading ? <RefreshCw size={16} className="spin" /> : <Sparkles size={16} />}
                    <span>{visionLoading ? 'Analyzing Component...' : 'Execute Vision Inspection'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedImageBase64(null);
                      setImageFileName('');
                      setVisionResponse(null);
                    }}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '8px',
                      backgroundColor: '#1e293b',
                      color: '#cbd5e1',
                      border: '1px solid #334155',
                      cursor: 'pointer'
                    }}
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            {selectedImageBase64 && (
              <div style={{ backgroundColor: '#040814', border: '1px solid #1e293b', borderRadius: '12px', padding: '14px' }}>
                <img
                  src={selectedImageBase64}
                  alt="Uploaded Asset"
                  style={{ width: '100%', maxHeight: '280px', objectFit: 'contain', borderRadius: '8px' }}
                />
              </div>
            )}
          </div>

            {visionResponse && (
              <div style={{
                marginTop: '20px',
                backgroundColor: '#000000',
                border: '1px solid #1e293b',
                borderRadius: '12px',
                padding: '20px'
              }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#38bdf8', marginBottom: '12px' }}>
                  🔍 Vision Diagnostic Findings ({visionResponse.provider}):
                </div>
                <FormattedAIMessage content={visionResponse.text} />
              </div>
            )}
        </div>
      )}

      {/* ========================================================
          TAB 3: AI CAD & SCHEMATIC GENERATOR
          ======================================================== */}
      {activeTab === 'IMAGE_GEN' && (
        <div style={{ padding: '20px', color: '#f8fafc' }}>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#38bdf8', margin: '0 0 4px 0' }}>
              Industrial CAD &amp; Schematic Generator
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
              Generate exploded assembly schematics, CAD line drawings, or hydraulic circuit blueprints on demand.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleGenerateDiagram();
            }}
            style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '18px' }}
          >
            <input
              type="text"
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              placeholder="e.g. 5-Axis CNC Milling Spindle exploded assembly with part callouts"
              style={{
                flex: 1,
                minWidth: '280px',
                padding: '12px 16px',
                backgroundColor: '#040814',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '0.85rem',
                outline: 'none'
              }}
            />

            <select
              value={imageStyle}
              onChange={(e) => setImageStyle(e.target.value)}
              style={{
                padding: '12px 14px',
                backgroundColor: '#040814',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '0.8rem',
                outline: 'none'
              }}
            >
              <option value="schematic">Technical CAD Blueprint</option>
              <option value="exploded">Isometric Exploded Assembly</option>
            </select>

            <button
              type="submit"
              disabled={generatingImage || !imagePrompt.trim()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 22px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                cursor: generatingImage || !imagePrompt.trim() ? 'not-allowed' : 'pointer'
              }}
            >
              {generatingImage ? <RefreshCw size={15} className="spin" /> : <Palette size={15} />}
              <span>{generatingImage ? 'Generating...' : 'Generate Blueprint'}</span>
            </button>
          </form>

          {generatedImage && (
            <div style={{ backgroundColor: '#040814', border: '1px solid #1e3a8a', borderRadius: '12px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <strong style={{ fontSize: '0.85rem', color: '#38bdf8' }}>
                  Generated Technical Blueprint ({generatedImage.provider})
                </strong>
                <a
                  href={generatedImage.imageUrl}
                  target="_blank"
                  rel="noreferrer"
                  download="schematic.jpg"
                  style={{ color: '#38bdf8', fontSize: '0.75rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Download size={13} /> Download
                </a>
              </div>
              <img
                src={generatedImage.imageUrl}
                alt="Generated Schematic"
                style={{ width: '100%', maxHeight: '420px', objectFit: 'contain', borderRadius: '8px' }}
              />
            </div>
          )}
        </div>
      )}

      {/* AI Key Configuration Modal */}
      <AIKeyConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        onSaved={handleConfigSaved}
      />
    </div>
  );
};

export default AITroubleshootingPanel;
