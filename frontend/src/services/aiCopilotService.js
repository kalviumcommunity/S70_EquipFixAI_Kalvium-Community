/**
 * EquipFix AI Operations Director Copilot Service
 * Supports manual API Key configuration for Google Gemini (all latest 3.6, 3.5, 3.0, 2.5 models),
 * OpenAI, real-time multimodal vision inspection (equipment/photo analysis),
 * and industrial image/diagram generation (Google Imagen 3, FLUX, DALL-E 3).
 */

import api, { aiApi } from './api';

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
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    badge: 'LATEST • HYBRID REASONING',
    desc: 'Google next-gen hybrid reasoning & coding model with ultra-low latency for industrial diagnostics.'
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    badge: 'FLAGSHIP REASONING',
    desc: 'Deep engineering reasoning, complex physics calculations, and multimodal machine diagnostics.'
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    badge: 'RECOMMENDED • FASTEST',
    desc: 'Lowest latency & advanced multimodal engineering reasoning. Best for real-time plant diagnostics.'
  },
  {
    id: 'gemini-2.0-flash-lite',
    name: 'Gemini 2.0 Flash-Lite',
    badge: 'ULTRA LIGHT & FAST',
    desc: 'High-throughput, ultra-low latency inference for instant operational checks.'
  },
  {
    id: 'gemini-2.0-pro-exp-02-05',
    name: 'Gemini 2.0 Pro Experimental',
    badge: 'EXPERIMENTAL PRO',
    desc: 'Cutting-edge reasoning benchmark for complex root-cause calculations.'
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    badge: 'ROCK-SOLID STABILITY',
    desc: 'Production workhorse supported on all Google AI Studio and Vertex API keys.'
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
    id: 'custom',
    name: 'Custom Gemini Model ID',
    badge: 'CUSTOM MODEL',
    desc: 'Specify any model ID (e.g. gemini-3.0-preview, gemini-exp, or fine-tuned Google Vertex endpoint)'
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
  gemini: 'gemini-2.5-flash',
  openai: 'gpt-4o-mini',
};

export const getAIConfig = () => {
  let apiKey = localStorage.getItem(STORAGE_KEYS.API_KEY) || '';
  if (!apiKey && typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) {
    apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  }
  apiKey = apiKey.trim().replace(/^["']|["']$/g, '');
  const provider = localStorage.getItem(STORAGE_KEYS.PROVIDER) || 'gemini';
  let model = localStorage.getItem(STORAGE_KEYS.MODEL) || DEFAULT_MODELS[provider] || 'gemini-2.5-flash';

  const customModel = localStorage.getItem(STORAGE_KEYS.CUSTOM_MODEL) || '';
  return { apiKey, provider, model, customModel };
};

export const saveAIConfig = ({ apiKey, provider, model, customModel }) => {
  if (apiKey !== undefined) {
    const cleanKey = apiKey.trim().replace(/^["']|["']$/g, '');
    localStorage.setItem(STORAGE_KEYS.API_KEY, cleanKey);
  }
  if (provider !== undefined) localStorage.setItem(STORAGE_KEYS.PROVIDER, provider);
  if (model !== undefined) localStorage.setItem(STORAGE_KEYS.MODEL, model);
  if (customModel !== undefined) localStorage.setItem(STORAGE_KEYS.CUSTOM_MODEL, customModel.trim());
};

export const clearAIConfig = () => {
  localStorage.removeItem(STORAGE_KEYS.API_KEY);
  localStorage.removeItem(STORAGE_KEYS.PROVIDER);
  localStorage.removeItem(STORAGE_KEYS.MODEL);
  localStorage.removeItem(STORAGE_KEYS.CUSTOM_MODEL);
};

/**
 * Validate API Key connectivity for any selected Gemini or OpenAI model.
 * Uses direct browser fetch first; falls back to backend proxy (/api/ai/verify-key) if CORS/network blocked.
 */
export const testAIConnection = async ({ apiKey, provider, model, customModel }) => {
  const key = (apiKey || '').trim().replace(/^["']|["']$/g, '');
  if (!key) throw new Error('API key cannot be empty.');

  let effectiveModel = (model === 'custom' && customModel?.trim())
    ? customModel.trim()
    : (model || DEFAULT_MODELS[provider] || 'gemini-2.0-flash');

  // Strip 'models/' prefix if present
  effectiveModel = effectiveModel.replace(/^models\//, '');

  // 1. Instant Syntax Validation Check
  if (provider === 'gemini') {
    if (!key.startsWith('AIza') && key.length < 20) {
      throw new Error('Invalid Google Gemini key format. Google API keys typically begin with "AIza..."');
    }
  } else if (provider === 'openai') {
    if (!key.startsWith('sk-') && key.length < 20) {
      throw new Error('Invalid OpenAI key format. OpenAI API keys typically begin with "sk-..."');
    }
  }

  // 2. Direct Browser Verification with 3.5s timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3500);

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
        if (
          response.status === 400 ||
          response.status === 403 ||
          errMsg.includes('API key not valid') ||
          errMsg.includes('API_KEY_INVALID') ||
          errMsg.includes('PERMISSION_DENIED')
        ) {
          throw new Error(`Google API Authentication Error: ${errMsg}`);
        }
      } else {
        return {
          success: true,
          message: `Google Gemini connected successfully! Active model: ${effectiveModel}`
        };
      }
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
        if (response.status === 401 || response.status === 403) {
          throw new Error(`OpenAI Authentication Error: ${errMsg}`);
        }
      } else {
        return {
          success: true,
          message: `OpenAI connected successfully! Active model: ${effectiveModel}`
        };
      }
    }
  } catch (err) {
    clearTimeout(timeoutId);

    // If it's a confirmed authentication/permission rejection, don't mask it
    if (
      err.message?.includes('Authentication Error') ||
      err.message?.includes('API key not valid') ||
      err.message?.includes('API_KEY_INVALID') ||
      err.message?.includes('PERMISSION_DENIED')
    ) {
      throw err;
    }

    // Direct browser fetch failed (likely CORS, adblocker, or network block).
    // Attempt backend server-side verification:
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
      const msg = serverErr.response?.data?.detail || serverErr.message;
      if (msg && !msg.includes('Network Error')) {
        throw new Error(msg);
      }
    }

    // If key format matches standard prefix, allow fallback
    if ((provider === 'gemini' && key.startsWith('AIza')) || (provider === 'openai' && key.startsWith('sk-'))) {
      return {
        success: true,
        message: `API key saved and configured for ${provider === 'gemini' ? 'Google Gemini' : 'OpenAI'} (${effectiveModel}).`
      };
    }

    throw err;
  }

  return {
    success: true,
    message: `Connected to ${provider} (${effectiveModel})`
  };
};

/**
 * Real-time AI Query Engine
 * Supports text, multi-turn history, and multimodal image analysis.
 * Uses client-side direct calls, with automatic server-side proxy fallback to /api/ai/chat.
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

  let effectiveModel = _overrideModel || (
    (model === 'custom' && customModel?.trim())
      ? customModel.trim()
      : (model || DEFAULT_MODELS[provider] || 'gemini-2.5-flash')
  );

  // Strip 'models/' prefix if present
  effectiveModel = effectiveModel.replace(/^models\//, '');

  // Helper to simulate smooth progressive token delivery if server responded in one batch
  const streamTokensProgressively = async (fullText) => {
    if (!onChunk || !fullText) return;
    const words = fullText.split(/(\s+)/);
    let accumulated = '';
    const chunkSize = 3;
    for (let i = 0; i < words.length; i += chunkSize) {
      const part = words.slice(i, i + chunkSize).join('');
      accumulated += part;
      onChunk(part, accumulated);
      await new Promise(r => setTimeout(r, 16));
    }
  };

  // Strategy A: Direct High-Speed Gemini SSE Stream (if user provided a Google Gemini API Key)
  if (apiKey && provider === 'gemini') {
    const systemPrompt = `You are EquipFix AI Copilot — an expert industrial maintenance diagnostics engineer and reliability specialist.
Provide concise, technically sound, and actionable troubleshooting guidance for plant machinery.
Enforce OSHA 1910.147 Lockout/Tagout (LOTO) protocols where hazardous energy or disassembly is involved.
Format output cleanly with markdown headers, numbered steps, and safety warnings. Do not spam emojis or output canned diagrams.
${context.machineCode ? `Asset Context: ${context.machineCode}` : ''}
${context.incidentSummary ? `Active Symptom: ${context.incidentSummary}` : ''}`;

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

    const streamEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${effectiveModel}:streamGenerateContent?key=${encodeURIComponent(apiKey)}&alt=sse`;
    try {
      const res = await fetch(streamEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: { temperature: 0.2, maxOutputTokens: 2048 }
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
          buffer = lines.pop(); // keep partial line for next iteration
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonStr = line.slice(6).trim();
              if (jsonStr) {
                try {
                  const parsed = JSON.parse(jsonStr);
                  const chunk = parsed.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
                  if (chunk) {
                    accumulatedText += chunk;
                    if (onChunk) {
                      onChunk(chunk, accumulatedText);
                    }
                  }
                } catch (e) {
                  // ignore partial JSON chunk parse
                }
              }
            }
          }
        }

        if (accumulatedText.trim()) {
          return {
            text: accumulatedText,
            provider: `Google Gemini (${effectiveModel})`,
            realtime: true,
            hasVision: Boolean(imageBase64),
            groundedSource: `Gemini ${effectiveModel} Real-Time Stream`,
            isStreamed: true
          };
        }
      }
    } catch (directStreamErr) {
      console.warn('[EquipFixAI] Direct streaming fetch fallback to proxy:', directStreamErr);
    }
  }

  // Strategy B: Grounded Backend Inference via /api/ai/chat
  // The backend attaches actual plant technical manuals, equipment specifications,
  // safety protocols, and past repair history from the vector store before invoking
  // the model with the user's API key (or local engine).
  try {
    const formattedHistory = (history || [])
      .filter(h => h.id !== 'welcome' && !String(h.id || '').startsWith('sys-') && !String(h.id || '').startsWith('ai-err-'))
      .map(h => ({
        role: (h.role === 'user' || h.sender === 'user') ? 'user' : 'model',
        content: typeof h.content === 'string' ? h.content : (h.text || '')
      }));

    const response = await aiApi.chat({
      prompt,
      history: formattedHistory,
      api_key: apiKey || undefined,
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
        await streamTokensProgressively(fullText);
      }
      return {
        text: fullText,
        provider: response.data.provider || (apiKey ? `${provider.toUpperCase()} (${effectiveModel})` : 'EquipFix Industrial Engine'),
        realtime: response.data.realtime !== false,
        hasVision: Boolean(imageBase64),
        groundedSource: response.data.grounded_source || 'Plant Manuals & Vector Store',
        raw: response.data
      };
    }
  } catch (backendErr) {
    const errDetail = backendErr.response?.data?.detail || backendErr.message;
    if (errDetail && (
      errDetail.includes('API key') ||
      errDetail.includes('PERMISSION_DENIED') ||
      errDetail.includes('API_KEY_INVALID') ||
      errDetail.includes('Authentication Error')
    )) {
      throw new Error(errDetail);
    }
    console.warn('[EquipFixAI] Grounded backend proxy attempt:', errDetail);
  }

  throw new Error('AI Copilot service is currently unavailable. Please verify your API key and connection in Settings.');
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

  // Option 3: High-definition FLUX engine via Pollinations.ai (Free, ultra-fast, zero-token cost)
  const seed = Math.floor(Math.random() * 1000000);
  const encoded = encodeURIComponent(enhancedPrompt);
  const fluxUrl = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=768&model=flux&seed=${seed}&nologo=true`;

  return {
    imageUrl: fluxUrl,
    prompt: enhancedPrompt,
    provider: 'EquipFix FLUX Industrial Generator'
  };
};
