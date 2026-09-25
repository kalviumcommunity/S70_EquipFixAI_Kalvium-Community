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
            backgroundColor: '#070c18',
            color: '#38bdf8',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '0.8rem',
            overflowX: 'auto',
            fontFamily: 'var(--font-mono)',
            margin: '10px 0',
            border: '1px solid #1e293b'
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
          color: '#0f172a',
          margin: '14px 0 6px 0',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          borderLeft: '4px solid #0284c7',
          paddingLeft: '10px',
          backgroundColor: '#f8fafc',
          padding: '6px 10px',
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
          color: '#0369a1',
          margin: '16px 0 8px 0',
          borderBottom: '1px solid #e2e8f0',
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
          backgroundColor: '#fffbeb',
          borderLeft: '4px solid #f59e0b',
          border: '1px solid #fde68a',
          padding: '10px 14px',
          borderRadius: '6px',
          margin: '10px 0',
          color: '#92400e',
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
          color: '#334155',
          lineHeight: 1.55
        }}>
          <span style={{ color: '#0284c7', fontWeight: 800, fontSize: '0.9rem', marginTop: '-1px' }}>•</span>
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
          color: '#1e293b',
          lineHeight: 1.55
        }}>
          <span style={{
            backgroundColor: '#e0f2fe',
            color: '#0369a1',
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
        color: '#334155',
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
        <strong key={i} style={{ color: '#0f172a', fontWeight: 700 }}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} style={{
          backgroundColor: '#f1f5f9',
          color: '#0284c7',
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '0.825rem',
          fontFamily: 'monospace',
          border: '1px solid #e2e8f0'
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

  // Chat Conversation Thread
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: `### 🤖 Welcome to EquipFix AI Operations Director Copilot
I am ready for real-time equipment diagnostics, safety protocols, and plant operations! ⚙️

* 🔍 **Smart Diagnostics**: Ask about error codes, spindle vibration, bearing failure, or hydraulic pressure anomalies.
* 🛡️ **Safety & LOTO Protocols**: Request Lockout/Tagout procedures compliant with OSHA 1910.147.
* 👁️ **Visual Multimodal Inspection**: Switch to **Multimodal Inspection** to analyze photos of damaged components.
* 🎨 **CAD & Schematic Generator**: Generate exploded part assemblies, CAD diagrams, and blueprints instantly.

💡 *Tip: If you need to visualize any physical part or mechanism, click "🎨 Generate Visual Diagram" on any response!*`,
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
    machineCode ? `Diagnose Error E-204 on ${machineCode}` : 'Diagnose CNC spindle bearing vibration & thermal runaway',
    'OSHA 1910.147 Zero-Energy Isolation for 480V Substation & MCC-A',
    '200-Ton Hydraulic Press Pressure Loss & Proportional Valve SOP',
    'Robot Cell Safety Gate Interlock E-Stop Fault Reset Procedure'
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
    setCopiedStatus(`API Key verified & activated! Model: ${newCfg.model || 'Gemini 2.5 Flash'}`);
    setTimeout(() => setCopiedStatus(null), 4000);

    // Add confirmation message to chat thread
    setMessages((prev) => [
      ...prev,
      {
        id: `sys-${Date.now()}`,
        role: 'assistant',
        content: `### ⚡ Real-Time AI Connected
Active model updated to **${newCfg.model || 'Gemini 2.5 Flash'}** (${newCfg.provider === 'gemini' ? 'Google Gemini' : 'OpenAI'}).
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

  // --- TAB 1: DIAGNOSTICS & Q&A ---
  const handleSearch = async (queryText = null) => {
    const q = (queryText || question).trim();
    if (!q) return;

    // Refresh aiConfig right before query so newly configured keys are immediately active
    const activeConfig = getAIConfig();
    setAiConfig(activeConfig);

    // 1. Immediately make text in search bar invisible / cleared
    setQuestion('');

    // 2. Append user prompt to messages thread
    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages((prev) => [...prev, userMsg]);

    setLoading(true);
    setError(null);

    // 3. Scroll down right away so user sees their message sent
    setTimeout(() => {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);

    try {
      let aiText = '';
      let providerLabel = '';

      if (activeConfig.apiKey) {
        const result = await askEquipFixCopilot({
          prompt: q,
          context: { machineCode, incidentSummary, machineId, workOrderId }
        });
        aiText = result.text;
        providerLabel = result.provider;
      } else {
        const res = await aiApi.query({
          question: q,
          machine_id: machineId || undefined,
          work_order_id: workOrderId || undefined
        });
        const data = res.data;
        aiText = `### 🔍 Root Cause Analysis & Sensor Telemetry
${data.possible_cause || '✅ Diagnostic telemetry and vibration spectrum within normal thresholds.'}

### 🛠️ Recommended Action Steps
${(data.recommended_checks || []).map((c, i) => `🔹 **Step ${i + 1}**: ${c}`).join('\n')}

### ⚠️ Safety & Lockout/Tagout (LOTO) Compliance
${data.safety_instructions || '🛡️ Verify machine electrical isolation (OSHA 1910.147) and inspect physical guards before servicing.'}

### 📋 Visual Assembly Layout
\`\`\`
[Power Feed ⚡] ──▶ [Emergency Stop 🚨] ──▶ [Motor Drive ⚙️] ──▶ [Bearing Unit 🔩] ──▶ [Spindle Output 🏭]
\`\`\``;
        providerLabel = 'Internal RAG Engine';
      }

      // Append assistant message to thread
      const assistantMsg = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: aiText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        provider: providerLabel
      };
      setMessages((prev) => [...prev, assistantMsg]);
      fetchHistory();

      // Automatically generate visual diagram if question requested one
      const wantsDiagram = /\b(diagram|schematic|draw|visualize|blueprint|exploded|show me|look like|illustration|circuit|cad)\b/i.test(q);
      if (wantsDiagram) {
        setTimeout(() => {
          handleGenerateInlineDiagram(assistantMsg.id, q, aiText);
        }, 300);
      }
    } catch (err) {
      const errorMsg = err.message || err.response?.data?.detail || 'Failed to retrieve troubleshooting guidance.';
      setError(errorMsg);
      // Append an assistant message so user sees the diagnostic feedback and is not left hanging
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          role: 'assistant',
          content: `### ⚠️ AI Diagnostics Notice\n${errorMsg}\n\n*Tip: Check your API key under **Configure API Key** or ask another diagnostic question.*`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          provider: 'System Diagnostics'
        }
      ]);
    } finally {
      setLoading(false);
      // Auto-scroll chat down smoothly when prompt execution finishes
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
      backgroundColor: '#ffffff',
      borderRadius: '14px',
      border: '1px solid #cbd5e1',
      boxShadow: '0 8px 24px -6px rgba(0, 0, 0, 0.08)',
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
                ? `${aiConfig.model === 'custom' && aiConfig.customModel ? aiConfig.customModel : (aiConfig.model || 'Gemini 2.0 Flash')} ACTIVE`
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

      <div style={{ padding: '20px' }}>
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
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '16px'
              }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
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
                        padding: '6px 10px',
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.775rem'
                      }}
                    >
                      <span style={{ color: '#0f172a', fontWeight: 500 }}>{q.query_text}</span>
                      <span style={{ fontSize: '0.68rem', color: '#2563eb', fontWeight: 600 }}>Run Query</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Conversational Chat Scroll Box */}
            <div
              ref={chatContainerRef}
              style={{
                minHeight: '260px',
                maxHeight: '440px',
                overflowY: 'auto',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px'
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
                    color: '#64748b'
                  }}>
                    {msg.role === 'user' ? (
                      <>
                        <span>You</span>
                        <User size={12} />
                        <span>• {msg.timestamp}</span>
                      </>
                    ) : (
                      <>
                        <Bot size={13} color="#0284c7" />
                        <strong style={{ color: '#0284c7' }}>{msg.provider || 'EquipFix AI'}</strong>
                        <span>• {msg.timestamp}</span>
                      </>
                    )}
                  </div>

                  <div
                    style={{
                      maxWidth: msg.role === 'user' ? '82%' : '92%',
                      padding: msg.role === 'user' ? '10px 14px' : '14px 18px',
                      borderRadius: msg.role === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                      backgroundColor: msg.role === 'user' ? '#0f172a' : '#ffffff',
                      color: msg.role === 'user' ? '#f8fafc' : '#1e293b',
                      border: msg.role === 'user' ? 'none' : '1px solid #e2e8f0',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                      fontSize: '0.875rem'
                    }}
                  >
                    {msg.role === 'user' ? (
                      <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{msg.content}</div>
                    ) : (
                      <>
                        {/* Rich HTML-formatted message output */}
                        <FormattedAIMessage content={msg.content} />

                        {/* Inline Generated Visual Diagram (if loading) */}
                        {messageDiagrams[msg.id]?.loading && (
                          <div style={{ marginTop: '12px' }}>
                            <AIThinkingEffect mode="diagram" modelName="CAD Schematic Synthesizer" machineCode={machineCode} />
                          </div>
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
                          borderTop: '1px solid #f1f5f9',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                          flexWrap: 'wrap'
                        }}>
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

              {/* Clean AI Thinking Effect inside chat */}
              {loading && (
                <div style={{ display: 'flex', justifyContent: 'flex-start', margin: '4px 0 10px 0' }}>
                  <AIThinkingEffect
                    mode="chat"
                    modelName={aiConfig.model === 'custom' && aiConfig.customModel ? aiConfig.customModel : (aiConfig.model || 'Gemini 2.0 Flash')}
                    machineCode={machineCode}
                  />
                </div>
              )}



              {/* Auto scroll bottom anchor */}
              <div ref={chatBottomRef} style={{ height: '1px' }} />
            </div>

            {/* Input Bar — Text becomes invisible immediately when prompt is submitted */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSearch();
              }}
              style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}
            >
              <input
                type="text"
                className="form-input"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Type your industrial question... (e.g. Why is CNC-04 spindle vibrating? What is the LOTO step?)"
                style={{ fontSize: '0.875rem', flex: 1, padding: '11px 16px', borderRadius: '10px' }}
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || !question.trim()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '11px 22px',
                  borderRadius: '10px',
                  whiteSpace: 'nowrap',
                  fontWeight: 700
                }}
              >
                {loading ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                <span>{loading ? 'Processing...' : 'Send'}</span>
              </button>
            </form>

            {/* Suggested Chips */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, alignSelf: 'center', textTransform: 'uppercase' }}>
                Quick Prompts:
              </span>
              {quickPrompts.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSearch(p)}
                  style={{
                    backgroundColor: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    borderRadius: '16px',
                    padding: '4px 12px',
                    fontSize: '0.725rem',
                    color: '#334155',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#e2e8f0'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                >
                  ⚡ {p}
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
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
                Multimodal Equipment & Image Diagnostic Inspector
              </h4>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                Upload any photograph or image of plant equipment, broken components, thermal wear, gauges, or schematics for instant AI engineering inspection.
              </p>
            </div>

            {/* Drag and Drop / File Input Box */}
            <div
              style={{
                border: '2px dashed #94a3b8',
                borderRadius: '12px',
                padding: '24px',
                textAlign: 'center',
                backgroundColor: selectedImageBase64 ? '#f8fafc' : '#f1f5f9',
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
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        objectFit: 'contain',
                        display: 'block'
                      }}
                    />
                  </div>


                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1e293b' }}>
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
                    backgroundColor: '#e0f2fe',
                    color: '#0284c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px auto'
                  }}>
                    <Upload size={24} />
                  </div>
                  <strong style={{ display: 'block', fontSize: '0.9rem', color: '#0f172a', marginBottom: '4px' }}>
                    Click to select an equipment photo or drag & drop here
                  </strong>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Supports JPG, PNG, WEBP, BMP — Machine faults, gauge dials, broken gears, safety panels
                  </span>
                </div>
              )}
            </div>

            {/* Vision Question & Action */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
              <input
                type="text"
                className="form-input"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Inspection prompt: e.g. What mechanical damage is visible on this component?"
                style={{ fontSize: '0.85rem', flex: 1, borderRadius: '10px' }}
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
                    backgroundColor: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    borderRadius: '16px',
                    padding: '4px 12px',
                    fontSize: '0.725rem',
                    color: '#334155',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#e2e8f0'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
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
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.06)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles size={18} color="#0284c7" />
                    <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>
                      Multimodal Visual Inspection Breakdown
                    </strong>
                    <span style={{ fontSize: '0.68rem', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
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
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
                AI Industrial Schematic & Diagram Generator
              </h4>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                Generate mechanical CAD blueprints, isometric exploded assemblies, photorealistic manufacturing scenes, or OSHA safety signage on demand.
              </p>
            </div>

            {/* Prompt & Style Controls */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px auto', gap: '12px', marginBottom: '14px' }}>
              <input
                type="text"
                className="form-input"
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleGenerateDiagram(); }}
                placeholder="e.g. 5-axis CNC spindle assembly exploded view, hydraulic manifold circuit..."
                style={{ fontSize: '0.85rem', padding: '10px 14px', borderRadius: '10px' }}
              />

              <select
                className="form-select"
                value={imageStyle}
                onChange={(e) => setImageStyle(e.target.value)}
                style={{ fontSize: '0.825rem', padding: '10px 12px', borderRadius: '10px' }}
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
                    backgroundColor: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    borderRadius: '16px',
                    padding: '4px 12px',
                    fontSize: '0.725rem',
                    color: '#334155',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#e2e8f0'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
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
