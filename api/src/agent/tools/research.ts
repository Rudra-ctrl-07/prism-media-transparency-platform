/**
 * tools/research.ts — the agent's "hands" for observation.
 *
 * Observe step: pull recent live articles from the shared article store
 * (populated by RSS ingestion) and surface trending topics relevant to the
 * agent's niche. Zero-config: with no ingested articles it falls back to a
 * deterministic seed topic so the loop still runs.
 *
 * Feedback loop: when a memory store is passed, topics that resemble past
 * winners get boosted (double down) and loser-similar topics get demoted.
 * Follow-up topics are also derived directly from winning keywords.
 */

import { listArticles } from '../../services/articleStore';
import { AgentConfig, KeywordPerformance } from '../types';
import type { AgentMemoryStore } from '../memory';

export interface Topic {
  title: string;
  url?: string;
  source?: string;
  /** True when this topic was derived from a past winner (high priority). */
  derivedFromWinner?: boolean;
}

/** Strip stopwords + noise for niche matching. */
const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'with', 'at', 'by',
  'is', 'are', 'was', 'were', 'be', 'been', 'it', 'its', 'as', 'from', 'that',
  'this', 'these', 'those', 'how', 'what', 'why', 'when', 'where', 'who', 'new',
]);

function tokens(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

/**
 * Score a title by how many niche tokens it shares. Higher = more relevant.
 */
export function nicheRelevance(title: string, niche: string): number {
  const nicheTokens = new Set(tokens(niche));
  const titleTokens = tokens(title);
  let score = 0;
  for (const t of titleTokens) {
    if (nicheTokens.has(t)) score += 2;
  }
  // Whole-niche phrase match is a strong signal.
  if (title.toLowerCase().includes(niche.toLowerCase())) score += 5;
  return score;
}

/** Seed topic used when the live store is empty (zero-config demo mode). */
function seedTopics(config: AgentConfig): Topic[] {
  const niche = config.niche.toLowerCase();
  return [
    { title: `Best ${config.niche} gear for 2026: tested picks` },
    { title: `${config.niche} trends everyone is searching for right now` },
    { title: `How to choose ${config.niche} equipment without overpaying` },
  ].filter((t) => nicheRelevance(t.title, niche) > 0 || niche.length > 0);
}

/**
 * Build follow-up topics from winning keywords — the "double down" step.
 * Each winner becomes a fresh angle ("best X", "X guide", "X vs Y") so the
 * agent reinvests in what already earned clicks/revenue.
 */
export function deriveWinnerTopics(
  winners: KeywordPerformance[],
  limit: number,
): Topic[] {
  const year = new Date().getFullYear();
  const topics: Topic[] = [];
  for (const w of winners.slice(0, limit)) {
    const kw = w.keyword;
    topics.push({
      title: `Best ${kw} for ${year}: top picks compared`,
      derivedFromWinner: true,
    });
    topics.push({
      title: `${kw} buying guide: what actually matters in ${year}`,
      derivedFromWinner: true,
    });
  }
  return topics;
}

export interface ObserveOptions {
  limit?: number;
  /** Memory store used to boost winner-similar topics and derive follow-ups. */
  memory?: AgentMemoryStore;
}

/**
 * Observe: return trending topics relevant to the niche, boosted by learned
 * performance when a memory store is provided.
 */
export async function observeTrends(
  config: AgentConfig,
  opts: ObserveOptions = {},
): Promise<Topic[]> {
  const limit = opts.limit ?? 10;
  const memory = opts.memory;

  let articles: any[] = [];
  try {
    articles = await listArticles({ limit: 50 });
  } catch (err) {
    console.warn('[agent research] Could not list articles:', (err as Error).message);
  }

  const scored = articles
    .filter((a) => a.title)
    .map((a) => {
      const niche = nicheRelevance(a.title, config.niche);
      const boost = memory ? memory.topicBoost(a.title) : 0;
      return {
        topic: { title: a.title, url: a.link, source: a.source } as Topic,
        score: niche + boost,
      };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  const live = scored.slice(0, limit).map((s) => s.topic);

  // Double down: derive follow-up topics from proven winners and surface them
  // ahead of cold live topics.
  const winners = memory ? memory.winners(limit) : [];
  const derived = deriveWinnerTopics(winners, Math.max(1, Math.floor(limit / 2)));

  const combined = [...derived, ...live].slice(0, limit);
  if (combined.length > 0) return combined;
  return seedTopics(config).slice(0, limit);
}
