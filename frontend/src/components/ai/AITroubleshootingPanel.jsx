import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles, Bot, User, Send, Mic, MicOff, Paperclip, X, Image as ImageIcon,
  ChevronDown, ChevronRight, Copy, Check, ThumbsUp, ThumbsDown, Wrench, Shield,
  Activity, BookOpen, AlertTriangle, RefreshCw, Key, Trash2, Camera, Download,
  ExternalLink, Layers, Search, Cpu, PanelRight, ArrowUpRight, Zap, CheckCircle2,
  FileText, CornerDownLeft, Sliders, History, Info, Maximize2, ShieldAlert
} from 'lucide-react';
import { aiApi, machinesApi, documentsApi, workOrdersApi } from '../../services/api';
import {
  getAIConfig, saveAIConfig, askEquipFixCopilot, generateIndustrialImage, testAIConnection
} from '../../services/aiCopilotService';
import AIKeyConfigModal from './AIKeyConfigModal';
import { AIThinkingEffect } from './AIThinkingEffect';

// ─────────────────────────────────────────────────────────────────────────────
// RICH INDUSTRIAL HTML RESPONSE STYLES (PRESERVED 100%)
// ─────────────────────────────────────────────────────────────────────────────
const AI_RESPONSE_STYLES = `
  .ai-response-root {
    font-family: inherit;
    color: #f8fafc;
    font-size: 0.885rem;
    line-height: 1.7;
    word-break: break-word;
  }
  .ai-section {
    font-size: 0.95rem;
    font-weight: 800;
    color: #38bdf8;
    margin: 16px 0 10px 0;
    padding: 8px 14px 8px 14px;
    border-left: 3px solid #38bdf8;
    background: rgba(14, 165, 233, 0.08);
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
    margin: 4px 0;
    background: rgba(15, 23, 42, 0.6);
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.06);
    flex-wrap: wrap;
  }
  .ai-key {
    font-weight: 700;
    color: #94a3b8;
    font-size: 0.775rem;
    min-width: 140px;
    flex-shrink: 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding-top: 2px;
  }
  .ai-val {
    color: #ffffff;
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
    color: #f8fafc;
    line-height: 1.6;
    padding: 8px 12px;
    background: rgba(15, 23, 42, 0.6);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.06);
  }
  .ai-steps li::before {
    content: counter(step-counter);
    background: #0284c7;
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
    box-shadow: 0 0 10px rgba(2, 132, 199, 0.4);
  }
  .ai-facts { margin: 10px 0; padding: 0; list-style: none; }
  .ai-facts li {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin: 6px 0;
    font-size: 0.885rem;
    color: #f8fafc;
    line-height: 1.6;
    padding: 4px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  }
  .ai-facts li:last-child { border-bottom: none; }
  .ai-facts li::before {
    content: "▸";
    color: #38bdf8;
    font-weight: 900;
    font-size: 0.85rem;
    flex-shrink: 0;
    margin-top: 1px;
  }
  .ai-warn {
    background: rgba(120, 53, 15, 0.25);
    border: 1px solid rgba(245, 158, 11, 0.5);
    border-left: 4px solid #f59e0b;
    border-radius: 8px;
    padding: 12px 16px;
    margin: 12px 0;
    color: #fef08a;
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
    background: rgba(14, 165, 233, 0.15);
    color: #38bdf8;
    border: 1px solid rgba(56, 189, 248, 0.35);
  }
  .ai-code, code {
    background: rgba(2, 6, 23, 0.8);
    color: #38bdf8;
    padding: 2px 8px;
    border-radius: 5px;
    font-family: 'JetBrains Mono', Menlo, Consolas, monospace;
    font-size: 0.84rem;
    border: 1px solid rgba(56, 189, 248, 0.2);
  }
  .ai-table {
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0;
    font-size: 0.84rem;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(11, 19, 41, 0.5);
    display: block;
    overflow-x: auto;
  }
  .ai-table th {
    color: #38bdf8;
    font-weight: 800;
    padding: 9px 12px;
    text-align: left;
    border-bottom: 2px solid #0284c7;
    font-size: 0.76rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    white-space: nowrap;
    background: rgba(15, 23, 42, 0.9);
  }
  .ai-table td {
    padding: 8px 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    color: #f8fafc;
    vertical-align: top;
    line-height: 1.5;
  }
  .ai-table tbody tr:hover td { background: rgba(14, 165, 233, 0.06); }
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
        <div key={`b-${idx}`} style={{ display: 'flex', gap: '8px', margin: '5px 0', fontSize: '0.885rem', color: '#f8fafc' }}>
          <span style={{ color: '#38bdf8', fontWeight: 900 }}>•</span>
          <div style={{ flex: 1 }}>{trimmed.replace(/^[\*\-•]\s+/, '')}</div>
        </div>
      );
      return;
    }
    const nm = trimmed.match(/^(\d+)[\.\)]\s+(.*)/);
    if (nm) {
      elements.push(
        <div key={`n-${idx}`} style={{ display: 'flex', gap: '10px', margin: '6px 0', fontSize: '0.885rem', color: '#f8fafc' }}>
          <span style={{ background: '#0284c7', color: '#ffffff', fontWeight: 800, fontSize: '0.72rem', padding: '2px 7px', borderRadius: '6px', flexShrink: 0 }}>
            {nm[1]}
          </span>
          <div style={{ flex: 1 }}>{nm[2]}</div>
        </div>
      );
      return;
    }
    elements.push(<p key={`p-${idx}`} style={{ margin: '5px 0', fontSize: '0.885rem', color: '#f8fafc', lineHeight: 1.65 }}>{trimmed}</p>);
  });

  return <div style={{ wordBreak: 'break-word' }}>{elements}</div>;
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN AITROUBLESHOOTINGPANEL COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export const AITroubleshootingPanel = ({
  machineId = null,
  workOrderId = null,
  machineCode = '',
  incidentSummary = '',
  isFullPage = false
}) => {
  // Navigation / Modes: 'DIAGNOSTICS' | 'VISION' | 'IMAGE_GEN' | 'DB_TOOLS'
  const [activeTab, setActiveTab] = useState('DIAGNOSTICS');

  // Layout panels
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [showRightDrawer, setShowRightDrawer] = useState(false);
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false
  );

  // Equipment & Work Order Context
  const [allMachines, setAllMachines] = useState([]);
  const [allWorkOrders, setAllWorkOrders] = useState([]);
  const [activeMachineId, setActiveMachineId] = useState(machineId);
  const [activeMachineCode, setActiveMachineCode] = useState(machineCode);
  const [activeMachineData, setActiveMachineData] = useState(null);
  const [activeWorkOrderId, setActiveWorkOrderId] = useState(workOrderId);
  const [showMachineModal, setShowMachineModal] = useState(false);

  // Chat Conversation State
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
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [feedback, setFeedback] = useState({});
  const [copiedId, setCopiedId] = useState(null);
  const [diagramAttachments, setDiagramAttachments] = useState({});

  // Vision & Multimodal
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [selectedImageBase64, setSelectedImageBase64] = useState(null);
  const [selectedImageMime, setSelectedImageMime] = useState(null);
  const [visionLoading, setVisionLoading] = useState(false);
  const [visionResponse, setVisionResponse] = useState(null);
  const fileInputRef = useRef(null);

  // Dedicated CAD Schematics generator
  const [diagramPrompt, setDiagramPrompt] = useState('');
  const [generatingDiagram, setGeneratingDiagram] = useState(false);
  const [generatedDiagramUrl, setGeneratedDiagramUrl] = useState(null);
  const [diagramError, setDiagramError] = useState(null);

  // Direct Database Tools
  const [toolResults, setToolResults] = useState(null);
  const [runningTool, setRunningTool] = useState(false);
  const [activeToolName, setActiveToolName] = useState(null);

  // Voice Input (Web Speech API)
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  // API Key Config & Sources
  const [aiConfig, setAiConfig] = useState(getAIConfig());
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [activeSources, setActiveSources] = useState([]);
  const [recentQueries, setRecentQueries] = useState([]);

  // DOM Refs
  const chatScrollRef = useRef(null);
  const textareaRef = useRef(null);

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setShowLeftSidebar(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch machines and work orders
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [mRes, woRes] = await Promise.all([
          machinesApi.list(),
          workOrdersApi.list()
        ]);
        const mList = mRes.data || [];
        setAllMachines(mList);
        setAllWorkOrders(woRes.data || []);

        if (!activeMachineId && mList.length > 0) {
          setActiveMachineId(mList[0].id);
          setActiveMachineCode(mList[0].machine_code);
          setActiveMachineData(mList[0]);
        } else if (activeMachineId && mList.length > 0) {
          const found = mList.find((m) => String(m.id) === String(activeMachineId));
          if (found) setActiveMachineData(found);
        }
      } catch (err) {
        console.error('Failed to load fleet data for AI Copilot', err);
      }
    };
    fetchData();
  }, []);

  // Update active machine data on machine ID change
  useEffect(() => {
    if (activeMachineId && allMachines.length > 0) {
      const found = allMachines.find((m) => String(m.id) === String(activeMachineId));
      if (found) {
        setActiveMachineData(found);
        setActiveMachineCode(found.machine_code);
      }
    }
  }, [activeMachineId, allMachines]);

  // Load history queries
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const res = await aiApi.getHistory({
          machine_id: activeMachineId || undefined,
          limit: 6
        });
        setRecentQueries(res.data || []);
      } catch (e) {}
    };
    loadHistory();
  }, [activeMachineId]);

  // Scoped smooth scroll inside chat feed only
  const scrollToChatBottom = () => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTo({
        top: chatScrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    if (activeTab === 'DIAGNOSTICS') {
      scrollToChatBottom();
    }
  }, [messages, loading, isAnalyzing]);

  // Voice recognition init
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
      const recognition = new SpeechRec();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        if (transcript) {
          setQuestion((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      setIsListening(false);
    }
  };

  // Image file handler
  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedImageFile(file);
    setSelectedImageMime(file.type || 'image/jpeg');

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImageBase64(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const removeSelectedImage = () => {
    setSelectedImageFile(null);
    setSelectedImageBase64(null);
    setSelectedImageMime(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Run structured DB tool
  const handleRunDiagnosticTool = async (toolName, params, label) => {
    setRunningTool(true);
    setActiveToolName(toolName);
    setToolResults(null);
    try {
      const res = await aiApi.executeTool({ tool_name: toolName, parameters: params });
      setToolResults({ tool: toolName, label, data: res.data.result });
    } catch (err) {
      setToolResults({ tool: toolName, label, error: err.response?.data?.detail || 'Execution failed.' });
    } finally {
      setRunningTool(false);
      setActiveToolName(null);
    }
  };

  // Search / Ask Copilot
  const handleSearch = async (customPrompt = null) => {
    const promptToSend = (customPrompt || question).trim();
    if (!promptToSend && !selectedImageBase64) return;
    if (loading) return;

    // Reset prompt box
    setQuestion('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const currentReply = replyingTo;
    setReplyingTo(null);

    // Build user message
    const userMsgId = `user-${Date.now()}`;
    const userMsg = {
      id: userMsgId,
      role: 'user',
      content: promptToSend,
      replyTo: currentReply
        ? { id: currentReply.id, text: currentReply.content.slice(0, 120) }
        : null,
      imagePreview: selectedImageBase64 || null,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    setIsAnalyzing(true);

    try {
      let finalPrompt = promptToSend;
      if (currentReply) {
        finalPrompt = `[Context: Follow-up question referencing: "${currentReply.content.slice(0, 200)}..."]\n\n${promptToSend}`;
      }

      const conversationHistory = messages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content
        }));

      const result = await askEquipFixCopilot({
        prompt: finalPrompt,
        history: conversationHistory,
        imageBase64: selectedImageBase64,
        imageMime: selectedImageMime,
        context: {
          machineCode: activeMachineCode,
          incidentSummary
        }
      });

      // Clear image once submitted
      if (selectedImageBase64) {
        removeSelectedImage();
      }

      const answerText = result?.answer || result?.content || 'No response generated.';
      const sources = result?.sources || [];
      setActiveSources(sources);

      const assistantMsg = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: answerText,
        sources: sources,
        confidence: result?.confidence || 'STRONG',
        provider: result?.model || 'Gemini 2.0 Flash',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error('AI Copilot query error:', err);
      const errText = err?.message || 'Unable to connect to diagnostic engine.';
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `<div class="ai-warn">⚠️ <strong>Diagnostic Engine Notice:</strong> ${errText} Please verify your Google Gemini API key or check system connection.</div>`,
          sources: [],
          confidence: 'ERROR',
          provider: 'System Alert',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
      setIsAnalyzing(false);
    }
  };

  // Feedback handler
  const handleFeedback = (msgId, val) => {
    setFeedback((prev) => ({ ...prev, [msgId]: val }));
  };

  // Copy handler
  const handleCopy = (text, id) => {
    const cleanText = text.replace(/<[^>]*>/g, '').trim();
    navigator.clipboard.writeText(cleanText);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Inline diagram generator for a specific response
  const handleGenerateInlineDiagram = async (msgId, content) => {
    setDiagramAttachments((prev) => ({
      ...prev,
      [msgId]: { loading: true, diagramUrl: null, error: null }
    }));

    try {
      const prompt = `Industrial technical schematic: ${content.slice(0, 180)}`;
      const res = await generateIndustrialImage(prompt);
      setDiagramAttachments((prev) => ({
        ...prev,
        [msgId]: { loading: false, diagramUrl: res.imageUrl, error: null }
      }));
    } catch (err) {
      setDiagramAttachments((prev) => ({
        ...prev,
        [msgId]: { loading: false, diagramUrl: null, error: err.message || 'Diagram generation failed.' }
      }));
    }
  };

  // Standalone CAD Schematics Generator
  const handleGenerateCAD = async (prompt) => {
    const p = prompt || diagramPrompt;
    if (!p) return;
    setGeneratingDiagram(true);
    setDiagramError(null);
    setGeneratedDiagramUrl(null);

    try {
      const res = await generateIndustrialImage(p);
      setGeneratedDiagramUrl(res.imageUrl);
    } catch (err) {
      setDiagramError(err.message || 'Could not generate engineering schematic.');
    } finally {
      setGeneratingDiagram(false);
    }
  };

  // Multimodal Vision Analyzer
  const handleAnalyzeVision = async () => {
    if (!selectedImageBase64) return;
    setVisionLoading(true);
    setVisionResponse(null);

    try {
      const result = await askEquipFixCopilot({
        prompt: question || 'Perform exhaustive visual inspection: classify component, detect mechanical fractures, surface wear, overheating discoloration, and recommend immediate corrective action.',
        imageBase64: selectedImageBase64,
        imageMime: selectedImageMime,
        context: { machineCode: activeMachineCode }
      });
      setVisionResponse(result?.answer || 'Vision inspection complete.');
    } catch (err) {
      setVisionResponse(`Vision Inspection Error: ${err.message || 'Failed to inspect image.'}`);
    } finally {
      setVisionLoading(false);
    }
  };

  // Clear chat
  const handleClearChat = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: `<h3 class="ai-section">🤖 EquipFixAI Copilot — Industrial Reliability Engine</h3>
<div class="ai-kv"><span class="ai-key">Status</span><span class="ai-val">Ready for diagnosis</span></div>
<p>Session cleared. Inquire about equipment symptoms, alarms, or OSHA 1910.147 LOTO steps below.</p>`,
        timestamp: 'Now',
        provider: 'EquipFixAI Copilot',
        confidence: 'STRONG',
        sources: []
      }
    ]);
    setActiveSources([]);
  };

  // Quick Starter Prompts
  const STARTER_PROMPTS = [
    {
      title: 'Spindle Thermal Alarm',
      desc: 'Diagnose bearing thermal rise and coolant flow anomaly',
      prompt: `Diagnose spindle overheating alarm on ${activeMachineCode || 'CNC-01'}. Check bearing thermistors, coolant chiller circuit, and recommended lubrication procedure.`
    },
    {
      title: 'OSHA 1910.147 LOTO',
      desc: 'Zero-energy isolation and verified lockout protocol',
      prompt: `Generate complete OSHA 1910.147 LOTO zero-energy shutdown protocol for ${activeMachineCode || 'CNC-01'}. Include breaker lockout, residual pressure bleed, and live test verification.`
    },
    {
      title: 'Hydraulic Pressure Drop',
      desc: 'Troubleshoot proportional valve and line leak below 140 bar',
      prompt: `Troubleshoot hydraulic pressure dropping below 140 bar on ${activeMachineCode || 'CNC-01'}. Check accumulator precharge, proportional relief valve, and contamination filters.`
    },
    {
      title: 'Torque Specs & OEM Parts',
      desc: 'Verified manufacturer torque limits and spare part numbers',
      prompt: `What are the OEM bolt torque limits and replacement seal kit part numbers for ${activeMachineCode || 'CNC-01'} spindle cartridge assembly?`
    }
  ];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: isFullPage ? '100%' : 'calc(100vh - 60px)',
      backgroundColor: '#080c16',
      color: '#f8fafc',
      overflow: 'hidden',
      fontFamily: 'var(--font-sans)',
      position: 'relative'
    }}>
      {/* ───────────────────────────────────────────────────────────────────────
          1. TOP APP BAR (CLEAN, MODERN, UNIFIED)
          ─────────────────────────────────────────────────────────────────────── */}
      <header style={{
        height: '56px',
        backgroundColor: '#0c1220',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        gap: '12px',
        flexShrink: 0,
        zIndex: 40
      }}>
        {/* Left: Brand & Machine Dropdown Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => setShowLeftSidebar(!showLeftSidebar)}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '6px',
              color: showLeftSidebar ? '#38bdf8' : '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
            title={showLeftSidebar ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <Sliders size={16} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 0 12px rgba(14, 165, 233, 0.4)'
            }}>
              <Sparkles size={16} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.01em' }}>
                  EquipFix<span style={{ color: '#38bdf8' }}>AI</span>
                </span>
                <span style={{
                  fontSize: '0.625rem',
                  fontWeight: 700,
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  color: '#34d399',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  padding: '1px 6px',
                  borderRadius: '10px'
                }}>
                  LIVE RAG
                </span>
              </div>
            </div>
          </div>

          {/* Machine Context Selector Button */}
          <button
            type="button"
            onClick={() => setShowMachineModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#121a2e',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: '8px',
              padding: '5px 10px',
              color: '#f8fafc',
              cursor: 'pointer',
              fontSize: '0.785rem',
              fontWeight: 600,
              transition: 'border-color 0.15s ease'
            }}
            title="Switch Target Machine"
          >
            <Cpu size={14} color="#38bdf8" />
            <span style={{ color: '#38bdf8' }}>{activeMachineCode || 'Select Asset'}</span>
            {activeMachineData && (
              <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>
                • {activeMachineData.status}
              </span>
            )}
            <ChevronDown size={13} color="#94a3b8" />
          </button>
        </div>

        {/* Center: Mode Segmented Tabs */}
        {!isMobile && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#101626',
            borderRadius: '9px',
            padding: '3px',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            {[
              { id: 'DIAGNOSTICS', label: 'Chat Diagnostics', icon: Bot },
              { id: 'VISION', label: 'Photo Vision', icon: Camera },
              { id: 'IMAGE_GEN', label: 'CAD Schematics', icon: Layers },
              { id: 'DB_TOOLS', label: 'Direct DB Tools', icon: Zap }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '5px 12px',
                    borderRadius: '7px',
                    border: 'none',
                    backgroundColor: isActive ? '#0284c7' : 'transparent',
                    color: isActive ? '#ffffff' : '#94a3b8',
                    fontSize: '0.775rem',
                    fontWeight: isActive ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Right: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Evidence Drawer Button */}
          <button
            type="button"
            onClick={() => setShowRightDrawer(!showRightDrawer)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: showRightDrawer ? 'rgba(56, 189, 248, 0.15)' : '#101728',
              border: `1px solid ${showRightDrawer ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)'}`,
              color: showRightDrawer ? '#38bdf8' : '#cbd5e1',
              borderRadius: '8px',
              padding: '5px 10px',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
            title="Toggle OEM Evidence Drawer"
          >
            <BookOpen size={14} color="#38bdf8" />
            <span>OEM Sources ({activeSources.length})</span>
          </button>

          {/* API Key Modal Button */}
          <button
            type="button"
            onClick={() => setShowConfigModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              backgroundColor: '#101728',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '5px 10px',
              color: aiConfig.apiKey ? '#34d399' : '#fbbf24',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
            title="Configure Gemini API Key"
          >
            <Key size={13} />
            <span style={{ color: '#cbd5e1' }}>{aiConfig.apiKey ? 'Key Set' : 'Set Key'}</span>
          </button>

          {/* Clear Chat Button */}
          <button
            type="button"
            onClick={handleClearChat}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '8px',
              padding: '6px',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Clear Chat History"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </header>

      {/* ───────────────────────────────────────────────────────────────────────
          2. WORKSPACE BODY
          ─────────────────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* ── LEFT SIDEBAR: ASSET STATUS & QUICK WORKFLOWS ── */}
        {showLeftSidebar && (
          <aside style={{
            width: isMobile ? '280px' : '260px',
            backgroundColor: '#0c1220',
            borderRight: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
            overflowY: 'auto',
            padding: '14px',
            gap: '16px',
            zIndex: isMobile ? 50 : 20,
            position: isMobile ? 'absolute' : 'relative',
            top: 0,
            bottom: 0,
            left: 0,
            boxShadow: isMobile ? '0 10px 30px rgba(0,0,0,0.7)' : 'none'
          }}>
            {/* Equipment Card */}
            <div style={{
              backgroundColor: '#10182b',
              border: '1px solid rgba(56, 189, 248, 0.2)',
              borderRadius: '10px',
              padding: '12px 14px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Target Equipment
                </span>
                <span style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  backgroundColor: activeMachineData?.status === 'RUNNING' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: activeMachineData?.status === 'RUNNING' ? '#34d399' : '#f87171',
                  padding: '1px 6px',
                  borderRadius: '6px'
                }}>
                  {activeMachineData?.status || 'UNKNOWN'}
                </span>
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#ffffff' }}>
                {activeMachineCode || 'No Asset Selected'}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                {activeMachineData?.name || 'Industrial Equipment Fleet'}
              </div>
              <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.06)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '0.7rem' }}>
                <div>
                  <span style={{ color: '#64748b' }}>Dept: </span>
                  <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{activeMachineData?.department || 'Production'}</span>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Bay: </span>
                  <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{activeMachineData?.location || 'Bay 1'}</span>
                </div>
              </div>
            </div>

            {/* Quick Diagnostic Workflows */}
            <div>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                Diagnostic Workflows
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {[
                  { label: 'Diagnose Symptoms', icon: Activity, prompt: `Diagnose abnormal vibration and telemetry warnings on ${activeMachineCode}.` },
                  { label: 'OSHA LOTO Safety Check', icon: Shield, prompt: `Generate certified OSHA 1910.147 Lockout/Tagout isolation steps for ${activeMachineCode}.` },
                  { label: 'Search OEM Manuals', icon: BookOpen, prompt: `Search manufacturer service manual specs, tolerances, and calibration limits for ${activeMachineCode}.` },
                  { label: 'Step-by-Step Troubleshoot', icon: Wrench, prompt: `Provide structured step-by-step diagnostic guide for ${activeMachineCode}.` },
                  { label: 'Historical Repairs', icon: History, prompt: `Check recurring historical failure modes and replacement records for ${activeMachineCode}.` }
                ].map((wf, idx) => {
                  const Icon = wf.icon;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSearch(wf.prompt)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 10px',
                        backgroundColor: '#101628',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        borderRadius: '7px',
                        color: '#cbd5e1',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#162038'; e.currentTarget.style.color = '#38bdf8'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#101628'; e.currentTarget.style.color = '#cbd5e1'; }}
                    >
                      <Icon size={14} color="#0ea5e9" />
                      <span style={{ flex: 1 }}>{wf.label}</span>
                      <ChevronRight size={12} color="#64748b" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Recent Queries */}
            {recentQueries.length > 0 && (
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                  Recent Queries
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {recentQueries.slice(0, 5).map((q, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSearch(q.query_text || q.prompt || q.question)}
                      style={{
                        padding: '6px 8px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(15, 23, 42, 0.4)',
                        fontSize: '0.725rem',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.backgroundColor = '#101628'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.4)'; }}
                    >
                      {q.query_text || q.prompt || q.question}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>
        )}

        {/* ── CENTER: CHAT / VISION / CAD / DB CONTENT ── */}
        <main style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#080c16',
          overflow: 'hidden',
          position: 'relative'
        }}>
          {/* MODE: DIAGNOSTICS (MAIN CHAT) */}
          {activeTab === 'DIAGNOSTICS' && (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}>
              {/* Message Feed */}
              <div
                ref={chatScrollRef}
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '24px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px'
                }}
              >
                <div style={{ maxWidth: '880px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Empty state prompt cards */}
                  {messages.length <= 1 && (
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ textAlign: 'center', margin: '20px 0 28px 0' }}>
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '4px 14px',
                          borderRadius: '20px',
                          backgroundColor: 'rgba(14, 165, 233, 0.1)',
                          border: '1px solid rgba(14, 165, 233, 0.3)',
                          fontSize: '0.75rem',
                          color: '#38bdf8',
                          fontWeight: 700,
                          marginBottom: '10px'
                        }}>
                          <Sparkles size={14} />
                          <span>AUTONOMOUS INDUSTRIAL FLEET COPILOT</span>
                        </div>
                        <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#ffffff', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
                          Grounded Diagnostic Troubleshooting
                        </h2>
                        <p style={{ fontSize: '0.825rem', color: '#94a3b8', margin: 0, maxWidth: '580px', marginInline: 'auto' }}>
                          Cross-referencing OEM service manuals, live plant telemetry, and OSHA 1910.147 LOTO safety protocols with zero hallucinations.
                        </p>
                      </div>

                      {/* 2x2 Starter Prompts Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
                        {STARTER_PROMPTS.map((sp, idx) => (
                          <div
                            key={idx}
                            onClick={() => handleSearch(sp.prompt)}
                            style={{
                              backgroundColor: '#0c1220',
                              border: '1px solid rgba(255, 255, 255, 0.08)',
                              borderRadius: '10px',
                              padding: '14px',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.4)';
                              e.currentTarget.style.backgroundColor = '#10182b';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                              e.currentTarget.style.backgroundColor = '#0c1220';
                            }}
                          >
                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff', marginBottom: '4px' }}>
                              {sp.title}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.4 }}>
                              {sp.desc}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Messages Stream */}
                  {messages.map((msg) => {
                    const isUser = msg.role === 'user';
                    return (
                      <div
                        key={msg.id}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: isUser ? 'flex-end' : 'flex-start',
                          width: '100%'
                        }}
                      >
                        {/* Message Box */}
                        <div style={{
                          maxWidth: isUser ? '78%' : '100%',
                          width: isUser ? 'auto' : '100%',
                          backgroundColor: isUser ? '#162238' : '#0c1222',
                          border: isUser ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: isUser ? '14px 14px 2px 14px' : '12px',
                          padding: isUser ? '12px 16px' : '16px 18px',
                          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
                          position: 'relative'
                        }}>
                          {/* Assistant Header Row */}
                          {!isUser && (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '6px',
                                  background: 'linear-gradient(135deg, #0ea5e9, #2563eb)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#ffffff'
                                }}>
                                  <Bot size={14} />
                                </div>
                                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ffffff' }}>
                                  {msg.provider || 'EquipFixAI Copilot'}
                                </span>
                                <span style={{ fontSize: '0.675rem', color: '#64748b' }}>
                                  {msg.timestamp}
                                </span>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {msg.confidence && (
                                  <span style={{
                                    fontSize: '0.625rem',
                                    fontWeight: 700,
                                    backgroundColor: msg.confidence === 'ERROR' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                    color: msg.confidence === 'ERROR' ? '#f87171' : '#34d399',
                                    padding: '1px 6px',
                                    borderRadius: '5px'
                                  }}>
                                    {msg.confidence}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Replying-to Quote Banner */}
                          {msg.replyTo && (
                            <div style={{
                              padding: '4px 8px',
                              marginBottom: '8px',
                              borderRadius: '6px',
                              backgroundColor: 'rgba(0, 0, 0, 0.3)',
                              borderLeft: '3px solid #38bdf8',
                              fontSize: '0.72rem',
                              color: '#94a3b8'
                            }}>
                              <span style={{ fontWeight: 700, color: '#38bdf8' }}>In reply to: </span>
                              <span>{msg.replyTo.text}</span>
                            </div>
                          )}

                          {/* Image Attachment (if user uploaded image) */}
                          {msg.imagePreview && (
                            <div style={{ marginBottom: '10px' }}>
                              <img
                                src={msg.imagePreview}
                                alt="User attachment"
                                style={{ maxHeight: '180px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}
                              />
                            </div>
                          )}

                          {/* CONTENT: THE AI RESPONSE (PRESERVED 100%) */}
                          {isUser ? (
                            <div style={{ color: '#ffffff', fontSize: '0.885rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                              {msg.content}
                            </div>
                          ) : (
                            <FormattedAIMessage content={msg.content} />
                          )}

                          {/* Inline Generated CAD Schematic preview */}
                          {diagramAttachments[msg.id]?.diagramUrl && (
                            <div style={{ marginTop: '14px', padding: '12px', backgroundColor: '#070b14', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <Layers size={14} /> Industrial Engineering Schematic
                                </span>
                                <a
                                  href={diagramAttachments[msg.id].diagramUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  download="equipfix-schematic.svg"
                                  style={{ color: '#38bdf8', fontSize: '0.72rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                  <Download size={12} /> Download
                                </a>
                              </div>
                              <img
                                src={diagramAttachments[msg.id].diagramUrl}
                                alt="CAD Schematic"
                                style={{ width: '100%', maxHeight: '320px', objectFit: 'contain', borderRadius: '6px' }}
                              />
                            </div>
                          )}

                          {/* Assistant Action Buttons Toolbar */}
                          {!isUser && msg.id !== 'welcome' && (
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              flexWrap: 'wrap',
                              gap: '6px',
                              marginTop: '12px',
                              paddingTop: '8px',
                              borderTop: '1px solid rgba(255, 255, 255, 0.05)'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <button
                                  type="button"
                                  onClick={() => handleFeedback(msg.id, 'helpful')}
                                  style={{
                                    background: feedback[msg.id] === 'helpful' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                                    border: '1px solid rgba(255, 255, 255, 0.06)',
                                    borderRadius: '5px',
                                    padding: '4px 8px',
                                    color: feedback[msg.id] === 'helpful' ? '#34d399' : '#94a3b8',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '0.7rem'
                                  }}
                                  title="Mark as Helpful"
                                >
                                  <ThumbsUp size={12} />
                                  <span>Helpful</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleFeedback(msg.id, 'unhelpful')}
                                  style={{
                                    background: feedback[msg.id] === 'unhelpful' ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                                    border: '1px solid rgba(255, 255, 255, 0.06)',
                                    borderRadius: '5px',
                                    padding: '4px 8px',
                                    color: feedback[msg.id] === 'unhelpful' ? '#f87171' : '#94a3b8',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '0.7rem'
                                  }}
                                  title="Mark as Unhelpful"
                                >
                                  <ThumbsDown size={12} />
                                </button>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <button
                                  type="button"
                                  onClick={() => setReplyingTo(msg)}
                                  style={{
                                    background: 'transparent',
                                    border: '1px solid rgba(255, 255, 255, 0.06)',
                                    borderRadius: '5px',
                                    padding: '4px 8px',
                                    color: '#94a3b8',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '0.7rem'
                                  }}
                                >
                                  <CornerDownLeft size={12} />
                                  <span>Reply</span>
                                </button>

                                <button
                                  type="button"
                                  disabled={diagramAttachments[msg.id]?.loading}
                                  onClick={() => handleGenerateInlineDiagram(msg.id, msg.content)}
                                  style={{
                                    background: 'transparent',
                                    border: '1px solid rgba(139, 92, 246, 0.3)',
                                    borderRadius: '5px',
                                    padding: '4px 8px',
                                    color: '#a78bfa',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '0.7rem'
                                  }}
                                  title="Render CAD schematic for this fix"
                                >
                                  <Layers size={12} />
                                  <span>{diagramAttachments[msg.id]?.loading ? 'Rendering...' : 'CAD Diagram'}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleCopy(msg.content, msg.id)}
                                  style={{
                                    background: 'transparent',
                                    border: '1px solid rgba(255, 255, 255, 0.06)',
                                    borderRadius: '5px',
                                    padding: '4px 8px',
                                    color: copiedId === msg.id ? '#34d399' : '#94a3b8',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '0.7rem'
                                  }}
                                  title="Copy response"
                                >
                                  {copiedId === msg.id ? <Check size={12} /> : <Copy size={12} />}
                                  <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                                </button>

                                {msg.sources?.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveSources(msg.sources);
                                      setShowRightDrawer(true);
                                    }}
                                    style={{
                                      background: 'rgba(56, 189, 248, 0.1)',
                                      border: '1px solid rgba(56, 189, 248, 0.3)',
                                      borderRadius: '5px',
                                      padding: '4px 8px',
                                      color: '#38bdf8',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      fontSize: '0.7rem',
                                      fontWeight: 600
                                    }}
                                  >
                                    <BookOpen size={12} />
                                    <span>Sources ({msg.sources.length})</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Thinking effect */}
                  {loading && (
                    <div style={{ alignSelf: 'flex-start', margin: '4px 0' }}>
                      <AIThinkingEffect mode="chat" modelName={aiConfig.model || 'Gemini 2.0 Flash'} machineCode={activeMachineCode} />
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Floating Prompt Input Box */}
              <div style={{
                padding: '12px 20px 16px 20px',
                backgroundColor: 'rgba(8, 12, 22, 0.85)',
                backdropFilter: 'blur(10px)',
                borderTop: '1px solid rgba(255, 255, 255, 0.06)'
              }}>
                <div style={{ maxWidth: '880px', width: '100%', margin: '0 auto' }}>
                  {/* Replying-To Notification Bar */}
                  {replyingTo && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: '#101626',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      borderRadius: '8px 8px 0 0',
                      padding: '6px 12px',
                      fontSize: '0.75rem',
                      color: '#94a3b8'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CornerDownLeft size={13} color="#38bdf8" />
                        <span>Replying to: </span>
                        <strong style={{ color: '#ffffff' }}>"{replyingTo.content.slice(0, 70)}..."</strong>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReplyingTo(null)}
                        style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}

                  {/* Image Attachment Preview Tag */}
                  {selectedImageBase64 && (
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      backgroundColor: '#10182b',
                      border: '1px solid rgba(56, 189, 248, 0.4)',
                      borderRadius: '8px',
                      padding: '4px 10px',
                      marginBottom: '8px'
                    }}>
                      <img src={selectedImageBase64} alt="Thumb" style={{ width: '22px', height: '22px', borderRadius: '4px', objectFit: 'cover' }} />
                      <span style={{ fontSize: '0.72rem', color: '#e2e8f0' }}>Photo attached for inspection</span>
                      <button
                        type="button"
                        onClick={removeSelectedImage}
                        style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
                      >
                        <X size={13} />
                      </button>
                    </div>
                  )}

                  {/* Rounded Input Surface */}
                  <div style={{
                    backgroundColor: '#0e1424',
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                    borderRadius: replyingTo ? '0 0 14px 14px' : '14px',
                    padding: '10px 14px',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    <textarea
                      ref={textareaRef}
                      value={question}
                      onChange={(e) => {
                        setQuestion(e.target.value);
                        e.target.style.height = 'auto';
                        e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSearch();
                        }
                      }}
                      placeholder={`Ask EquipFixAI about ${activeMachineCode || 'machinery'}, alarms, symptoms, or OSHA LOTO... (Enter to send, Shift+Enter for newline)`}
                      rows={1}
                      style={{
                        width: '100%',
                        backgroundColor: 'transparent',
                        border: 'none',
                        outline: 'none',
                        color: '#ffffff',
                        fontSize: isMobile ? '16px' : '0.885rem',
                        lineHeight: 1.5,
                        resize: 'none',
                        fontFamily: 'inherit'
                      }}
                    />

                    {/* Bottom Control Bar */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {/* Photo Attachment button */}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={handleImageFileChange}
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          style={{
                            background: selectedImageBase64 ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '7px',
                            padding: '6px',
                            color: selectedImageBase64 ? '#38bdf8' : '#94a3b8',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title="Attach component photo for Multimodal Vision diagnosis"
                        >
                          <Paperclip size={15} />
                        </button>

                        {/* Microphone Voice Input button */}
                        <button
                          type="button"
                          onClick={toggleVoiceInput}
                          style={{
                            background: isListening ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                            border: `1px solid ${isListening ? '#ef4444' : 'rgba(255, 255, 255, 0.1)'}`,
                            borderRadius: '7px',
                            padding: '6px',
                            color: isListening ? '#f87171' : '#94a3b8',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title={isListening ? 'Listening... click to stop' : 'Dictate with voice'}
                        >
                          {isListening ? <MicOff size={15} /> : <Mic size={15} />}
                        </button>

                        {/* Machine context pill */}
                        <span style={{
                          fontSize: '0.7rem',
                          color: '#38bdf8',
                          backgroundColor: 'rgba(56, 189, 248, 0.1)',
                          padding: '2px 8px',
                          borderRadius: '6px'
                        }}>
                          ⚙️ {activeMachineCode || 'General Fleet'}
                        </span>
                      </div>

                      {/* Send Button */}
                      <button
                        type="button"
                        disabled={loading || (!question.trim() && !selectedImageBase64)}
                        onClick={() => handleSearch()}
                        style={{
                          background: loading || (!question.trim() && !selectedImageBase64)
                            ? '#1e293b'
                            : 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '6px 14px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: loading || (!question.trim() && !selectedImageBase64) ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 2px 10px rgba(14, 165, 233, 0.3)'
                        }}
                      >
                        <span>Send</span>
                        <Send size={14} />
                      </button>
                    </div>
                  </div>

                  <div style={{ textAlign: 'center', fontSize: '0.675rem', color: '#64748b', marginTop: '6px' }}>
                    EquipFixAI RAG is grounded in OEM service manuals &amp; OSHA 1910.147 standards. Always verify safety procedures before servicing equipment.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MODE: VISION (MULTIMODAL PHOTO INSPECTION) */}
          {activeTab === 'VISION' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px' }}>
              <div style={{ maxWidth: '880px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', margin: '0 0 4px 0' }}>
                    Multimodal Component Inspection &amp; Fault Classification
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
                    Upload broken components, worn gearing, thermal sensor readings, or gauge dials for instant computer-vision failure analysis.
                  </p>
                </div>

                {/* Upload Card */}
                <div style={{
                  backgroundColor: '#0c1220',
                  border: '2px dashed rgba(56, 189, 248, 0.3)',
                  borderRadius: '12px',
                  padding: '30px 20px',
                  textAlign: 'center',
                  cursor: 'pointer'
                }}
                onClick={() => fileInputRef.current?.click()}
                >
                  <Camera size={36} color="#38bdf8" style={{ margin: '0 auto 10px auto' }} />
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff' }}>
                    {selectedImageFile ? selectedImageFile.name : 'Click to select or capture component photo'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
                    Supports PNG, JPG, WebP inspection captures up to 10MB
                  </div>
                </div>

                {selectedImageBase64 && (
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <img
                      src={selectedImageBase64}
                      alt="Component to inspect"
                      style={{ maxHeight: '240px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}
                    />
                    <div style={{ flex: 1, minWidth: '260px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <textarea
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder="Specify inspection focus (e.g. check bearing race wear or crack propagation)..."
                        style={{
                          flex: 1,
                          backgroundColor: '#0e1424',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '8px',
                          padding: '10px',
                          color: '#ffffff',
                          fontSize: '0.85rem',
                          resize: 'none'
                        }}
                      />
                      <button
                        type="button"
                        disabled={visionLoading}
                        onClick={handleAnalyzeVision}
                        style={{
                          backgroundColor: '#0284c7',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '10px',
                          fontWeight: 700,
                          cursor: visionLoading ? 'wait' : 'pointer'
                        }}
                      >
                        {visionLoading ? 'Analyzing Tensors & Wear Patterns...' : 'Run Vision Inspection'}
                      </button>
                    </div>
                  </div>
                )}

                {visionResponse && (
                  <div style={{ backgroundColor: '#0c1220', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '10px', padding: '16px' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#38bdf8', marginBottom: '8px' }}>
                      Inspection Findings
                    </div>
                    <FormattedAIMessage content={visionResponse} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MODE: CAD SCHEMATICS GENERATOR */}
          {activeTab === 'IMAGE_GEN' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px' }}>
              <div style={{ maxWidth: '880px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', margin: '0 0 4px 0' }}>
                    Engineering CAD Schematics &amp; Diagram Generator
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
                    Generate detailed technical illustrations, isometric exploded views, and electrical wiring schematics for maintenance operations.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    value={diagramPrompt}
                    onChange={(e) => setDiagramPrompt(e.target.value)}
                    placeholder="Describe schematic (e.g. CNC spindle bearing cartridge exploded diagram with callouts)..."
                    style={{
                      flex: 1,
                      backgroundColor: '#0c1220',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      color: '#ffffff',
                      fontSize: '0.85rem'
                    }}
                  />
                  <button
                    type="button"
                    disabled={generatingDiagram || !diagramPrompt.trim()}
                    onClick={() => handleGenerateCAD()}
                    style={{
                      backgroundColor: '#8b5cf6',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '10px 18px',
                      fontWeight: 700,
                      cursor: generatingDiagram || !diagramPrompt.trim() ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {generatingDiagram ? 'Rendering...' : 'Generate CAD'}
                  </button>
                </div>

                {/* Templates */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {[
                    'CNC Spindle Bearing Preload Assembly',
                    'Hydraulic Proportional Valve Manifold',
                    '3-Phase Induction Motor Terminal Wiring & Overload',
                    'Pneumatic FRL Unit & Solenoid Circuit'
                  ].map((tpl, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setDiagramPrompt(tpl);
                        handleGenerateCAD(tpl);
                      }}
                      style={{
                        backgroundColor: '#101628',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        fontSize: '0.725rem',
                        color: '#a78bfa',
                        cursor: 'pointer'
                      }}
                    >
                      + {tpl}
                    </button>
                  ))}
                </div>

                {diagramError && (
                  <div style={{ color: '#ef4444', fontSize: '0.8rem' }}>{diagramError}</div>
                )}

                {generatedDiagramUrl && (
                  <div style={{ backgroundColor: '#070b14', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: '12px', padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#a78bfa' }}>Generated Schematic</span>
                      <a
                        href={generatedDiagramUrl}
                        download="cad-schematic.svg"
                        style={{ color: '#38bdf8', fontSize: '0.75rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Download size={14} /> Download SVG
                      </a>
                    </div>
                    <img
                      src={generatedDiagramUrl}
                      alt="Generated CAD"
                      style={{ width: '100%', maxHeight: '480px', objectFit: 'contain', borderRadius: '8px' }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MODE: DIRECT DB TOOLS */}
          {activeTab === 'DB_TOOLS' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px' }}>
              <div style={{ maxWidth: '880px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', margin: '0 0 4px 0' }}>
                    Authoritative Database Inspection Tools
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
                    Execute direct relational queries against PostgreSQL plant telemetry, work orders, incidents, and spare parts catalog.
                  </p>
                </div>

                {/* 4 Tool Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  <button
                    type="button"
                    disabled={runningTool}
                    onClick={() => handleRunDiagnosticTool('get_machine_status', { identifier: activeMachineCode }, 'Live Telemetry & Specs')}
                    style={{
                      backgroundColor: '#0c1220',
                      border: '1px solid rgba(14, 165, 233, 0.25)',
                      borderRadius: '10px',
                      padding: '16px',
                      textAlign: 'left',
                      cursor: 'pointer'
                    }}
                  >
                    <Activity size={20} color="#0ea5e9" style={{ marginBottom: '8px' }} />
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#ffffff' }}>Machine Telemetry</div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>Operational state, RPM, vibration</div>
                  </button>

                  <button
                    type="button"
                    disabled={runningTool}
                    onClick={() => handleRunDiagnosticTool('get_open_incidents', { machine_id: activeMachineId }, 'Active Alarms & Faults')}
                    style={{
                      backgroundColor: '#0c1220',
                      border: '1px solid rgba(245, 158, 11, 0.25)',
                      borderRadius: '10px',
                      padding: '16px',
                      textAlign: 'left',
                      cursor: 'pointer'
                    }}
                  >
                    <AlertTriangle size={20} color="#f59e0b" style={{ marginBottom: '8px' }} />
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#ffffff' }}>Active Alarms</div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>Open incidents and severity tags</div>
                  </button>

                  <button
                    type="button"
                    disabled={runningTool}
                    onClick={() => handleRunDiagnosticTool('check_spare_parts_stock', { machine_id: activeMachineId }, 'Spare Parts Inventory')}
                    style={{
                      backgroundColor: '#0c1220',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      borderRadius: '10px',
                      padding: '16px',
                      textAlign: 'left',
                      cursor: 'pointer'
                    }}
                  >
                    <Shield size={20} color="#10b981" style={{ marginBottom: '8px' }} />
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#ffffff' }}>Spare Parts Stock</div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>Stock quantities & reorder points</div>
                  </button>

                  <button
                    type="button"
                    disabled={runningTool}
                    onClick={() => handleRunDiagnosticTool('get_historical_repairs', { machine_id: activeMachineId }, 'Historical Repair Logs')}
                    style={{
                      backgroundColor: '#0c1220',
                      border: '1px solid rgba(139, 92, 246, 0.25)',
                      borderRadius: '10px',
                      padding: '16px',
                      textAlign: 'left',
                      cursor: 'pointer'
                    }}
                  >
                    <History size={20} color="#8b5cf6" style={{ marginBottom: '8px' }} />
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#ffffff' }}>Historical Repairs</div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>Previous MTTR & fixes</div>
                  </button>
                </div>

                {/* Tool Output Box */}
                {toolResults && (
                  <div style={{ backgroundColor: '#070b14', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '10px', padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#38bdf8' }}>
                        Query Output: {toolResults.label}
                      </span>
                      <button
                        type="button"
                        onClick={() => setToolResults(null)}
                        style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                      >
                        <X size={15} />
                      </button>
                    </div>
                    {toolResults.error ? (
                      <div style={{ color: '#ef4444' }}>{toolResults.error}</div>
                    ) : (
                      <pre style={{ margin: 0, padding: '10px', backgroundColor: '#020617', borderRadius: '6px', fontSize: '0.75rem', color: '#e2e8f0', overflowX: 'auto' }}>
                        {JSON.stringify(toolResults.data, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        {/* ── RIGHT DRAWER: OEM EVIDENCE & CITATIONS ── */}
        {showRightDrawer && (
          <aside style={{
            width: isMobile ? '300px' : '320px',
            backgroundColor: '#0c1220',
            borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
            overflowY: 'auto',
            padding: '16px',
            gap: '14px',
            zIndex: isMobile ? 50 : 20,
            position: isMobile ? 'absolute' : 'relative',
            top: 0,
            bottom: 0,
            right: 0,
            boxShadow: isMobile ? '0 10px 30px rgba(0,0,0,0.7)' : 'none'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookOpen size={16} color="#38bdf8" />
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#ffffff' }}>
                  Retrieved OEM Sources ({activeSources.length})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowRightDrawer(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
              >
                <X size={16} />
              </button>
            </div>

            {activeSources.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>
                No active document chunks retrieved for this prompt. Ask a query to inspect citations.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {activeSources.map((src, i) => (
                  <div
                    key={i}
                    style={{
                      backgroundColor: '#101628',
                      border: '1px solid rgba(56, 189, 248, 0.2)',
                      borderRadius: '8px',
                      padding: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#38bdf8' }}>
                        Source #{i + 1}
                      </span>
                      {src.similarity && (
                        <span style={{ fontSize: '0.65rem', color: '#34d399', fontWeight: 700 }}>
                          {(src.similarity * 100).toFixed(0)}% Match
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ffffff', marginBottom: '4px' }}>
                      {src.document_title || src.title || 'OEM Service Manual'}
                    </div>
                    {src.section_title && (
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '6px' }}>
                        Sec: {src.section_title} {src.page_number && `(Pg ${src.page_number})`}
                      </div>
                    )}
                    <div style={{ fontSize: '0.75rem', color: '#cbd5e1', lineHeight: 1.45, backgroundColor: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '5px' }}>
                      "{src.content || src.text || 'Grounded passage excerpt.'}"
                    </div>
                  </div>
                ))}
              </div>
            )}
          </aside>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────────────────
          MODALS
          ─────────────────────────────────────────────────────────────────────── */}
      {/* 1. API Key Config Modal */}
      {showConfigModal && (
        <AIKeyConfigModal
          isOpen={showConfigModal}
          onClose={() => setShowConfigModal(false)}
          onConfigSaved={(newCfg) => setAiConfig(newCfg)}
        />
      )}

      {/* 2. Machine Switcher Modal */}
      {showMachineModal && (
        <div
          onClick={() => setShowMachineModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
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
              maxWidth: '460px',
              backgroundColor: '#0c1220',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: '14px',
              padding: '20px',
              color: '#ffffff',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Cpu size={18} color="#38bdf8" /> Select Operational Machine
              </h3>
              <button
                type="button"
                onClick={() => setShowMachineModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '360px', overflowY: 'auto' }}>
              {allMachines.map((m) => {
                const isSelected = String(m.id) === String(activeMachineId);
                return (
                  <div
                    key={m.id}
                    onClick={() => {
                      setActiveMachineId(m.id);
                      setActiveMachineCode(m.machine_code);
                      setActiveMachineData(m);
                      setShowMachineModal(false);
                    }}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      backgroundColor: isSelected ? 'rgba(14, 165, 233, 0.15)' : '#101628',
                      border: `1px solid ${isSelected ? '#0ea5e9' : 'rgba(255, 255, 255, 0.06)'}`,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: isSelected ? '#38bdf8' : '#ffffff' }}>
                        {m.machine_code} — {m.name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                        Dept: {m.department} • Bay: {m.location}
                      </div>
                    </div>
                    <span style={{
                      fontSize: '0.675rem',
                      fontWeight: 700,
                      backgroundColor: m.status === 'RUNNING' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: m.status === 'RUNNING' ? '#34d399' : '#f87171',
                      padding: '2px 8px',
                      borderRadius: '5px'
                    }}>
                      {m.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
