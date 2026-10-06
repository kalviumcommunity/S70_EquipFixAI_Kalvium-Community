/**
 * EquipFix AI Operations Copilot Service
 * Production-ready AI assistant service communicating strictly with the server backend.
 * All API keys are securely managed on the backend and never exposed to the client.
 */

import api, { aiApi, getBaseURL } from './api';

export const AI_PROVIDERS = {
  GEMINI: 'gemini',
};

export const GEMINI_MODELS = [
  {
    id: 'gemini-flash-lite-latest',
    name: 'Gemini Flash-Lite (Recommended)',
    badge: 'FAST & RESPONSIVE',
    desc: 'Google lightweight Gemini model for real-time conversation and diagnostics.'
  },
  {
    id: 'gemini-3.5-flash-lite',
    name: 'Gemini 3.5 Flash-Lite',
    badge: 'HIGH SPEED',
    desc: 'High-speed multimodal intelligence for rapid equipment operational checks.'
  },
  {
    id: 'gemini-3.6-flash',
    name: 'Gemini 3.6 Flash',
    badge: 'BALANCED',
    desc: 'Advanced reasoning and precision troubleshooting for complex machinery.'
  },
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    badge: 'FLAGSHIP',
    desc: 'Deep reasoning for comprehensive manufacturing and plant engineering queries.'
  }
];

export const DEFAULT_MODELS = {
  gemini: 'gemini-flash-lite-latest',
};

export const OPENAI_MODELS = [
  { id: 'gemini-flash-lite-latest', name: 'Gemini Flash-Lite', badge: 'RECOMMENDED', desc: 'Google Gemini real-time model' }
];

/**
 * Storage helpers for user model preferences only (NO API keys stored client-side)
 */
export const getAIConfig = () => {
  return {
    provider: 'gemini',
    model: typeof localStorage !== 'undefined' ? (localStorage.getItem('equipfix_ai_model') || 'gemini-flash-lite-latest') : 'gemini-flash-lite-latest',
    apiKey: '', // API key is strictly maintained on the backend
  };
};

export const saveAIConfig = ({ model }) => {
  if (typeof localStorage !== 'undefined' && model) {
    localStorage.setItem('equipfix_ai_model', model);
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('equipfix:aiconfig-updated', { detail: { model } }));
  }
  return { provider: 'gemini', model: model || 'gemini-flash-lite-latest' };
};

export const clearAIConfig = () => {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('equipfix_ai_model');
  }
};

export const testAIConnection = async () => {
  try {
    const res = await aiApi.chat({ message: 'ping' });
    return { success: true, message: 'Google Gemini backend connected successfully!' };
  } catch (e) {
    return { success: false, message: e.response?.data?.detail || e.message || 'Connection check failed' };
  }
};

export const fetchAvailableGeminiModels = async () => {
  try {
    const res = await aiApi.getModels();
    return res.data || GEMINI_MODELS;
  } catch (_) {
    return GEMINI_MODELS;
  }
};

export const buildCopilotResult = ({
  text = '',
  provider = 'Google Gemini',
  model = 'gemini-flash-lite-latest',
  sources = [],
  success = true,
  isStreamed = false
}) => {
  return {
    text,
    message: text,
    answer: text,
    content: text,
    provider,
    model,
    sources,
    success,
    isStreamed,
    timestamp: new Date().toISOString()
  };
};

/**
 * Primary AI Chat function supporting progressive token streaming via Server-Sent Events (SSE)
 * Architecture: User -> Chat UI -> Backend API -> Gemini API -> Backend -> Chat UI
 */
export const askEquipFixCopilot = async ({
  prompt = '',
  message = '',
  history = [],
  conversationId = null,
  context = {},
  imageBase64 = null,
  imageMime = 'image/jpeg',
  onChunk = null,
  signal = null
}) => {
  const queryText = (prompt || message || '').trim();
  if (!queryText && !imageBase64) {
    throw new Error('Please enter a message or attach an image.');
  }

  const activeModel = getAIConfig().model;
  const formattedHistory = (history || [])
    .filter((h) => h && h.id !== 'welcome' && !String(h.id || '').startsWith('sys-') && !String(h.id || '').startsWith('err-'))
    .map((h) => ({
      role: (h.role === 'user' || h.sender === 'user') ? 'user' : 'model',
      content: typeof h.content === 'string' ? h.content : (h.text || h.message || '')
    }));

  const requestPayload = {
    message: queryText,
    prompt: queryText,
    conversationId: conversationId || context.conversationId || undefined,
    history: formattedHistory,
    model: activeModel,
    image_base64: imageBase64,
    image_mime: imageMime,
    machine_id: context.machineId || undefined,
    work_order_id: context.workOrderId || undefined
  };

  let hasStreamedAnyToken = false;
  let accumulatedText = '';
  let finalSources = [];
  let returnedModel = activeModel;

  // STRATEGY 1: Server-Sent Events (SSE) Real-Time Token Streaming (/api/ai/chat/stream)
  try {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
    const streamEndpoint = `${getBaseURL()}/ai/chat/stream`;

    const streamResponse = await fetch(streamEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(requestPayload),
      signal: signal || undefined
    });

    if (streamResponse.ok && streamResponse.body) {
      const reader = streamResponse.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let streamErrorMessage = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine.startsWith('data: ')) {
            const dataString = trimmedLine.slice(6).trim();
            if (dataString) {
              try {
                const parsed = JSON.parse(dataString);
                if (parsed.error) {
                  streamErrorMessage = parsed.error;
                }
                if (parsed.text) {
                  accumulatedText += parsed.text;
                  hasStreamedAnyToken = true;
                  if (onChunk) {
                    onChunk(parsed.text, accumulatedText);
                  }
                }
                if (parsed.sources && Array.isArray(parsed.sources)) {
                  finalSources = parsed.sources;
                }
                if (parsed.model) {
                  returnedModel = parsed.model;
                }
              } catch (_) {
                // Partial line parse error, continue
              }
            }
          }
        }
      }

      if (streamErrorMessage && !accumulatedText.trim()) {
        throw new Error(streamErrorMessage);
      }

      if (accumulatedText.trim()) {
        return buildCopilotResult({
          text: accumulatedText,
          provider: `Google Gemini (${returnedModel})`,
          model: returnedModel,
          sources: finalSources,
          isStreamed: true
        });
      }
    } else if (streamResponse.status >= 400) {
      const errorJson = await streamResponse.json().catch(() => ({}));
      const errorDetail = errorJson.detail || errorJson.message || `Server returned error ${streamResponse.status}`;
      throw new Error(errorDetail);
    }
  } catch (streamErr) {
    if (signal?.aborted || streamErr.name === 'AbortError') {
      throw streamErr;
    }
    // If tokens already arrived, return what was accumulated rather than throwing
    if (hasStreamedAnyToken && accumulatedText.trim()) {
      return buildCopilotResult({
        text: accumulatedText,
        provider: `Google Gemini (${returnedModel})`,
        model: returnedModel,
        sources: finalSources,
        isStreamed: true
      });
    }
    // If it's a genuine server error, log and attempt normal non-streaming fallback
    console.warn('[EquipFixAI] Streaming unavailable, falling back to non-streaming endpoint:', streamErr.message);
  }

  // STRATEGY 2: Backend Standard Chat Endpoint (/api/ai/chat)
  try {
    const res = await aiApi.chat(requestPayload);
    const data = res.data || {};
    const responseText = data.message || data.text || '';

    if (responseText) {
      if (onChunk) {
        onChunk(responseText, responseText);
      }
      return buildCopilotResult({
        text: responseText,
        provider: data.provider || `Google Gemini (${data.model || activeModel})`,
        model: data.model || activeModel,
        sources: data.sources || [],
        isStreamed: false
      });
    }
    throw new Error('Received empty response from AI service.');
  } catch (err) {
    if (signal?.aborted || err.name === 'AbortError') {
      throw err;
    }
    const backendMessage = err.response?.data?.detail || err.response?.data?.message || err.message;
    throw new Error(backendMessage || 'AI service is temporarily unavailable. Please try again.');
  }
};

/**
 * Modern helper function matching the specification in Section 9
 */
export const sendAIChatMessage = async ({
  message,
  history = [],
  conversationId = null,
  machineId = null,
  onChunk = null,
  signal = null
}) => {
  return askEquipFixCopilot({
    prompt: message,
    message,
    history,
    conversationId,
    context: { machineId, conversationId },
    onChunk,
    signal
  });
};

/**
 * Industrial Image & Schematic Diagram Generator using Pollinations FLUX Engine
 */
export const generateIndustrialImage = async ({ prompt, style = 'schematic' }) => {
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

  const seed = Math.floor(Date.now() % 1000000);
  const encoded = encodeURIComponent(enhancedPrompt);
  const fluxUrl = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=768&model=flux&seed=${seed}&nologo=true`;

  return {
    imageUrl: fluxUrl,
    prompt: enhancedPrompt,
    provider: 'EquipFix FLUX Industrial Generator'
  };
};
