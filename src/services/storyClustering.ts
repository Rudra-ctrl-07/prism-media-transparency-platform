/**
 * storyClustering.ts — groups articles into "stories" (topics corroborated
 * across sources) for the Story Tracker view.
 *
 * Approach: extract significant keywords from each article's TITLE (titles
 * are written to be distinctive; excerpts carry boilerplate like "data",
 * "markets" and "reports" that over-connects unrelated stories). Tokens are
 * lightly stemmed (trailing plural "s") and two articles join a story when
 * they share >= minSharedTokens stemmed keywords. Union-find gives the story
 * as the transitive closure of those links, so the grouping is deterministic
 * and explainable — the UI shows the raw keywords WHY articles were grouped.
 */

import { Article } from '../types';

export interface StoryCluster {
  id: string;
  headline: string;
  keywords: string[];
  articles: Article[];
  articleCount: number;
  /** Distinct outlets covering this story — the corroboration count. */
  sourceCount: number;
  sources: string[];
  credibilityAvg: number;
  minCredibility: number;
  maxCredibility: number;
  latestTimestamp: string;
}

/** Common connective words that carry no topical signal. */
const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'for', 'with', 'without', 'from', 'into',
  'onto', 'over', 'under', 'about', 'after', 'before', 'during', 'between',
  'against', 'through', 'across', 'within', 'along', 'news', 'report', 'reports',
  'reporting', 'said', 'says', 'say', 'will', 'would', 'could', 'should', 'may',
  'might', 'must', 'can', 'has', 'have', 'had', 'been', 'being', 'this', 'that',
  'these', 'those', 'its', 'their', 'there', 'they', 'them', 'she', 'his', 'her',
  'who', 'whom', 'which', 'what', 'when', 'where', 'why', 'how', 'not', 'no',
  'yes', 'one', 'two', 'new', 'more', 'most', 'less', 'few', 'much', 'many',
  'also', 'very', 'just', 'now', 'still', 'yet', 'even', 'ever', 'never', 'first',
  'last', 'next', 'up', 'down', 'out', 'off', 'on', 'in', 'at', 'by', 'as', 'of',
  'to', 'is', 'are', 'was', 'were', 'be', 'am', 'supply', 'chain', 'global',
  'market', 'markets', 'week', 'weeks', 'month', 'months', 'year', 'years', 'day',
  'days', 'today', 'time', 'times', 'level', 'levels', 'part', 'parts', 'way',
  'ways', 'make', 'made', 'take', 'took', 'given', 'come', 'came', 'show',
  'shows', 'shown', 'see', 'seen', 'going', 'get', 'got', 'use', 'used', 'help',
  'back', 'again', 'until', 'since', 'each', 'every', 'both', 'either', 'neither',
  'such', 'same', 'other', 'others', 'another', 'some', 'any', 'all', 'only',
  'too', 'quite', 'rather', 'really', 'however', 'though', 'although', 'because',
  'plus', 'well', 'good', 'big', 'small', 'large', 'high', 'low',
]);

/** Extract a de-duplicated list of significant keywords from a text blob. */
export function extractKeywords(text: string): string[] {
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, ' ')
        .split(/[\s-]+/)
        .filter((w) => w.length >= 4 && !STOPWORDS.has(w)),
    ),
  );
}

/** Light stemmer: strip a trailing plural "s" from longer words. */
function stem(w: string): string {
  if (w.length > 4 && w.endsWith('s') && !w.endsWith('ss') && !w.endsWith('us')) {
    return w.slice(0, -1);
  }
  return w;
}

/** Stemmed keyword set used for MATCHING (titles only). */
function matchKeywords(a: Article): Set<string> {
  return new Set(extractKeywords(a.title).map(stem));
}

/** Raw keyword set used for DISPLAY (title + excerpt). */
function displayKeywords(a: Article): Set<string> {
  return new Set(extractKeywords(`${a.title} ${a.excerpt}`));
}

function sharedCount(a: Set<string>, b: Set<string>): number {
  let n = 0;
  for (const k of a) if (b.has(k)) n++;
  return n;
}

class UnionFind {
  private parent: number[];

  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);
  }

  find(x: number): number {
    if (this.parent[x] !== x) this.parent[x] = this.find(this.parent[x]);
    return this.parent[x];
  }

  union(a: number, b: number): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent[rb] = ra;
  }
}

/**
 * Cluster articles into stories. Two articles join a story when their stemmed
 * titles share at least `minSharedTokens` significant keywords.
 */
export function clusterStories(
  articles: Article[],
  minSharedTokens = 2,
): StoryCluster[] {
  const n = articles.length;
  if (n === 0) return [];

  const matchSets = articles.map(matchKeywords);
  const uf = new UnionFind(n);

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (sharedCount(matchSets[i], matchSets[j]) >= minSharedTokens) {
        uf.union(i, j);
      }
    }
  }

  const groups = new Map<number, Article[]>();
  articles.forEach((article, i) => {
    const root = uf.find(i);
    const list = groups.get(root) || [];
    list.push(article);
    groups.set(root, list);
  });

  const clusters: StoryCluster[] = Array.from(groups.values()).map((group) => {
    // Sort by recency within the story.
    group.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    // Display keywords: raw tokens shared by at least two members (or the most
    // frequent member keywords when the story is a singleton).
    const freq = new Map<string, number>();
    for (const a of group) {
      for (const k of displayKeywords(a)) {
        freq.set(k, (freq.get(k) || 0) + 1);
      }
    }
    const keywords =
      group.length > 1
        ? Array.from(freq.entries())
            .filter(([, count]) => count >= 2)
            .sort((a, b) => b[1] - a[1])
            .map(([k]) => k)
            .slice(0, 6)
        : Array.from(freq.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([k]) => k)
            .slice(0, 6);

    const sources = Array.from(new Set(group.map((a) => a.sourceName)));
    const creds = group.map((a) => a.sourceCredibility);
    const avg = creds.reduce((s, c) => s + c, 0) / creds.length;

    return {
      id: `story-${group[0].id}-${group.length}`,
      headline: group[0].title,
      keywords,
      articles: group,
      articleCount: group.length,
      sourceCount: sources.length,
      sources,
      credibilityAvg: avg,
      minCredibility: Math.min(...creds),
      maxCredibility: Math.max(...creds),
      latestTimestamp: group[0].timestamp,
    };
  });

  // Most corroborated first, then most recent.
  clusters.sort(
    (a, b) =>
      b.sourceCount - a.sourceCount ||
      b.articleCount - a.articleCount ||
      new Date(b.latestTimestamp).getTime() - new Date(a.latestTimestamp).getTime(),
  );

  return clusters;
}
