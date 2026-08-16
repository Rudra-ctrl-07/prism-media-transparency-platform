/**
 * memory.ts — the agent's long-term memory.
 *
 * Persists posts, mistakes, preferences, and revenue to a JSON file
 * (zero-config, works without Firebase). A human-readable `memory.md` is
 * written alongside so the agent's learnings are inspectable, matching the
 * "memory.md" pattern from the agent architecture.
 *
 * The memory also powers the observe step's "double down on winners":
 * per-post engagement metrics are aggregated by keyword so the agent can
 * boost topics similar to past winners and steer away from losers.
 */

import fs from 'fs';
import path from 'path';
import {
  AgentMemory,
  AgentPost,
  KeywordPerformance,
  PostMetrics,
  RevenueEntry,
} from './types';

function emptyMemory(): AgentMemory {
  return { posts: [], mistakes: [], preferences: {}, revenue: [], lastRun: null };
}

/** Minimum impressions before a keyword is judged a "loser" (seen but unclicked). */
const LOSER_MIN_IMPRESSIONS = 50;
/** A keyword needs at least this many clicks to be considered a proven winner. */
const WINNER_MIN_CLICKS = 2;
/** A keyword with any revenue is a winner regardless of raw click count. */
const WINNER_MIN_REVENUE = 0.01;

export class AgentMemoryStore {
  private memory: AgentMemory;
  private mdPath: string;

  constructor(private filePath: string) {
    this.mdPath = filePath.replace(/\.json$/, '.md');
    this.memory = this.load();
  }

  private load(): AgentMemory {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        return { ...emptyMemory(), ...parsed };
      }
    } catch (err) {
      console.warn('[agent memory] Failed to load memory file, starting fresh:', (err as Error).message);
    }
    return emptyMemory();
  }

  private persist(): void {
    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      fs.writeFileSync(this.filePath, JSON.stringify(this.memory, null, 2), 'utf-8');
      fs.writeFileSync(this.mdPath, this.renderMarkdown(), 'utf-8');
    } catch (err) {
      console.warn('[agent memory] Failed to persist memory:', (err as Error).message);
    }
  }

  /** Human-readable mirror of memory (the memory.md view). */
  private renderMarkdown(): string {
    const lines: string[] = ['# Agent Memory', ''];
    lines.push(`Last run: ${this.memory.lastRun || 'never'}`);
    lines.push(`Posts: ${this.memory.posts.length}`, '');
    lines.push('## Posts');
    for (const p of this.memory.posts) {
      const m = p.metrics;
      lines.push(
        `- **${p.title}** (${p.status}, ${p.affiliateLinks.length} affiliate links)` +
          (m ? ` — ${m.clicks} clicks / ${m.impressions} impressions / $${m.revenue.toFixed(2)}` : ''),
      );
    }
    lines.push('', '## Winning keywords');
    const winners = this.winners(5);
    if (winners.length === 0) {
      lines.push('- none yet — publish posts and record metrics to find winners');
    } else {
      for (const w of winners) {
        lines.push(
          `- **${w.keyword}** — ${w.clicks} clicks, ${w.revenue.toFixed(2)} revenue, ${w.postCount} post(s)`,
        );
      }
    }
    lines.push('', '## Mistakes');
    for (const m of this.memory.mistakes) lines.push(`- ${m}`);
    lines.push('', '## Preferences');
    for (const [k, v] of Object.entries(this.memory.preferences)) lines.push(`- ${k}: ${v}`);
    lines.push('', '## Revenue');
    for (const r of this.memory.revenue) {
      lines.push(`- $${r.amount} — ${r.source}${r.postId ? ` (${r.postId})` : ''} on ${r.date}`);
    }
    return lines.join('\n') + '\n';
  }

  get posts(): AgentPost[] {
    return this.memory.posts;
  }

  get mistakes(): string[] {
    return this.memory.mistakes;
  }

  get preferences(): Record<string, string> {
    return this.memory.preferences;
  }

  get revenue(): RevenueEntry[] {
    return this.memory.revenue;
  }

  get lastRun(): string | null {
    return this.memory.lastRun;
  }

  /** Track a run timestamp and record any mistakes the loop hit. */
  recordRun(mistakes: string[] = []): void {
    this.memory.lastRun = new Date().toISOString();
    for (const m of mistakes) {
      if (!this.memory.mistakes.includes(m)) this.memory.mistakes.push(m);
    }
    this.persist();
  }

  addPost(post: AgentPost): void {
    this.memory.posts.push(post);
    this.persist();
  }

  updatePost(id: string, patch: Partial<AgentPost>): AgentPost | null {
    const idx = this.memory.posts.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    this.memory.posts[idx] = { ...this.memory.posts[idx], ...patch };
    this.persist();
    return this.memory.posts[idx];
  }

  getPost(id: string): AgentPost | null {
    return this.memory.posts.find((p) => p.id === id) || null;
  }

  addRevenue(entry: RevenueEntry): void {
    this.memory.revenue.push(entry);
    // Keep the post's metrics.revenue in sync so winner detection sees it.
    if (entry.postId) {
      const post = this.getPost(entry.postId);
      if (post) {
        const m = post.metrics || zeroMetrics();
        post.metrics = { ...m, revenue: m.revenue + entry.amount, updatedAt: new Date().toISOString() };
      }
    }
    this.persist();
  }

  /**
   * Record engagement metrics for a post (deltas — accumulates).
   * Also updates the post's revenue from revenue entries if it lags behind.
   */
  recordMetrics(
    id: string,
    delta: Partial<Omit<PostMetrics, 'updatedAt'>>,
  ): AgentPost | null {
    const post = this.getPost(id);
    if (!post) return null;
    const prev = post.metrics || zeroMetrics();
    const recordedRevenue = this.revenue
      .filter((r) => r.postId === id)
      .reduce((sum, r) => sum + r.amount, 0);
    post.metrics = {
      clicks: prev.clicks + (delta.clicks || 0),
      impressions: prev.impressions + (delta.impressions || 0),
      conversions: prev.conversions + (delta.conversions || 0),
      revenue: Math.max(prev.revenue, recordedRevenue),
      updatedAt: new Date().toISOString(),
    };
    this.persist();
    return post;
  }

  setPreference(key: string, value: string): void {
    this.memory.preferences[key] = value;
    this.persist();
  }

  /**
   * Dedupe guardrail: skip topics we already covered, matching on slug.
   * Also skips slugs the agent previously failed on (mistakes) so it does
   * not burn iterations repeating a losing topic.
   */
  isCovered(slug: string): boolean {
    const covered = new Set(this.memory.posts.map((p) => p.slug));
    if (covered.has(slug)) return true;
    const failed = new Set(
      this.memory.mistakes
        .map((m) => m.match(/slug[: ]\s*([a-z0-9-]+)/i)?.[1])
        .filter(Boolean) as string[],
    );
    return failed.has(slug);
  }

  // ── Performance learning (observe-step feedback) ─────────────────────

  /**
   * Aggregate engagement per keyword across posts. Published posts carry the
   * metrics; revenue comes from the revenue log. Sorted by revenue then clicks.
   */
  keywordPerformance(): KeywordPerformance[] {
    const map = new Map<string, KeywordPerformance>();
    for (const post of this.memory.posts) {
      const m = post.metrics || zeroMetrics();
      const revenue = this.revenue
        .filter((r) => r.postId === post.id)
        .reduce((sum, r) => sum + r.amount, 0);
      const keywords = post.keywords.length > 0 ? post.keywords : [post.sourceTopic];
      for (const kw of keywords) {
        const key = kw.trim().toLowerCase();
        if (!key) continue;
        const cur = map.get(key) || {
          keyword: key,
          clicks: 0,
          impressions: 0,
          revenue: 0,
          postCount: 0,
          ctr: 0,
          revenuePerClick: 0,
        };
        cur.clicks += m.clicks;
        cur.impressions += m.impressions;
        cur.revenue += revenue;
        cur.postCount += 1;
        map.set(key, cur);
      }
    }
    const list = [...map.values()];
    for (const k of list) {
      k.ctr = k.impressions > 0 ? k.clicks / k.impressions : 0;
      k.revenuePerClick = k.clicks > 0 ? k.revenue / k.clicks : 0;
    }
    return list.sort(
      (a, b) => b.revenue - a.revenue || b.clicks - a.clicks || b.impressions - a.impressions,
    );
  }

  /** Top keywords by proven engagement (clicks or revenue). */
  winners(limit = 5): KeywordPerformance[] {
    return this.keywordPerformance()
      .filter(
        (k) => k.clicks >= WINNER_MIN_CLICKS || k.revenue >= WINNER_MIN_REVENUE,
      )
      .slice(0, limit);
  }

  /** Keywords that got impressions but almost no clicks — steer away. */
  losers(limit = 5): KeywordPerformance[] {
    return this.keywordPerformance()
      .filter(
        (k) =>
          k.impressions >= LOSER_MIN_IMPRESSIONS &&
          k.clicks === 0 &&
          k.revenue === 0,
      )
      .slice(0, limit);
  }

  /**
   * Score a candidate topic by how well it matches past winners/losers.
   * Returns a signed boost (positive = double down, negative = avoid).
   * Compares token overlap between the topic and learned keywords.
   */
  topicBoost(topicTitle: string): number {
    const tokens = tokenize(topicTitle);
    if (tokens.length === 0) return 0;
    let score = 0;
    for (const k of this.keywordPerformance()) {
      const kTokens = tokenize(k.keyword);
      const overlap = kTokens.filter((t) => tokens.includes(t)).length;
      if (overlap === 0) continue;
      const isWinner = k.clicks >= WINNER_MIN_CLICKS || k.revenue >= WINNER_MIN_REVENUE;
      const isLoser =
        k.impressions >= LOSER_MIN_IMPRESSIONS && k.clicks === 0 && k.revenue === 0;
      if (isWinner) score += overlap * 2;
      else if (isLoser) score -= overlap * 2;
      else score += overlap * 0.5; // light positive for untested relevance
    }
    return score;
  }
}

function zeroMetrics(): PostMetrics {
  return { clicks: 0, impressions: 0, conversions: 0, revenue: 0, updatedAt: new Date().toISOString() };
}

/** Simple tokenizer shared with research.ts (duplicated here to avoid cycles). */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2);
}

/** Default store instance bound to the configured memory file. */
let defaultStore: AgentMemoryStore | null = null;
export function getMemoryStore(filePath: string): AgentMemoryStore {
  if (!defaultStore) {
    defaultStore = new AgentMemoryStore(filePath);
  }
  return defaultStore;
}

/** Fresh store (mainly for tests). */
export function createMemoryStore(filePath: string): AgentMemoryStore {
  return new AgentMemoryStore(filePath);
}
