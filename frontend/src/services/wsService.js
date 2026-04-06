/**
 * WebSocket client singleton with automatic reconnection.
 * Connects to VITE_WS_URL and dispatches typed events to registered handlers.
 */

const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:4001';
const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1000;

const wsService = (() => {
  let socket = null;
  let retryCount = 0;
  let retryTimer = null;
  let isManualDisconnect = false;

  // Map of event type → Set of handler functions
  const handlers = new Map();

  function getBackoffDelay(attempt) {
    return Math.min(BASE_DELAY_MS * Math.pow(2, attempt), 30000);
  }

  function dispatch(type, payload) {
    const typeHandlers = handlers.get(type);
    if (typeHandlers) {
      typeHandlers.forEach((handler) => {
        try {
          handler(payload);
        } catch (err) {
          console.error(`[wsService] Handler error for "${type}":`, err);
        }
      });
    }

    // Also dispatch to wildcard '*' handlers
    const wildcardHandlers = handlers.get('*');
    if (wildcardHandlers) {
      wildcardHandlers.forEach((handler) => {
        try {
          handler({ type, payload });
        } catch (err) {
          console.error('[wsService] Wildcard handler error:', err);
        }
      });
    }
  }

  function scheduleReconnect() {
    if (isManualDisconnect || retryCount >= MAX_RETRIES) {
      if (retryCount >= MAX_RETRIES) {
        console.error('[wsService] Max reconnection attempts reached.');
        dispatch('connection:failed', { retries: retryCount });
      }
      return;
    }

    const delay = getBackoffDelay(retryCount);
    retryCount++;
    console.warn(`[wsService] Reconnecting in ${delay}ms (attempt ${retryCount}/${MAX_RETRIES})...`);

    retryTimer = setTimeout(() => {
      connect();
    }, delay);
  }

  function connect() {
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    isManualDisconnect = false;

    try {
      socket = new WebSocket(WS_URL);

      socket.onopen = () => {
        retryCount = 0;
        console.info('[wsService] Connected to', WS_URL);
        dispatch('connection:open', {});
      };

      socket.onmessage = (event) => {
        try {
          const { type, payload } = JSON.parse(event.data);
          dispatch(type, payload);
        } catch (err) {
          console.error('[wsService] Failed to parse message:', event.data, err);
        }
      };

      socket.onerror = (err) => {
        console.error('[wsService] WebSocket error:', err);
        dispatch('connection:error', { error: err });
      };

      socket.onclose = (event) => {
        console.warn('[wsService] Connection closed:', event.code, event.reason);
        dispatch('connection:closed', { code: event.code, reason: event.reason });

        if (!isManualDisconnect) {
          scheduleReconnect();
        }
      };
    } catch (err) {
      console.error('[wsService] Failed to create WebSocket:', err);
      scheduleReconnect();
    }
  }

  function disconnect() {
    isManualDisconnect = true;

    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }

    if (socket) {
      socket.close(1000, 'Client disconnected');
      socket = null;
    }

    retryCount = 0;
  }

  function send(type, payload) {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.warn('[wsService] Cannot send — socket not open. Message dropped:', type);
      return false;
    }

    try {
      socket.send(JSON.stringify({ type, payload }));
      return true;
    } catch (err) {
      console.error('[wsService] Send error:', err);
      return false;
    }
  }

  function on(type, handler) {
    if (!handlers.has(type)) {
      handlers.set(type, new Set());
    }
    handlers.get(type).add(handler);
  }

  function off(type, handler) {
    const typeHandlers = handlers.get(type);
    if (typeHandlers) {
      typeHandlers.delete(handler);
      if (typeHandlers.size === 0) {
        handlers.delete(type);
      }
    }
  }

  function isConnected() {
    return socket !== null && socket.readyState === WebSocket.OPEN;
  }

  return { connect, disconnect, send, on, off, isConnected };
})();

export default wsService;
