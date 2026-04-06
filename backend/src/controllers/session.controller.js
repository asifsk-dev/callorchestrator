import * as sessionService from '../services/session.service.js';

/**
 * GET /api/session/:id
 * Fetch the full state of a session by ID.
 */
export async function getSession(req, res, next) {
  try {
    const { id } = req.params;
    const session = sessionService.getSession(id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
        error: 'SESSION_NOT_FOUND',
        details: { sessionId: id },
      });
    }

    res.status(200).json({
      success: true,
      data: { session },
    });
  } catch (err) {
    next(err);
  }
}
