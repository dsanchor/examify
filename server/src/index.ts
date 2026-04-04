import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import session from 'express-session';
import path from 'path';
import { config } from './config';
import { cosmosService } from './services/cosmosService';
import { errorHandler } from './middleware/errorHandler';
import { requireAuth } from './middleware/auth';
import sourcesRouter from './routes/sources';
import examsRouter from './routes/exams';
import testsRouter from './routes/tests';

const app = express();

// Trust reverse proxy (Azure Container Apps, etc.) for secure cookies
app.set('trust proxy', 1);

// Security & parsing middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: config.nodeEnv === 'production' ? true : config.clientUrl,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));

// Session middleware
app.use(session({
  secret: config.auth.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: config.nodeEnv === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
}));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth endpoints (public)
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (username === config.auth.username && password === config.auth.password) {
    req.session.authenticated = true;
    req.session.username = username;
    req.session.save((err) => {
      if (err) {
        res.status(500).json({ error: 'Session save failed' });
        return;
      }
      res.json({ authenticated: true, username });
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ authenticated: false });
  });
});

app.get('/api/auth/me', (req, res) => {
  if (req.session?.authenticated) {
    res.json({ authenticated: true, username: req.session.username });
  } else {
    res.json({ authenticated: false });
  }
});

// Auth guard for all /api routes (after auth endpoints)
app.use('/api', requireAuth);

// API routes
app.use('/api/sources', sourcesRouter);
app.use('/api/exams', examsRouter);
app.use('/api/tests', testsRouter);

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
