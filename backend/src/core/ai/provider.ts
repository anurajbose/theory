import { setModelRunner, ModelRunner } from './gateway';
import logger from '../../utils/logger';

/**
 * Real model adapter — OpenAI-compatible /chat/completions over fetch (no SDK
 * dependency; works with OpenAI, Azure, local Ollama, vLLM…). Registered ONLY
 * when AI_ENABLED=true and a key/url are present; otherwise the S16 gateway
 * stays in governed-fallback mode (fully audited, no external calls).
 */
const URL = process.env.AI_PROVIDER_URL; // e.g. https://api.openai.com/v1/chat/completions
const KEY = process.env.AI_API_KEY;

export interface ChatRequest {
  model: string;
  messages: Array<{ role: 'system' | 'user'; content: string }>;
  temperature: number;
  max_tokens: number;
}

/** Pure — exported for deterministic assertion of the outbound shape. */
export function buildChatRequest(prompt: string, model: string): ChatRequest {
  return {
    model,
    messages: [
      { role: 'system', content: 'You are an operational-intelligence assistant. Use ONLY the metadata provided. Never infer or request private notes, journals, or credentials.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.2,
    max_tokens: 800,
  };
}

const httpModelRunner: ModelRunner = async (prompt, model) => {
  const res = await fetch(URL as string, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
    body: JSON.stringify(buildChatRequest(prompt, model)),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`provider ${res.status}`);
  const j = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  return {
    output: j.choices?.[0]?.message?.content ?? '',
    inputTokens: j.usage?.prompt_tokens,
    outputTokens: j.usage?.completion_tokens,
  };
};

/** Called at startup. No-op (governed fallback) unless fully configured. */
export function initAi(): void {
  if (process.env.AI_ENABLED === 'true' && URL && KEY) {
    setModelRunner(httpModelRunner);
    logger.info('AI provider registered', { url: URL.replace(/\/\/.*@/, '//') });
  } else {
    logger.info('AI disabled — gateway in governed-fallback mode');
  }
}
