/**
 * Dialogue Manager
 *
 * Central state machine that orchestrates the voice pipeline per turn:
 *   STT → (transcript) → LLM (stream) → TTS lifecycle events
 *
 * Relies on wsServer to push events to the correct WebSocket client.
 * Relies on workflowRegistry to look up the correct workflow module.
 * Relies on sessionService to read/write session state.
 */

import * as sessionService  from '../services/session.service.js';
import * as llmAgent        from './llmAgent.js';
import { getWorkflow }      from '../workflows/workflowRegistry.js';
import { emitToClient }     from '../wsServer.js';
import { startTimer }       from '../utils/timer.js';
import { generateId }       from '../utils/idGenerator.js';
import { logger }           from '../utils/logger.js';
import * as appointmentRepo from '../mock/repositories/appointmentRepo.js';

const MAX_RETRIES = 2;

// ---------------------------------------------------------------------------
// System prompt builder
// ---------------------------------------------------------------------------

/**
 * Build a system prompt for the LLM based on the current workflow step.
 * @param {object} workflow - Workflow module
 * @param {number} stepIndex
 * @param {object} collectedData
 * @returns {string}
 */
function buildSystemPrompt(workflow, stepIndex, collectedData) {
  const step = workflow.steps[stepIndex];
  const dataContext = Object.keys(collectedData).length
    ? `\n\nData collected so far:\n${JSON.stringify(collectedData, null, 2)}`
    : '';

  // If we have the caller's name and are on the appointment type step,
  // look up their history so Aria can personalise the response.
  // If multiple records match the name, require booking ref verification first.
  let returningCallerContext = '';
  if (collectedData.callerName && stepIndex === 2) {
    try {
      const { findByName } = await import('../mock/repositories/appointmentRepo.js');
      const matches = findByName(collectedData.callerName);

      if (matches.length === 1) {
        // Unique match — safe to personalise
        const past = matches[0];
        returningCallerContext = `\n\nReturning caller context: ${collectedData.callerName} has one previous appointment on record — type: "${past.appointmentType}", date: ${past.preferredDate}. Mention this naturally when offering appointment types.`;
      } else if (matches.length > 1) {
        // Multiple records with same name — must verify identity first
        returningCallerContext = `\n\nData privacy notice: Multiple records found for the name "${collectedData.callerName}". Do NOT reveal any appointment details. Instead, ask the caller: "For security, could you share your previous booking reference number?" If they provide it and it matches (booking refs look like APT-XXXX), then personalise. If they don't have one, treat them as a new caller.`;
      }
    } catch { /* ignore lookup errors */ }
  }

  return [
    `You are Aria, a friendly receptionist on a phone call. Keep every reply to ONE short sentence — like a real human on a call.`,
    `Rules:`,
    `- One sentence per reply, maximum two if absolutely necessary.`,
    `- Never repeat or summarise what the caller just said.`,
    `- Never confirm what you already know before asking the next question — just ask it directly.`,
    `- No filler phrases like "Great!", "Perfect!", "Of course!", "Certainly!" or "Sure thing!".`,
    `- Never use the caller's name more than once per conversation — it sounds robotic.`,
    `- Never invent options or lists unless the current task explicitly instructs you to read out a list (e.g. appointment types).`,
    `- You only handle appointment scheduling. If the caller asks about anything else, politely say you can only help with booking appointments.`,
    `- If the caller's answer is unclear, a filler sound ("uh", "um", "huh"), too short, or doesn't answer the question, ask the same question again differently — never advance.`,
    `- Speech recognition sometimes mishears words. Use context to correct obvious errors (e.g. "apartment" likely means "appointment").`,
    `- No bullet points, markdown, or lists — plain spoken words only.`,
    `- Sound natural and human, not scripted. Short pauses in thought are fine.`,
    `- Only introduce yourself as Aria on the very first turn of the call.`,
    `Current task: ${step.instruction}`,
    dataContext,
    returningCallerContext,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Emit helpers
// ---------------------------------------------------------------------------

function emit(wsClientId, type, payload) {
  if (!wsClientId) return;
  emitToClient(wsClientId, { type, payload });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Initiate a session — sends the opening greeting from the AI without waiting
 * for user input. This triggers step 0 of the workflow.
 *
 * @param {string} sessionId
 */
export async function startSession(sessionId) {
  const session = sessionService.getSession(sessionId);
  if (!session) {
    logger.error('startSession: session not found', { sessionId });
    return;
  }

  const workflow = getWorkflow(session.workflow);
  const step     = workflow.steps[0];

  // Build the initial LLM prompt (no user message yet — the AI speaks first)
  const systemPrompt = buildSystemPrompt(workflow, 0, session.collectedData);
  const messages = [
    { role: 'system',    content: systemPrompt },
    { role: 'user',      content: 'Begin the call.' },
  ];

  sessionService.updateSession(sessionId, {
    conversationHistory: messages,
  });

  await runLlmTurn(sessionId, messages, step);
}

/**
 * Process a user transcript — the core per-turn handler called after STT.
 *
 * @param {string} sessionId
 * @param {string} transcript - Raw transcript from STT
 */
export async function processTranscript(sessionId, transcript) {
  const session = sessionService.getSession(sessionId);
  if (!session) {
    logger.error('processTranscript: session not found', { sessionId });
    return;
  }

  if (session.status === 'ended') {
    logger.warn('processTranscript: session already ended', { sessionId });
    return;
  }

  const workflow    = getWorkflow(session.workflow);
  const currentStep = session.currentStep;
  const step        = workflow.steps[currentStep];

  if (!step) {
    logger.warn('processTranscript: no step found', { sessionId, currentStep });
    return;
  }

  // Append user turn to conversation history
  const updatedHistory = [
    ...session.conversationHistory,
    { role: 'user', content: transcript },
  ];

  // Rebuild system prompt for current step
  const systemPrompt = buildSystemPrompt(workflow, currentStep, session.collectedData);
  const messages = [
    { role: 'system', content: systemPrompt },
    ...updatedHistory.filter((m) => m.role !== 'system'),
  ];

  sessionService.updateSession(sessionId, { conversationHistory: updatedHistory });

  // Validate the user's input for this step
  const isValid = step.validate(session.collectedData, transcript);

  if (!isValid) {
    // Track retry attempts
    const retries = (session._retries || 0) + 1;
    sessionService.updateSession(sessionId, { _retries: retries });

    if (retries > MAX_RETRIES) {
      logger.warn('Max retries exceeded for step', { sessionId, currentStep });
      const fallbackMsg = "I'm sorry, I didn't quite catch that. Let's move forward — I'll follow up if anything's missing.";
      emit(session.wsClientId, 'llm:token', { token: fallbackMsg, sessionId });
      emit(session.wsClientId, 'llm:complete', { response: fallbackMsg, durationMs: 0, sessionId });
      emit(session.wsClientId, 'log:entry', {
        level: 'error',
        message: `Max retries exceeded at step ${currentStep}. Advancing with fallback.`,
        timestamp: new Date().toISOString(),
      });
      // Advance past the stuck step to avoid infinite loop
      await advanceStep(sessionId, workflow, currentStep, null);
      return;
    }
  } else {
    sessionService.updateSession(sessionId, { _retries: 0 });
  }

  await runLlmTurn(sessionId, messages, step, transcript, isValid, currentStep, workflow);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Run a full LLM streaming turn and handle post-response logic.
 */
async function runLlmTurn(sessionId, messages, step, transcript, isValid = true, currentStep = 0, workflow = null) {
  const session = sessionService.getSession(sessionId);
  if (!session) return;

  const resolvedWorkflow = workflow || getWorkflow(session.workflow);

  // --- LLM active ---
  emit(session.wsClientId, 'agent:active', { agent: 'llm', timestamp: new Date().toISOString() });

  const llmTimer = startTimer();

  let fullResponse = '';

  try {
    const { response, durationMs } = await llmAgent.streamResponse(messages, {
      onToken: (token) => {
        fullResponse += token;
        emit(session.wsClientId, 'llm:token', { token, sessionId });
      },
    });

    fullResponse = response;

    emit(session.wsClientId, 'agent:done', { agent: 'llm', durationMs });
    emit(session.wsClientId, 'llm:complete', { response: fullResponse, durationMs, sessionId });

    // Record timing
    const timing = { agent: 'llm', durationMs, timestamp: new Date().toISOString() };
    const freshSession = sessionService.getSession(sessionId);
    sessionService.updateSession(sessionId, {
      agentTimings: [...(freshSession?.agentTimings || []), timing],
      conversationHistory: [
        ...(freshSession?.conversationHistory || []),
        { role: 'assistant', content: fullResponse },
      ],
    });
  } catch (err) {
    logger.error('LLM stream error', { sessionId, message: err.message });
    emit(session.wsClientId, 'agent:done', { agent: 'llm', durationMs: llmTimer.stop() });
    emit(session.wsClientId, 'log:entry', {
      level: 'error',
      message: `LLM error: ${err.message}`,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // --- TTS lifecycle (browser handles actual playback) ---
  emit(session.wsClientId, 'agent:active', { agent: 'tts', timestamp: new Date().toISOString() });
  // TTS duration is estimated — actual timing is reported by the frontend
  emit(session.wsClientId, 'agent:done',   { agent: 'tts', durationMs: 0 });

  // --- Advance workflow step if input was valid ---
  if (isValid && transcript !== undefined) {
    await advanceStep(sessionId, resolvedWorkflow, currentStep, transcript);
  }
}

/**
 * Advance the workflow to the next step and persist collected data.
 */
async function advanceStep(sessionId, workflow, currentStep, transcript) {
  const session = sessionService.getSession(sessionId);
  if (!session) return;

  const step = workflow.steps[currentStep];

  // Persist the field collected at this step
  let updatedData = { ...session.collectedData };
  if (step?.field && transcript) {
    const value = workflow.extractField(currentStep, transcript);
    if (value) {
      updatedData[step.field] = value;
    }
  }

  const nextStep = currentStep + 1;
  const isLastStep = nextStep >= workflow.totalSteps;

  sessionService.updateSession(sessionId, {
    currentStep: nextStep,
    collectedData: updatedData,
  });

  emit(session.wsClientId, 'session:update', {
    currentStep: nextStep,
    collectedData: updatedData,
  });

  if (isLastStep) {
    await finaliseCall(sessionId, updatedData, session.wsClientId);
  }
}

/**
 * Finalise the call — save to mock repo, emit call:ended.
 */
async function finaliseCall(sessionId, collectedData, wsClientId) {
  logger.info('Finalising call', { sessionId });

  // Generate booking reference and persist to mock repo
  const bookingRef = `APT-${Math.floor(1000 + Math.random() * 9000)}`;
  const appointment = appointmentRepo.create({
    ...collectedData,
    bookingRef,
    sessionId,
  });

  // Update session with booking reference
  sessionService.updateSession(sessionId, {
    collectedData: { ...collectedData, bookingRef },
  });

  const endedSession = sessionService.endSession(sessionId);

  const startedAt  = new Date(endedSession.startedAt).getTime();
  const endedAt    = new Date(endedSession.endedAt).getTime();
  const durationMs = endedAt - startedAt;

  emit(wsClientId, 'call:ended', {
    sessionId,
    summary: {
      duration: durationMs,
      collectedData: endedSession.collectedData,
      bookingRef,
    },
  });

  logger.info('Call finalised', { sessionId, bookingRef, appointmentId: appointment.id });
}
