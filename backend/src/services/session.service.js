import { generateId } from '../utils/idGenerator.js';
import { logger } from '../utils/logger.js';

/**
 * In-memory session store.
 * Interface is intentionally Redis-serializable for future upgrade.
 *
 * Session schema:
 * {
 *   sessionId:           string,
 *   startedAt:           string (ISO),
 *   workflow:            string,
 *   currentStep:         number,
 *   collectedData:       {},
 *   conversationHistory: [],
 *   agentTimings:        [],
 *   status:              'active' | 'ended',
 *   wsClientId:          string
 * }
 */

/** @type {Map<string, object>} */
const sessions = new Map();

/**
 * Create a new session and persist it to the store.
 * @param {{ workflow: string, wsClientId: string }} params
 * @returns {object} The created session
 */
export function createSession({ workflow, wsClientId }) {
  const sessionId = generateId();
  const session = {
    sessionId,
    startedAt: new Date().toISOString(),
    workflow: workflow || 'appointment',
    currentStep: 0,
    collectedData: {},
    conversationHistory: [],
    agentTimings: [],
    status: 'active',
    wsClientId,
  };

  sessions.set(sessionId, session);
  logger.info('Session created', { sessionId, workflow: session.workflow });
  return session;
}

/**
 * Retrieve a session by ID.
 * @param {string} sessionId
 * @returns {object|null}
 */
export function getSession(sessionId) {
  return sessions.get(sessionId) ?? null;
}

/**
 * Merge updates into an existing session.
 * @param {string} sessionId
 * @param {object} updates - Partial session fields to merge
 * @returns {object|null} Updated session, or null if not found
 */
export function updateSession(sessionId, updates) {
  const session = sessions.get(sessionId);
  if (!session) {
    logger.warn('updateSession: session not found', { sessionId });
    return null;
  }

  const updated = { ...session, ...updates };
  sessions.set(sessionId, updated);
  return updated;
}

/**
 * Mark a session as ended.
 * @param {string} sessionId
 * @returns {object|null} Ended session, or null if not found
 */
export function endSession(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) {
    logger.warn('endSession: session not found', { sessionId });
    return null;
  }

  const ended = { ...session, status: 'ended', endedAt: new Date().toISOString() };
  sessions.set(sessionId, ended);
  logger.info('Session ended', { sessionId });
  return ended;
}

/**
 * Return all sessions as an array.
 * @returns {object[]}
 */
export function getAllSessions() {
  return Array.from(sessions.values());
}
