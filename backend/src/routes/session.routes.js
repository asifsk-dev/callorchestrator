import { Router } from 'express';
import * as sessionController from '../controllers/session.controller.js';

const router = Router();

/**
 * GET /api/session/:id
 * Fetch the full state of a session by ID.
 */
router.get('/:id', sessionController.getSession);

export default router;
