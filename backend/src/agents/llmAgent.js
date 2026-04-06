import Groq from 'groq-sdk';
import { logger } from '../utils/logger.js';
import { startTimer } from '../utils/timer.js';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const LLM_MODEL       = 'llama-3.3-70b-versatile';
const MAX_TOKENS      = 512;
const TEMPERATURE     = 0.7;

/**
 * Stream a response from the Groq LLM.
 *
 * Calls onToken for each streamed token and returns the full assembled response.
 *
 * @param {Array<{ role: string, content: string }>} messages  - Full conversation history
 * @param {{ onToken: (token: string) => void }}     callbacks
 * @returns {Promise<{ response: string, durationMs: number }>}
 */
export async function streamResponse(messages, { onToken }) {
  if (!process.env.GROQ_API_KEY) {
    throw Object.assign(new Error('GROQ_API_KEY is not configured'), {
      statusCode: 503,
      code: 'LLM_NOT_CONFIGURED',
    });
  }

  logger.info('Starting LLM stream', { model: LLM_MODEL, messageCount: messages.length });

  const timer  = startTimer();
  let fullText = '';

  const stream = await groq.chat.completions.create({
    model: LLM_MODEL,
    messages,
    max_tokens: MAX_TOKENS,
    temperature: TEMPERATURE,
    stream: true,
  });

  for await (const chunk of stream) {
    const token = chunk.choices[0]?.delta?.content ?? '';
    if (token) {
      fullText += token;
      onToken(token);
    }
  }

  const durationMs = timer.stop();

  logger.info('LLM stream complete', { durationMs, responseLength: fullText.length });

  return { response: fullText, durationMs };
}
