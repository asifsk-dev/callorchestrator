import { Router } from 'express';
import { requireFields } from '../middleware/validate.js';
import * as llmController from '../controllers/llm.controller.js';

const router = Router();

/**
 * POST /api/llm
 * Triggers LLM processing for a session. Response streams via WebSocket.
 */
router.post('/', requireFields(['sessionId', 'transcript']), llmController.processTranscript);

export default router;
