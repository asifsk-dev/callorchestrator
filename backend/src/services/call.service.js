import * as sessionService from './session.service.js';
import { logger } from '../utils/logger.js';

/**
 * Orchestrates the call lifecycle.
 * Acts as the bridge between WS/REST entry points and session state.
 */

/**
 * Start a new call — creates a session.
 * @param {{ workflow?: string, wsClientId: string }} params
 * @returns {{ sessionId: string, status: 'active' }}
 */
export function startCall({ workflow = 'appointment', wsClientId }) {
  const session = sessionService.createSession({ workflow, wsClientId });

  logger.info('Call started', { sessionId: session.sessionId, workflow });

  return {
    sessionId: session.sessionId,
    status: 'active',
  };
}

/**
 * End an existing call — terminates the session and returns a summary.
 * @param {{ sessionId: string }} params
 * @returns {{ sessionId: string, summary: { duration: number, collectedData: object } }}
 */
export function endCall({ sessionId }) {
  const session = sessionService.getSession(sessionId);

  if (!session) {
    const err = new Error('Session not found');
    err.statusCode = 404;
    err.code = 'SESSION_NOT_FOUND';
    throw err;
  }

  const endedSession = sessionService.endSession(sessionId);

  const startedAt  = new Date(endedSession.startedAt).getTime();
  const endedAt    = new Date(endedSession.endedAt).getTime();
  const durationMs = endedAt - startedAt;

  const summary = {
    duration:      durationMs,
    collectedData: endedSession.collectedData,
  };

  logger.info('Call ended', { sessionId, durationMs });

  return { sessionId, summary };
}
