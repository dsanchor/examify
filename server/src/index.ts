import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { config } from './config';
import { cosmosService } from './services/cosmosService';
import { errorHandler } from './middleware/errorHandler';
import { easyAuthMiddleware } from './middleware/auth';
import sourcesRouter from './routes/sources';
import examsRouter from './routes/exams';
import testsRouter from './routes/tests';

const app = express();

// Security & parsing middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: config.clientUrl, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));

// Easy Auth header reading (non-blocking — reads headers if present)
app.use(easyAuthMiddleware);

// Auth info endpoint
app.get('/api/auth/me', (req, res) => {
  if (req.user) {
    res.json({ authenticated: true, user: req.user });
  } else {
    res.json({ authenticated: false, user: null });
  }
});

// API routes
app.use('/api/sources', sourcesRouter);
app.use('/api/exams', examsRouter);
app.use('/api/tests', testsRouter);

// Health check — exclude from Easy Auth in Azure config (--excluded-paths "/health")
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static client build in production
if (config.nodeEnv === 'production') {
  const clientPath = path.join(__dirname, '..', 'public');
  app.use(express.static(clientPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientPath, 'index.html'));
  });
}

// Error handler (must be last)
app.use(errorHandler);

async function start(): Promise<void> {
  try {
    await cosmosService.initialize();
    console.log('Connected to CosmosDB');
  } catch (error) {
    console.error('Failed to connect to CosmosDB:', error);
    console.warn('Starting server without database connection...');
  }

  app.listen(config.port, () => {
    console.log(`Examify server running on port ${config.port} (${config.nodeEnv})`);
  });
}

start();

export default app;
