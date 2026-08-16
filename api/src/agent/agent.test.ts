import { describe, it, expect, afterAll } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { extractJson } from './brain';
import { isBlockedTopic } from './agentLoop';
import { nicheRelevance, deriveWinnerTopics } from './tools/research';
import {
  matchAffiliateKeywords,
  insertAffiliateLinks,
  buildSearchUrl,
} from './tools/affiliate';
import { createMemoryStore } from './memory';
import { AgentPost, KeywordPerformance } from './types';

// ──────────────────────────────────────────────────────────────────────
// brain.ts — LLM JSON extraction
// ──────────────────────────────────────────────────────────────────────
describe('extractJson', () => {
  it('parses plain JSON', () => {
    expect(extractJson('{"title":"hi"}')).toEqual({ title: 'hi' });
  });

  it('strips markdown code fences', () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it('extracts the JSON block from prose around it', () => {
    const raw = 'Sure! Here you go:\n{"content":"hello"}\nHope that helps.';
    expect(extractJson(raw)).toEqual({ content: 'hello' });
  });

  it('returns null for non-JSON', () => {
    expect(extractJson('not json at all')).toBeNull();
    expect(extractJson('')).toBeNull();
  });
});

// ──────────────────────────────────────────────────────────────────────
// agentLoop.ts — harmful-topic guardrail
// ──────────────────────────────────────────────────────────────────────
describe('isBlockedTopic', () => {
  it('blocks harmful / rejected categories', () => {
    expect(isBlockedTopic('How to hack Instagram accounts')).toBe(true);
    expect(isBlockedTopic('Best deals on prescription drugs online')).toBe(true);
    expect(isBlockedTopic('How to make money with gambling systems')).toBe(true);
  });

  it('allows legitimate niche topics', () => {
    expect(isBlockedTopic('Best smart home security cameras for 2026')).toBe(false);
    expect(isBlockedTopic('How to choose a video doorbell')).toBe(false);
    expect(isBlockedTopic('Ring vs Nest: which doorbell is right for you')).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────────
// tools/research.ts — niche relevance scoring
// ──────────────────────────────────────────────────────────────────────
describe('nicheRelevance', () => {
  it('scores topics sharing niche tokens higher', () => {
    const niche = 'smart home security';
    const relevant = nicheRelevance('Best smart home security cameras', niche);
    const unrelated = nicheRelevance('Stock market closes higher', niche);
    expect(relevant).toBeGreaterThan(unrelated);
    expect(relevant).toBeGreaterThan(0);
  });

  it('gives a big boost for an exact niche phrase match', () => {
    expect(nicheRelevance('smart home security guide', 'smart home security')).toBeGreaterThan(4);
  });

  it('returns 0 for unrelated topics', () => {
    expect(nicheRelevance('Election results announced', 'smart home security')).toBe(0);
  });
});

// ──────────────────────────────────────────────────────────────────────
// tools/affiliate.ts — the monetization hand
// ──────────────────────────────────────────────────────────────────────
describe('buildSearchUrl', () => {
  it('builds a search URL with the affiliate tag', () => {
    expect(buildSearchUrl('mytag-20', 'security camera')).toBe(
      'https://www.amazon.com/s?k=security+camera&tag=mytag-20',
    );
  });
});

describe('matchAffiliateKeywords', () => {
  it('matches keywords present in the text, ordered by first appearance', () => {
    const map = { camera: 'https://amzn.to/cam', doorbell: 'https://amzn.to/door' };
    const links = matchAffiliateKeywords(
      'A doorbell review then a camera review',
      map,
      'tag-20',
    );
    expect(links.map((l) => l.keyword)).toEqual(['doorbell', 'camera']);
  });

  it('ignores keywords not in the text', () => {
    const map = { camera: 'https://amzn.to/cam', 'smoke detector': 'https://amzn.to/smoke' };
    const links = matchAffiliateKeywords('All about the camera', map, 'tag-20');
    expect(links).toHaveLength(1);
    expect(links[0].keyword).toBe('camera');
  });
});

describe('insertAffiliateLinks', () => {
  const links = [
    { keyword: 'video doorbell', url: 'https://amzn.to/door' },
    { keyword: 'security camera', url: 'https://amzn.to/cam' },
  ];

  it('wraps the first occurrence of each keyword in a markdown link', () => {
    const content = 'Buy a video doorbell today. A security camera also helps.';
    const { content: out, inserted } = insertAffiliateLinks(content, links, 5);
    expect(out).toContain('[video doorbell](https://amzn.to/door)');
    expect(out).toContain('[security camera](https://amzn.to/cam)');
    expect(inserted).toHaveLength(2);
  });

  it('respects the max links per post guardrail', () => {
    const content = 'A video doorbell and a security camera, plus another video doorbell.';
    const { content: out, inserted } = insertAffiliateLinks(content, links, 1);
    expect(inserted).toHaveLength(1);
    expect(out).toContain('[video doorbell](');
    expect(out).not.toContain('[security camera](');
  });

  it('does not link inside an existing markdown link', () => {
    const content = 'See [video doorbell](https://example.com) for details.';
    const { content: out, inserted } = insertAffiliateLinks(content, links, 5);
    expect(inserted).toHaveLength(0);
    expect(out).toBe(content);
  });

  it('skips keywords that do not appear', () => {
    const content = 'Nothing relevant here.';
    const { content: out, inserted } = insertAffiliateLinks(content, links, 5);
    expect(inserted).toHaveLength(0);
    expect(out).toBe(content);
  });

  it('does not match a keyword inside a longer word (plurals)', () => {
    const content = 'Compare the best smart home security cameras here.';
    const { content: out, inserted } = insertAffiliateLinks(content, links, 5);
    expect(inserted).toHaveLength(0);
    expect(out).toBe(content);
  });
});

// ──────────────────────────────────────────────────────────────────────
// memory.ts — long-term memory store
// ──────────────────────────────────────────────────────────────────────
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-memory-'));
const memoryFile = path.join(tmpDir, 'agent-memory.json');

describe('AgentMemoryStore', () => {
  const store = createMemoryStore(memoryFile);
  const post = {
    id: 'post-1',
    title: 'Best smart home security cameras',
    slug: 'best-smart-home-security-cameras',
    summary: 's',
    content: 'c',
    keywords: ['security camera'],
    affiliateLinks: [{ keyword: 'security camera', url: 'https://amzn.to/cam' }],
    status: 'draft' as const,
    sourceTopic: 'smart home security',
    createdAt: new Date().toISOString(),
  };

  it('starts empty', () => {
    expect(store.posts).toHaveLength(0);
    expect(store.mistakes).toHaveLength(0);
  });

  it('adds posts and dedupes covered slugs', () => {
    store.addPost(post);
    expect(store.isCovered('best-smart-home-security-cameras')).toBe(true);
    expect(store.isCovered('some-other-topic')).toBe(false);
  });

  it('records mistakes and blocks failed slugs from retry', () => {
    store.recordRun(['Failed topic "X" (slug: my-broken-topic): LLM timeout']);
    expect(store.mistakes.length).toBeGreaterThan(0);
    expect(store.isCovered('my-broken-topic')).toBe(true);
  });

  it('tracks revenue', () => {
    store.addRevenue({ amount: 12.5, source: 'Amazon Associates', date: '2026-08-16', postId: 'post-1' });
    expect(store.revenue).toHaveLength(1);
    expect(store.revenue[0].amount).toBe(12.5);
  });

  it('persists to disk and reloads', () => {
    const reloaded = createMemoryStore(memoryFile);
    expect(reloaded.posts).toHaveLength(1);
    expect(reloaded.posts[0].slug).toBe('best-smart-home-security-cameras');
    expect(reloaded.revenue[0].amount).toBe(12.5);
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});

// ──────────────────────────────────────────────────────────────────────
// Performance feedback loop — record metrics, learn winners, double down
// ──────────────────────────────────────────────────────────────────────
const perfDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-perf-'));

function makePost(id: string, keywords: string[], status: 'draft' | 'published' = 'published'): AgentPost {
  return {
    id,
    title: `Post ${id}`,
    slug: `post-${id}`,
    summary: 's',
    content: 'c',
    keywords,
    affiliateLinks: [],
    status,
    sourceTopic: keywords[0] || 'topic',
    createdAt: new Date().toISOString(),
  };
}

describe('performance feedback loop', () => {
  const store = createMemoryStore(path.join(perfDir, 'agent-memory.json'));

  it('records metrics and aggregates keyword performance', () => {
    store.addPost(makePost('a', ['security camera']));
    store.recordMetrics('a', { clicks: 10, impressions: 100 });
    store.addRevenue({ amount: 5, source: 'affiliate', date: '2026-08-16', postId: 'a' });

    const perf = store.keywordPerformance();
    expect(perf).toHaveLength(1);
    expect(perf[0].keyword).toBe('security camera');
    expect(perf[0].clicks).toBe(10);
    expect(perf[0].impressions).toBe(100);
    expect(perf[0].revenue).toBe(5);
    expect(perf[0].ctr).toBeCloseTo(0.1, 5);
    expect(perf[0].revenuePerClick).toBeCloseTo(0.5, 5);
    expect(perf[0].postCount).toBe(1);
  });

  it('detects winners by clicks or revenue', () => {
    const winners = store.winners(5);
    expect(winners.length).toBeGreaterThanOrEqual(1);
    expect(winners[0].keyword).toBe('security camera');
  });

  it('flags impression-heavy zero-click keywords as losers', () => {
    store.addPost(makePost('b', ['smoke detector']));
    store.recordMetrics('b', { clicks: 0, impressions: 200 });
    const losers = store.losers(5);
    expect(losers.some((l) => l.keyword === 'smoke detector')).toBe(true);
  });

  it('boosts topics similar to winners and demotes losers', () => {
    expect(store.topicBoost('Best security camera deals')).toBeGreaterThan(0);
    expect(store.topicBoost('All about smoke detector brands')).toBeLessThan(0);
  });

  it('does not boost unrelated topics', () => {
    expect(store.topicBoost('Stock market rally continues')).toBe(0);
  });

  it('derives follow-up topics from winning keywords', () => {
    const winners: KeywordPerformance[] = store.winners(5);
    const topics = deriveWinnerTopics(winners, 5);
    expect(topics.length).toBeGreaterThan(0);
    expect(topics[0].derivedFromWinner).toBe(true);
    expect(topics[0].title.toLowerCase()).toContain('security camera');
  });

  afterAll(() => {
    fs.rmSync(perfDir, { recursive: true, force: true });
  });
});
