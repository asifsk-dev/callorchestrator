import { Router } from 'express';
import multer from 'multer';
import * as sttController from '../controllers/stt.controller.js';

const router = Router();

// Store audio files in memory — buffers are passed directly to the Groq API.
// Max file size: 25 MB (Groq Whisper API limit).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

/**
 * POST /api/stt
 * Multipart form upload: field name must be 'audio'.
 */
router.post('/', upload.single('audio'), sttController.transcribe);

export default router;
