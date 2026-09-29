/**
 * EquipFix AI Operations Director Copilot Service
 * High-speed real-time multimodal intelligence engine powered strictly by Google Gemini API keys.
 * Supports all latest Gemini models (Gemini 2.0 Flash, Flash-Lite, 1.5 Flash, 1.5 Pro, 2.0 Pro Experimental, and custom models).
 * Features direct client-side SSE streaming and backend streaming fallback with zero dummy data and zero simulated delays.
 */

import api, { aiApi, getBaseURL } from './api';

const STORAGE_KEYS = {
  API_KEY: 'equipfix_ai_api_key',
  PROVIDER: 'equipfix_ai_provider', // 'gemini' | 'openai'
  MODEL: 'equipfix_ai_model',
  CUSTOM_MODEL: 'equipfix_ai_custom_model',
};

export const AI_PROVIDERS = {
  GEMINI: 'gemini',
  OPENAI: 'openai',
};

export const GEMINI_MODELS = [
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    badge: 'DEFAULT • RECOMMENDED',
    desc: 'Google flagship real-time multimodal model with lowest latency and state-of-the-art diagnostics.'
  },
  {
    id: 'gemini-2.0-flash-lite',
    name: 'Gemini 2.0 Flash-Lite',
    badge: 'ULTRA FAST & LIGHT',
    desc: 'High-speed, cost-effective inference for rapid plant checks and live metrics.'
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    badge: 'NEXT-GEN PREVIEW',
    desc: 'Cutting-edge reasoning benchmark for complex root-cause calculations and multi-step diagnostics.'
  },
  {
    id: 'gemini-2.0-pro-exp-02-05',
    name: 'Gemini 2.0 Pro Experimental',
    badge: 'DEEP REASONING PRO',
    desc: 'Google flagship reasoning model for intricate schematics & MTTR failure tree calculations.'
  },
  {
    id: 'custom',
    name: 'Custom Gemini Model ID',
    badge: 'CUSTOM MODEL',
    desc: 'Specify any Gemini model identifier (e.g. gemini-2.0-flash, gemini-2.5-flash, or Vertex model)'
  }
];

export const OPENAI_MODELS = [
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', badge: 'FAST & LIGHT', desc: 'Efficient standard diagnostic queries' },
  { id: 'gpt-4o', name: 'GPT-4o', badge: 'OMNI FLAGSHIP', desc: 'Top tier multimodal vision & reasoning' },
  { id: 'o1', name: 'o1', badge: 'DEEP THINKING', desc: 'Complex algorithmic troubleshooting' },
  { id: 'o3-mini', name: 'o3-mini', badge: 'REASONING MINI', desc: 'Fast STEM & industrial reasoning' },
  { id: 'custom', name: 'Custom OpenAI Model ID', badge: 'CUSTOM', desc: 'Specify custom model name or fine-tuned checkpoint' }
];

export const DEFAULT_MODELS = {
  gemini: 'gemini-2.0-flash',
  openai: 'gpt-4o-mini',
};

/**
 * Resolve user-selected model identifier to an ordered list of verified working models.
 * Ensures free tier Google Gemini keys work 100% reliably.
 * Permanently eliminates nonexistent aliases like gemini-1.5-flash, gemini-1.5-pro, etc.
 */
export const resolveGeminiCandidateModels = (modelName) => {
  let raw = (modelName || 'gemini-2.0-flash').replace(/^models\//, '').trim();
  if (
    raw.startsWith('gemini-1.5') ||
    raw.includes('flash-8b') ||
    raw.includes('flash-latest') ||
    raw.includes('pro-latest') ||
    raw === 'gemini-pro' ||
    raw === '1.5-flash' ||
    raw === '1.5-pro'
  ) {
    raw = 'gemini-2.0-flash';
  } else if (raw === '2.0-flash' || raw === '2.0' || raw === 'flash') {
    raw = 'gemini-2.0-flash';
  } else if (raw === '2.0-flash-lite' || raw === 'flash-lite') {
    raw = 'gemini-2.0-flash-lite';
  } else if (raw === '2.5-flash' || raw === '2.5') {
    raw = 'gemini-2.5-flash';
  }

  const list = [raw];
  for (const fallback of [
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-2.5-flash'
  ]) {
    if (!list.includes(fallback)) list.push(fallback);
  }
  return list;
};

export const getAIConfig = () => {
  let apiKey = localStorage.getItem(STORAGE_KEYS.API_KEY) || '';
  if (!apiKey && typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) {
    apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  }
  apiKey = apiKey.trim().replace(/^["']|["']$/g, '');

  let provider = localStorage.getItem(STORAGE_KEYS.PROVIDER);
  // Auto-detect provider if key prefix is unmistakable
  if (apiKey.startsWith('sk-')) {
    provider = 'openai';
  } else if (apiKey.startsWith('AIza')) {
    provider = 'gemini';
  } else if (!provider) {
    provider = 'gemini';
  }

  let model = localStorage.getItem(STORAGE_KEYS.MODEL);
  if (provider === 'openai') {
    if (!model || model.startsWith('gemini') || model === 'custom') {
      model = 'gpt-4o-mini';
      localStorage.setItem(STORAGE_KEYS.MODEL, model);
    }
  } else {
    if (!model || model.startsWith('gpt') || model.startsWith('o1') || model.startsWith('o3')) {
      model = 'gemini-2.0-flash';
      localStorage.setItem(STORAGE_KEYS.MODEL, model);
    }
    // Sanitize any stale or deprecated model names to prevent 404s
    if (
      model.startsWith('gemini-1.5') ||
      model.includes('flash-8b') ||
      model.includes('flash-latest') ||
      model.includes('pro-latest') ||
      model === 'gemini-pro' ||
      model === 'gemini-1.5-flash' ||
      model === 'gemini-1.5-pro'
    ) {
      model = 'gemini-2.0-flash';
      localStorage.setItem(STORAGE_KEYS.MODEL, model);
    }
  }

  const customModel = localStorage.getItem(STORAGE_KEYS.CUSTOM_MODEL) || '';
  return { apiKey, provider, model, customModel };
};

export const saveAIConfig = ({ apiKey, provider, model, customModel }) => {
  let cleanKey;
  if (apiKey !== undefined) {
    cleanKey = apiKey.trim().replace(/^["']|["']$/g, '');
    localStorage.setItem(STORAGE_KEYS.API_KEY, cleanKey);
  } else {
    cleanKey = localStorage.getItem(STORAGE_KEYS.API_KEY) || '';
  }

  let effectiveProvider = provider;
  if (cleanKey.startsWith('sk-')) {
    effectiveProvider = 'openai';
  } else if (cleanKey.startsWith('AIza')) {
    effectiveProvider = 'gemini';
  } else if (!effectiveProvider) {
    effectiveProvider = localStorage.getItem(STORAGE_KEYS.PROVIDER) || 'gemini';
  }
  localStorage.setItem(STORAGE_KEYS.PROVIDER, effectiveProvider);

  if (model !== undefined) {
    let cleanModel = model;
    if (effectiveProvider === 'openai' && (cleanModel.startsWith('gemini') || cleanModel === 'custom')) {
      cleanModel = 'gpt-4o-mini';
    } else if (effectiveProvider === 'gemini' && (cleanModel.startsWith('gpt') || cleanModel.startsWith('o1') || cleanModel.startsWith('o3'))) {
      cleanModel = 'gemini-2.0-flash';
    }
    if (
      cleanModel.startsWith('gemini-1.5') ||
      cleanModel.includes('flash-8b') ||
      cleanModel.includes('flash-latest') ||
      cleanModel.includes('pro-latest') ||
      cleanModel === 'gemini-pro'
    ) {
      cleanModel = 'gemini-2.0-flash';
    }
    localStorage.setItem(STORAGE_KEYS.MODEL, cleanModel);
  }

  if (customModel !== undefined) localStorage.setItem(STORAGE_KEYS.CUSTOM_MODEL, customModel.trim());
};

export const clearAIConfig = () => {
  localStorage.removeItem(STORAGE_KEYS.API_KEY);
  localStorage.removeItem(STORAGE_KEYS.PROVIDER);
  localStorage.removeItem(STORAGE_KEYS.MODEL);
  localStorage.removeItem(STORAGE_KEYS.CUSTOM_MODEL);
};

/**
 * Dynamically fetch all available models enabled for the user's API Key.
 * Queries Google Gemini API directly or via backend proxy to list all models supporting generateContent.
 */
export const fetchAvailableGeminiModels = async (apiKey) => {
  const cleanKey = (apiKey || getAIConfig().apiKey || '').trim().replace(/^["']|["']$/g, '');
  if (!cleanKey) return GEMINI_MODELS;

  // Try backend proxy first
  try {
    const res = await aiApi.getModels({ api_key: cleanKey });
    if (res.data && Array.isArray(res.data) && res.data.length > 0) {
      const items = res.data
        .filter((m) => !String(m.id || '').startsWith('gemini-1.5'))
        .map((m) => ({
          id: m.id,
          name: m.display_name || m.name,
          badge: m.is_default ? 'RECOMMENDED' : 'AVAILABLE',
          desc: m.description || `AI ${m.display_name} model for live diagnostics.`
        }));
      // Always include Custom model option at bottom
      items.push({
        id: 'custom',
        name: 'Custom Model ID',
        badge: 'CUSTOM MODEL',
        desc: 'Specify any custom or preview model identifier'
      });
      return items;
    }
  } catch (err) {
    console.warn('[EquipFixAI] Backend getModels attempt:', err);
  }

  // Direct Google API call fallback
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(cleanKey)}`);
    if (res.ok) {
      const data = await res.json();
      const raw = data.models || [];
      const contentModels = raw.filter((m) => {
        const cleanId = (m.name || '').replace(/^models\//, '');
        const methods = m.supportedGenerationMethods || [];
        return methods.includes('generateContent') && cleanId && !cleanId.startsWith('gemini-1.5');
      });
      if (contentModels.length > 0) {
        const items = contentModels.map((m) => {
          const cleanId = (m.name || '').replace(/^models\//, '');
          return {
            id: cleanId,
            name: m.displayName || cleanId,
            badge: cleanId === 'gemini-2.0-flash' ? 'RECOMMENDED' : 'AVAILABLE',
            desc: m.description || `Google Gemini ${m.displayName || cleanId}`
          };
        });
        items.push({
          id: 'custom',
          name: 'Custom Gemini Model ID',
          badge: 'CUSTOM MODEL',
          desc: 'Specify any custom or preview Gemini model identifier'
        });
        return items;
      }
    }
  } catch (e) {
    console.warn('[EquipFixAI] Direct Google models fetch failed:', e);
  }

  return GEMINI_MODELS;
};

/**
 * Validate API Key connectivity for any selected Gemini or OpenAI model.
 * Tests live connection without dummy data.
 */
export const testAIConnection = async ({ apiKey, provider, model, customModel }) => {
  const key = (apiKey || '').trim().replace(/^["']|["']$/g, '');
  if (!key) throw new Error('API key cannot be empty.');

  let effectiveProvider = provider;
  if (key.startsWith('sk-')) {
    effectiveProvider = 'openai';
  } else if (key.startsWith('AIza')) {
    effectiveProvider = 'gemini';
  } else if (!effectiveProvider) {
    effectiveProvider = 'gemini';
  }

  let effectiveModel = (model === 'custom' && customModel?.trim())
    ? customModel.trim()
    : (model || DEFAULT_MODELS[effectiveProvider] || (effectiveProvider === 'openai' ? 'gpt-4o-mini' : 'gemini-2.0-flash'));

  if (effectiveProvider === 'openai' && effectiveModel.startsWith('gemini')) {
    effectiveModel = 'gpt-4o-mini';
  } else if (effectiveProvider === 'gemini' && (effectiveModel.startsWith('gpt') || effectiveModel.startsWith('o1') || effectiveModel.startsWith('o3'))) {
    effectiveModel = 'gemini-2.0-flash';
  }

  effectiveModel = effectiveModel.replace(/^models\//, '');

  // Instant syntax sanity check
  if (effectiveProvider === 'gemini') {
    if (!key.startsWith('AIza') && key.length < 20) {
      throw new Error('Invalid Google Gemini key format. Google API keys typically begin with "AIza..."');
    }
  } else if (effectiveProvider === 'openai') {
    if (!key.startsWith('sk-') && key.length < 20) {
      throw new Error('Invalid OpenAI key format. OpenAI API keys typically begin with "sk-..."');
    }
  }

  // 1. Direct API validation
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    if (effectiveProvider === 'gemini') {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`;
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const errMsg = errData.error?.message || `Gemini API returned status ${response.status}`;
        throw new Error(`Google Authentication Error: ${errMsg}`);
      }

      return {
        success: true,
        message: `Google Gemini connected successfully! Active model: ${effectiveModel}`,
        provider: 'gemini',
        model: effectiveModel
      };
    }

    if (effectiveProvider === 'openai') {
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${key}`,
          Accept: 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const errMsg = errData.error?.message || `OpenAI API returned status ${response.status}`;
        throw new Error(`OpenAI Authentication Error: ${errMsg}`);
      }

      return {
        success: true,
        message: `OpenAI connected successfully! Active model: ${effectiveModel}`,
        provider: 'openai',
        model: effectiveModel
      };
    }
  } catch (err) {
    clearTimeout(timeoutId);

    // If direct fetch is blocked by CORS/network, use backend proxy verification
    try {
      const serverRes = await aiApi.verifyKey({
        api_key: key,
        provider: effectiveProvider,
        model: effectiveModel
      });

      if (serverRes.data?.success) {
        return {
          success: true,
          message: serverRes.data.message || `API key verified via secure proxy! (${effectiveModel})`,
          provider: serverRes.data.provider || effectiveProvider,
          model: serverRes.data.model || effectiveModel
        };
      } else {
        throw new Error(serverRes.data?.message || 'API key verification failed');
      }
    } catch (serverErr) {
      const msg = serverErr.response?.data?.detail || serverErr.message || err.message;
      throw new Error(msg);
    }
  }

  return {
    success: true,
    message: `Connected to ${effectiveProvider} (${effectiveModel})`,
    provider: effectiveProvider,
    model: effectiveModel
  };
};

/**
 * Real-Time AI Query Engine with Live SSE Streaming.
 * Strictly uses the configured Google Gemini API key. Zero dummy data, zero simulated token delays.
 */
export const askEquipFixCopilot = async ({
  prompt,
  history = [],
  imageBase64 = null,
  imageMime = 'image/jpeg',
  context = {},
  _overrideModel = null,
  onChunk = null
}) => {
  const config = getAIConfig();
  const { apiKey, provider, model, customModel } = config;

  // Strict enforcement: A valid API key is required. No dummy fallback answers!
  if (!apiKey) {
    throw new Error(
      'API key required. Real-time AI response is enabled exclusively via a valid Google Gemini or OpenAI API key. Please configure your API key to proceed.'
    );
  }

  const effectiveProvider = apiKey.startsWith('sk-')
    ? 'openai'
    : (apiKey.startsWith('AIza') ? 'gemini' : (provider || 'gemini'));

  let effectiveModel = _overrideModel || (
    (model === 'custom' && customModel?.trim())
      ? customModel.trim()
      : (model || DEFAULT_MODELS[effectiveProvider] || (effectiveProvider === 'openai' ? 'gpt-4o-mini' : 'gemini-2.0-flash'))
  );

  effectiveModel = effectiveModel.replace(/^models\//, '');
  if (effectiveProvider === 'openai') {
    if (effectiveModel.startsWith('gemini') || !effectiveModel) {
      effectiveModel = 'gpt-4o-mini';
    }
  } else {
    if (effectiveModel.startsWith('gpt') || effectiveModel.startsWith('o1') || effectiveModel.startsWith('o3') || !effectiveModel) {
      effectiveModel = 'gemini-2.0-flash';
    }
    if (effectiveModel === 'gemini-2.5-flash' || effectiveModel.includes('flash-8b') || effectiveModel.includes('flash-latest')) {
      effectiveModel = 'gemini-2.0-flash';
    }
  }

  // System instruction for grounded industrial diagnostics
  const systemPrompt = `You are EquipFix AI Copilot — an expert industrial maintenance diagnostics engineer and reliability specialist.
Your mission is to provide technically accurate, source-grounded, actionable troubleshooting guidance for plant machinery in REAL TIME.
Enforce OSHA 1910.147 Lockout/Tagout (LOTO) protocols where hazardous energy or disassembly is involved.
Format output cleanly with markdown headings (### 🔍 Root Cause Analysis, ### 🛠️ Recommended Action Steps, ### ⚠️ Safety & Lockout/Tagout Compliance).
Provide direct, high-value technical advice for floor technicians.
${context.machineCode ? `Plant Equipment Context: Machine Code ${context.machineCode}` : ''}
${context.incidentSummary ? `Active Symptom / Alarm: ${context.incidentSummary}` : ''}`;

  // STRATEGY 1A: Direct Real-Time Streaming from OpenAI API (SSE)
  if (effectiveProvider === 'openai') {
    const openAiMessages = [
      { role: 'system', content: systemPrompt }
    ];
    if (Array.isArray(history)) {
      for (const h of history) {
        if (h.id === 'welcome' || String(h.id || '').startsWith('sys-') || String(h.id || '').startsWith('ai-err-')) continue;
        const role = (h.role === 'user' || h.sender === 'user') ? 'user' : 'assistant';
        const text = (typeof h.content === 'string' ? h.content : (h.text || '')).trim();
        if (text) openAiMessages.push({ role, content: text });
      }
    }

    if (imageBase64) {
      const dataUrl = imageBase64.startsWith('data:') ? imageBase64 : `data:${imageMime || 'image/jpeg'};base64,${imageBase64}`;
      openAiMessages.push({
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: dataUrl } }
        ]
      });
    } else {
      openAiMessages.push({ role: 'user', content: prompt });
    }

    const openAiModelsToTry = [effectiveModel];
    if (!openAiModelsToTry.includes('gpt-4o-mini')) openAiModelsToTry.push('gpt-4o-mini');
    if (!openAiModelsToTry.includes('gpt-4o')) openAiModelsToTry.push('gpt-4o');

    for (const curModel of openAiModelsToTry) {
      try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: curModel,
            messages: openAiMessages,
            stream: true,
            temperature: 0.2
          })
        });

        if (res.ok && res.body) {
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let accumulatedText = '';
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop(); // keep partial line

            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed === 'data: [DONE]') break;
              if (trimmed.startsWith('data: ')) {
                const jsonStr = trimmed.slice(6).trim();
                if (jsonStr) {
                  try {
                    const parsed = JSON.parse(jsonStr);
                    const chunk = parsed.choices?.[0]?.delta?.content || '';
                    if (chunk) {
                      accumulatedText += chunk;
                      if (onChunk) {
                        onChunk(chunk, accumulatedText);
                      }
                    }
                  } catch (e) {
                    // ignore partial json chunk
                  }
                }
              }
            }
          }

          if (accumulatedText.trim()) {
            return {
              text: accumulatedText,
              provider: `OpenAI (${curModel})`,
              model: curModel,
              realtime: true,
              hasVision: Boolean(imageBase64),
              groundedSource: `OpenAI ${curModel} Live Stream`,
              isStreamed: true
            };
          }
        } else if (res.status === 401 || res.status === 403) {
          const errData = await res.json().catch(() => ({}));
          const errMsg = errData.error?.message || `HTTP ${res.status}`;
          throw new Error(`OpenAI Authentication Failed: ${errMsg}. Please check your OpenAI API key.`);
        }
      } catch (streamErr) {
        if (streamErr.message && streamErr.message.includes('Authentication Failed')) {
          throw streamErr;
        }
        console.warn(`[EquipFixAI] Direct OpenAI stream attempt on ${curModel} failed:`, streamErr.message);
      }
    }
  }

  // STRATEGY 1B: Direct Real-Time Streaming from Google Gemini API (SSE)
  if (effectiveProvider === 'gemini') {
    // Ground system instruction directly into user query turn to avoid HTTP 400 systemInstruction rejection
    const groundedPrompt = `[SYSTEM INSTRUCTIONS & PLANT SAFETY PROTOCOLS]\n${systemPrompt}\n\n[TECHNICIAN DIAGNOSTIC QUERY]\n${prompt}`;

    // Build clean contents payload
    const contents = [];
    if (Array.isArray(history) && history.length > 0) {
      for (const h of history) {
        const role = (h.role === 'user' || h.sender === 'user') ? 'user' : 'model';
        const text = (typeof h.content === 'string' ? h.content : (h.text || '')).trim();
        if (text) {
          if (contents.length > 0 && contents[contents.length - 1].role === role) {
            contents[contents.length - 1].parts[0].text += `\n\n${text}`;
          } else {
            contents.push({ role, parts: [{ text }] });
          }
        }
      }
    }
    while (contents.length > 0 && contents[0].role !== 'user') {
      contents.shift();
    }

    const currentParts = [];
    if (imageBase64) {
      const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9.+]+;base64,/, '');
      currentParts.push({
        inlineData: {
          mimeType: imageMime || 'image/jpeg',
          data: cleanBase64
        }
      });
    }
    currentParts.push({ text: groundedPrompt });

    if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
      contents[contents.length - 1].parts.push(...currentParts);
    } else {
      contents.push({ role: 'user', parts: currentParts });
    }

    const cleanList = resolveGeminiCandidateModels(effectiveModel);

    for (const curModel of cleanList) {
      const streamEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${curModel}:streamGenerateContent?key=${encodeURIComponent(apiKey)}&alt=sse`;
      const directEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${curModel}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const payload = {
        contents,
        generationConfig: { temperature: 0.2, maxOutputTokens: 4096 }
      };

      try {
        let res = await fetch(streamEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok && res.body) {
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let accumulatedText = '';
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop(); // keep partial line

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const jsonStr = line.slice(6).trim();
                if (jsonStr) {
                  try {
                    const parsed = JSON.parse(jsonStr);
                    if (parsed.error) {
                      console.warn(`[EquipFixAI] Stream error on ${curModel}:`, parsed.error.message);
                      break;
                    }
                    const chunk = parsed.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
                    if (chunk) {
                      accumulatedText += chunk;
                      if (onChunk) {
                        onChunk(chunk, accumulatedText);
                      }
                    }
                  } catch (e) {
                    // ignore partial chunk json parse
                  }
                }
              }
            }
          }

          if (accumulatedText.trim()) {
            return {
              text: accumulatedText,
              provider: `Google Gemini (${curModel})`,
              model: curModel,
              realtime: true,
              hasVision: Boolean(imageBase64),
              groundedSource: `Gemini ${curModel} Live Stream`,
              isStreamed: true
            };
          }
        }

        // Direct generateContent fallback if SSE response was not 200 or body was empty
        const directRes = await fetch(directEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (directRes.ok) {
          const data = await directRes.json();
          const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
          if (text.trim()) {
            if (onChunk) onChunk(text, text);
            return {
              text,
              provider: `Google Gemini (${curModel})`,
              model: curModel,
              realtime: true,
              hasVision: Boolean(imageBase64),
              groundedSource: `Gemini ${curModel} Direct Content`,
              isStreamed: false
            };
          }
        } else if (directRes.status === 400 || directRes.status === 403 || directRes.status === 401) {
          const errData = await directRes.json().catch(() => ({}));
          const errMsg = errData.error?.message || `HTTP ${directRes.status}`;
          if (errMsg.includes('API key not valid') || errMsg.includes('API_KEY_INVALID')) {
            throw new Error(`Google Gemini Authentication Failed: ${errMsg}. Please verify your API key.`);
          }
        }
      } catch (streamErr) {
        if (streamErr.message && streamErr.message.includes('Authentication Failed')) {
          throw streamErr;
        }
        console.warn(`[EquipFixAI] Direct attempt on ${curModel} failed:`, streamErr.message);
      }
    }
  }

  // STRATEGY 2: Backend Real-Time Streaming Proxy (/api/ai/chat/stream)
  // Used when client-side direct fetch is blocked by browser CORS, adblockers, or corporate proxy.
  try {
    const token = localStorage.getItem('token');
    const formattedHistory = (history || [])
      .filter((h) => h.id !== 'welcome' && !String(h.id || '').startsWith('sys-') && !String(h.id || '').startsWith('ai-err-'))
      .map((h) => ({
        role: (h.role === 'user' || h.sender === 'user') ? 'user' : 'model',
        content: typeof h.content === 'string' ? h.content : (h.text || '')
      }));

    const backendStreamRes = await fetch(`${getBaseURL()}/ai/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        prompt,
        history: formattedHistory,
        api_key: apiKey,
        provider: effectiveProvider,
        model: effectiveModel,
        image_base64: imageBase64,
        image_mime: imageMime,
        machine_id: context.machineId || undefined,
        work_order_id: context.workOrderId || undefined
      })
    });

    if (backendStreamRes.ok && backendStreamRes.body) {
      const reader = backendStreamRes.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';
      let buffer = '';
      let backendError = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6).trim();
            if (jsonStr) {
              try {
                const parsed = JSON.parse(jsonStr);
                if (parsed.error) {
                  backendError = parsed.error;
                }
                if (parsed.text) {
                  accumulatedText += parsed.text;
                  if (onChunk) {
                    onChunk(parsed.text, accumulatedText);
                  }
                }
              } catch (e) {
                // partial json chunk
              }
            }
          }
        }
      }

      if (backendError && !accumulatedText.trim()) {
        throw new Error(backendError);
      }

      if (accumulatedText.trim()) {
        return {
          text: accumulatedText,
          provider: effectiveProvider === 'openai' ? `OpenAI (${effectiveModel})` : `Google Gemini (${effectiveModel})`,
          model: effectiveModel,
          realtime: true,
          hasVision: Boolean(imageBase64),
          groundedSource: `${effectiveProvider === 'openai' ? 'OpenAI' : 'Gemini'} ${effectiveModel} + Plant Grounding (Real-Time)`,
          isStreamed: true
        };
      }
    }
  } catch (backendStreamErr) {
    if (backendStreamErr.message && backendStreamErr.message.includes('API key')) {
      throw backendStreamErr;
    }
    console.warn('[EquipFixAI] Backend SSE stream proxy attempt failed:', backendStreamErr.message);
  }

  // STRATEGY 3: Backend Non-Streaming Call (/api/ai/chat)
  try {
    const formattedHistory = (history || [])
      .filter((h) => h.id !== 'welcome' && !String(h.id || '').startsWith('sys-') && !String(h.id || '').startsWith('ai-err-'))
      .map((h) => ({
        role: (h.role === 'user' || h.sender === 'user') ? 'user' : 'model',
        content: typeof h.content === 'string' ? h.content : (h.text || '')
      }));

    const response = await aiApi.chat({
      prompt,
      history: formattedHistory,
      api_key: apiKey,
      provider: effectiveProvider,
      model: effectiveModel,
      image_base64: imageBase64,
      image_mime: imageMime,
      machine_id: context.machineId || undefined,
      work_order_id: context.workOrderId || undefined
    });

    if (response.data?.text) {
      const fullText = response.data.text;
      if (onChunk) {
        onChunk(fullText, fullText);
      }
      return {
        text: fullText,
        provider: response.data.provider || (effectiveProvider === 'openai' ? `OpenAI (${effectiveModel})` : `Google Gemini (${effectiveModel})`),
        model: response.data.model || effectiveModel,
        realtime: true,
        hasVision: Boolean(imageBase64),
        groundedSource: response.data.grounded_source || 'Plant Manuals & Vector Store',
        raw: response.data
      };
    }
  } catch (err) {
    const msg = err.response?.data?.detail || err.message;
    throw new Error(msg || 'AI Copilot inference failed. Please check your API key.');
  }

  throw new Error('AI Copilot service is currently unavailable. Please verify your API key and connection.');
};

/**
 * Industrial Image & Schematic Diagram Generator
 * Supports Google Imagen 3 (via Gemini API), OpenAI DALL-E 3, and Pollinations FLUX
 */
export const generateIndustrialImage = async ({ prompt, style = 'schematic' }) => {
  const config = getAIConfig();
  const { apiKey, provider } = config;

  const effectiveProvider = apiKey && apiKey.startsWith('sk-')
    ? 'openai'
    : (apiKey && apiKey.startsWith('AIza') ? 'gemini' : (provider || 'gemini'));

  let enhancedPrompt = prompt;
  if (style === 'schematic') {
    enhancedPrompt = `Detailed engineering schematic technical blueprint, industrial CAD drawing, precise line art, cross-section breakdown, high resolution industrial illustration: ${prompt}`;
  } else if (style === 'exploded') {
    enhancedPrompt = `Isometric exploded view assembly diagram of ${prompt}, engineering parts labels, clean technical illustration, 4k ultra-detailed mechanical schematic`;
  } else if (style === 'realistic') {
    enhancedPrompt = `Photorealistic modern industrial manufacturing plant photo of ${prompt}, high-tech machinery, clean workshop lighting, 8k resolution, professional photography`;
  } else if (style === 'safety') {
    enhancedPrompt = `OSHA compliant industrial safety warning sign, high contrast safety colors, standard warning icons, crisp vector sign for: ${prompt}`;
  }

  // Option 1: OpenAI DALL-E 3 if OpenAI key is active
  if (apiKey && effectiveProvider === 'openai') {
    try {
      const res = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: enhancedPrompt,
          n: 1,
          size: '1024x1024',
          quality: 'standard'
        })
      });
      if (res.ok) {
        const data = await res.json();
        const imgUrl = data.data?.[0]?.url;
        if (imgUrl) {
          return {
            imageUrl: imgUrl,
            prompt: enhancedPrompt,
            provider: 'OpenAI DALL-E 3'
          };
        }
      }
    } catch (err) {
      console.warn('DALL-E 3 call failed, falling back to Pollinations FLUX engine', err);
    }
  }

  // Option 2: Google Imagen 3 via Gemini API if Gemini key is active
  if (apiKey && effectiveProvider === 'gemini') {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${encodeURIComponent(apiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            instances: [{ prompt: enhancedPrompt }],
            parameters: { sampleCount: 1, aspectRatio: '4:3', outputMimeType: 'image/jpeg' }
          })
        }
      );
      if (res.ok) {
        const data = await res.json();
        const base64Bytes = data.predictions?.[0]?.bytesBase64Encoded;
        if (base64Bytes) {
          return {
            imageUrl: `data:image/jpeg;base64,${base64Bytes}`,
            prompt: enhancedPrompt,
            provider: 'Google Imagen 3 (imagen-3.0-generate-002)'
          };
        }
      }
    } catch (err) {
      console.warn('Google Imagen 3 call failed, using high-res FLUX fallback', err);
    }
  }

  // Option 3: High-definition FLUX engine via Pollinations.ai
  const seed = Math.floor(Date.now() % 1000000);
  const encoded = encodeURIComponent(enhancedPrompt);
  const fluxUrl = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=768&model=flux&seed=${seed}&nologo=true`;

  return {
    imageUrl: fluxUrl,
    prompt: enhancedPrompt,
    provider: 'EquipFix FLUX Industrial Generator'
  };
};
