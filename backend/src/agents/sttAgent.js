import Groq from 'groq-sdk';
import { logger } from '../utils/logger.js';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const WHISPER_MODEL = 'whisper-large-v3-turbo';

/**
 * Known Whisper hallucination strings — generated when it encounters silence
 * or noise with no real speech. Returning these to the LLM causes nonsense.
 * We treat them as empty transcripts.
 */
const HALLUCINATION_PATTERNS = [
  /^(thank you(?: for watching)?[.!]?\s*)+$/i,
  /^(thanks for watching[.!]?\s*)+$/i,
  /^(you\s*)+$/i,
  /^\s*\[.*?\]\s*$/,              // e.g. "[Music]" "[Applause]"
  /^\s*\(.*?\)\s*$/,              // e.g. "(silence)" "(noise)"
  /^[^a-zA-Z]*$/,                 // only punctuation / whitespace
  /^(.)\1{4,}$/,                  // repeated single char e.g. "......" "?????"
];

function isHallucination(text) {
  if (!text || text.trim().length < 2) return true;
  return HALLUCINATION_PATTERNS.some((re) => re.test(text.trim()));
}

/**
 * Transcribe an audio buffer using Groq Whisper.
 *
 * @param {Buffer} audioBuffer
 * @param {string} mimeType
 * @returns {Promise<{ transcript: string, durationMs?: number, noise?: boolean }>}
 */
export async function transcribe(audioBuffer, mimeType = 'audio/webm') {
  if (!process.env.GROQ_API_KEY) {
    throw Object.assign(new Error('GROQ_API_KEY is not configured'), {
      statusCode: 503,
      code: 'STT_NOT_CONFIGURED',
    });
  }

  const extension = mimeType.split('/')[1]?.split(';')[0] || 'webm';
  const fileName  = `audio.${extension}`;
  const blob      = new Blob([audioBuffer], { type: mimeType });
  const file      = new File([blob], fileName, { type: mimeType });

  logger.info('Calling Groq Whisper', { model: WHISPER_MODEL, fileName, bytes: audioBuffer.length });

  const response = await groq.audio.transcriptions.create({
    file,
    model:           WHISPER_MODEL,
    response_format: 'verbose_json',
    language:        'en',
    prompt:          'English phone call. Human speech only. Caller is booking an appointment.',
    temperature:     0,
  });

  const transcript   = response.text?.trim() ?? '';
  const segments     = response.segments ?? [];
  const avgNoSpeech  = segments.length
    ? segments.reduce((s, seg) => s + (seg.no_speech_prob ?? 0), 0) / segments.length
    : 0;

  logger.info('Groq Whisper response', {
    transcript: transcript.slice(0, 80),
    avgNoSpeechProb: avgNoSpeech.toFixed(3),
    segments: segments.length,
  });

  // 1. Whisper confidence — discard if mostly noise
  if (avgNoSpeech > 0.5) {
    logger.info('STT discarded — high no_speech_prob', { avgNoSpeech });
    return { transcript: '', noise: true };
  }

  // 2. Known hallucination strings — discard silently
  if (isHallucination(transcript)) {
    logger.info('STT discarded — hallucination pattern', { transcript });
    return { transcript: '', noise: true };
  }

  return { transcript };
}
