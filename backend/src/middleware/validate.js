/**
 * Input validation middleware factory.
 */

/**
 * Returns Express middleware that checks req.body contains all required fields.
 * Responds 400 with a structured error if any field is missing.
 *
 * @param {string[]} fields - Array of required field names
 * @returns {import('express').RequestHandler}
 */
export function requireFields(fields) {
  return function validateRequiredFields(req, res, next) {
    const missing = fields.filter(
      (field) => req.body[field] === undefined || req.body[field] === null || req.body[field] === ''
    );

    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        error: 'VALIDATION_ERROR',
        details: { missing },
      });
    }

    next();
  };
}
