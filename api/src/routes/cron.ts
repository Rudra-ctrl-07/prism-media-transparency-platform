import { Router } from 'express';
import { ingestNews } from '../services/ingestion';
import { runAgentJob } from '../cron/agentJob';

const router = Router();

// Secret key to protect the endpoint (should be set in environment variables)
const CRON_SECRET = process.env.CRON_SECRET || '';

/**
 * Trigger ingestion manually (for cron services)
 * Protected by a simple secret key header
 */
router.post('/ingest', async (req, res) => {
  const providedSecret = req.headers['x-cron-secret'] as string;
  if (!CRON_SECRET || providedSecret !== CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('Manual ingestion triggered via cron endpoint');
    await ingestNews();
    res.json({ success: true, message: `Ingestion completed.` });
  } catch (error) {
    console.error('Error during manual ingestion:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check for cron service
router.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

/**
 * Trigger the Content & Affiliate Agent on a schedule (e.g. daily).
 * Protected by the same secret-key header as /ingest.
 */
router.post('/agent', async (req, res) => {
  const providedSecret = req.headers['x-cron-secret'] as string;
  if (!CRON_SECRET || providedSecret !== CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { success, result } = await runAgentJob();
    res.json({ success, result });
  } catch (error) {
    console.error('Error during scheduled agent run:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;