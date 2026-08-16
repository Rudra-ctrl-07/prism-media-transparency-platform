import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config as dotenvConfig } from 'dotenv';
import { authenticate, authorizePro } from './middleware/auth';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import articlesRouter from './routes/articles';
import liveRouter from './routes/live';
import votesRouter from './routes/votes';
import cronRouter from './routes/cron';
import mcpRouter from './mcp/routes';
import analyticsRouter from './routes/analytics';
import { handleWebhook } from './services/stripe';
import { stripeRouter } from './routes/stripe';
import { geminiRouter } from './services/gemini';
import { automatonRouter } from './routes/automaton';
import { agentRouter } from './routes/agent';

// Load environment variables
dotenvConfig();

// Initialize Firebase Admin safely
try {
  const saStr = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (saStr) {
    const serviceAccount = JSON.parse(saStr);
    initializeApp({ credential: cert(serviceAccount) });
  } else {
    initializeApp();
  }
} catch (e) {
  console.warn('Firebase Admin initialization warning:', (e as Error).message);
}

// Initialize Express app
const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Stripe webhook endpoint (raw body — must be registered before express.json)
app.post('/api/stripe/webhook', express.raw({type: 'application/json'}), (req, res) => {
  handleWebhook(req, res);
});

// Stripe checkout (authenticated, JSON body)
app.use('/api/stripe', stripeRouter);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/articles', authenticate, articlesRouter);
app.use('/api/live', authenticate, liveRouter);
app.use('/api/votes', authenticate, votesRouter);
app.use('/api/cron', cronRouter);
app.use('/api/analytics', authenticate, analyticsRouter);

// Gemini-powered endpoints (multi-agent analysis, forecast, maps, chat, etc.)
app.use('/api/gemini', geminiRouter);

// Automaton (Conway sovereign AI agent) integration
app.use('/api/automaton', automatonRouter);

// Content & Affiliate Agent (autonomous observe→think→act loop)
app.use('/api/agent', agentRouter);

// MCP (Model Context Protocol) endpoints for agent-queryable verification
app.use('/mcp', mcpRouter);

// 404 handler
app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

export default app;