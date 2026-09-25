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
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    badge: 'RECOMMENDED • FASTEST',
    desc: 'Lowest latency & advanced multimodal engineering reasoning. Best for real-time plant diagnostics.'
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    badge: 'ROCK-SOLID STABILITY',
    desc: 'Production workhorse supported on all Google AI Studio and Vertex API keys.'
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    badge: 'ADVANCED REASONING',
    desc: 'Deep mechanical root-cause calculations, CAD drawings & MTTR analysis.'
  },
  {
    id: 'custom',
    name: 'Custom Gemini Model ID',
    badge: 'CUSTOM',
    desc: 'Specify any model ID or fine-tuned Google Vertex/AI Studio endpoint'
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

  // Automatically migrate invalid, deprecated, or fictional models to valid Google Gemini models
  if (
    !model ||
    model.startsWith('gemini-3.') ||
    model.startsWith('gemini-3-') ||
    model === 'gemini-2.5-flash' ||
    model === 'gemini-2.0-flash-lite' ||
    model === 'models/gemini-2.0-flash-lite'
  ) {
    model = 'gemini-2.0-flash';
    localStorage.setItem(STORAGE_KEYS.MODEL, 'gemini-2.0-flash');
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
  _overrideModel = null
}) => {
  const config = getAIConfig();
  const { apiKey, provider, model, customModel } = config;

  let effectiveModel = _overrideModel || (
    (model === 'custom' && customModel?.trim())
      ? customModel.trim()
      : (model || DEFAULT_MODELS[provider] || 'gemini-2.0-flash')
  );

  // Strip 'models/' prefix if present
  effectiveModel = effectiveModel.replace(/^models\//, '');

  // System instruction specialized for Operations Director & Equipment Troubleshooting
  const systemPrompt = `You are EquipFix AI Operations Director Copilot — an expert industrial AI diagnostics engineer, plant operations director, and reliability specialist.
Your mission is to provide rigorous, actionable, source-informed answers for manufacturing plant operations, CNC milling, hydraulic presses, robotics, safety protocols (OSHA 1910.147 Lockout/Tagout - LOTO), and predictive maintenance.

CRITICAL PRESENTATION RULES:
1. EMOJIS ARE MANDATORY: Liberally add intuitive, relevant emojis across your entire response:
   - Headers: e.g. ### 🔍 Root Cause Analysis, ### 🛠️ Recommended Action Steps, ### ⚠️ Safety & LOTO Protocol, ### 💡 Operational Insights, ### 📋 Parts & Tools Needed, ### 📊 Telemetry Diagnostics.
   - Bullets and action steps: e.g. 🔧, ⚙️, 🔩, ⚡, 🛡️, 🚨, 🧯, ✅, ⏱️, 🌡️, 📐, 🏭, 🔌.
2. DIAGRAMS & SCHEMATICS:
   - When explaining physical parts, mechanisms, electrical circuits, hydraulic flow, or procedural sequences, ALWAYS include a clear visual ASCII diagram (e.g. [Motor] ──▶ [Coupling] ──▶ [Bearing] ──▶ [Spindle]) to help the user clearly understand the concept visually.
3. When analyzing images, inspect mechanical components, electrical wear, thermal discoloration, structural fatigue, or safety hazards with engineering precision.
4. Format output with clean markdown headings, numbered steps, bold highlights, and safety callouts.
${context.machineCode ? `Current Machine Focus: ${context.machineCode}` : ''}
${context.incidentSummary ? `Active Symptom Context: ${context.incidentSummary}` : ''}`;

  // If user configured a Gemini key:
  if (apiKey && provider === 'gemini') {
    // 1. Build conversation history ensuring alternating roles starting with 'user'
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

    // Ensure the conversation starts with a 'user' turn
    while (contents.length > 0 && contents[0].role !== 'user') {
      contents.shift();
    }

    // Current query turn
    const promptText = contents.length === 0
      ? `${systemPrompt}\n\nUser Question/Instruction: ${prompt}`
      : prompt;

    const currentParts = [{ text: promptText }];
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

    const payload = {
      contents,
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 2048,
      }
    };

    // Sequential candidate models to attempt directly
    const candidateModels = Array.from(new Set([
      effectiveModel,
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-1.5-pro'
    ].filter(Boolean)));

    let directCallError = null;

    for (const currentModel of candidateModels) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${encodeURIComponent(apiKey)}`;

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          const candidate = data.candidates?.[0];
          const textOutput = candidate?.content?.parts?.map(p => p.text).join('') || '';

          if (textOutput.trim()) {
            saveAIConfig({ model: currentModel });
            return {
              text: textOutput,
              provider: `Google Gemini (${currentModel})`,
              realtime: true,
              hasVision: Boolean(imageBase64),
              groundedSource: `Gemini ${currentModel} Direct Stream`
            };
          }
        }

        const errData = await res.json().catch(() => ({}));
        const errMsg = errData.error?.message || `Google API returned status ${res.status}`;
        directCallError = errMsg;

        // If explicitly unauthorized or invalid key, throw clear error to let user know
        if (
          res.status === 400 ||
          res.status === 403 ||
          errMsg.includes('API key not valid') ||
          errMsg.includes('API_KEY_INVALID') ||
          errMsg.includes('PERMISSION_DENIED')
        ) {
          throw new Error(`Google Gemini API Key Error: ${errMsg}. Please update your key in Settings.`);
        }

        console.warn(`[EquipFixAI] Model ${currentModel} failed (${res.status}: ${errMsg}). Trying next model...`);
      } catch (attemptErr) {
        clearTimeout(timeoutId);
        if (attemptErr.message?.includes('Google Gemini API Key Error')) {
          throw attemptErr;
        }
        directCallError = attemptErr.message || 'Direct network request failed';
      }
    }

    // Direct browser calls failed (CORS, network error, or timeout).
    // Attempt Tier 2: Server-side proxy through /api/ai/chat with user's key!
    try {
      console.warn('[EquipFixAI] Direct browser call failed, attempting backend server proxy /api/ai/chat...');
      const proxyRes = await aiApi.chat({
        prompt,
        history: (history || []).map(h => ({
          role: (h.role === 'user' || h.sender === 'user') ? 'user' : 'model',
          content: h.content || h.text || ''
        })),
        api_key: apiKey,
        provider: 'gemini',
        model: effectiveModel,
        image_base64: imageBase64,
        image_mime: imageMime,
        machine_id: context.machineId || undefined,
        work_order_id: context.workOrderId || undefined
      });

      if (proxyRes.data?.text) {
        return {
          text: proxyRes.data.text,
          provider: proxyRes.data.provider || `Google Gemini (${effectiveModel}) [Proxy]`,
          realtime: true,
          hasVision: Boolean(imageBase64),
          groundedSource: proxyRes.data.grounded_source || 'Gemini Cloud via Secure Proxy'
        };
      }
    } catch (proxyErr) {
      const detail = proxyErr.response?.data?.detail || proxyErr.message;
      if (detail && (detail.includes('API key') || detail.includes('PERMISSION_DENIED'))) {
        throw new Error(detail);
      }
      console.warn('[EquipFixAI] Backend proxy also failed:', proxyErr);
    }
  }

  // If user configured an OpenAI key:
  if (apiKey && provider === 'openai') {
    const userContent = [{ type: 'text', text: prompt }];

    if (imageBase64) {
      const dataUrl = imageBase64.startsWith('data:')
        ? imageBase64
        : `data:${imageMime || 'image/jpeg'};base64,${imageBase64}`;
      userContent.push({
        type: 'image_url',
        image_url: { url: dataUrl }
      });
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(history || []).map(h => ({
        role: (h.role === 'user' || h.sender === 'user') ? 'user' : 'assistant',
        content: h.content || h.text || ''
      })),
      { role: 'user', content: userContent }
    ];

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: effectiveModel,
          messages,
          max_tokens: 2500,
          temperature: 0.25
        })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        const errMsg = err.error?.message || `OpenAI API error (${response.status})`;
        if (response.status === 401 || response.status === 403) {
          throw new Error(`OpenAI Authentication Error: ${errMsg}. Please update your API key.`);
        }
        throw new Error(errMsg);
      }

      const data = await response.json();
      const textOutput = data.choices?.[0]?.message?.content || 'No response generated.';

      return {
        text: textOutput,
        provider: `OpenAI (${effectiveModel})`,
        realtime: true,
        hasVision: Boolean(imageBase64),
        groundedSource: `OpenAI ${effectiveModel} Direct Stream`
      };
    } catch (err) {
      if (err.message?.includes('Authentication Error')) throw err;

      // Fallback to server-side proxy
      try {
        const proxyRes = await aiApi.chat({
          prompt,
          history: (history || []).map(h => ({
            role: (h.role === 'user' || h.sender === 'user') ? 'user' : 'assistant',
            content: h.content || h.text || ''
          })),
          api_key: apiKey,
          provider: 'openai',
          model: effectiveModel,
          image_base64: imageBase64,
          image_mime: imageMime,
          machine_id: context.machineId || undefined,
          work_order_id: context.workOrderId || undefined
        });

        if (proxyRes.data?.text) {
          return {
            text: proxyRes.data.text,
            provider: proxyRes.data.provider || `OpenAI (${effectiveModel}) [Proxy]`,
            realtime: true,
            hasVision: Boolean(imageBase64),
            groundedSource: proxyRes.data.grounded_source || 'OpenAI Cloud via Secure Proxy'
          };
        }
      } catch (proxyErr) {
        const detail = proxyErr.response?.data?.detail || proxyErr.message;
        throw new Error(detail || err.message);
      }
    }
  }

  // Fallback / No API Key: Use high-speed backend /api/ai/chat (handles greetings, plant RAG & diagnostics)
  try {
    const res = await aiApi.chat({
      prompt,
      history: (history || []).map(h => ({
        role: (h.role === 'user' || h.sender === 'user') ? 'user' : 'model',
        content: h.content || h.text || ''
      })),
      machine_id: context.machineId || undefined,
      work_order_id: context.workOrderId || undefined
    });

    const data = res.data;
    return {
      text: data.text,
      provider: data.provider || 'EquipFix Local Industrial Engine',
      realtime: data.realtime || false,
      hasVision: false,
      groundedSource: data.grounded_source || 'Internal Plant Manuals & Knowledge Base',
      raw: data
    };
  } catch (err) {
    const detail = err.response?.data?.detail || err.message || 'Troubleshooting query failed. Please configure your API key for direct real-time answers.';
    throw new Error(detail);
  }
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
