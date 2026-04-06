/**
 * REST API client for CallOrchestrator backend.
 * All requests go to VITE_API_BASE_URL.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

async function handleResponse(res) {
  const contentType = res.headers.get('content-type') ?? '';

  if (!res.ok) {
    let errorBody;
    try {
      errorBody = contentType.includes('application/json') ? await res.json() : await res.text();
    } catch {
      errorBody = { message: res.statusText };
    }

    const message =
      (typeof errorBody === 'object' && errorBody?.message) ||
      `HTTP ${res.status}: ${res.statusText}`;

    throw new Error(message);
  }

  if (contentType.includes('application/json')) {
    return res.json();
  }

  return res.text();
}

/**
 * Start a new call session.
 * @param {string} [workflow='appointment'] - Workflow type
 * @returns {Promise<{ sessionId: string, status: string }>}
 */
export async function startCall(workflow = 'appointment') {
  const res = await fetch(`${BASE_URL}/api/call/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workflow }),
  });
  return handleResponse(res);
}

/**
 * End an active call session.
 * @param {string} sessionId
 * @returns {Promise<{ summary: string }>}
 */
export async function endCall(sessionId) {
  const res = await fetch(`${BASE_URL}/api/call/end`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  });
  return handleResponse(res);
}

/**
 * Transcribe an audio blob via Groq Whisper.
 * @param {Blob} audioBlob - WebM/Opus audio blob
 * @param {string} sessionId
 * @returns {Promise<{ transcript: string, durationMs: number }>}
 */
export async function transcribeAudio(audioBlob, sessionId) {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'audio.webm');
  formData.append('sessionId', sessionId);

  const res = await fetch(`${BASE_URL}/api/stt`, {
    method: 'POST',
    body: formData,
  });
  return handleResponse(res);
}

/**
 * Send a transcript to the LLM for processing.
 * Response is delivered via WebSocket stream (llm:token events).
 * @param {string} sessionId
 * @param {string} transcript
 * @returns {Promise<void>}
 */
export async function processTranscript(sessionId, transcript) {
  const res = await fetch(`${BASE_URL}/api/llm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, transcript }),
  });
  return handleResponse(res);
}

/**
 * Fetch the current session state.
 * @param {string} sessionId
 * @returns {Promise<{ session: object }>}
 */
export async function getSession(sessionId) {
  const res = await fetch(`${BASE_URL}/api/session/${sessionId}`);
  return handleResponse(res);
}
