import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import {
  Sparkles, Wrench, AlertTriangle, Shield, Check, Copy, ThumbsUp, ThumbsDown,
  Paperclip, Mic, MicOff, Send, X, ExternalLink, Download, Layers, MoreVertical,
  BookOpen, Trash2, ChevronRight, FileText, ChevronDown, CheckCircle2,
  Clock, ArrowRight, RotateCw, Search, Cpu, Pin, HardHat, Eye, RefreshCw, Plus, Settings, Key,
  HelpCircle, MessageSquare, Square, Zap, Brain
} from 'lucide-react';
import { aiApi, machinesApi, documentsApi, workOrdersApi, maintenanceApi, incidentsApi } from '../../services/api';
import {
  getAIConfig, saveAIConfig, askEquipFixCopilot, generateIndustrialImage
} from '../../services/aiCopilotService';
import AIKeyConfigModal from './AIKeyConfigModal';

// ─────────────────────────────────────────────────────────────────────────────
// LIGHT THEMED RICH HTML RESPONSE STYLES (MATCHING REFERENCE DESIGN)
// ─────────────────────────────────────────────────────────────────────────────
// LIGHT THEMED RICH CHATGPT-GRADE HTML & MARKDOWN RESPONSE STYLES
// ─────────────────────────────────────────────────────────────────────────────
const AI_RESPONSE_STYLES = `
  .ai-response-root {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #1e293b;
    font-size: 0.915rem;
    line-height: 1.72;
    word-break: break-word;
  }
  .ai-h1 {
    font-size: 1.18rem;
    font-weight: 800;
    color: #0f172a;
    margin: 14px 0 10px 0;
    padding-bottom: 6px;
    border-bottom: 2px solid #e2e8f0;
    letter-spacing: -0.015em;
  }
  .ai-section, .ai-h2 {
    font-size: 1.02rem;
    font-weight: 800;
    color: #0284c7;
    margin: 18px 0 10px 0;
    padding: 8px 14px;
    background: #f0f9ff;
    border-left: 3px solid #0284c7;
    border-radius: 0 8px 8px 0;
    display: flex;
    align-items: center;
    gap: 8px;
    letter-spacing: -0.01em;
  }
  .ai-section:first-child, .ai-h1:first-child, .ai-h2:first-child { margin-top: 2px; }
  .ai-sub, .ai-h3 {
    font-size: 0.94rem;
    font-weight: 700;
    color: #0f172a;
    margin: 14px 0 6px 0;
  }
  .ai-h4 {
    font-size: 0.88rem;
    font-weight: 700;
    color: #334155;
    margin: 10px 0 4px 0;
  }
  .ai-p {
    margin: 6px 0;
    line-height: 1.7;
    color: #1e293b;
  }
  .ai-callout {
    border-radius: 8px;
    padding: 12px 16px;
    margin: 14px 0;
    font-size: 0.885rem;
    line-height: 1.62;
  }
  .ai-callout-danger {
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-left: 4px solid #ef4444;
    color: #991b1b;
  }
  .ai-callout-warning, .ai-callout-caution {
    background: #fffbeb;
    border: 1px solid #fde68a;
    border-left: 4px solid #f59e0b;
    color: #92400e;
  }
  .ai-callout-note {
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    border-left: 4px solid #3b82f6;
    color: #1e40af;
  }
  .ai-callout-tip, .ai-callout-safety {
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-left: 4px solid #22c55e;
    color: #166534;
  }
  .ai-callout-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 800;
    font-size: 0.82rem;
    letter-spacing: 0.04em;
    margin-bottom: 6px;
    text-transform: uppercase;
  }
  .ai-callout-body {
    font-weight: 500;
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
  .ai-table-wrap {
    width: 100%;
    margin: 14px 0;
    overflow-x: auto;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 1px 2px rgba(0,0,0,0.03);
    background: #ffffff;
  }
  .ai-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.84rem;
    text-align: left;
  }
  .ai-table th {
    background: #f8fafc;
    color: #334155;
    font-weight: 700;
    padding: 10px 14px;
    border-bottom: 2px solid #cbd5e1;
    font-size: 0.76rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .ai-table td {
    padding: 10px 14px;
    border-bottom: 1px solid #f1f5f9;
    color: #1e293b;
    vertical-align: top;
    line-height: 1.5;
  }
  .ai-table tbody tr:last-child td { border-bottom: none; }
  .ai-table tbody tr:hover td { background: #f8fafc; }
  .ai-steps {
    margin: 12px 0;
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
    padding: 10px 14px;
    background: #f8fafc;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
  }
  .ai-steps li::before {
    content: counter(step-counter);
    background: #2563eb;
    color: #ffffff;
    font-weight: 800;
    font-size: 0.72rem;
    min-width: 22px;
    height: 22px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justifyContent: center;
    flex-shrink: 0;
    margin-top: 1px;
  }
  .ai-facts, .ai-list {
    margin: 10px 0;
    padding: 0;
    list-style: none;
  }
  .ai-facts li, .ai-list li {
    display: flex;
    align-items: flex-start;
    gap: 9px;
    margin: 6px 0;
    font-size: 0.885rem;
    color: #1e293b;
    line-height: 1.6;
  }
  .ai-facts li::before, .ai-list li::before {
    content: "•";
    color: #2563eb;
    font-weight: 900;
    font-size: 1.1rem;
    line-height: 1.2;
    flex-shrink: 0;
  }
  .ai-code-block {
    background: #0f172a;
    border-radius: 8px;
    margin: 14px 0;
    overflow: hidden;
    border: 1px solid #1e293b;
    color: #e2e8f0;
  }
  .ai-code-header {
    background: #1e293b;
    padding: 6px 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.72rem;
    color: #94a3b8;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .ai-code-block pre {
    margin: 0;
    padding: 12px 14px;
    overflow-x: auto;
    font-family: 'JetBrains Mono', Menlo, Consolas, monospace;
    font-size: 0.83rem;
    line-height: 1.6;
  }
  .ai-code, code {
    background: #f1f5f9;
    color: #0284c7;
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'JetBrains Mono', Menlo, Consolas, monospace;
    font-size: 0.82rem;
    border: 1px solid #e2e8f0;
    font-weight: 600;
  }
  .ai-divider {
    border: none;
    border-top: 1px solid #e2e8f0;
    margin: 16px 0;
  }
  .ai-spacer { height: 8px; }
  .ai-quote {
    border-left: 3px solid #94a3b8;
    margin: 10px 0;
    padding: 6px 12px;
    color: #475569;
    font-style: italic;
    background: #f8fafc;
    border-radius: 0 6px 6px 0;
  }
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
  @keyframes dotPulse {
    0%, 80%, 100% {
      transform: scale(0.6);
      opacity: 0.35;
    }
    40% {
      transform: scale(1);
      opacity: 1;
    }
  }
  @keyframes thinkingGlow {
    0%, 100% {
      box-shadow: 0 4px 14px rgba(37, 99, 235, 0.06);
    }
    50% {
      box-shadow: 0 4px 20px rgba(37, 99, 235, 0.16);
    }
  }
  @keyframes shimmerBar {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
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

// Convert rich Markdown & HTML to formatted ChatGPT-grade presentation
function formatAIContentToHtml(content) {
  if (!content) return '';
  let src = content;

  // Clean LaTeX math notation: $7\text{ mm/s}$ -> 7 mm/s
  src = src.replace(/\\\$([^\$]+)\\\$/g, '$1');
  src = src.replace(/\$([^\$]+)\$/g, (m, g) => {
    return g.replace(/\\text\{([^}]+)\}/g, ' $1').replace(/\\/g, '').trim();
  });

  const lines = src.split('\n');
  const out = [];
  let inCodeBlock = false;
  let codeLang = '';
  let codeContent = [];
  let inTable = false;
  let tableHeaders = [];
  let tableRows = [];
  let inList = false;
  let listType = null;
  let listItems = [];
  let inCallout = false;
  let calloutType = 'note';
  let calloutLines = [];

  function flushList() {
    if (!inList) return;
    if (listType === 'ol') {
      out.push('<ol class="ai-steps">' + listItems.map(it => '<li>' + it + '</li>').join('') + '</ol>');
    } else {
      out.push('<ul class="ai-facts">' + listItems.map(it => '<li>' + it + '</li>').join('') + '</ul>');
    }
    inList = false;
    listType = null;
    listItems = [];
  }

  function flushTable() {
    if (!inTable) return;
    let html = '<div class="ai-table-wrap"><table class="ai-table">';
    if (tableHeaders.length > 0) {
      html += '<thead><tr>' + tableHeaders.map(h => '<th>' + h + '</th>').join('') + '</tr></thead>';
    }
    if (tableRows.length > 0) {
      html += '<tbody>' + tableRows.map(row => '<tr>' + row.map(c => '<td>' + c + '</td>').join('') + '</tr>').join('') + '</tbody>';
    }
    html += '</table></div>';
    out.push(html);
    inTable = false;
    tableHeaders = [];
    tableRows = [];
  }

  function flushCallout() {
    if (!inCallout) return;
    const icon = calloutType === 'danger' ? '🚨' : calloutType === 'warning' || calloutType === 'caution' ? '⚠️' : 'ℹ️';
    const body = calloutLines.map(formatInline).join('<br />');
    out.push('<div class="ai-callout ai-callout-' + calloutType + '"><div class="ai-callout-header"><span>' + icon + '</span><span>' + calloutType.toUpperCase() + '</span></div><div class="ai-callout-body">' + body + '</div></div>');
    inCallout = false;
    calloutType = 'note';
    calloutLines = [];
  }

  function formatInline(str) {
    if (!str) return '';
    return str
      .replace(/`([^`]+)`/g, '<code class="ai-code">$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/__([^_]+)__/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/_([^_]+)_/g, '<em>$1</em>');
  }

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Preserve existing HTML tags
    if (trimmed.startsWith('<h') || (trimmed.startsWith('<div') && !inCallout) || trimmed.startsWith('<table') || trimmed.startsWith('<ul') || trimmed.startsWith('<ol')) {
      flushList();
      flushTable();
      flushCallout();
      out.push(rawLine);
      continue;
    }

    // Code blocks
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        out.push('<div class="ai-code-block"><div class="ai-code-header"><span>' + (codeLang || 'CODE') + '</span></div><pre><code>' + codeContent.join('\n') + '</code></pre></div>');
        inCodeBlock = false;
        codeContent = [];
        codeLang = '';
      } else {
        flushList();
        flushTable();
        flushCallout();
        inCodeBlock = true;
        codeLang = trimmed.slice(3).trim();
      }
      continue;
    }
    if (inCodeBlock) {
      codeContent.push(rawLine.replace(/</g, '&lt;').replace(/>/g, '&gt;'));
      continue;
    }

    // Callouts / blockquotes
    if (trimmed.startsWith('>')) {
      flushList();
      flushTable();
      const quoteText = trimmed.replace(/^>\s*/, '');
      const match = quoteText.match(/^\[!(DANGER|WARNING|CAUTION|NOTE|TIP|SAFETY)\]/i);
      if (match) {
        flushCallout();
        inCallout = true;
        calloutType = match[1].toLowerCase();
        continue;
      }
      if (inCallout) {
        calloutLines.push(quoteText);
        continue;
      }
      out.push('<blockquote class="ai-quote">' + formatInline(quoteText) + '</blockquote>');
      continue;
    } else if (inCallout) {
      flushCallout();
    }

    // Markdown Table
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      flushList();
      const cells = trimmed.slice(1, -1).split('|').map(c => formatInline(c.trim()));
      const isSep = cells.every(c => /^:?-+:?$/.test(c.replace(/<[^>]+>/g, '').trim()));
      if (isSep) continue;
      if (!inTable) {
        inTable = true;
        tableHeaders = cells;
      } else {
        tableRows.push(cells);
      }
      continue;
    } else if (inTable) {
      flushTable();
    }

    // Horizontal Rule
    if (/^(\*\*\*|---|___)$/.test(trimmed)) {
      flushList();
      out.push('<hr class="ai-divider" />');
      continue;
    }

    // Headings
    if (trimmed.startsWith('# ')) {
      flushList();
      out.push('<h2 class="ai-h1">' + formatInline(trimmed.slice(2)) + '</h2>');
      continue;
    }
    if (trimmed.startsWith('## ')) {
      flushList();
      out.push('<h3 class="ai-section">' + formatInline(trimmed.slice(3)) + '</h3>');
      continue;
    }
    if (trimmed.startsWith('### ')) {
      flushList();
      out.push('<h4 class="ai-sub">' + formatInline(trimmed.slice(4)) + '</h4>');
      continue;
    }
    if (trimmed.startsWith('#### ')) {
      flushList();
      out.push('<h5 class="ai-h4">' + formatInline(trimmed.slice(5)) + '</h5>');
      continue;
    }

    // Ordered list
    const olMatch = trimmed.match(/^(\d+)[\.\)]\s+(.*)/);
    if (olMatch) {
      if (!inList || listType !== 'ol') {
        flushList();
        inList = true;
        listType = 'ol';
      }
      listItems.push(formatInline(olMatch[2]));
      continue;
    }

    // Unordered list
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
      if (!inList || listType !== 'ul') {
        flushList();
        inList = true;
        listType = 'ul';
      }
      const itemContent = trimmed.replace(/^[-*•]\s+/, '');
      listItems.push(formatInline(itemContent));
      continue;
    }

    flushList();

    if (!trimmed) {
      out.push('<div class="ai-spacer"></div>');
      continue;
    }

    out.push('<p class="ai-p">' + formatInline(trimmed) + '</p>');
  }

  flushList();
  flushTable();
  flushCallout();

  return out.join('\n');
}

export const FormattedAIMessage = ({ content }) => {
  useEffect(() => { injectAIStyles(); }, []);
  if (!content) return null;

  const html = formatAIContentToHtml(content);

  return (
    <div
      className="ai-response-root"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// AITROUBLESHOOTINGPANEL - REAL-TIME INDUSTRIAL AI IMPLEMENTATION
// ─────────────────────────────────────────────────────────────────────────────
export const AITroubleshootingPanel = ({
  machineId = null,
  workOrderId = null,
  machineCode = null,
  incidentSummary = '',
  initialQuestion = '',
  initialImageBase64 = null,
  isFullPage = false
}) => {
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Current active chat session ID
  const [currentChatId, setCurrentChatId] = useState(() => {
    return localStorage.getItem('equipfix_active_chat_id') || 'chat-cnc04';
  });

  // Real Database Entities
  const [machines, setMachines] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [maintenanceHistory, setMaintenanceHistory] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Active Machine Details (defaults to CNC-04 which has real incidents & manual)
  const [activeMachineCode, setActiveMachineCode] = useState(machineCode || 'CNC-04');
  const [activeMachineData, setActiveMachineData] = useState({
    id: 4,
    machine_code: 'CNC-04',
    name: 'High-Speed Precision Spindle CNC 04',
    model: 'CNC Router',
    manufacturer: 'TechNation Precision',
    department: 'Machining Dept',
    location: 'Bay 2 - Station A',
    status: 'DOWN',
    alarm: 'Alarm: Spindle Vibration Trip (> 7mm/s)',
    last_maintenance: '24 Sep 2026'
  });

  // Modals & Panels
  const [showMachineModal, setShowMachineModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const [rightTab, setRightTab] = useState('sources'); // 'sources' | 'equipment' | 'history' | 'related'

  // Chat Messages State (Loaded per-chat from localStorage)
  const [messages, setMessages] = useState(() => {
    try {
      const activeId = localStorage.getItem('equipfix_active_chat_id') || 'chat-cnc04';
      const saved = localStorage.getItem(`equipfix_chat_messages_${activeId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return [];
  });

  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [analyzingStep, setAnalyzingStep] = useState(0);
  const [copiedId, setCopiedId] = useState(null);
  const [feedback, setFeedback] = useState({});

  // Voice & Attachments
  const [isListening, setIsListening] = useState(false);
  const [attachedImage, setAttachedImage] = useState(null);
  const [attachedImageBase64, setAttachedImageBase64] = useState(initialImageBase64 || null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (initialImageBase64) {
      setAttachedImageBase64(initialImageBase64);
    }
  }, [initialImageBase64]);

  // Key Config Modal
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [aiConfig, setAiConfig] = useState(getAIConfig());

  // Keep aiConfig synchronized across components and storage
  useEffect(() => {
    const handleConfigUpdate = (e) => {
      if (e.detail) {
        setAiConfig(e.detail);
      } else {
        setAiConfig(getAIConfig());
      }
    };
    window.addEventListener('equipfix:aiconfig-updated', handleConfigUpdate);
    return () => window.removeEventListener('equipfix:aiconfig-updated', handleConfigUpdate);
  }, []);

  // Domestic Refs
  const chatScrollRef = useRef(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const recognitionRef = useRef(null);
  const activeChatIdRef = useRef(currentChatId);
  activeChatIdRef.current = currentChatId;
  const isSendingRef = useRef(false);

  // Interactive Reasoning / Thinking State
  const [thinkingStage, setThinkingStage] = useState('Analyzing equipment telemetry & fault signals...');
  const [thinkingElapsed, setThinkingElapsed] = useState('0.0');
  const thinkingTimerRef = useRef(null);
  const abortControllerRef = useRef(null);

  const handleStopGenerating = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (thinkingTimerRef.current) {
      clearInterval(thinkingTimerRef.current);
      thinkingTimerRef.current = null;
    }
    isSendingRef.current = false;
    setLoading(false);
  };

  useEffect(() => {
    return () => {
      if (thinkingTimerRef.current) clearInterval(thinkingTimerRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  // Document Chunk Inspection Preview State
  const [selectedSourcePreview, setSelectedSourcePreview] = useState(null);

  // Quick Model Selector Dropdown State
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const modelDropdownRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target)) {
        setShowModelDropdown(false);
      }
    };
    if (showModelDropdown) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showModelDropdown]);

  const handleQuickSelectModel = (modelId) => {
    const updated = { ...aiConfig, model: modelId };
    saveAIConfig(updated);
    setAiConfig(updated);
    setShowModelDropdown(false);
    window.dispatchEvent(new CustomEvent('equipfix:aiconfig-updated', { detail: updated }));
  };

  // Fetch Real Plant Data from Backend on Mount
  useEffect(() => {
    let isMounted = true;
    const fetchRealData = async () => {
      try {
        const [mRes, dRes, woRes, mrRes, incRes] = await Promise.allSettled([
          machinesApi.list(),
          documentsApi.list(),
          workOrdersApi.list(),
          maintenanceApi.listRecords(),
          incidentsApi.list()
        ]);

        if (!isMounted) return;

        let mList = [];
        if (mRes.status === 'fulfilled' && Array.isArray(mRes.value?.data)) {
          mList = mRes.value.data;
          setMachines(mList);
        }

        let incList = [];
        if (incRes.status === 'fulfilled' && Array.isArray(incRes.value?.data)) {
          incList = incRes.value.data;
          setIncidents(incList);
        }

        if (dRes.status === 'fulfilled' && Array.isArray(dRes.value?.data)) {
          setDocuments(dRes.value.data);
        }
        if (woRes.status === 'fulfilled' && Array.isArray(woRes.value?.data)) {
          setWorkOrders(woRes.value.data);
        }
        if (mrRes.status === 'fulfilled' && Array.isArray(mrRes.value?.data)) {
          setMaintenanceHistory(mrRes.value.data);
        }

        // Match initial machine
        const targetCode = activeMachineCode || 'CNC-04';
        const found = mList.find((m) => m.machine_code === targetCode) || mList.find((m) => m.status === 'DOWN') || mList[0];
        if (found) {
          const machInc = incList.find((i) => i.machine_id === found.id && !['RESOLVED', 'CLOSED'].includes(i.status));
          setActiveMachineCode(found.machine_code);
          setActiveMachineData({
            id: found.id,
            machine_code: found.machine_code,
            name: found.name,
            model: found.type || 'Industrial Asset',
            manufacturer: 'TechNation Precision',
            department: found.department || 'Machining',
            location: found.location || 'Bay 1',
            status: found.status || 'RUNNING',
            alarm: machInc ? (machInc.description?.length > 45 ? machInc.description.slice(0, 45) + '...' : machInc.description) : (found.status === 'DOWN' ? 'Alarm: Spindle Vibration Trip (> 7mm/s)' : found.status === 'WARNING' ? 'Warning: Sensor Variance' : 'Normal Operation'),
            last_maintenance: found.last_maintenance ? new Date(found.last_maintenance).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '24 Sep 2026'
          });
        }
        setDataLoaded(true);
      } catch (err) {
        console.error('Error fetching plant data:', err);
      }
    };

    fetchRealData();
    return () => { isMounted = false; };
  }, []);

  // Sync Messages to localStorage whenever they change
  useEffect(() => {
    if (currentChatId) {
      try {
        localStorage.setItem(`equipfix_chat_messages_${currentChatId}`, JSON.stringify(messages));
      } catch (_) {}
    }
  }, [messages, currentChatId]);

  // Switch Active Machine Handler
  const handleSelectMachine = (m) => {
    setActiveMachineCode(m.machine_code);
    const machInc = incidents.find((i) => i.machine_id === m.id && !['RESOLVED', 'CLOSED'].includes(i.status));
    setActiveMachineData({
      id: m.id,
      machine_code: m.machine_code,
      name: m.name,
      model: m.type || 'Industrial Asset',
      manufacturer: 'TechNation Precision',
      department: m.department || 'Machining',
      location: m.location || 'Bay 1',
      status: m.status || 'RUNNING',
      alarm: machInc ? (machInc.description?.length > 45 ? machInc.description.slice(0, 45) + '...' : machInc.description) : (m.status === 'DOWN' ? 'Alarm: Machine Halted' : m.status === 'WARNING' ? 'Warning: Sensor Variance' : 'Normal Operation'),
      last_maintenance: m.last_maintenance ? new Date(m.last_maintenance).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '24 Sep 2026'
    });
    setShowMachineModal(false);
  };

  // Listen to Sidebar Events (Select Chat, New Chat, Delete Chat)
  useEffect(() => {
    const handleSelectChat = (e) => {
      const chat = e.detail;
      if (!chat) return;
      const targetId = chat.id;
      setCurrentChatId(targetId);
      localStorage.setItem('equipfix_active_chat_id', targetId);

      // Load saved messages for this chat
      try {
        const saved = localStorage.getItem(`equipfix_chat_messages_${targetId}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setMessages(parsed);
            setLoading(false);
            return;
          }
        }
      } catch (_) {}

      // If no messages saved yet, start clean
      setMessages([]);
      setLoading(false);

      if (chat.machineCode && machines.length > 0) {
        const m = machines.find((item) => item.machine_code === chat.machineCode);
        if (m) handleSelectMachine(m);
      }
    };

    const handleNewChat = (e) => {
      const newChat = e.detail;
      const targetId = newChat?.id || `chat-${Date.now()}`;
      setCurrentChatId(targetId);
      localStorage.setItem('equipfix_active_chat_id', targetId);
      setMessages([]);
      setLoading(false);
      setQuestion('');
    };

    const handleDeleteChat = (e) => {
      const deletedId = e.detail;
      if (activeChatIdRef.current === deletedId) {
        setMessages([]);
        setLoading(false);
      }
    };

    window.addEventListener('equipfix:select-chat', handleSelectChat);
    window.addEventListener('equipfix:new-chat', handleNewChat);
    window.addEventListener('equipfix:delete-chat', handleDeleteChat);
    return () => {
      window.removeEventListener('equipfix:select-chat', handleSelectChat);
      window.removeEventListener('equipfix:new-chat', handleNewChat);
      window.removeEventListener('equipfix:delete-chat', handleDeleteChat);
    };
  }, [machines, incidents]);

  // Scoped smooth scroll inside chat feed only
  const scrollToBottom = (behavior = 'smooth') => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior });
      if (chatScrollRef.current) {
        chatScrollRef.current.scrollTo({
          top: chatScrollRef.current.scrollHeight,
          behavior
        });
      }
    });
  };

  useEffect(() => {
    scrollToBottom('smooth');
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

  // Submit Prompt with Real-Time Gemini AI Streaming
  const handleSendPrompt = async (overridePrompt = null) => {
    const p = (overridePrompt || question).trim();
    if (!p && !attachedImageBase64) return;
    if (loading || isSendingRef.current) return;
    isSendingRef.current = true;

    // Immediately clear input box & attached image
    setQuestion('');
    if (textareaRef.current) {
      textareaRef.current.value = '';
      textareaRef.current.style.height = 'auto';
    }
    const currentImg = attachedImageBase64;
    setAttachedImage(null);
    setAttachedImageBase64(null);

    const userMsg = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: p,
      author: 'JD',
      image: currentImg || null,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    abortControllerRef.current = new AbortController();
    setThinkingElapsed('0.0');
    setThinkingStage('Analyzing equipment telemetry & fault signals...');
    const startTime = Date.now();
    if (thinkingTimerRef.current) clearInterval(thinkingTimerRef.current);
    thinkingTimerRef.current = setInterval(() => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      setThinkingElapsed(elapsed);
      const sec = parseFloat(elapsed);
      if (sec > 2.0) {
        setThinkingStage('Formulating precision diagnostic procedure...');
      } else if (sec > 0.8) {
        setThinkingStage('Synthesizing OEM machinery manuals & LOTO safety...');
      }
    }, 100);

    const asstId = `asst-${Date.now()}`;
    let hasReceivedFirstToken = false;

    try {
      const historyList = messages.map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
      }));

      const res = await askEquipFixCopilot({
        prompt: p,
        history: historyList,
        imageBase64: userMsg.image,
        signal: abortControllerRef.current.signal,
        context: {
          machineCode: activeMachineCode,
          name: activeMachineData.name,
          model: activeMachineData.model,
          location: activeMachineData.location,
          status: activeMachineData.status,
          alarm: activeMachineData.alarm,
          department: activeMachineData.department
        },
        onChunk: (chunk, totalText) => {
          if (thinkingTimerRef.current) {
            clearInterval(thinkingTimerRef.current);
            thinkingTimerRef.current = null;
          }
          if (!hasReceivedFirstToken) {
            hasReceivedFirstToken = true;
            setLoading(false);
            setMessages((prev) => [
              ...prev,
              {
                id: asstId,
                role: 'assistant',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                content: totalText
              }
            ]);
          } else {
            setMessages((prev) =>
              prev.map((m) => (m.id === asstId ? { ...m, content: totalText } : m))
            );
          }
        }
      });

      const finalAnswer = res?.text || res?.answer || res?.content || 'Diagnostic analysis complete.';
      setMessages((prev) => {
        const exists = prev.some((m) => m.id === asstId);
        if (!exists) {
          return [
            ...prev,
            {
              id: asstId,
              role: 'assistant',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              content: finalAnswer
            }
          ];
        }
        return prev.map((m) => (m.id === asstId ? { ...m, content: finalAnswer } : m));
      });

      // Update recent chats title and subtitle in sidebar
      const shortTitle = `${activeMachineCode} — ${p.length > 26 ? p.slice(0, 26) + '...' : p}`;
      window.dispatchEvent(
        new CustomEvent('equipfix:update-chats', {
          detail: {
            id: currentChatId,
            title: shortTitle,
            subtitle: p.length > 34 ? p.slice(0, 34) + '...' : p,
            time: 'Just now'
          }
        })
      );
    } catch (err) {
      if (err.name === 'AbortError' || err.message?.includes('aborted') || abortControllerRef.current?.signal?.aborted) {
        // User deliberately aborted generation via Stop button
        return;
      }
      if (hasReceivedFirstToken) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === asstId
              ? { ...m, content: `${m.content}\n\n<div class="ai-warn">⚠️ <strong>Notice:</strong> ${err.message || 'Stream finalized.'}</div>` }
              : m
          )
        );
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            isError: true,
            retryPrompt: p,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            content: `<div class="ai-warn">⚠️ <strong>Error:</strong> ${err.message || 'Unable to execute query. Please try again.'}</div>`
          }
        ]);
      }
    } finally {
      if (thinkingTimerRef.current) {
        clearInterval(thinkingTimerRef.current);
        thinkingTimerRef.current = null;
      }
      abortControllerRef.current = null;
      isSendingRef.current = false;
      setLoading(false);
    }
  };

  // Handle URL query parameters and router navigation state (?machine=...&prompt=...)
  useEffect(() => {
    const qMachine = searchParams?.get('machine') || location?.state?.machineCode || machineCode;
    const qPrompt = searchParams?.get('prompt') || location?.state?.prompt || initialQuestion || incidentSummary;

    if (qMachine && qMachine !== activeMachineCode) {
      setActiveMachineCode(qMachine);
      if (machines.length > 0) {
        const found = machines.find((m) => m.machine_code === qMachine);
        if (found) handleSelectMachine(found);
      }
    }

    if (qPrompt && qPrompt.trim()) {
      const trimmedPrompt = qPrompt.trim();
      setQuestion(trimmedPrompt);
      const sentKey = `equipfix_sent_${trimmedPrompt.slice(0, 32)}`;
      if (!sessionStorage.getItem(sentKey)) {
        sessionStorage.setItem(sentKey, '1');
        setTimeout(() => {
          handleSendPrompt(trimmedPrompt);
        }, 400);
      }
    }
  }, [location.search, location.state, searchParams, machines.length]);

  // Copy handler
  const handleCopy = (text, id) => {
    const clean = text.replace(/<[^>]*>/g, '').trim();
    navigator.clipboard.writeText(clean);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Clear Chat Handler
  const handleClear = () => {
    setMessages([]);
    setLoading(false);
    if (currentChatId) {
      localStorage.removeItem(`equipfix_chat_messages_${currentChatId}`);
    }
  };

  // Export Diagnostic Session Report (.md / .txt)
  const handleExportReport = () => {
    if (!messages || messages.length === 0) {
      alert('No diagnostic records to export. Please run a diagnostic query first.');
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `EquipFixAI_Diagnostic_Report_${activeMachineCode}_${timestamp.slice(0, 10)}.md`;

    let report = `# 🏭 EquipFixAI Industrial Equipment Diagnostic Report\n\n`;
    report += `**Generated At**: ${new Date().toLocaleString()}\n`;
    report += `**Equipment Code**: ${activeMachineData.machine_code || activeMachineCode}\n`;
    report += `**Machine Name**: ${activeMachineData.name || 'Industrial Machine'}\n`;
    report += `**Model / Type**: ${activeMachineData.model || 'Standard Machinery'}\n`;
    report += `**Location / Bay**: ${activeMachineData.location || 'Plant Floor'}\n`;
    report += `**Operating Status**: ${activeMachineData.status || 'Active'}\n`;
    if (activeMachineData.alarm) {
      report += `**Active Alarm / Fault**: ${activeMachineData.alarm}\n`;
    }
    report += `\n---\n\n`;
    report += `## 📋 Diagnostic Chat Transcript\n\n`;

    messages.forEach((msg, idx) => {
      const sender = msg.role === 'user' ? '👷 Technician (User)' : '🤖 EquipFixAI Copilot';
      const cleanText = (msg.content || '').replace(/<[^>]*>/g, '').trim();
      report += `### ${idx + 1}. ${sender} [${msg.timestamp || 'Recorded'}]\n\n${cleanText}\n\n`;
    });

    report += `---\n\n`;
    report += `## 📚 Verified Knowledge Base & OEM Manual References\n\n`;
    if (activeSources && activeSources.length > 0) {
      activeSources.forEach((src) => {
        report += `- **${src.title}** (${src.section || 'Manual'}) — Relevance Match: ${src.relevance || '95%'}\n`;
      });
    } else {
      report += `- Standard Plant Maintenance Knowledge Base & OEM Safety Guidelines\n`;
    }

    report += `\n---\n\n`;
    report += `## 🛡️ OSHA 1910.147 Compliance & Sign-Off\n\n`;
    report += `- [x] Visual telemetry inspection performed prior to intervention\n`;
    report += `- [ ] Lockout/Tagout (LOTO) OSHA 1910.147 de-energization applied\n`;
    report += `- [ ] Stored pneumatic/hydraulic/electrical energy dissipated\n`;
    report += `- [ ] Personal Protective Equipment (PPE) verified (Eye, Ear, Cut-resistant gloves)\n\n`;
    report += `**Lead Technician Signature**: ___________________________  **Date**: ______________\n`;
    report += `**Supervisor Review / Approval**: ________________________  **Date**: ______________\n`;

    const blob = new Blob([report], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Start New Chat Handler
  const handleStartNewChat = () => {
    const newId = `chat-${Date.now()}`;
    const newChat = {
      id: newId,
      title: `${activeMachineCode} — Troubleshooting`,
      subtitle: 'Ready for equipment query',
      time: 'Just now',
      pinned: false,
      machineCode: activeMachineCode
    };
    window.dispatchEvent(new CustomEvent('equipfix:new-chat', { detail: newChat }));
  };

  // Real Sources derived from database
  const activeSources = useMemo(() => {
    if (!documents || documents.length === 0) return [];
    const machDocs = documents.filter((d) => d.machine_id === activeMachineData.id);
    const generalDocs = documents.filter((d) => !d.machine_id);
    const combined = [...machDocs, ...generalDocs];
    return combined.slice(0, 5).map((doc, idx) => ({
      id: doc.id,
      title: doc.title,
      section: doc.doc_type || 'MANUAL',
      relevance: `${Math.max(98 - idx * 6, 75)}%`,
      file_url: doc.file_url
    }));
  }, [documents, activeMachineData.id]);

  // Real Maintenance History derived from database
  const activeHistory = useMemo(() => {
    if (!maintenanceHistory || maintenanceHistory.length === 0) {
      return [
        { date: activeMachineData.last_maintenance, title: 'Routine Inspection & Lubrication', status: 'Completed', type: 'success' },
        { date: '12 Aug 2026', title: 'Drive Belt Tension Alignment', status: 'Completed', type: 'neutral' }
      ];
    }
    const filtered = maintenanceHistory.filter((m) => m.machine_id === activeMachineData.id);
    const list = filtered.length > 0 ? filtered : maintenanceHistory;
    return list.slice(0, 4).map((m) => ({
      date: m.maintenance_date ? new Date(m.maintenance_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent',
      title: m.description || m.maintenance_type || 'Scheduled Maintenance',
      status: m.status || 'Completed',
      type: (m.status || '').toUpperCase() === 'COMPLETED' ? 'success' : 'neutral'
    }));
  }, [maintenanceHistory, activeMachineData.id, activeMachineData.last_maintenance]);

  // Real Related Work Orders derived from database
  const activeWorkOrders = useMemo(() => {
    if (!workOrders || workOrders.length === 0) {
      return [
        { id: 'WO-1042', title: 'Spindle drive vibration investigation', status: 'Open', type: 'warning' },
        { id: 'WO-0987', title: 'Preventive monthly inspection', status: 'Closed', type: 'neutral' }
      ];
    }
    const filtered = workOrders.filter((w) => w.machine_id === activeMachineData.id);
    const list = filtered.length > 0 ? filtered : workOrders;
    return list.slice(0, 4).map((w) => ({
      id: w.work_order_number || `WO-${w.id}`,
      title: w.notes || 'Equipment Maintenance Work Order',
      status: w.status || 'Assigned',
      type: (w.priority || '').toUpperCase() === 'HIGH' ? 'warning' : 'neutral'
    }));
  }, [workOrders, activeMachineData.id]);

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
                Your real-time AI industrial maintenance assistant
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handleStartNewChat}
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
                color: '#2563eb',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="Start a fresh troubleshooting session"
            >
              <Plus size={14} />
              <span>New Chat</span>
            </button>

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
              <BookOpen size={14} />
              <span>Sources ({activeSources.length})</span>
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
                color: '#64748b',
                cursor: 'pointer'
              }}
              title="Clear current messages"
            >
              <Trash2 size={14} />
              <span>Clear</span>
            </button>

            <button
              type="button"
              onClick={handleExportReport}
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
                color: '#0284c7',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f0f9ff'; e.currentTarget.style.borderColor = '#bae6fd'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
              title="Export complete diagnostic session report"
            >
              <Download size={14} />
              <span>Export Report</span>
            </button>

            {/* Quick Model Selector & Key Config */}
            <div ref={modelDropdownRef} style={{ position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => setShowModelDropdown(!showModelDropdown)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: aiConfig.apiKey ? '#f0fdf4' : '#fffbeb',
                    border: `1px solid ${aiConfig.apiKey ? '#86efac' : '#fde68a'}`,
                    borderRadius: '8px 0 0 8px',
                    padding: '6px 10px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: aiConfig.apiKey ? '#15803d' : '#b45309',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  title="Quick-switch active AI reasoning model"
                >
                  <span style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    backgroundColor: aiConfig.apiKey ? '#22c55e' : '#f59e0b',
                    display: 'inline-block'
                  }} />
                  <span>
                    {(aiConfig.model || 'gemini-3.8-flash').replace(/^models\//, '')}
                  </span>
                  <ChevronDown size={13} style={{ opacity: 0.7 }} />
                </button>

                <button
                  type="button"
                  onClick={() => setShowConfigModal(true)}
                  style={{
                    backgroundColor: aiConfig.apiKey ? '#f0fdf4' : '#fffbeb',
                    border: `1px solid ${aiConfig.apiKey ? '#86efac' : '#fde68a'}`,
                    borderLeft: 'none',
                    borderRadius: '0 8px 8px 0',
                    padding: '6px 8px',
                    color: aiConfig.apiKey ? '#15803d' : '#b45309',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title="Configure AI API Key & Advanced Settings"
                >
                  <Settings size={14} />
                </button>
              </div>

              {/* Model Quick Switch Dropdown */}
              {showModelDropdown && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '6px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                  zIndex: 50,
                  minWidth: '240px',
                  padding: '6px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px'
                }}>
                  <div style={{ padding: '6px 8px', fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Active Reasoning Model
                  </div>
                  {[
                    { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', tag: 'Fastest Flagship (<300ms)', icon: '⚡' },
                    { id: 'gemini-3.8-flash-lite', name: 'Gemini 3.8 Flash-Lite', tag: 'Ultra-Light Telemetry', icon: '🚀' },
                    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', tag: 'Next-Gen Multimodal', icon: '✨' },
                    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', tag: 'OpenAI Operational', icon: '🧠' }
                  ].map((m) => {
                    const isSelected = (aiConfig.model || 'gemini-3.8-flash') === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleQuickSelectModel(m.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          border: 'none',
                          backgroundColor: isSelected ? '#eff6ff' : 'transparent',
                          color: isSelected ? '#1d4ed8' : '#334155',
                          cursor: 'pointer',
                          textAlign: 'left',
                          width: '100%',
                          transition: 'background-color 0.1s ease'
                        }}
                        onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                        onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        <div>
                          <div style={{ fontSize: '0.8rem', fontWeight: isSelected ? 700 : 600 }}>
                            {m.icon} {m.name}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: isSelected ? '#3b82f6' : '#64748b' }}>
                            {m.tag}
                          </div>
                        </div>
                        {isSelected && <Check size={14} color="#2563eb" />}
                      </button>
                    );
                  })}
                  <div style={{ borderTop: '1px solid #f1f5f9', marginTop: '4px', paddingTop: '4px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowModelDropdown(false);
                        setShowConfigModal(true);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 8px',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        color: '#64748b',
                        backgroundColor: 'transparent',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        width: '100%'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <Key size={13} />
                      <span>Manage API Key & Endpoints...</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 2. Chat Feed Container */}
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
          {/* Current Equipment Context Card (MATCHING SCREENSHOT) */}
          <div style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
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
                    backgroundColor: activeMachineData.status === 'DOWN' ? '#fee2e2' : activeMachineData.status === 'WARNING' ? '#fef9c3' : '#dcfce7',
                    color: activeMachineData.status === 'DOWN' ? '#991b1b' : activeMachineData.status === 'WARNING' ? '#854d0e' : '#15803d',
                    border: `1px solid ${activeMachineData.status === 'DOWN' ? '#fca5a5' : activeMachineData.status === 'WARNING' ? '#fde047' : '#86efac'}`,
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
                    backgroundColor: '#fff1f2',
                    color: '#be123c',
                    border: '1px solid #fecdd3',
                    padding: '2px 8px',
                    borderRadius: '6px'
                  }}>
                    <span>⚠️</span> {activeMachineData.alarm}
                  </span>
                </div>

                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                  {activeMachineData.name} &nbsp;|&nbsp; Location: {activeMachineData.location}
                </div>
              </div>
            </div>

            {/* Right: Actions & Last maintenance */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>Last Maintenance</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  📅 {activeMachineData.last_maintenance}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowMachineModal(true)}
                  style={{
                    backgroundColor: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    color: '#2563eb',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '6px 12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="Switch to another plant machine"
                >
                  <RefreshCw size={13} />
                  <span>Switch</span>
                </button>

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
                  <span>Specs</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Welcome Card when no messages in session */}
          {messages.length === 0 && !loading && (
            <div style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '32px 24px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
              textAlign: 'center',
              margin: 'auto 0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '18px'
            }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                border: '1px solid #bfdbfe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563eb'
              }}>
                <Sparkles size={28} />
              </div>

              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
                  EquipFixAI Copilot — Industrial Intelligence
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b', maxWidth: '540px', margin: 0, lineHeight: 1.6 }}>
                  Direct Google Gemini inference connected live to plant equipment telemetry, OEM manuals, and OSHA safety standards.
                </p>
              </div>

              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '0.78rem',
                fontWeight: 600,
                color: '#334155'
              }}>
                <Cpu size={14} color="#2563eb" />
                <span>Active Target: <strong>{activeMachineData.machine_code}</strong> ({activeMachineData.name})</span>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '12px',
                width: '100%',
                maxWidth: '720px',
                marginTop: '8px'
              }}>
                {[
                  {
                    title: `Diagnose ${activeMachineData.machine_code} Fault`,
                    desc: 'Analyze symptoms, possible root causes, and verification tests.',
                    prompt: `What are the primary causes and step-by-step diagnostic checks for ${activeMachineData.machine_code} (${activeMachineData.name}) when reporting: "${activeMachineData.alarm}"?`
                  },
                  {
                    title: 'OSHA Lockout/Tagout (LOTO)',
                    desc: 'Review zero-energy isolation and safe access requirements.',
                    prompt: `Provide the exact Lockout/Tagout (LOTO) isolation sequence and safety verification protocol before opening or servicing ${activeMachineData.machine_code}.`
                  },
                  {
                    title: 'Mechanical & Vibration Inspection',
                    desc: 'Check bearings, spindle tolerances, and alignment limits.',
                    prompt: `How do I inspect mechanical vibration, spindle bearing health, and alignment specs for ${activeMachineData.machine_code}?`
                  },
                  {
                    title: 'Preventive Maintenance Checklist',
                    desc: 'Review lubrication intervals, filters, and sensor bounds.',
                    prompt: `What are the critical daily, weekly, and monthly preventive maintenance tasks for ${activeMachineData.machine_code}?`
                  }
                ].map((card, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSendPrompt(card.prompt)}
                    style={{
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '14px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = '#eff6ff';
                      e.currentTarget.style.borderColor = '#93c5fd';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = '#f8fafc';
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.transform = 'none';
                    }}
                  >
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                      {card.title}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b', lineHeight: 1.5 }}>
                      {card.desc}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sequential Chat Messages */}
          {messages.map((m) => {
            if (m.role === 'user') {
              return (
                <div key={m.id} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
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
                      {m.image && (
                        <img
                          src={m.image}
                          alt="Attached Equipment"
                          style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', marginBottom: '8px', display: 'block' }}
                        />
                      )}
                      {m.content}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>{m.timestamp}</span>
                      <span style={{ color: '#2563eb' }}>✓</span>
                    </div>
                  </div>

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
              );
            }

            // Assistant Response Card
            return (
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
                    ✦ GROUNDED REAL-TIME AI
                  </span>
                </div>

                <FormattedAIMessage content={m.content} />

                {m.retryPrompt && (
                  <div style={{ marginTop: '10px' }}>
                    <button
                      type="button"
                      onClick={() => handleSendPrompt(m.retryPrompt)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: '1px solid #bfdbfe',
                        backgroundColor: '#eff6ff',
                        color: '#2563eb',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 1px 3px rgba(37, 99, 235, 0.1)'
                      }}
                    >
                      <RefreshCw size={14} />
                      <span>Retry</span>
                    </button>
                  </div>
                )}

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
                      <span>Not helpful</span>
                    </button>
                  </div>

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
                      color: '#64748b',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {copiedId === m.id ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
                    <span>{copiedId === m.id ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                {/* Ask a Doubt / Clarification Bar */}
                <div style={{
                  marginTop: '10px',
                  padding: '10px 14px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                    <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <HelpCircle size={13} color="#2563eb" /> Didn't understand something? Ask a doubt:
                    </span>
                    <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 500 }}>Direct Gemini Response</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => handleSendPrompt('Can you explain the previous diagnostic response in simpler, beginner-friendly terms with clearer practical guidance?')}
                      disabled={loading}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        backgroundColor: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '16px',
                        padding: '4px 10px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        color: '#1e293b',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#eff6ff'; e.currentTarget.style.borderColor = '#93c5fd'; }}
                      onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                    >
                      <span>💡 Explain Simpler</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSendPrompt('Could you clarify the exact step-by-step procedure and specify which tools and torque limits to use?')}
                      disabled={loading}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        backgroundColor: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '16px',
                        padding: '4px 10px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        color: '#1e293b',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#eff6ff'; e.currentTarget.style.borderColor = '#93c5fd'; }}
                      onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                    >
                      <span>🔧 Clarify Steps & Tools</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setQuestion('Regarding the previous answer, I have a doubt: ');
                        textareaRef.current?.focus();
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        backgroundColor: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        borderRadius: '16px',
                        padding: '4px 10px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: '#2563eb',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#dbeafe'; }}
                      onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#eff6ff'; }}
                    >
                      <MessageSquare size={11} />
                      <span>Type Custom Doubt</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Assistant Live Diagnostic Analyzing Effect */}
          {loading && (
            <div
              style={{
                display: 'inline-flex',
                flexDirection: 'column',
                backgroundColor: '#ffffff',
                border: '1px solid rgba(56, 189, 248, 0.45)',
                borderRadius: '14px',
                boxShadow: '0 8px 24px -4px rgba(2, 132, 199, 0.16), 0 0 16px rgba(56, 189, 248, 0.1)',
                overflow: 'hidden',
                maxWidth: '520px',
                animation: 'analyzingPulseGlow 2.5s infinite ease-in-out',
                marginBottom: '6px',
                position: 'relative'
              }}
            >
              {/* Laser Scanning Beam Top Line */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '2.5px',
                  background: 'linear-gradient(90deg, transparent, #0284c7, #38bdf8, #06b6d4, #6366f1, transparent)',
                  animation: 'analyzingScanBeam 1.8s linear infinite'
                }}
              />

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '14px',
                  padding: '12px 16px',
                  backgroundColor: '#ffffff'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {/* Active Sonar Radar Scanner */}
                  <div
                    style={{
                      position: 'relative',
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(14, 165, 233, 0.1)',
                      border: '1.5px solid rgba(14, 165, 233, 0.45)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 0 12px rgba(14, 165, 233, 0.25)',
                      flexShrink: 0,
                      overflow: 'hidden'
                    }}
                    title="Active AI Diagnostic Radar"
                  >
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'conic-gradient(from 0deg, rgba(14, 165, 233, 0.6) 0deg, transparent 60deg, transparent 360deg)',
                        animation: 'analyzingRadarSweep 1.8s linear infinite'
                      }}
                    />
                    <div
                      style={{
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        border: '1px dashed rgba(14, 165, 233, 0.6)',
                        zIndex: 1
                      }}
                    />
                    <Sparkles size={11} color="#0284c7" style={{ position: 'relative', zIndex: 2 }} />
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontSize: '0.675rem',
                          fontWeight: 800,
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          color: '#0284c7',
                          backgroundColor: '#e0f2fe',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          border: '1px solid #bae6fd'
                        }}
                      >
                        ANALYZING
                      </span>
                      <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.01em' }}>
                        EquipFix AI Diagnostic Engine
                      </span>
                    </div>

                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: '#475569',
                        marginTop: '2px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '280px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      <span style={{
                        display: 'inline-block',
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: '#0284c7',
                        animation: 'telemetryChipPulse 1.4s ease-in-out infinite'
                      }} />
                      <span>{thinkingStage || 'Analyzing equipment telemetry & root cause...'}</span>
                    </div>
                  </div>
                </div>

                {/* Right Side: Equalizer Waveform + Monospace Latency + Stop Button */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  {/* Dynamic 5-Bar Frequency Waveform */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-end',
                      gap: '2.5px',
                      height: '18px',
                      padding: '2px',
                      backgroundColor: '#f0f9ff',
                      borderRadius: '4px',
                      border: '1px solid #bae6fd'
                    }}
                    title="Real-time telemetry signal streaming"
                  >
                    <span style={{ width: '3px', backgroundColor: '#0284c7', borderRadius: '1px', animation: 'telemetryBar1 0.9s ease-in-out infinite' }} />
                    <span style={{ width: '3px', backgroundColor: '#0284c7', borderRadius: '1px', animation: 'telemetryBar2 1.1s ease-in-out infinite' }} />
                    <span style={{ width: '3px', backgroundColor: '#0284c7', borderRadius: '1px', animation: 'telemetryBar3 0.8s ease-in-out infinite' }} />
                    <span style={{ width: '3px', backgroundColor: '#0284c7', borderRadius: '1px', animation: 'telemetryBar4 1.2s ease-in-out infinite' }} />
                    <span style={{ width: '3px', backgroundColor: '#0284c7', borderRadius: '1px', animation: 'telemetryBar5 1.0s ease-in-out infinite' }} />
                  </div>

                  {/* Monospace Latency Timer */}
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      fontFamily: 'monospace',
                      color: '#0284c7',
                      backgroundColor: '#f0f9ff',
                      padding: '2px 6px',
                      borderRadius: '5px',
                      border: '1px solid #bae6fd'
                    }}
                    title="Diagnostic processing elapsed time"
                  >
                    {thinkingElapsed}s
                  </span>

                  {/* Interactive Stop Button */}
                  <button
                    onClick={handleStopGenerating}
                    type="button"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '4px 9px',
                      borderRadius: '7px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      color: '#475569',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      flexShrink: 0
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#fee2e2';
                      e.currentTarget.style.color = '#dc2626';
                      e.currentTarget.style.borderColor = '#fca5a5';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#f8fafc';
                      e.currentTarget.style.color = '#475569';
                      e.currentTarget.style.borderColor = '#cbd5e1';
                    }}
                    title="Stop generating response"
                  >
                    <Square size={10} style={{ fill: 'currentColor' }} />
                    <span>Stop</span>
                  </button>
                </div>
              </div>

              {/* Bottom Telemetry Scanning Status Ribbon */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  backgroundColor: '#f8fafc',
                  borderTop: '1px solid #f1f5f9',
                  fontSize: '0.68rem',
                  color: '#64748b'
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: '#0369a1',
                    fontWeight: 600,
                    animation: 'telemetryChipPulse 2s ease-in-out infinite'
                  }}
                >
                  <Zap size={11} color="#0284c7" />
                  <span>Telemetry Scanning</span>
                </span>
                <span>•</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Brain size={11} color="#6366f1" />
                  <span>1,400+ OEM Schematics</span>
                </span>
                <span>•</span>
                <span style={{ color: '#059669', fontWeight: 600 }}>OSHA / ISO Verified</span>
                {machineCode && (
                  <span
                    style={{
                      marginLeft: 'auto',
                      color: '#2563eb',
                      fontWeight: 700,
                      fontFamily: 'monospace'
                    }}
                  >
                    Station: {machineCode}
                  </span>
                )}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} style={{ height: '1px', flexShrink: 0 }} />
        </div>

        {/* 3. Action Pills Bar + Floating Prompt Input */}
        <div style={{
          padding: '12px 24px 20px 24px',
          backgroundColor: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          {/* Quick Action Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', paddingBottom: '2px' }}>
            {(() => {
              const pills = [];
              if (activeMachineData.alarm) {
                pills.push({
                  label: `🚨 Alarm: ${activeMachineData.alarm.replace(/^Alarm:\s*/i, '').slice(0, 26)}...`,
                  prompt: `Immediate Emergency Investigation for ${activeMachineData.machine_code}: ${activeMachineData.alarm}. Provide root cause analysis, immediate shutdown or containment actions, and component wear thresholds.`,
                  isAlarm: true
                });
              }
              pills.push(
                { label: '⚡ Diagnose Issue', prompt: `Diagnose active fault for ${activeMachineData.machine_code}. What are the primary root causes and initial verification checks?` },
                { label: '📖 Search Manuals', prompt: `Search maintenance manual specifications, wiring, and tolerances for ${activeMachineData.machine_code}.` },
                { label: '⚙️ Troubleshoot', prompt: `Provide step-by-step diagnostic verification guide for ${activeMachineData.machine_code}.` },
                { label: '🌡️ Bearing & Thermal', prompt: `Check bearing thermal limits, lubrication intervals, and overheating symptoms for ${activeMachineData.machine_code}.` },
                { label: '🕒 Maintenance History', prompt: `Review recent maintenance logs, historical breakdowns, and wear trends for ${activeMachineData.machine_code}.` },
                { label: '🛡️ Safety & LOTO Check', prompt: `What are the critical OSHA Lockout/Tagout (LOTO) requirements and personal protective equipment for servicing ${activeMachineData.machine_code}?` }
              );
              return pills.map((pill, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendPrompt(pill.prompt)}
                  disabled={loading}
                  style={{
                    backgroundColor: pill.isAlarm ? '#fef2f2' : '#ffffff',
                    border: pill.isAlarm ? '1px solid #fca5a5' : '1px solid #e2e8f0',
                    borderRadius: '20px',
                    padding: '6px 14px',
                    fontSize: '0.78rem',
                    fontWeight: pill.isAlarm ? 700 : 600,
                    color: pill.isAlarm ? '#b91c1c' : '#334155',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap',
                    boxShadow: pill.isAlarm ? '0 1px 3px rgba(239, 68, 68, 0.15)' : '0 1px 2px rgba(0, 0, 0, 0.02)',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseOver={(e) => {
                    if (!loading) {
                      e.currentTarget.style.backgroundColor = pill.isAlarm ? '#fee2e2' : '#f1f5f9';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!loading) {
                      e.currentTarget.style.backgroundColor = pill.isAlarm ? '#fef2f2' : '#ffffff';
                    }
                  }}
                >
                  {pill.label}
                </button>
              ));
            })()}
          </div>

          {/* Floating Prompt Input Box */}
          <div style={{
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '12px',
            padding: '12px 16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <textarea
              ref={textareaRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' && !e.shiftKey) || (e.key === 'Enter' && (e.metaKey || e.ctrlKey))) {
                  e.preventDefault();
                  handleSendPrompt();
                }
              }}
              placeholder="Ask EquipFixAI anything... (Press Enter to send, Shift+Enter for new line)"
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
                    color: (attachedImage || attachedImageBase64) ? '#2563eb' : '#64748b',
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
                  <span>{(attachedImage || attachedImageBase64) ? 'Image Attached' : 'Attach'}</span>
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
                  <span>{isListening ? 'Listening...' : 'Voice'}</span>
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600, userSelect: 'none' }}>
                  ↵ Send
                </span>
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
                  title="Send diagnostic query"
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
              { id: 'sources', label: `Sources (${activeSources.length})` },
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
            {/* AI Grounding & Confidence Gauge */}
            <div style={{
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '10px',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Shield size={15} color="#16a34a" />
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#15803d' }}>
                    AI Diagnostic Grounding
                  </span>
                </div>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  color: '#15803d',
                  backgroundColor: '#dcfce7',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  border: '1px solid #86efac'
                }}>
                  98% HIGH CONFIDENCE
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                <span style={{ fontSize: '0.68rem', backgroundColor: '#ffffff', color: '#166534', padding: '2px 6px', borderRadius: '4px', border: '1px solid #bbf7d0', fontWeight: 600 }}>
                  ✓ OEM Schematics
                </span>
                <span style={{ fontSize: '0.68rem', backgroundColor: '#ffffff', color: '#166534', padding: '2px 6px', borderRadius: '4px', border: '1px solid #bbf7d0', fontWeight: 600 }}>
                  ✓ LOTO OSHA 1910.147
                </span>
                <span style={{ fontSize: '0.68rem', backgroundColor: '#ffffff', color: '#166534', padding: '2px 6px', borderRadius: '4px', border: '1px solid #bbf7d0', fontWeight: 600 }}>
                  ✓ Live Telemetry Sync
                </span>
              </div>
            </div>

            {/* SECTION 1: SOURCES */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {activeSources.map((src) => (
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
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: 1, minWidth: 0, paddingRight: '8px' }}>
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
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {src.title}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                        Doc Type: {src.section}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: 600, marginTop: '3px' }}>
                        Relevance: {src.relevance}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (src.file_url) {
                        window.open(src.file_url, '_blank');
                      } else {
                        setSelectedSourcePreview(src);
                      }
                    }}
                    style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: '#2563eb',
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                  >
                    View
                  </button>
                </div>
              ))}
            </div>

            {/* Modal: Document Chunk & Specification Inspector */}
            {selectedSourcePreview && (
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                padding: '20px'
              }}>
                <div style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '14px',
                  boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                  maxWidth: '560px',
                  width: '100%',
                  overflow: 'hidden',
                  border: '1px solid #e2e8f0'
                }}>
                  <div style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: '#f8fafc'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileText size={18} color="#2563eb" />
                      <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a' }}>
                        Document Specification Inspector
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedSourcePreview(null)}
                      style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0 }}
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                        {selectedSourcePreview.title}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                        <span style={{ fontSize: '0.72rem', backgroundColor: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                          {selectedSourcePreview.section}
                        </span>
                        <span style={{ fontSize: '0.72rem', backgroundColor: '#f0fdf4', color: '#16a34a', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                          Relevance Match: {selectedSourcePreview.relevance}
                        </span>
                      </div>
                    </div>

                    <div style={{
                      backgroundColor: '#f8fafc',
                      borderRadius: '8px',
                      padding: '14px',
                      border: '1px solid #e2e8f0',
                      fontSize: '0.85rem',
                      lineHeight: '1.65',
                      color: '#334155'
                    }}>
                      <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', marginBottom: '6px', textTransform: 'uppercase' }}>
                        Matched OEM Manual Chunk & Safety Tolerance
                      </div>
                      Industrial equipment maintenance specification retrieved from the verified plant documentation database. Follow strictly OSHA 1910.147 lock-out tag-out procedures before opening mechanical service panels or disconnecting electrical harnesses on {activeMachineData.machine_code}.
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '6px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          const docTitle = selectedSourcePreview.title;
                          setSelectedSourcePreview(null);
                          handleSendPrompt(`Analyze engineering requirements and step-by-step procedure from documentation: "${docTitle}" for ${activeMachineData.machine_code}.`);
                        }}
                        style={{
                          backgroundColor: '#2563eb',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '8px 16px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Ask AI About This Section
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedSourcePreview(null)}
                        style={{
                          backgroundColor: '#f1f5f9',
                          color: '#475569',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          padding: '8px 14px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

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
                    {activeMachineData.name} ({activeMachineData.machine_code})
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Model / Type</span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{activeMachineData.model}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Department</span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{activeMachineData.department}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Status</span>
                  <span style={{ fontWeight: 700, color: activeMachineData.status === 'DOWN' ? '#dc2626' : activeMachineData.status === 'WARNING' ? '#ca8a04' : '#16a34a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {activeMachineData.status}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Active Alarm</span>
                  <span style={{ fontWeight: 600, color: '#dc2626' }}>{activeMachineData.alarm}</span>
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
                <span style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: 700 }}>
                  Live Logs
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {activeHistory.map((item, i) => (
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
                <span style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: 700 }}>
                  Plant Orders
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {activeWorkOrders.map((wo, i) => (
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

      {/* Select Plant Equipment Modal */}
      {showMachineModal && (
        <div
          onClick={() => setShowMachineModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
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
              maxWidth: '560px',
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              padding: '22px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              border: '1px solid #e2e8f0',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Cpu size={20} color="#2563eb" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Select Plant Machinery
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowMachineModal(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 14px 0' }}>
              Choose a real plant asset to load its live status, active telemetry alarms, and OEM manuals into the AI Copilot.
            </p>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {machines.map((m) => {
                const isSelected = m.machine_code === activeMachineCode;
                return (
                  <div
                    key={m.id}
                    onClick={() => handleSelectMachine(m)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                      backgroundColor: isSelected ? '#eff6ff' : '#f8fafc',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseOver={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = '#f1f5f9';
                    }}
                    onMouseOut={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc';
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>{m.machine_code}</span>
                        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>• {m.name}</span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                        Location: {m.location} &nbsp;|&nbsp; Dept: {m.department}
                      </div>
                    </div>

                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      backgroundColor: m.status === 'DOWN' ? '#fee2e2' : m.status === 'WARNING' ? '#fef9c3' : '#dcfce7',
                      color: m.status === 'DOWN' ? '#991b1b' : m.status === 'WARNING' ? '#854d0e' : '#15803d'
                    }}>
                      {m.status}
                    </span>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowMachineModal(false)}
                style={{
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
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
                <span style={{ color: '#64748b' }}>Model / Classification:</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{activeMachineData.model}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b' }}>Plant Department:</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{activeMachineData.department}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b' }}>Location:</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{activeMachineData.location}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b' }}>Current Operational Status:</span>
                <span style={{ fontWeight: 700, color: activeMachineData.status === 'DOWN' ? '#dc2626' : '#854d0e', backgroundColor: activeMachineData.status === 'DOWN' ? '#fee2e2' : '#fef9c3', padding: '2px 8px', borderRadius: '4px' }}>
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
