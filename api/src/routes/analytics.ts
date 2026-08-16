import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  trackArticleView,
  trackArticleEngagement,
  getArticleAnalytics,
  getTopArticlesByViews
} from '../services/analytics';

const router = Router();

// Track article view (public endpoint)
router.post('/view', async (req, res) => {
  try {
    const { articleId } = req.body;

    if (!articleId) {
      return res.status(400).json({ error: 'Article ID is required' });
    }

    await trackArticleView(articleId, {
      userId: req.user?.uid || null,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent') || '',
      referrer: req.get('Referer') || ''
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error tracking article view:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Track article engagement (protected endpoint)
router.post('/engagement', authenticate, async (req, res) => {
  try {
    const { articleId, engagementType, value } = req.body;

    if (!articleId || !engagementType) {
      return res.status(400).json({ error: 'Article ID and engagement type are required' });
    }

    await trackArticleEngagement(articleId, engagementType, req.user?.uid, value);

    res.status(204).send();
  } catch (error) {
    console.error('Error tracking article engagement:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get analytics for a specific article (protected endpoint)
router.get('/:articleId', authenticate, async (req, res) => {
  try {
    const { articleId } = req.params;
    const days = parseInt(req.query.days as string) || 30;

    const analytics = await getArticleAnalytics(articleId, days);
    res.json(analytics);
  } catch (error) {
    console.error('Error getting article analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get top articles by views (public endpoint)
router.get('/top', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const days = parseInt(req.query.days as string) || 30;

    const topArticles = await getTopArticlesByViews(limit, days);
    res.json(topArticles);
  } catch (error) {
    console.error('Error getting top articles:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;