import { logger } from '../utils/logger.js';

/**
 * Express middleware that logs each incoming request as a structured JSON entry.
 * @type {import('express').RequestHandler}
 */
export default function requestLogger(req, res, next) {
  logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    timestamp: new Date().toISOString(),
  });
  next();
}
