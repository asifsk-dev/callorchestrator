import * as dialogueManager from '../agents/dialogueManager.js';
import { logger } from '../utils/logger.js';

/**
 * POST /api/llm
 * Accepts a transcript and triggers LLM processing for a session.
 * The actual response is streamed back to the client via WebSocket,
 * not via this HTTP response.
 *
 * Body: { sessionId: string, transcript: string }
 */
export async function processTranscript(req, res, next) {
  try {
    const { sessionId, transcript } = req.body;

    logger.info('LLM processing requested', { sessionId, transcriptLength: transcript.length });

    // Fire-and-forget — streaming tokens are pushed over WebSocket
    dialogueManager.processTranscript(sessionId, transcript).catch((err) => {
      logger.error('Dialogue manager error (async)', { sessionId, message: err.message });
    });

    res.status(200).json({
      success: true,
      message: 'Processing started',
    });
  } catch (err) {
    next(err);
  }
}
