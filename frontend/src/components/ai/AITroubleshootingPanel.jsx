import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles, AlertTriangle, ShieldAlert, BookOpen, CheckCircle2,
  Copy, ThumbsUp, ThumbsDown, ChevronDown, ChevronUp, History,
  Send, RefreshCw, Cpu, ExternalLink, Image, Upload, Camera,
  X, Download, Key, Zap, FileText, Eye, Layers, Palette,
  Bot, User, CornerDownLeft
} from 'lucide-react';
import { aiApi } from '../../services/api';
import {
  getAIConfig, askEquipFixCopilot, generateIndustrialImage
} from '../../services/aiCopilotService';
import AIKeyConfigModal from './AIKeyConfigModal';
import AIThinkingEffect from './AIThinkingEffect';



// --- RICH HTML-STYLE FORMATTED MESSAGE RENDERER ---
export const FormattedAIMessage = ({ content }) => {
  if (!content) return null;

  const lines = content.split('\n');
  const elements = [];
  let inCodeBlock = false;
  let codeBlockLines = [];

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Code block toggle
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre key={`code-${idx}`} style={{
            backgroundColor: '#020617',
            color: '#38bdf8',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '0.8rem',
            overflowX: 'auto',
            fontFamily: 'var(--font-mono)',
            margin: '10px 0',
            border: '1px solid #1e3a8a'
          }}>
            <code>{codeBlockLines.join('\n')}</code>
          </pre>
        );
        codeBlockLines = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      return;
    }

    if (!trimmed) {
      elements.push(<div key={`sp-${idx}`} style={{ height: '8px' }} />);
      return;
    }

    // Level 3 Headings: ### Title
    if (trimmed.startsWith('### ')) {
      elements.push(
        <div key={`h3-${idx}`} style={{
          fontSize: '0.95rem',
          fontWeight: 800,
          color: '#38bdf8',
          margin: '14px 0 6px 0',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          borderLeft: '4px solid #0284c7',
          paddingLeft: '10px',
          backgroundColor: 'rgba(14, 165, 233, 0.12)',
          padding: '6px 12px',
          borderRadius: '0 6px 6px 0'
        }}>
          {parseInlineFormatting(trimmed.replace(/^###\s+/, ''))}
        </div>
      );
      return;
    }

    // Level 1 or 2 Headings: # Title or ## Title
    if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
      elements.push(
        <h3 key={`h2-${idx}`} style={{
          fontSize: '1.05rem',
          fontWeight: 800,
          color: '#ffffff',
          margin: '16px 0 8px 0',
          borderBottom: '1px solid #1e3a8a',
          paddingBottom: '4px',
          letterSpacing: '-0.01em'
        }}>
          {parseInlineFormatting(trimmed.replace(/^#{1,2}\s+/, ''))}
        </h3>
      );
      return;
    }

    // Safety / Warning Callout Banner
    if (/^(warning|caution|danger|safety notice|loto mandatory|safety)/i.test(trimmed)) {
      elements.push(
        <div key={`warn-${idx}`} style={{
          backgroundColor: 'rgba(245, 158, 11, 0.15)',
          borderLeft: '4px solid #f59e0b',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          padding: '10px 14px',
          borderRadius: '6px',
          margin: '10px 0',
          color: '#fef3c7',
          fontSize: '0.85rem',
          fontWeight: 600,
          lineHeight: 1.45
        }}>
          ⚠️ {parseInlineFormatting(trimmed)}
        </div>
      );
      return;
    }

    // Bullet point items: * , - , •
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
      const textWithoutBullet = trimmed.replace(/^[\*\-•]\s+/, '');
      elements.push(
        <div key={`bullet-${idx}`} style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '8px',
          margin: '5px 0',
          fontSize: '0.85rem',
          color: '#e2e8f0',
          lineHeight: 1.55
        }}>
          <span style={{ color: '#38bdf8', fontWeight: 800, fontSize: '0.9rem', marginTop: '-1px' }}>•</span>
          <div style={{ flex: 1 }}>{parseInlineFormatting(textWithoutBullet)}</div>
        </div>
      );
      return;
    }

    // Numbered step list: 1. or 2)
    const numberMatch = trimmed.match(/^(\d+)[\.\)]\s+(.*)/);
    if (numberMatch) {
      elements.push(
        <div key={`num-${idx}`} style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
          margin: '6px 0',
          fontSize: '0.85rem',
          color: '#e2e8f0',
          lineHeight: 1.55
        }}>
          <span style={{
            backgroundColor: '#1e3a8a',
            color: '#38bdf8',
            fontWeight: 800,
            fontSize: '0.725rem',
            padding: '2px 7px',
            borderRadius: '6px',
            flexShrink: 0
          }}>
            {numberMatch[1]}
          </span>
          <div style={{ flex: 1 }}>{parseInlineFormatting(numberMatch[2])}</div>
        </div>
      );
      return;
    }

    // Standard HTML paragraph
    elements.push(
      <p key={`p-${idx}`} style={{
        margin: '5px 0',
        fontSize: '0.875rem',
        color: '#e2e8f0',
        lineHeight: 1.6
      }}>
        {parseInlineFormatting(trimmed)}
      </p>
    );
  });

  return <div style={{ wordBreak: 'break-word' }}>{elements}</div>;
};

// Parser for inline bold and code tags
function parseInlineFormatting(text) {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} style={{ color: '#ffffff', fontWeight: 700 }}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} style={{
          backgroundColor: '#070c18',
          color: '#38bdf8',
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '0.825rem',
          fontFamily: 'monospace',
          border: '1px solid #1e3a8a'
        }}>
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

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

  // API Key State & Modal
  const [aiConfig, setAiConfig] = useState(getAIConfig());
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [inlineKey, setInlineKey] = useState('');
  const [inlineModel, setInlineModel] = useState('gemini-2.0-flash');
  const [savingInlineKey, setSavingInlineKey] = useState(false);
  const [inlineKeyError, setInlineKeyError] = useState(null);

  // Chat Conversation Thread
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: `### 🤖 EquipFix AI Diagnostics Copilot
Real-time equipment diagnostics, OSHA 1910.147 LOTO compliance, and root-cause analysis powered live by Google Gemini & OpenAI.

* 🔍 **Real-Time Fault Diagnostics**: Ask about machine error codes, vibration spikes, or hydraulic pressure anomalies.
* 🛡️ **Safety & LOTO Compliance**: Zero-energy isolation steps compliant with OSHA 1910.147.
* 👁️ **Multimodal Vision**: Switch to **Multimodal Inspection** to inspect equipment photos in real time.`,
      timestamp: 'Now',
      provider: 'EquipFix AI'
    }
  ]);

  // Diagram attachments state: { [messageId]: { loading: boolean, diagramUrl: string, prompt: string, provider: string, error: string } }
  const [messageDiagrams, setMessageDiagrams] = useState({});

  // Input & Feedback
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copiedStatus, setCopiedStatus] = useState(null);

  // Scroll Anchor
  const chatBottomRef = useRef(null);
  const chatContainerRef = useRef(null);

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
    machineCode ? `Diagnose Error E-204 on ${machineCode}` : 'Diagnose spindle bearing abnormal vibration & temperature spike',
    'OSHA 1910.147 zero-energy isolation procedure for main 480V substation breaker',
    'Hydraulic press proportional valve pressure fluctuation troubleshooting',
    'Robotic welder arc start failure & wire feed sensor diagnostics'
  ];

  const visionPrompts = [
    'Inspect this equipment for mechanical cracks, thermal discoloration & bearing wear.',
    'Identify this industrial component, its estimated SKU, and replacement procedure.',
    'Analyze electrical cabinet wiring for corrosion, loose terminals or overheating.',
    'Verify if this machine operation adheres to OSHA safety guard standards.'
  ];

  const diagramPrompts = [
    '5-Axis CNC Milling Spindle exploded assembly diagram',
    'High-pressure hydraulic relief valve cross-section CAD blueprint',
    'Electrical schematic for 480V 3-phase motor control center',
    'Mandatory OSHA Lockout/Tagout Danger Warning sign'
  ];

  const handleInlineKeyChange = (val) => {
    setInlineKey(val);
    setInlineKeyError(null);
    const clean = val.trim();
    if (clean.startsWith('sk-')) {
      if (inlineModel.startsWith('gemini')) {
        setInlineModel('gpt-4o-mini');
      }
    } else if (clean.startsWith('AIza')) {
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

    const detectedProvider = cleanKey.startsWith('sk-') ? 'openai' : (cleanKey.startsWith('AIza') ? 'gemini' : 'gemini');
    let effectiveModel = inlineModel;
    if (detectedProvider === 'openai' && (effectiveModel.startsWith('gemini') || !effectiveModel)) {
      effectiveModel = 'gpt-4o-mini';
    } else if (detectedProvider === 'gemini' && (effectiveModel.startsWith('gpt') || effectiveModel.startsWith('o1') || effectiveModel.startsWith('o3'))) {
      effectiveModel = 'gemini-2.0-flash';
    }

    setSavingInlineKey(true);
    setInlineKeyError(null);
    try {
      const res = await testAIConnection({ apiKey: cleanKey, provider: detectedProvider, model: effectiveModel });
      const newCfg = { apiKey: cleanKey, provider: detectedProvider, model: effectiveModel, customModel: '' };
      saveAIConfig(newCfg);
      setAiConfig(newCfg);
      setCopiedStatus(`${detectedProvider === 'openai' ? 'OpenAI' : 'Google Gemini'} connected! Model: ${effectiveModel}`);
      setTimeout(() => setCopiedStatus(null), 4000);
      setMessages((prev) => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          role: 'assistant',
          content: `### ⚡ ${detectedProvider === 'openai' ? 'OpenAI' : 'Google Gemini'} Connected in Real Time\nActive model: **${effectiveModel}**\nReal-time streaming diagnostics is now active. Send any diagnostic query below!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          provider: `${detectedProvider === 'openai' ? 'OpenAI' : 'Google Gemini'} (${effectiveModel})`
        }
      ]);
    } catch (err) {
      setInlineKeyError(err.message || 'Key verification failed. Please check your API key.');
    } finally {
      setSavingInlineKey(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [machineId, workOrderId]);

  // Pre-fill question if incidentSummary provided
  useEffect(() => {
    if (incidentSummary && !question && messages.length <= 1) {
      setQuestion(incidentSummary);
    }
  }, [incidentSummary]);

  // Auto-scroll chat downwards on new message or loading
  useEffect(() => {
    if (activeTab === 'DIAGNOSTICS') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading, activeTab]);

  const fetchHistory = async () => {
    try {
      const res = await aiApi.getHistory({
        machine_id: machineId || undefined,
        work_order_id: workOrderId || undefined,
        limit: 5
      });
      setRecentQueries(res.data);
    } catch (err) {
      console.warn('Could not load AI query history', err);
    }
  };

  // Called when API key is saved in modal
  const handleConfigSaved = (newCfg) => {
    setAiConfig(newCfg);
    setActiveTab('DIAGNOSTICS'); // Redirect straight to chat view!
    setCopiedStatus(`API Key verified & activated! Model: ${newCfg.model || 'Gemini 2.0 Flash'}`);
    setTimeout(() => setCopiedStatus(null), 4000);

    // Add confirmation message to chat thread
    setMessages((prev) => [
      ...prev,
      {
        id: `sys-${Date.now()}`,
        role: 'assistant',
        content: `### ⚡ Real-Time AI Connected
Active model updated to **${newCfg.model || 'Gemini 2.0 Flash'}** (${newCfg.provider === 'gemini' ? 'Google Gemini' : 'OpenAI'}).
Direct multimodal streaming inference is now active. Send any diagnostic prompt below!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        provider: `${newCfg.provider.toUpperCase()} ENGINE`
      }
    ]);
  };

  // --- INLINE DIAGRAM GENERATOR ---
  const handleGenerateInlineDiagram = async (messageId, queryPrompt = null, answerContent = '') => {
    setMessageDiagrams((prev) => ({
      ...prev,
      [messageId]: { loading: true, error: null }
    }));

    setTimeout(() => {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);

    try {
      // Create an engineering schematic prompt from the diagnosis
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

  // --- TAB 1: DIAGNOSTICS & Q&A WITH REAL-TIME STREAMING ---
  const handleSearch = async (queryText = null) => {
    const q = (queryText || question).trim();
    if (!q) return;

    // Refresh aiConfig right before query so newly configured keys are immediately active
    const activeConfig = getAIConfig();
    setAiConfig(activeConfig);

    // Require API Key for real-time diagnostics
    if (!activeConfig.apiKey) {
      setError('Google Gemini API key required. Please enter your API key to activate real-time responses.');
      setShowConfigModal(true);
      return;
    }

    // 1. Immediately make text in search bar invisible / cleared
    setQuestion('');

    // 2. Append user prompt to messages thread
    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // 3. Immediately prepare real-time streaming assistant placeholder
    const assistantMsgId = `ai-${Date.now()}`;
    const activeModelLabel = (activeConfig.model === 'custom' && activeConfig.customModel)
      ? activeConfig.customModel
      : (activeConfig.model || 'gemini-2.0-flash');
    const initialAssistantMsg = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      provider: `Google Gemini (${activeModelLabel})`,
      isStreaming: true
    };

    setMessages((prev) => [...prev, userMsg, initialAssistantMsg]);
    setLoading(true);
    setError(null);

    // Auto-scroll down smoothly
    setTimeout(() => {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);

    try {
      // Build conversation history excluding system and error notices
      const conversationHistory = messages
        .filter(m => m.id !== 'welcome' && !m.id.startsWith('sys-') && !m.id.startsWith('ai-err-') && m.content)
        .slice(-8)
        .map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          content: m.content
        }));

      const result = await askEquipFixCopilot({
        prompt: q,
        history: conversationHistory,
        context: { machineCode, incidentSummary, machineId, workOrderId },
        onChunk: (_chunk, accumulatedText) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? { ...m, content: accumulatedText, isStreaming: true }
                : m
            )
          );
          chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
      });

      const aiText = result.text;
      const providerLabel = result.provider;

      // Finalize assistant message
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? {
                ...m,
                content: aiText,
                provider: providerLabel || m.provider,
                isStreaming: false
              }
            : m
        )
      );
      fetchHistory();

      // Automatically generate visual diagram only when explicitly requested
      const wantsDiagram = /\b(generate (a )?(diagram|schematic|blueprint)|draw (a )?(diagram|schematic))\b/i.test(q);
      if (wantsDiagram) {
        setTimeout(() => {
          handleGenerateInlineDiagram(assistantMsgId, q, aiText);
        }, 300);
      }
    } catch (err) {
      const errorMsg = err.message || err.response?.data?.detail || 'Failed to retrieve troubleshooting guidance.';
      const isKeyErr = /api key|unauthorized|permission_denied|quota|auth/i.test(errorMsg);
      setError(errorMsg);

      // Replace or update streaming message with notice
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? {
                ...m,
                content: `### ⚠️ AI Diagnostics Notice\n${errorMsg}\n\n*Click **Configure AI Key** below to verify or update your API credentials.*`,
                provider: 'System Diagnostics',
                isKeyError: isKeyErr,
                isStreaming: false
              }
            : m
        )
      );
    } finally {
      setLoading(false);
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

    // Clear search bar
    setQuestion('');
    setVisionLoading(true);
    setError(null);
    setVisionResponse(null);

    try {
      const result = await askEquipFixCopilot({
        prompt: p,
        imageBase64: selectedImageBase64,
        imageMime: selectedImageMime,
        context: { machineCode, incidentSummary }
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

    // Clear input bar
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
    }
  };

  return (
    <div style={{
      backgroundColor: '#0b1329',
      borderRadius: '16px',
      border: '1px solid #1e3a8a',
      boxShadow: '0 12px 36px -8px rgba(0, 0, 0, 0.5), 0 0 20px rgba(14, 165, 233, 0.08)',
      overflow: 'hidden',
      marginBottom: '24px'
    }}>
      {/* Panel Header */}
      <div style={{
        backgroundColor: '#070c1a',
        color: '#ffffff',
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        borderBottom: '1px solid #1e293b'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #0ea5e9, #2563eb)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 14px rgba(14, 165, 233, 0.5)'
          }}>
            <Sparkles size={18} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <strong style={{ fontSize: '1rem', letterSpacing: '-0.01em', color: '#f8fafc' }}>
                EquipFix AI Operations Director Copilot
              </strong>
              {machineCode && (
                <span style={{
                  backgroundColor: '#1e293b',
                  color: '#38bdf8',
                  fontSize: '0.725rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '6px',
                  border: '1px solid #334155'
                }}>
                  {machineCode}
                </span>
              )}
            </div>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              Real-time engineering intelligence, multimodal inspection & diagram generation.
            </span>
          </div>
        </div>

        {/* Right Header: Active Key Status & Config Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            onClick={() => setShowConfigModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: aiConfig.apiKey ? 'rgba(16, 185, 129, 0.15)' : 'rgba(56, 189, 248, 0.12)',
              border: `1px solid ${aiConfig.apiKey ? 'rgba(16, 185, 129, 0.4)' : 'rgba(56, 189, 248, 0.25)'}`,
              padding: '4px 10px',
              borderRadius: '20px',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="Click to view or edit AI Key configuration"
          >
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: aiConfig.apiKey ? '#10b981' : '#38bdf8',
              boxShadow: `0 0 8px ${aiConfig.apiKey ? '#10b981' : '#38bdf8'}`
            }} />
            <span style={{
              fontSize: '0.725rem',
              fontWeight: 700,
              color: aiConfig.apiKey ? '#6ee7b7' : '#7dd3fc',
              textTransform: 'uppercase'
            }}>
              {aiConfig.apiKey
                ? `${aiConfig.provider === 'openai' ? 'OpenAI' : 'Gemini'} • ${aiConfig.model === 'custom' && aiConfig.customModel ? aiConfig.customModel : (aiConfig.model || (aiConfig.provider === 'openai' ? 'gpt-4o-mini' : 'gemini-2.0-flash'))} ACTIVE`
                : 'Internal RAG Mode'}
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
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#334155'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#1e293b'; }}
          >
            <Key size={13} color="#38bdf8" />
            <span>Configure AI Key</span>
          </button>

          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
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
          >
            <History size={13} />
            <span>History ({recentQueries.length})</span>
          </button>
        </div>
      </div>

      {/* Mode Switcher Navigation Tabs */}
      <div style={{
        display: 'flex',
        backgroundColor: '#0f172a',
        borderBottom: '1px solid #1e293b',
        padding: '0 16px'
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('DIAGNOSTICS')}
          style={{
            padding: '12px 18px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'DIAGNOSTICS' ? '3px solid #38bdf8' : '3px solid transparent',
            color: activeTab === 'DIAGNOSTICS' ? '#ffffff' : '#94a3b8',
            fontSize: '0.825rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease'
          }}
        >
          <Zap size={16} color={activeTab === 'DIAGNOSTICS' ? '#38bdf8' : '#64748b'} />
          <span>Real-Time Diagnosis & Chat</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('VISION')}
          style={{
            padding: '12px 18px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'VISION' ? '3px solid #38bdf8' : '3px solid transparent',
            color: activeTab === 'VISION' ? '#ffffff' : '#94a3b8',
            fontSize: '0.825rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease'
          }}
        >
          <Eye size={16} color={activeTab === 'VISION' ? '#38bdf8' : '#64748b'} />
          <span>Multimodal Visual Inspection</span>
          <span style={{ fontSize: '0.65rem', backgroundColor: '#0284c7', color: 'white', padding: '1px 6px', borderRadius: '10px' }}>
            IMAGE ANALYSIS
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('IMAGE_GEN')}
          style={{
            padding: '12px 18px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'IMAGE_GEN' ? '3px solid #38bdf8' : '3px solid transparent',
            color: activeTab === 'IMAGE_GEN' ? '#ffffff' : '#94a3b8',
            fontSize: '0.825rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease'
          }}
        >
          <Palette size={16} color={activeTab === 'IMAGE_GEN' ? '#38bdf8' : '#64748b'} />
          <span>AI Diagram & Image Generator</span>
        </button>
      </div>

      {/* Panel Content Body */}
      <div style={{ padding: '22px', backgroundColor: '#0b1329', color: '#f8fafc' }}>
        {/* Error Feedback */}
        {error && (
          <div style={{
            backgroundColor: '#fef2f2',
            color: '#991b1b',
            border: '1px solid #fecaca',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '0.825rem',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={18} color="#dc2626" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              style={{ background: 'none', border: 'none', color: '#991b1b', cursor: 'pointer' }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Copy Status Notification */}
        {copiedStatus && (
          <div style={{
            backgroundColor: '#ecfdf5',
            color: '#065f46',
            border: '1px solid #a7f3d0',
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '0.8rem',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle2 size={16} color="#059669" />
            <strong>{copiedStatus}</strong>
          </div>
        )}

        {/* ========================================================
            TAB 1: REAL-TIME DIAGNOSIS & CHAT
            ======================================================== */}
        {activeTab === 'DIAGNOSTICS' && (
          <div>
            {/* Recent History Drawer */}
            {showHistory && recentQueries.length > 0 && (
              <div style={{
                backgroundColor: '#070c18',
                border: '1px solid #1e293b',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '16px'
              }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Recent Queries:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {recentQueries.map((q) => (
                    <div
                      key={q.id}
                      onClick={() => handleSearch(q.query_text)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '6px 12px',
                        backgroundColor: 'rgba(15, 23, 42, 0.7)',
                        border: '1px solid #1e293b',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.775rem',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#38bdf8'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1e293b'; }}
                    >
                      <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{q.query_text}</span>
                      <span style={{ fontSize: '0.68rem', color: '#38bdf8', fontWeight: 600 }}>Run Query →</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Inline Google Gemini or OpenAI API Key Banner if not yet configured */}
            {!aiConfig.apiKey && (
              <div style={{
                backgroundColor: '#070c1a',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                borderRadius: '12px',
                padding: '16px 20px',
                marginBottom: '16px',
                color: '#ffffff',
                boxShadow: '0 4px 20px rgba(14, 165, 233, 0.15)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Key size={18} color="#38bdf8" />
                    <strong style={{ fontSize: '0.95rem', color: '#f8fafc' }}>
                      Google Gemini or OpenAI API Key Required for Real-Time AI
                    </strong>
                    <span style={{ fontSize: '0.675rem', backgroundColor: '#0284c7', color: '#ffffff', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                      REAL-TIME RESPONSE
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: '0.75rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                    >
                      Get Gemini Key <ExternalLink size={12} />
                    </a>
                    <span style={{ color: '#334155' }}>•</span>
                    <a
                      href="https://platform.openai.com/api-keys"
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: '0.75rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                    >
                      Get OpenAI Key <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
                <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '0 0 12px 0' }}>
                  EquipFix AI runs exclusively in real time using authenticated models (Gemini 2.0 Flash, OpenAI GPT-4o, etc.). No dummy or random data is used.
                </p>
                <form onSubmit={handleSaveInlineKey} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <input
                    type="password"
                    value={inlineKey}
                    onChange={(e) => handleInlineKeyChange(e.target.value)}
                    placeholder="Paste Google Gemini (AIzaSy...) or OpenAI (sk-...) API Key"
                    style={{
                      flex: '1',
                      minWidth: '260px',
                      padding: '9px 12px',
                      backgroundColor: 'rgba(15, 23, 42, 0.8)',
                      border: inlineKeyError ? '1px solid #ef4444' : '1px solid #334155',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: '0.85rem',
                      fontFamily: 'monospace'
                    }}
                  />
                  <select
                    value={inlineModel}
                    onChange={(e) => setInlineModel(e.target.value)}
                    style={{
                      padding: '9px 12px',
                      backgroundColor: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: '0.8rem',
                      cursor: 'pointer'
                    }}
                  >
                    {inlineKey.trim().startsWith('sk-') ? (
                      <>
                        <option value="gpt-4o-mini">GPT-4o Mini (Fast & Light)</option>
                        <option value="gpt-4o">GPT-4o Flagship (Vision & Reasoning)</option>
                        <option value="o1">o1 (Deep STEM Reasoning)</option>
                        <option value="o3-mini">o3-mini (Reasoning Mini)</option>
                      </>
                    ) : (
                      <>
                        <option value="gemini-2.0-flash">Gemini 2.0 Flash (Recommended)</option>
                        <option value="gemini-2.0-flash-lite">Gemini 2.0 Flash-Lite</option>
                        <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                        <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                        <option value="gemini-2.0-pro-exp-02-05">Gemini 2.0 Pro Experimental</option>
                        <option value="gemini-exp-1206">Gemini Experimental 1206</option>
                      </>
                    )}
                  </select>
                  <button
                    type="submit"
                    disabled={savingInlineKey || !inlineKey.trim()}
                    className="btn btn-primary btn-sm"
                    style={{ fontSize: '0.8rem', padding: '9px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    {savingInlineKey ? <RefreshCw size={14} className="spin" /> : <Zap size={14} />}
                    <span>{savingInlineKey ? 'Connecting...' : 'Activate Real-Time AI'}</span>
                  </button>
                </form>
                {inlineKeyError && (
                  <div style={{ color: '#f87171', fontSize: '0.75rem', marginTop: '8px' }}>
                    ⚠️ {inlineKeyError}
                  </div>
                )}
              </div>
            )}

            {/* Conversational Chat Scroll Box */}
            <div
              ref={chatContainerRef}
              style={{
                minHeight: '280px',
                maxHeight: '460px',
                overflowY: 'auto',
                backgroundColor: '#030712',
                border: '1px solid #1e293b',
                borderRadius: '12px',
                padding: '18px',
                marginBottom: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.4)'
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
                        <span style={{ color: '#cbd5e1' }}>You</span>
                        <User size={12} color="#38bdf8" />
                        <span>• {msg.timestamp}</span>
                      </>
                    ) : (
                      <>
                        <Bot size={13} color="#38bdf8" />
                        <strong style={{ color: '#38bdf8' }}>{msg.provider || 'EquipFix AI'}</strong>
                        <span>• {msg.timestamp}</span>
                      </>
                    )}
                  </div>

                  <div
                    style={{
                      maxWidth: msg.role === 'user' ? '82%' : '92%',
                      padding: msg.role === 'user' ? '12px 16px' : '16px 20px',
                      borderRadius: msg.role === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                      background: msg.role === 'user' ? 'linear-gradient(135deg, #0284c7 0%, #1e40af 100%)' : '#0f172a',
                      color: '#f8fafc',
                      border: msg.role === 'user' ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid #1e293b',
                      boxShadow: msg.role === 'user' ? '0 4px 14px rgba(2, 132, 199, 0.25)' : '0 4px 14px rgba(0, 0, 0, 0.4)',
                      fontSize: '0.875rem'
                    }}
                  >
                    {msg.role === 'user' ? (
                      <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{msg.content}</div>
                    ) : (
                      <>
                        {/* Live Streaming Message Content */}
                        {msg.isStreaming && !msg.content ? (
                          <AIThinkingEffect
                            mode="chat"
                            modelName={aiConfig.model === 'custom' && aiConfig.customModel ? aiConfig.customModel : (aiConfig.model || 'Gemini 2.5 Flash')}
                            machineCode={machineCode}
                          />
                        ) : (
                          <>
                            {/* Rich HTML-formatted message output */}
                            <FormattedAIMessage content={msg.content} />

                            {/* Live Streaming Progress Indicator */}
                            {msg.isStreaming && (
                              <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                marginTop: '8px',
                                padding: '3px 8px',
                                borderRadius: '12px',
                                backgroundColor: '#f0f9ff',
                                border: '1px solid #bae6fd',
                                fontSize: '0.72rem',
                                color: '#0284c7',
                                fontWeight: 700
                              }}>
                                <span style={{
                                  display: 'inline-block',
                                  width: '6px',
                                  height: '6px',
                                  borderRadius: '50%',
                                  backgroundColor: '#0284c7',
                                  boxShadow: '0 0 6px #0284c7'
                                }} />
                                <span>Real-Time Streaming Active</span>
                                <span style={{ fontWeight: 900, color: '#0284c7' }}>▍</span>
                              </div>
                            )}
                          </>
                        )}

                        {/* Inline Generated Visual Diagram (if ready) */}
                        {messageDiagrams[msg.id]?.diagramUrl && (
                          <div style={{
                            marginTop: '12px',
                            backgroundColor: '#070c18',
                            border: '1px solid #1e3a8a',
                            borderRadius: '10px',
                            padding: '12px',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.3)'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase' }}>
                                📐 Exploded View & Part Schematic ({messageDiagrams[msg.id].provider})
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

                        {/* Message Action Row: Generate Visual Diagram & Copy */}
                        <div style={{
                          marginTop: '10px',
                          paddingTop: '8px',
                          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                          flexWrap: 'wrap'
                        }}>
                          {(msg.isKeyError || (msg.content && msg.content.includes('Configure AI Key'))) && (
                            <button
                              type="button"
                              onClick={() => setShowConfigModal(true)}
                              className="btn btn-primary btn-sm"
                              style={{
                                fontSize: '0.72rem',
                                padding: '4px 10px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: 'linear-gradient(135deg, #0284c7, #2563eb)',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '6px'
                              }}
                            >
                              <Key size={12} />
                              <span>Configure AI Key</span>
                            </button>
                          )}

                          {!messageDiagrams[msg.id]?.diagramUrl && !messageDiagrams[msg.id]?.loading && (
                            <button
                              type="button"
                              onClick={() => handleGenerateInlineDiagram(msg.id, null, msg.content)}
                              className="btn btn-secondary btn-sm"
                              style={{
                                fontSize: '0.72rem',
                                padding: '4px 10px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                color: '#0284c7',
                                borderColor: '#bae6fd',
                                backgroundColor: '#f0f9ff'
                              }}
                              title="Generate an AI visual schematic or CAD exploded assembly diagram to understand this part"
                            >
                              <Palette size={12} color="#0284c7" />
                              <span>🎨 Generate Visual Diagram to Understand</span>
                            </button>
                          )}

                          {onCopyToLog && (
                            <button
                              type="button"
                              onClick={() => handleCopyLogs(msg.content, 'AI Copilot Diagnostic Answer')}
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '0.7rem', padding: '4px 8px', marginLeft: 'auto' }}
                            >
                              <Copy size={11} /> Copy to Work Log
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}

              {/* Auto scroll bottom anchor */}
              <div ref={chatBottomRef} style={{ height: '1px' }} />
            </div>

            {/* Input Bar — Prompt Area */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSearch();
              }}
              style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}
            >
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask EquipFix AI: e.g. Why is CNC-04 spindle vibrating? What are mandatory LOTO steps?"
                style={{
                  fontSize: '0.875rem',
                  flex: 1,
                  padding: '12px 18px',
                  borderRadius: '10px',
                  backgroundColor: '#070c18',
                  color: '#ffffff',
                  border: '1px solid #334155',
                  outline: 'none',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.4)'
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#38bdf8'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#334155'; }}
              />
              <button
                type="submit"
                disabled={loading || !question.trim()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                  color: '#ffffff',
                  border: '1px solid rgba(56, 189, 248, 0.4)',
                  boxShadow: '0 0 16px rgba(14, 165, 233, 0.35)',
                  whiteSpace: 'nowrap',
                  fontWeight: 700,
                  cursor: loading || !question.trim() ? 'not-allowed' : 'pointer',
                  opacity: loading || !question.trim() ? 0.7 : 1
                }}
              >
                {loading ? <RefreshCw size={16} className="spin" /> : <Send size={16} />}
                <span>{loading ? 'Processing...' : 'Send'}</span>
              </button>
            </form>

            {/* Suggested Chips */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, alignSelf: 'center', textTransform: 'uppercase' }}>
                Quick Prompts:
              </span>
              {quickPrompts.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSearch(p)}
                  style={{
                    backgroundColor: '#070c18',
                    border: '1px solid #1e293b',
                    borderRadius: '16px',
                    padding: '4px 12px',
                    fontSize: '0.725rem',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#38bdf8'; e.currentTarget.style.borderColor = '#38bdf8'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = '#1e293b'; }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 2: MULTIMODAL IMAGE ANALYSIS (ANALYZE ANYTHING)
            ======================================================== */}
        {activeTab === 'VISION' && (
          <div>
            <div style={{ marginBottom: '18px' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff', margin: '0 0 6px 0' }}>
                Multimodal Equipment &amp; Image Diagnostic Inspector
              </h4>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
                Upload any photograph or image of plant equipment, broken components, thermal wear, gauges, or schematics for instant AI engineering inspection.
              </p>
            </div>

            {/* Drag and Drop / File Input Box */}
            <div
              style={{
                border: '2px dashed #334155',
                borderRadius: '12px',
                padding: '24px',
                textAlign: 'center',
                backgroundColor: selectedImageBase64 ? 'rgba(15, 23, 42, 0.8)' : '#070c18',
                cursor: 'pointer',
                marginBottom: '16px',
                position: 'relative'
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageFileChange}
                style={{ display: 'none' }}
              />

              {selectedImageBase64 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%' }}>
                    <img
                      src={selectedImageBase64}
                      alt="Equipment to inspect"
                      style={{
                        maxHeight: '260px',
                        maxWidth: '100%',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                        objectFit: 'contain',
                        display: 'block'
                      }}
                    />
                  </div>


                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#ffffff' }}>
                      {imageFileName || 'Selected Equipment Image'}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedImageBase64(null);
                        setImageFileName('');
                        setVisionResponse(null);
                      }}
                      style={{
                        padding: '4px 10px',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.725rem',
                        cursor: 'pointer'
                      }}
                    >
                      Remove
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      style={{
                        padding: '4px 10px',
                        backgroundColor: '#2563eb',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.725rem',
                        cursor: 'pointer'
                      }}
                    >
                      Change Photo
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(56, 189, 248, 0.15)',
                    color: '#38bdf8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px auto'
                  }}>
                    <Upload size={24} />
                  </div>
                  <strong style={{ display: 'block', fontSize: '0.9rem', color: '#ffffff', marginBottom: '4px' }}>
                    Click to select an equipment photo or drag &amp; drop here
                  </strong>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    Supports JPG, PNG, WEBP, BMP — Machine faults, gauge dials, broken gears, safety panels
                  </span>
                </div>
              )}
            </div>

            {/* Vision Question & Action */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Inspection prompt: e.g. What mechanical damage is visible on this component?"
                style={{
                  fontSize: '0.85rem',
                  flex: 1,
                  borderRadius: '10px',
                  backgroundColor: '#070c18',
                  border: '1px solid #334155',
                  color: '#ffffff',
                  padding: '10px 14px'
                }}
              />
              <button
                type="button"
                className="btn btn-primary"
                disabled={visionLoading || !selectedImageBase64}
                onClick={() => handleAnalyzeImage()}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 22px', borderRadius: '10px', whiteSpace: 'nowrap' }}
              >
                {visionLoading ? <RefreshCw size={16} className="animate-spin" /> : <Eye size={16} />}
                <span>{visionLoading ? 'Inspecting Image...' : 'Analyze Image with AI'}</span>
              </button>
            </div>

            {/* Preset Vision Prompts */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
              {visionPrompts.map((vp, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleAnalyzeImage(vp)}
                  style={{
                    backgroundColor: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid #1e293b',
                    borderRadius: '16px',
                    padding: '4px 12px',
                    fontSize: '0.725rem',
                    color: '#cbd5e1',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1e293b'; e.currentTarget.style.borderColor = '#38bdf8'; e.currentTarget.style.color = '#ffffff'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.8)'; e.currentTarget.style.borderColor = '#1e293b'; e.currentTarget.style.color = '#cbd5e1'; }}
                >
                  🔍 {vp}
                </button>
              ))}
            </div>

            {/* Clean AI Thinking Effect for Vision */}
            {visionLoading && (
              <div style={{ marginBottom: '20px' }}>
                <AIThinkingEffect
                  mode="vision"
                  modelName={aiConfig.model === 'custom' && aiConfig.customModel ? aiConfig.customModel : (aiConfig.model || 'Gemini 2.0 Flash')}
                  machineCode={machineCode}
                />
              </div>
            )}


            {/* Vision Response Card with HTML Rendering */}

            {visionResponse && (
              <div style={{
                backgroundColor: '#070c18',
                border: '1px solid #1e3a8a',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #1e293b', paddingBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles size={18} color="#38bdf8" />
                    <strong style={{ fontSize: '0.95rem', color: '#ffffff' }}>
                      Multimodal Visual Inspection Breakdown
                    </strong>
                    <span style={{ fontSize: '0.68rem', backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                      {visionResponse.provider}
                    </span>
                  </div>

                  {onCopyToLog && (
                    <button
                      type="button"
                      onClick={() => handleCopyLogs(visionResponse.text, 'AI Visual Inspection Breakdown')}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.725rem', padding: '4px 10px' }}
                    >
                      <Copy size={12} /> Copy to Log
                    </button>
                  )}
                </div>

                <FormattedAIMessage content={visionResponse.text} />
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            TAB 3: INDUSTRIAL DIAGRAM & IMAGE GENERATOR
            ======================================================== */}
        {activeTab === 'IMAGE_GEN' && (
          <div>
            <div style={{ marginBottom: '18px' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff', margin: '0 0 6px 0' }}>
                AI Industrial Schematic &amp; Diagram Generator
              </h4>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
                Generate mechanical CAD blueprints, isometric exploded assemblies, photorealistic manufacturing scenes, or OSHA safety signage on demand.
              </p>
            </div>

            {/* Prompt & Style Controls */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px auto', gap: '12px', marginBottom: '14px' }}>
              <input
                type="text"
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleGenerateDiagram(); }}
                placeholder="e.g. 5-axis CNC spindle assembly exploded view, hydraulic manifold circuit..."
                style={{
                  fontSize: '0.85rem',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  backgroundColor: '#070c18',
                  border: '1px solid #334155',
                  color: '#ffffff'
                }}
              />

              <select
                value={imageStyle}
                onChange={(e) => setImageStyle(e.target.value)}
                style={{
                  fontSize: '0.825rem',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  backgroundColor: '#070c18',
                  border: '1px solid #334155',
                  color: '#ffffff'
                }}
              >
                <option value="schematic">📐 Engineering CAD Blueprint</option>
                <option value="exploded">⚙️ Isometric Exploded Assembly</option>
                <option value="realistic">🏭 Realistic Plant Equipment</option>
                <option value="safety">⚠️ OSHA Warning & Safety Sign</option>
              </select>

              <button
                type="button"
                className="btn btn-primary"
                disabled={generatingImage || !imagePrompt.trim()}
                onClick={() => handleGenerateDiagram()}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 22px', borderRadius: '10px', whiteSpace: 'nowrap' }}
              >
                {generatingImage ? <RefreshCw size={16} className="animate-spin" /> : <Palette size={16} />}
                <span>{generatingImage ? 'Generating...' : 'Generate Image'}</span>
              </button>
            </div>

            {/* Preset Diagram Prompts */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '22px' }}>
              {diagramPrompts.map((dp, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleGenerateDiagram(dp)}
                  style={{
                    backgroundColor: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid #1e293b',
                    borderRadius: '16px',
                    padding: '4px 12px',
                    fontSize: '0.725rem',
                    color: '#cbd5e1',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1e293b'; e.currentTarget.style.borderColor = '#38bdf8'; e.currentTarget.style.color = '#ffffff'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.8)'; e.currentTarget.style.borderColor = '#1e293b'; e.currentTarget.style.color = '#cbd5e1'; }}
                >
                  ✨ {dp}
                </button>
              ))}
            </div>

            {/* Clean AI Thinking Effect for Diagram Generation */}
            {generatingImage && (
              <div style={{ marginBottom: '20px' }}>
                <AIThinkingEffect
                  mode="diagram"
                  modelName={aiConfig.imageProvider === 'openai' ? 'DALL-E 3 (OpenAI)' : 'Imagen 3 (Google)'}
                  machineCode={machineCode}
                />
              </div>
            )}


            {/* Generated Image Result Card */}

            {generatedImage && (
              <div style={{
                backgroundColor: '#070c18',
                border: '1px solid #1e3a8a',
                borderRadius: '16px',
                padding: '24px',
                textAlign: 'center',
                boxShadow: '0 12px 36px rgba(0, 0, 0, 0.4)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase' }}>
                      Generated Asset: {generatedImage.provider}
                    </span>
                  </div>

                  <a
                    href={generatedImage.imageUrl}
                    download="equipfix-ai-diagram.jpg"
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      textDecoration: 'none',
                      padding: '6px 14px',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      fontWeight: 700
                    }}
                  >
                    <Download size={14} /> Open & Download Full-Res
                  </a>
                </div>

                <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%' }}>
                  <img
                    src={generatedImage.imageUrl}
                    alt={generatedImage.prompt}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '520px',
                      borderRadius: '10px',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6)'
                    }}
                  />
                </div>

                <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '12px', fontStyle: 'italic' }}>
                  Prompt: "{generatedImage.prompt}"
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Embedded API Key Configuration Modal */}
      <AIKeyConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        onConfigSaved={handleConfigSaved}
      />
    </div>
  );
};

export default AITroubleshootingPanel;
