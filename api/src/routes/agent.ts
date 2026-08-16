/**
 * routes/agent.ts — REST endpoints for the PRISM Content & Affiliate Agent.
 *
 *   GET  /api/agent/status        → config summary + memory stats
 *   POST /api/agent/run           → run one Observe→Think→Act cycle
 *   GET  /api/agent/posts         → list produced posts
 *   GET  /api/agent/posts/:id     → full post (markdown + links)
 *   POST /api/agent/posts/:id/publish  → human-in-the-loop: push live (WP or local)
 *   POST /api/agent/posts/:id/revenue  → record an affiliate payout for a post
 *   GET  /api/agent/memory        → long-term memory (posts, mistakes, revenue)
 */

import { Router } from 'express';
import { authenticate, authorizePro } from '../middleware/auth';
import { loadAgentConfig } from '../agent/config';
import { runAgentRun } from '../agent/agentLoop';
import { createMemoryStore } from '../agent/memory';

export const agentRouter = Router();

/** Summary of agent config + memory for the panel/UI. */
agentRouter.get('/status', async (_req: any, res: any) => {
  const config = loadAgentConfig();
  const store = createMemoryStore(config.memoryFile);
  const totalRevenue = store.revenue.reduce((sum, r) => sum + r.amount, 0);
  res.json({
    enabled: config.enabled,
    niche: config.niche,
    maxPostsPerRun: config.maxPostsPerRun,
    maxIterations: config.maxIterations,
    maxAffiliateLinksPerPost: config.maxAffiliateLinksPerPost,
    autoPublish: config.autoPublish,
    wordpressConfigured: Boolean(config.wordpress),
    affiliateKeywordsConfigured: Object.keys(config.affiliateKeywords).length,
    affiliateTagConfigured: Boolean(config.affiliateTag),
    llmConfigured: Boolean(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY),
    memory: {
      posts: store.posts.length,
      published: store.posts.filter((p) => p.status === 'published').length,
      mistakes: store.mistakes.length,
      totalRevenue,
      lastRun: store.lastRun,
      winners: store.winners(5),
      losers: store.losers(5),
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * Trigger one agent run. Optional body: { niche?, maxPosts?, topics?: string[] }
 * Pro-gated: running content generation costs LLM tokens, so only Pro
 * subscribers may trigger it (enforced when Firebase is configured;
 * pass-through in zero-config mode).
 */
agentRouter.post('/run', authenticate, authorizePro, async (req: any, res: any) => {
  const { niche, maxPosts, topics, forceSandbox } = req.body || {};
  try {
    const result = await runAgentRun({
      config: {
        ...(niche ? { niche } : {}),
        ...(maxPosts ? { maxPostsPerRun: Number(maxPosts) } : {}),
      },
      ...(Array.isArray(topics) ? { topics: topics.slice(0, 5).map(String) } : {}),
      ...(forceSandbox ? { forceSandbox: true } : {}),
    });
    res.json(result);
  } catch (error: any) {
    console.error('[/api/agent/run] error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/** List posts, optionally filtered by status. */
agentRouter.get('/posts', async (req: any, res: any) => {
  const config = loadAgentConfig();
  const store = createMemoryStore(config.memoryFile);
  const { status } = req.query;
  let posts = store.posts;
  if (status) posts = posts.filter((p) => p.status === status);
  res.json(posts);
});

/** Get a single post. */
agentRouter.get('/posts/:id', async (req: any, res: any) => {
  const config = loadAgentConfig();
  const store = createMemoryStore(config.memoryFile);
  const post = store.getPost(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  res.json(post);
});

/**
 * Human-in-the-loop publish: mark a draft as published locally, or push to
 * WordPress when configured.
 */
agentRouter.post('/posts/:id/publish', async (req: any, res: any) => {
  const config = loadAgentConfig();
  const store = createMemoryStore(config.memoryFile);
  const post = store.getPost(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  if (config.wordpress) {
    try {
      const { publishToWordPress } = await import('../agent/tools/publisher');
      const wp = await publishToWordPress(config, post);
      const updated = store.updatePost(post.id, {
        status: 'published',
        publishedAt: new Date().toISOString(),
        wordpressId: wp.id,
      });
      return res.json({ published: true, post: updated, wordpress: wp });
    } catch (error: any) {
      console.error('[/api/agent/posts/:id/publish] error:', error);
      return res.status(500).json({ error: error.message || 'WordPress publish failed' });
    }
  }

  const updated = store.updatePost(post.id, {
    status: 'published',
    publishedAt: new Date().toISOString(),
  });
  res.json({ published: true, post: updated, note: 'Marked published locally (no WordPress configured).' });
});

/** Record an affiliate payout / ad earning attributed to a post. */
agentRouter.post('/posts/:id/revenue', async (req: any, res: any) => {
  const config = loadAgentConfig();
  const store = createMemoryStore(config.memoryFile);
  const post = store.getPost(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  const { amount, source } = req.body || {};
  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt < 0) {
    return res.status(400).json({ error: 'amount must be a non-negative number' });
  }

  store.addRevenue({
    amount: amt,
    source: source || 'affiliate',
    date: new Date().toISOString().slice(0, 10),
    postId: post.id,
  });
  res.json({ recorded: true, total: store.revenue.reduce((s, r) => s + r.amount, 0) });
});

/**
 * Record engagement metrics for a post (deltas, accumulated).
 * Body: { clicks?, impressions?, conversions? } — the observe step uses these
 * to learn which topics win and double down on them.
 */
agentRouter.post('/posts/:id/metrics', async (req: any, res: any) => {
  const config = loadAgentConfig();
  const store = createMemoryStore(config.memoryFile);
  const post = store.getPost(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  const { clicks, impressions, conversions } = req.body || {};
  const num = (v: any, fallback = 0) => (Number.isFinite(Number(v)) ? Math.max(0, Number(v)) : fallback);

  const updated = store.recordMetrics(post.id, {
    clicks: num(clicks),
    impressions: num(impressions),
    conversions: num(conversions),
  });
  res.json({ recorded: true, metrics: updated?.metrics });
});

/** Long-term memory: posts, mistakes, preferences, revenue. */
agentRouter.get('/memory', async (_req: any, res: any) => {
  const config = loadAgentConfig();
  const store = createMemoryStore(config.memoryFile);
  res.json({
    lastRun: store.lastRun,
    posts: store.posts,
    mistakes: store.mistakes,
    preferences: store.preferences,
    revenue: store.revenue,
  });
});
