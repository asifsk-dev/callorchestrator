import express from 'express';
import cors from 'cors';

import requestLogger from './middleware/requestLogger.js';
import errorHandler  from './middleware/errorHandler.js';

import callRoutes    from './routes/call.routes.js';
import sttRoutes     from './routes/stt.routes.js';
import llmRoutes     from './routes/llm.routes.js';
import sessionRoutes from './routes/session.routes.js';

const app = express();

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

// ---------------------------------------------------------------------------
// Body parsing
// ---------------------------------------------------------------------------
app.use(express.json());

// ---------------------------------------------------------------------------
// Request logging
// ---------------------------------------------------------------------------
app.use(requestLogger);

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.use('/api/call',    callRoutes);
app.use('/api/stt',     sttRoutes);
app.use('/api/llm',     llmRoutes);
app.use('/api/session', sessionRoutes);

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.get('/health', (_req, res) => {
  res.status(200).json({ success: true, message: 'CallOrchestrator backend is healthy' });
});

// ---------------------------------------------------------------------------
// 404 handler — must come after all routes
// ---------------------------------------------------------------------------
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    error: 'NOT_FOUND',
    details: {},
  });
});

// ---------------------------------------------------------------------------
// Error handler — must be last middleware (4 args)
// ---------------------------------------------------------------------------
app.use(errorHandler);

export default app;
