/**
 * Structured JSON logger
 * Logs to console as JSON. Supports optional WS emission via createWsLogger.
 */

/**
 * Write a structured log entry to stdout.
 * @param {'info'|'warn'|'error'} level
 * @param {string} message
 * @param {object} meta
 */
function writeLog(level, message, meta = {}) {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...meta,
  };
  console.log(JSON.stringify(entry));
  return entry;
}

export const logger = {
  info:  (message, meta) => writeLog('info',  message, meta),
  warn:  (message, meta) => writeLog('warn',  message, meta),
  error: (message, meta) => writeLog('error', message, meta),
};

/**
 * Create a logger that mirrors all entries to a WebSocket emit function.
 * @param {(eventObj: object) => void} emitFn
 * @returns {{ info, warn, error }}
 */
export function createWsLogger(emitFn) {
  function writeAndEmit(level, message, meta = {}) {
    const entry = writeLog(level, message, meta);
    try {
      emitFn({ type: 'log:entry', level: entry.level, message: entry.message, timestamp: entry.timestamp });
    } catch (err) {
      // Never let WS emission errors crash the logger
      console.error(JSON.stringify({ level: 'error', message: 'WS emit failed in logger', timestamp: new Date().toISOString() }));
    }
  }

  return {
    info:  (message, meta) => writeAndEmit('info',  message, meta),
    warn:  (message, meta) => writeAndEmit('warn',  message, meta),
    error: (message, meta) => writeAndEmit('error', message, meta),
  };
}
