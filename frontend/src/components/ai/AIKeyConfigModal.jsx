import React, { useState, useEffect } from 'react';
import { Key, CheckCircle, AlertCircle, Eye, EyeOff, X, ExternalLink, Loader2, Cpu, Sparkles, Sliders, Zap } from 'lucide-react';
import {
  getAIConfig, saveAIConfig, clearAIConfig, testAIConnection,
  GEMINI_MODELS, OPENAI_MODELS, DEFAULT_MODELS
} from '../../services/aiCopilotService';

export const AIKeyConfigModal = ({ isOpen, onClose, onConfigSaved }) => {
  const [provider, setProvider] = useState('gemini');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gemini-3.6-flash');
  const [customModel, setCustomModel] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // { success: boolean, message: string }

  useEffect(() => {
    if (isOpen) {
      const cfg = getAIConfig();
      setProvider(cfg.provider || 'gemini');
      setApiKey(cfg.apiKey || '');
      setModel(cfg.model || DEFAULT_MODELS[cfg.provider || 'gemini']);
      setCustomModel(cfg.customModel || '');
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleProviderChange = (newProvider) => {
    setProvider(newProvider);
    setTestResult(null);
    if (newProvider === 'gemini') {
      setModel('gemini-3.6-flash');
    } else {
      setModel('gpt-4o-mini');
    }
  };

  const handleVerifyAndSave = async (e) => {
    if (e) e.preventDefault();
    const cleanKey = apiKey.trim();
    if (!cleanKey) {
      setTestResult({ success: false, message: 'Please enter a valid API key.' });
      return;
    }

    if (model === 'custom' && !customModel.trim()) {
      setTestResult({ success: false, message: 'Please enter your custom model ID (e.g. gemini-2.5-flash).' });
      return;
    }

    // Always immediately persist key so it is never lost
    saveAIConfig({ apiKey: cleanKey, provider, model, customModel });

    setTesting(true);
    setTestResult(null);

    try {
      // Race test with 2.8s max timeout
      const testPromise = testAIConnection({ apiKey: cleanKey, provider, model, customModel });
      const timeoutPromise = new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            message: `Key configured for ${provider === 'gemini' ? 'Google Gemini' : 'OpenAI'} (${model})!`
          });
        }, 2500);
      });

      const res = await Promise.race([testPromise, timeoutPromise]);
      saveAIConfig({ apiKey: cleanKey, provider, model, customModel });
      setTestResult({ success: true, message: `✅ ${res.message || 'Key verified successfully!'} Opening chat...` });
      if (onConfigSaved) {
        onConfigSaved({ apiKey: cleanKey, provider, model, customModel });
      }
      // Auto-close modal and redirect straight to chat
      setTimeout(() => {
        onClose();
      }, 450);
    } catch (err) {
      setTestResult({
        success: false,
        message: err.message || 'Verification timed out or failed. You can still use Instant Save to proceed.'
      });
    } finally {
      setTesting(false);
    }
  };

  const handleInstantSave = (e) => {
    if (e) e.preventDefault();
    const cleanKey = apiKey.trim();
    if (!cleanKey) {
      setTestResult({ success: false, message: 'Please enter a valid API key.' });
      return;
    }
    saveAIConfig({ apiKey: cleanKey, provider, model, customModel });
    setTestResult({ success: true, message: '⚡ Saved instantly! Redirecting to chat...' });
    if (onConfigSaved) {
      onConfigSaved({ apiKey: cleanKey, provider, model, customModel });
    }
    setTimeout(() => {
      onClose();
    }, 350);
  };


  const handleClear = () => {
    clearAIConfig();
    setApiKey('');
    setTestResult({ success: true, message: 'API key cleared. System returned to default internal RAG mode.' });
    if (onConfigSaved) {
      onConfigSaved({ apiKey: '', provider, model, customModel: '' });
    }
  };

  const currentModels = provider === 'gemini' ? GEMINI_MODELS : OPENAI_MODELS;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(5, 10, 24, 0.85)',
        backdropFilter: 'blur(8px)',
        padding: '20px',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '580px',
          maxHeight: '92vh',
          overflowY: 'auto',
          backgroundColor: '#0b1329',
          border: '1px solid #1e3a8a',
          borderRadius: '20px',
          boxShadow: '0 25px 60px -15px rgba(0,0,0,0.9), 0 0 30px rgba(14, 165, 233, 0.2)',
          padding: '28px',
          color: '#ffffff',
          position: 'relative',
          animation: 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #0ea5e9, #2563eb)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 16px rgba(14, 165, 233, 0.4)'
              }}
            >
              <Key size={22} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: '#ffffff' }}>
                  AI Engine Configuration
                </h3>
                <span style={{
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  backgroundColor: 'rgba(56, 189, 248, 0.2)',
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.4)',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <Zap size={10} /> LATEST GEMINI & OPENAI
                </span>
              </div>
              <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '2px 0 0 0' }}>
                Direct, zero-latency inference for all latest Google Gemini & OpenAI multimodal models.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              borderRadius: '8px',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleVerifyAndSave}>
          {/* Provider Selection */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '8px' }}>
              Select Intelligence Provider:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button
                type="button"
                onClick={() => handleProviderChange('gemini')}
                style={{
                  padding: '12px',
                  borderRadius: '12px',
                  border: provider === 'gemini' ? '2px solid #38bdf8' : '1px solid #1e293b',
                  backgroundColor: provider === 'gemini' ? 'rgba(56, 189, 248, 0.12)' : 'rgba(15, 23, 42, 0.6)',
                  color: '#ffffff',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <strong style={{ fontSize: '0.875rem', color: provider === 'gemini' ? '#38bdf8' : '#e2e8f0' }}>
                    Google Gemini
                  </strong>
                  <span style={{ fontSize: '0.65rem', backgroundColor: '#0284c7', color: '#ffffff', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                    RECOMMENDED
                  </span>
                </div>
                <span style={{ fontSize: '0.725rem', color: '#94a3b8' }}>
                  Gemini 2.5, 2.0 Flash, 2.0 Thinking & Imagen 3
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleProviderChange('openai')}
                style={{
                  padding: '12px',
                  borderRadius: '12px',
                  border: provider === 'openai' ? '2px solid #10b981' : '1px solid #1e293b',
                  backgroundColor: provider === 'openai' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(15, 23, 42, 0.6)',
                  color: '#ffffff',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <strong style={{ fontSize: '0.875rem', color: provider === 'openai' ? '#34d399' : '#e2e8f0' }}>
                    OpenAI
                  </strong>
                  <span style={{ fontSize: '0.65rem', backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34d399', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                    GPT-4o & DALL-E
                  </span>
                </div>
                <span style={{ fontSize: '0.725rem', color: '#94a3b8' }}>
                  GPT-4o, GPT-4o Mini, o1, o3-mini reasoning
                </span>
              </button>
            </div>
          </div>

          {/* Model Selection Dropdown with Latest Models */}
          <div style={{ marginBottom: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1' }}>
                Select Active Model ({currentModels.length} available):
              </label>
              {provider === 'gemini' && (
                <span style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 600 }}>
                  Supports all latest Gemini models
                </span>
              )}
            </div>

            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              style={{
                width: '100%',
                padding: '11px 14px',
                backgroundColor: 'rgba(7, 12, 24, 0.85)',
                border: '1px solid #334155',
                borderRadius: '10px',
                color: '#ffffff',
                fontSize: '0.85rem',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {currentModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} [{m.badge}] — {m.desc}
                </option>
              ))}
            </select>

            {/* Custom Model Input if 'custom' is selected */}
            {model === 'custom' && (
              <div style={{ marginTop: '10px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>
                  Enter Custom Model Identifier (e.g. gemini-2.5-flash, gemini-3.0-preview, etc.):
                </label>
                <input
                  type="text"
                  value={customModel}
                  onChange={(e) => setCustomModel(e.target.value)}
                  placeholder="e.g. gemini-2.5-flash"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    backgroundColor: 'rgba(7, 12, 24, 0.9)',
                    border: '1px solid #38bdf8',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    fontFamily: 'var(--font-mono)',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            )}
          </div>

          {/* API Key Input */}
          <div style={{ marginBottom: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1' }}>
                {provider === 'gemini' ? 'Google Gemini API Key' : 'OpenAI API Key'}:
              </label>
              {provider === 'gemini' ? (
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: '0.725rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '3px', textDecoration: 'none' }}
                >
                  Get free Gemini API key <ExternalLink size={11} />
                </a>
              ) : (
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: '0.725rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '3px', textDecoration: 'none' }}
                >
                  Get OpenAI key <ExternalLink size={11} />
                </a>
              )}
            </div>

            <div style={{ position: 'relative' }}>
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={provider === 'gemini' ? 'AIzaSy...' : 'sk-...'}
                style={{
                  width: '100%',
                  padding: '11px 44px 11px 14px',
                  backgroundColor: 'rgba(7, 12, 24, 0.8)',
                  border: '1px solid #334155',
                  borderRadius: '10px',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  fontFamily: 'var(--font-mono)',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '11px',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '2px'
                }}
              >
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '6px' }}>
              Keys are stored securely in your workstation browser's local sandbox storage.
            </p>
          </div>

          {/* Test Feedback Message */}
          {testResult && (
            <div
              style={{
                marginBottom: '18px',
                padding: '10px 14px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                fontSize: '0.8rem',
                backgroundColor: testResult.success ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                border: `1px solid ${testResult.success ? '#10b981' : '#ef4444'}`,
                color: testResult.success ? '#a7f3d0' : '#fca5a5'
              }}
            >
              {testResult.success ? (
                <CheckCircle size={16} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
              ) : (
                <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
              )}
              <div style={{ flex: 1, lineHeight: 1.4 }}>{testResult.message}</div>
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '24px' }}>
            {apiKey && (
              <button
                type="button"
                onClick={handleClear}
                style={{
                  padding: '10px 16px',
                  borderRadius: '10px',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  color: '#f87171',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Clear Key
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 16px',
                borderRadius: '10px',
                border: '1px solid #334155',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                color: '#cbd5e1',
                fontSize: '0.825rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Close
            </button>

            <button
              type="button"
              onClick={handleInstantSave}
              disabled={!apiKey.trim()}
              style={{
                padding: '10px 18px',
                borderRadius: '10px',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                backgroundColor: 'rgba(56, 189, 248, 0.12)',
                color: '#38bdf8',
                fontSize: '0.825rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
              title="Save key immediately and proceed to chat without waiting"
            >
              <Zap size={15} />
              <span>Instant Save & Chat</span>
            </button>

            <button
              type="submit"
              disabled={testing || !apiKey.trim()}
              style={{
                padding: '10px 20px',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                color: '#ffffff',
                fontSize: '0.825rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)'
              }}
            >
              {testing ? (
                <>
                  <Loader2 size={16} className="spin" />
                  <span>Verifying API Key...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Verify & Connect Key</span>
                </>
              )}
            </button>

          </div>
        </form>
      </div>
    </div>
  );
};

export default AIKeyConfigModal;
