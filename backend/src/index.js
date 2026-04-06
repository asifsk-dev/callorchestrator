import 'dotenv/config';

import http from 'http';
import app from './app.js';
import { initWsServer } from './wsServer.js';
import { logger } from './utils/logger.js';

const PORT = parseInt(process.env.PORT || '4000', 10);

// Create a single HTTP server shared by Express and the WebSocket server.
// This allows both to run on one port — required for Railway deployment.
const server = http.createServer(app);

initWsServer(server);

server.listen(PORT, () => {
  logger.info('CallOrchestrator backend running', {
    port: PORT,
    nodeEnv: process.env.NODE_ENV || 'development',
  });
});
