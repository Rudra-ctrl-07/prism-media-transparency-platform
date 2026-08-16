import { Router } from 'express';
import { getVerification } from '../services/llmRouter';
import {
  listArticles,
  getArticle,
  saveArticle,
  updateArticle,
  deleteArticle,
  isPersistent,
  countArticles,
} from '../services/articleStore';
import { authenticate } from '../middleware/auth';
import { trackArticleView } from '../services/analytics';

const router = Router();

function isFirebaseConfigured(): boolean {
  // A default Firebase app is always initialized even without credentials, so
  // key off the service account env var rather than getFirestore() throwing.
  return Boolean(process.env.FIREBASE_SERVICE_ACCOUNT);
}

// GET /api/articles — list with filters, pagination (works with in-memory store too)
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    const articles = await listArticles({
      limit,
      offset,
      source: req.query.source as string | undefined,
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
      minCredibility: req.query.minCredibility
        ? parseFloat(req.query.minCredibility as string)
        : undefined,
    });
    res.json(articles);
  } catch (error) {
    console.error('Error fetching articles:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/articles/meta — dashboard stats (total count, sources, coverage)
router.get('/meta', async (req, res) => {
  try {
    const all = await listArticles({ limit: 200 });
    const sources = [...new Set(all.map((a) => a.source).filter(Boolean))];
    const avgCredibility =
      all.length > 0
        ? all.reduce((sum, a) => sum + (a.sourceCredibility || 0.5), 0) / all.length
        : 0;
    res.json({
      total: all.length,
      sources: sources.length,
      sourceList: sources,
      avgCredibility: Math.round(avgCredibility * 100) / 100,
      persistent: isPersistent(),
      ingestedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching article meta:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET a single article by ID (basic info)
router.get('/:id', async (req, res) => {
  try {
    const article = await getArticle(req.params.id);
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Track article view (non-blocking)
    trackArticleView(req.params.id, {
      userId: req.user?.uid || null,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent') || '',
    }).catch((err) => {
      console.warn('Failed to track article view:', err);
    });

    res.json(article);
  } catch (error) {
    console.error('Error fetching article:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET verification for an article (basic or deep)
router.get('/:id/verify', authenticate, async (req, res) => {
  try {
    const articleId = req.params.id;
    const deep = req.query.deep === 'true';

    const article = await getArticle(articleId);
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Basic verification requires no further checks.
    if (!deep) {
      const result = await getVerification(article, false);
      return res.json(result);
    }

    // Deep verification: enforce Pro only when Firebase auth is actually
    // configured. In zero-config mode (no service account) there is no user
    // concept, so deep analysis is served openly.
    if (isFirebaseConfigured() && req.user?.uid) {
      const { getFirestore } = await import('firebase-admin/firestore');
      const userDoc = await getFirestore().collection('users').doc(req.user.uid).get();
      const isPro = userDoc.data()?.isPro ?? false;
      if (!isPro) {
        return res.status(403).send('Forbidden: Pro subscription required');
      }
    }

    const result = await getVerification(article, true);
    res.json(result);
  } catch (error) {
    console.error('Error getting verification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST a new article (used by ingestion service)
router.post('/', async (req, res) => {
  try {
    const id = await saveArticle({ ...req.body, createdAt: new Date().toISOString() });
    res.status(201).json({ id, ...req.body });
  } catch (error) {
    console.error('Error creating article:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT update an article
router.put('/:id', async (req, res) => {
  try {
    const updated = await updateArticle(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Article not found' });
    }
    res.json(updated);
  } catch (error) {
    console.error('Error updating article:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE an article
router.delete('/:id', async (req, res) => {
  try {
    const ok = await deleteArticle(req.params.id);
    if (!ok) {
      return res.status(404).json({ error: 'Article not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting article:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
