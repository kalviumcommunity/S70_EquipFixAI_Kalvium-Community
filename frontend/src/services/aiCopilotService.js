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
    badge: 'DEFAULT • LOWEST LATENCY',
    desc: 'Google flagship real-time multimodal model with lowest latency and state-of-the-art diagnostics.'
  },
  {
    id: 'gemini-2.0-flash-lite',
    name: 'Gemini 2.0 Flash-Lite',
    badge: 'ULTRA FAST & LIGHT',
    desc: 'High-speed, cost-effective inference for rapid plant checks and live metrics.'
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    badge: 'ROCK-SOLID STABILITY',
    desc: 'Proven production workhorse supported on all Google AI Studio accounts.'
  },
  {
    id: 'gemini-1.5-flash-8b',
    name: 'Gemini 1.5 Flash-8B',
    badge: 'HIGH FREQUENCY',
    desc: 'Lightweight high-frequency diagnostic assistant with minimal token overhead.'
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    badge: '2M CONTEXT PRO',
    desc: 'Massive context window for comprehensive technical manuals, schematics & MTTR analysis.'
  },
  {
    id: 'gemini-2.0-pro-exp-02-05',
    name: 'Gemini 2.0 Pro Experimental',
    badge: 'DEEP REASONING PRO',
    desc: 'Cutting-edge reasoning benchmark for complex root-cause calculations.'
  },
  {
    id: 'gemini-exp-1206',
    name: 'Gemini Experimental 1206',
    badge: 'EXPERIMENTAL',
    desc: 'Experimental multimodal reasoning model for advanced diagnostics.'
  },
  {
    id: 'custom',
    name: 'Custom Gemini Model ID',
    badge: 'CUSTOM MODEL',
    desc: 'Specify any Gemini model identifier (e.g. gemini-2.5-flash, gemini-3.0-preview, or Vertex model)'
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

export const getAIConfig = () => {
  let apiKey = localStorage.getItem(STORAGE_KEYS.API_KEY) || '';
  if (!apiKey && typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) {
    apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  }
  apiKey = apiKey.trim().replace(/^["']|["']$/g, '');
  const provider = localStorage.getItem(STORAGE_KEYS.PROVIDER) || 'gemini';
  let model = localStorage.getItem(STORAGE_KEYS.MODEL) || DEFAULT_MODELS[provider] || 'gemini-2.0-flash';

  // Sanitize any stale or invalid default model
  if (model === 'gemini-2.5-flash') {
    model = 'gemini-2.0-flash';
    localStorage.setItem(STORAGE_KEYS.MODEL, model);
  }

  const customModel = localStorage.getItem(STORAGE_KEYS.CUSTOM_MODEL) || '';
  return { apiKey, provider, model, customModel };
};

export const saveAIConfig = ({ apiKey, provider, model, customModel }) => {
  if (apiKey !== undefined) {
    const cleanKey = apiKey.trim().replace(/^["']|["']$/g, '');
    localStorage.setItem(STORAGE_KEYS.API_KEY, cleanKey);
  }
  if (provider !== undefined) localStorage.setItem(STORAGE_KEYS.PROVIDER, provider);
  if (model !== undefined) {
    const cleanModel = model === 'gemini-2.5-flash' ? 'gemini-2.0-flash' : model;
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
      const items = res.data.map((m) => ({
        id: m.id,
        name: m.display_name || m.name,
        badge: m.is_default ? 'RECOMMENDED' : 'AVAILABLE',
        desc: m.description || `Google Gemini ${m.display_name} model for live diagnostics.`
      }));
      // Always include Custom model option at bottom
      items.push({
        id: 'custom',
        name: 'Custom Gemini Model ID',
        badge: 'CUSTOM MODEL',
        desc: 'Specify any custom or newer Gemini model identifier'
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
      const contentModels = raw.filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'));
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
export const testAIConnection = async ({ apiKey, provider = 'gemini', model, customModel }) => {
  const key = (apiKey || '').trim().replace(/^["']|["']$/g, '');
  if (!key) throw new Error('API key cannot be empty.');

  let effectiveModel = (model === 'custom' && customModel?.trim())
    ? customModel.trim()
    : (model || DEFAULT_MODELS[provider] || 'gemini-2.0-flash');

  effectiveModel = effectiveModel.replace(/^models\//, '');

  // Instant syntax sanity check
  if (provider === 'gemini') {
    if (!key.startsWith('AIza') && key.length < 20) {
      throw new Error('Invalid Google Gemini key format. Google API keys typically begin with "AIza..."');
    }
  } else if (provider === 'openai') {
    if (!key.startsWith('sk-') && key.length < 20) {
      throw new Error('Invalid OpenAI key format. OpenAI API keys typically begin with "sk-..."');
    }
  }

  // 1. Direct Google API validation
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    if (provider === 'gemini') {
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
        message: `Google Gemini connected successfully! Active model: ${effectiveModel}`
      };
    }

    if (provider === 'openai') {
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
        message: `OpenAI connected successfully! Active model: ${effectiveModel}`
      };
    }
  } catch (err) {
    clearTimeout(timeoutId);

    // If direct fetch is blocked by CORS/network, use backend proxy verification
    try {
      const serverRes = await aiApi.verifyKey({
        api_key: key,
        provider,
        model: effectiveModel
      });

      if (serverRes.data?.success) {
        return {
          success: true,
          message: serverRes.data.message || `API key verified via secure proxy! (${effectiveModel})`
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
    message: `Connected to ${provider} (${effectiveModel})`
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
      'Google Gemini API key required. Real-time AI response is enabled exclusively via a valid Gemini API key. Please configure your API key to proceed.'
    );
  }

  let effectiveModel = _overrideModel || (
    (model === 'custom' && customModel?.trim())
      ? customModel.trim()
      : (model || DEFAULT_MODELS[provider] || 'gemini-2.0-flash')
  );

  effectiveModel = effectiveModel.replace(/^models\//, '');
  if (effectiveModel === 'gemini-2.5-flash') {
    effectiveModel = 'gemini-2.0-flash';
  }

  // System instruction for grounded industrial diagnostics
  const systemPrompt = `You are EquipFix AI Copilot — an expert industrial maintenance diagnostics engineer and reliability specialist.
Your mission is to provide technically accurate, source-grounded, actionable troubleshooting guidance for plant machinery in REAL TIME.
Enforce OSHA 1910.147 Lockout/Tagout (LOTO) protocols where hazardous energy or disassembly is involved.
Format output cleanly with markdown headings (### 🔍 Root Cause Analysis, ### 🛠️ Recommended Action Steps, ### ⚠️ Safety & Lockout/Tagout Compliance).
Provide direct, high-value technical advice for floor technicians.
${context.machineCode ? `Plant Equipment Context: Machine Code ${context.machineCode}` : ''}
${context.incidentSummary ? `Active Symptom / Alarm: ${context.incidentSummary}` : ''}`;

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

  const currentParts = [{ text: prompt }];
  if (imageBase64) {
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9.+]+;base64,/, '');
    currentParts.push({
      inlineData: {
        mimeType: imageMime || 'image/jpeg',
        data: cleanBase64
      }
    });
  }

  if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
    contents[contents.length - 1].parts.push(...currentParts);
  } else {
    contents.push({ role: 'user', parts: currentParts });
  }

  // STRATEGY 1: Direct Real-Time Streaming from Google Gemini API (SSE)
  if (provider === 'gemini') {
    const candidateModels = [effectiveModel, 'gemini-2.0-flash', 'gemini-1.5-flash'];
    const seen = new Set();
    const cleanList = [];
    for (const m of candidateModels) {
      if (m && !seen.has(m)) {
        seen.add(m);
        cleanList.push(m);
      }
    }

    for (const curModel of cleanList) {
      const streamEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${curModel}:streamGenerateContent?key=${encodeURIComponent(apiKey)}&alt=sse`;

      try {
        const payload = {
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: { temperature: 0.2, maxOutputTokens: 4096 }
        };

        const res = await fetch(streamEndpoint, {
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
        } else if (res.status === 400 || res.status === 403) {
          const errData = await res.json().catch(() => ({}));
          const errMsg = errData.error?.message || `HTTP ${res.status}`;
          if (errMsg.includes('API key not valid') || errMsg.includes('API_KEY_INVALID') || errMsg.includes('PERMISSION_DENIED')) {
            throw new Error(`Google Gemini Authentication Failed: ${errMsg}. Please verify your API key.`);
          }
        }
      } catch (streamErr) {
        if (streamErr.message && streamErr.message.includes('Authentication Failed')) {
          throw streamErr;
        }
        console.warn(`[EquipFixAI] Direct stream attempt on ${curModel} failed:`, streamErr.message);
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
        provider: provider || 'gemini',
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
          provider: `Google Gemini (${effectiveModel})`,
          model: effectiveModel,
          realtime: true,
          hasVision: Boolean(imageBase64),
          groundedSource: `Gemini ${effectiveModel} + Plant Grounding (Real-Time)`,
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
      provider: provider || 'gemini',
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
        provider: response.data.provider || `Google Gemini (${effectiveModel})`,
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

  // Option 1: Google Imagen 3 via Gemini API
  if (apiKey && provider === 'gemini') {
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

  // Option 2: OpenAI DALL-E 3
  if (apiKey && provider === 'openai') {
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
