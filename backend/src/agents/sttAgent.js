import Groq from 'groq-sdk';
import { logger } from '../utils/logger.js';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const WHISPER_MODEL = 'whisper-large-v3-turbo';

/**
 * Transcribe an audio buffer using Groq Whisper.
 *
 * @param {Buffer} audioBuffer - Raw audio bytes
 * @param {string} mimeType    - MIME type e.g. 'audio/webm'
 * @returns {Promise<{ transcript: string }>}
 */
export async function transcribe(audioBuffer, mimeType = 'audio/webm') {
  if (!process.env.GROQ_API_KEY) {
    throw Object.assign(new Error('GROQ_API_KEY is not configured'), {
      statusCode: 503,
      code: 'STT_NOT_CONFIGURED',
    });
  }

  // Groq SDK accepts a File-like object. We wrap the buffer in a Blob.
  const extension = mimeType.split('/')[1]?.split(';')[0] || 'webm';
  const fileName  = `audio.${extension}`;
  const blob      = new Blob([audioBuffer], { type: mimeType });

  // The Groq Node SDK accepts File objects (available globally in Node 20+).
  const file = new File([blob], fileName, { type: mimeType });

  logger.info('Calling Groq Whisper', { model: WHISPER_MODEL, fileName, bytes: audioBuffer.length });

  const response = await groq.audio.transcriptions.create({
    file,
    model: WHISPER_MODEL,
    response_format: 'json',
    language: 'en',
  });

  const transcript = response.text?.trim() ?? '';

  logger.info('Groq Whisper response received', { transcriptLength: transcript.length });

  return { transcript };
}
