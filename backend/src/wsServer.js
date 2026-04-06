import { WebSocketServer } from 'ws';
import { generateId } from './utils/idGenerator.js';
import { logger } from './utils/logger.js';
import * as callService from './services/call.service.js';

// Lazy import to avoid circular dependency at startup.
// dialogueManager imports wsServer, so we defer the import to first use.
let _dialogueManager = null;
async function getDialogueManager() {
  if (!_dialogueManager) {
    _dialogueManager = await import('./agents/dialogueManager.js');
  }
  return _dialogueManager;
}

/** @type {WebSocketServer} */
export let wss = null;

/**
 * Attach the WebSocket server to an existing http.Server instance.
 * Called from index.js after the HTTP server is created so that both
 * REST and WebSocket share a single port — required for Railway deployment.
 *
 * @param {import('http').Server} httpServer
 */
export function initWsServer(httpServer) {
  wss = new WebSocketServer({ server: httpServer });

/**
 * Bidirectional registry:
 *   clientId → ws   (for targeted emits)
 *   ws       → clientId (for identifying senders on message/close)
 */
/** @type {Map<string, import('ws').WebSocket>} */
const clientMap = new Map();

/** @type {WeakMap<import('ws').WebSocket, string>} */
const wsToClientId = new WeakMap();

// ---------------------------------------------------------------------------
// Exported helpers
// ---------------------------------------------------------------------------

/**
 * Send a JSON event to a specific connected client.
 * @param {string} clientId
 * @param {object} eventObj
 */
export function emitToClient(clientId, eventObj) {
  const ws = clientMap.get(clientId);
  if (!ws) {
    logger.warn('emitToClient: client not found', { clientId });
    return;
  }
  if (ws.readyState !== ws.OPEN) {
    logger.warn('emitToClient: socket not open', { clientId, readyState: ws.readyState });
    return;
  }
  ws.send(JSON.stringify(eventObj));
}

/**
 * Broadcast a JSON event to every connected client.
 * @param {object} eventObj
 */
export function broadcast(eventObj) {
  const payload = JSON.stringify(eventObj);
  for (const ws of clientMap.values()) {
    if (ws.readyState === ws.OPEN) {
      ws.send(payload);
    }
  }
}

/**
 * Look up the clientId associated with a WebSocket instance.
 * @param {import('ws').WebSocket} ws
 * @returns {string|undefined}
 */
export function getClientId(ws) {
  return wsToClientId.get(ws);
}

  // -------------------------------------------------------------------------
  // Connection lifecycle
  // -------------------------------------------------------------------------

  wss.on('connection', (ws) => {
  const clientId = generateId();
  clientMap.set(clientId, ws);
  wsToClientId.set(ws, clientId);

  logger.info('WebSocket client connected', { clientId, totalClients: clientMap.size });

  // Send the client its own ID so the frontend can correlate REST calls.
  emitToClient(clientId, { type: 'connected', payload: { clientId } });

  // -------------------------------------------------------------------------
  // Message handling
  // -------------------------------------------------------------------------
  ws.on('message', async (rawData) => {
    let parsed;
    try {
      parsed = JSON.parse(rawData.toString());
    } catch {
      logger.warn('Received non-JSON WebSocket message', { clientId });
      return;
    }

    const { type, payload = {} } = parsed;

    logger.info('WebSocket message received', { clientId, type });

    switch (type) {
      case 'call:start': {
        try {
          const { sessionId } = callService.startCall({
            workflow: payload.workflow || 'appointment',
            wsClientId: clientId,
          });

          // Immediate: ringing
          emitToClient(clientId, {
            type: 'call:status',
            payload: { status: 'ringing', sessionId },
          });

          // After 1.5 s: active + start dialogue
          setTimeout(async () => {
            emitToClient(clientId, {
              type: 'call:status',
              payload: { status: 'active', sessionId },
            });

            try {
              const dm = await getDialogueManager();
              await dm.startSession(sessionId);
            } catch (err) {
              logger.error('dialogueManager.startSession failed', { sessionId, message: err.message });
            }
          }, 1500);
        } catch (err) {
          logger.error('call:start handler error', { clientId, message: err.message });
          emitToClient(clientId, {
            type: 'error',
            payload: { message: err.message, code: err.code || 'CALL_START_ERROR' },
          });
        }
        break;
      }

      case 'call:end': {
        try {
          const { sessionId } = payload;
          const { summary } = callService.endCall({ sessionId });

          emitToClient(clientId, {
            type: 'call:ended',
            payload: { sessionId, summary },
          });
        } catch (err) {
          logger.error('call:end handler error', { clientId, message: err.message });
          emitToClient(clientId, {
            type: 'error',
            payload: { message: err.message, code: err.code || 'CALL_END_ERROR' },
          });
        }
        break;
      }

      default:
        logger.warn('Unknown WebSocket event type', { clientId, type });
    }
  });

  // -------------------------------------------------------------------------
  // Disconnect
  // -------------------------------------------------------------------------
  ws.on('close', () => {
    clientMap.delete(clientId);
    logger.info('WebSocket client disconnected', { clientId, totalClients: clientMap.size });
  });

  ws.on('error', (err) => {
    logger.error('WebSocket client error', { clientId, message: err.message });
  });
});

  wss.on('listening', () => {
    logger.info('WebSocket server listening (shared HTTP port)');
  });

  wss.on('error', (err) => {
    logger.error('WebSocket server error', { message: err.message });
  });
}
