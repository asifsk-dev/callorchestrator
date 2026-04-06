import { logger } from '../utils/logger.js';

/**
 * Express error-handling middleware.
 * Must have exactly 4 arguments so Express recognises it as an error handler.
 *
 * Returns a structured error envelope:
 *   { success: false, message, error: 'ERROR_CODE', details: {} }
 *
 * @type {import('express').ErrorRequestHandler}
 */
// eslint-disable-next-line no-unused-vars
export default function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const errorCode  = err.code       || 'INTERNAL_ERROR';
  const message    = err.message    || 'An unexpected error occurred';
  const details    = err.details    || {};

  logger.error('Unhandled error', {
    errorCode,
    message,
    statusCode,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(statusCode).json({
    success: false,
    message,
    error: errorCode,
    details,
  });
}
