import * as sttAgent from '../agents/sttAgent.js';
import * as sessionService from '../services/session.service.js';
import { startTimer } from '../utils/timer.js';
import { logger } from '../utils/logger.js';

/**
 * POST /api/stt
 * Transcribes an uploaded audio file using the STT agent (Groq Whisper).
 *
 * Expects multipart/form-data with:
 *   - audio:     audio file (via multer)
 *   - sessionId: string
 */
export async function transcribe(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No audio file provided',
        error: 'VALIDATION_ERROR',
        details: { missing: ['audio'] },
      });
    }

    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        error: 'VALIDATION_ERROR',
        details: { missing: ['sessionId'] },
      });
    }

    const session = sessionService.getSession(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
        error: 'SESSION_NOT_FOUND',
        details: { sessionId },
      });
    }

    const audioBuffer = req.file.buffer;
    const mimeType    = req.file.mimetype || 'audio/webm';

    logger.info('STT transcription started', { sessionId, mimeType, bytes: audioBuffer.length });

    const timer = startTimer();
    const { transcript } = await sttAgent.transcribe(audioBuffer, mimeType);
    const durationMs = timer.stop();

    logger.info('STT transcription complete', { sessionId, durationMs, transcriptLength: transcript.length });

    res.status(200).json({
      success: true,
      data: { transcript, durationMs },
    });
  } catch (err) {
    next(err);
  }
}
