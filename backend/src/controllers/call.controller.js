import * as callService from '../services/call.service.js';

/**
 * POST /api/call/start
 * Creates a new call session.
 */
export async function startCall(req, res, next) {
  try {
    const { workflow = 'appointment' } = req.body;

    // wsClientId is not available over REST — sessions started via REST
    // are assigned a placeholder; WS-originated calls pass the real clientId.
    const wsClientId = req.body.wsClientId || null;

    const result = callService.startCall({ workflow, wsClientId });

    res.status(200).json({
      success: true,
      data: {
        sessionId: result.sessionId,
        status: result.status,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/call/end
 * Terminates an existing call session.
 */
export async function endCall(req, res, next) {
  try {
    const { sessionId } = req.body;

    const result = callService.endCall({ sessionId });

    res.status(200).json({
      success: true,
      data: {
        summary: result.summary,
      },
    });
  } catch (err) {
    next(err);
  }
}
