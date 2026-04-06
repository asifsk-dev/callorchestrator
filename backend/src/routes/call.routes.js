import { Router } from 'express';
import { requireFields } from '../middleware/validate.js';
import * as callController from '../controllers/call.controller.js';

const router = Router();

/**
 * POST /api/call/start
 * No required body fields — workflow defaults to 'appointment'.
 */
router.post('/start', callController.startCall);

/**
 * POST /api/call/end
 * Requires sessionId in body.
 */
router.post('/end', requireFields(['sessionId']), callController.endCall);

export default router;
