/**
 * TTS Agent — Interface only.
 *
 * Text-to-speech is handled entirely in the browser via the Web Speech API
 * (SpeechSynthesis). This module exists as a server-side interface so that:
 *
 *   1. The dialogue manager can emit agent lifecycle events (agent:active, agent:done)
 *      consistently for TTS, matching the STT and LLM agents.
 *   2. A real server-side TTS provider (e.g. Twilio, ElevenLabs) can be dropped
 *      in here without touching dialogueManager or any other module.
 *
 * When a server-side TTS provider is added:
 *   - Implement synthesize(text, options) → Buffer (audio)
 *   - Stream or send the buffer to the client via WebSocket
 *   - Update dialogueManager to await synthesize() before emitting agent:done
 */

/**
 * Notify that TTS has started (no-op on the server — browser handles playback).
 * The caller is responsible for emitting agent:active { agent:'tts' } via WS.
 *
 * @param {string} _text - The text to be spoken (unused server-side in v1)
 * @returns {Promise<void>}
 */
export async function speak(_text) {
  // No-op: TTS is executed in the browser via SpeechSynthesis.
  // This function is a placeholder for future server-side TTS integration.
}
