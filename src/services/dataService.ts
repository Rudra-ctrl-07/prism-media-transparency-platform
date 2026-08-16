/**
 * dataService.ts — single access point for articles, verifications, and
 * sources. Tries the live backend first (via the Vite `/api` proxy); when
 * the backend is unreachable, unconfigured, or returns no data, it falls
 * back to the clearly-labeled demo dataset so every view stays functional.
 *
 * Every call reports `mode: 'live' | 'demo'` so the UI can badge the source
 * of truth honestly.
 */

import { Article, Source, VerificationResult } from '../types';
import { demoArticles, demoSources } from './demoData';

export type DataMode = 'live' | 'demo';

export interface FetchResult<T> {
  data: T;
  mode: DataMode;
}

const FETCH_TIMEOUT_MS = 4500;

/** fetch with an AbortController timeout so a dead backend fails fast. */
async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function normalizeArticle(raw: any): Article {
  return {
    id: raw.id || raw._id || '',
    title: raw.title || 'Untitled',
    excerpt: raw.excerpt || raw.summary || raw.contentSnippet || '',
    content: raw.content || raw.summary || '',
    category: raw.category || 'Home',
    sourceName: raw.sourceName || raw.source || 'Unknown',
    sourceCredibility: typeof raw.sourceCredibility === 'number' ? raw.sourceCredibility : 0.5,
    biasRating: raw.biasRating || 'Center',
    verificationStatus: raw.verificationStatus || 'PENDING',
    timestamp: raw.timestamp || raw.publishedAt || new Date().toISOString(),
    latitude: raw.latitude,
    longitude: raw.longitude,
    url: raw.url || raw.link || '',
    imageUrl: raw.imageUrl,
    biasAxes: raw.biasAxes,
    biasAnalysis: raw.biasAnalysis,
    groundingUrls: raw.groundingUrls,
    verificationTier: raw.verificationTier,
    verifiedBy: raw.verifiedBy,
    aiInsight: raw.aiInsight,
  };
}

/**
 * Fetch articles. Live backend first (with pagination/filters), then demo.
 */
export async function fetchArticles(params: {
  limit?: number;
  source?: string;
  minCredibility?: number;
  startDate?: string;
  endDate?: string;
} = {}): Promise<FetchResult<Article[]>> {
  const query = new URLSearchParams();
  if (params.limit) query.set('limit', String(params.limit));
  if (params.source) query.set('source', params.source);
  if (params.minCredibility !== undefined) query.set('minCredibility', String(params.minCredibility));
  if (params.startDate) query.set('startDate', params.startDate);
  if (params.endDate) query.set('endDate', params.endDate);

  try {
    const res = await fetchWithTimeout(`/api/articles?${query.toString()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const rawList: any[] = Array.isArray(json) ? json : json.articles || [];
    if (rawList.length > 0) {
      return { data: rawList.map(normalizeArticle), mode: 'live' };
    }
    // Backend reachable but empty — surface demo data so the UI is usable,
    // but clearly flagged so nobody mistakes it for real coverage.
    return { data: getDemoArticles(params), mode: 'demo' };
  } catch {
    return { data: getDemoArticles(params), mode: 'demo' };
  }
}

function getDemoArticles(params: { limit?: number; source?: string; minCredibility?: number } = {}): Article[] {
  let list = [...demoArticles];
  if (params.source) {
    list = list.filter((a) => a.sourceName === params.source);
  }
  if (params.minCredibility !== undefined) {
    list = list.filter((a) => a.sourceCredibility >= params.minCredibility!);
  }
  if (params.limit) {
    list = list.slice(0, params.limit);
  }
  return list;
}

/**
 * Fetch a single article by id (live first, then demo lookup).
 */
export async function fetchArticle(id: string): Promise<FetchResult<Article | null>> {
  try {
    const res = await fetchWithTimeout(`/api/articles/${encodeURIComponent(id)}`);
    if (res.ok) {
      const json = await res.json();
      if (json && json.id) return { data: normalizeArticle(json), mode: 'live' };
    }
  } catch {
    // fall through to demo
  }
  const demo = demoArticles.find((a) => a.id === id) || null;
  return { data: demo, mode: 'demo' };
}

/**
 * Fetch (or synthesize) a verification result for an article.
 * Tries the live deep-verification endpoint; if the backend is unreachable,
 * unauthenticated, or returns an error, falls back to the article's own
 * bias analysis (demo articles carry full debate analyses).
 */
export async function fetchVerification(article: Article): Promise<FetchResult<VerificationResult>> {
  try {
    const res = await fetchWithTimeout(`/api/articles/${encodeURIComponent(article.id)}/verify?deep=true`, {
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      const json = await res.json();
      if (json && typeof json.credibility === 'number') {
        return {
          data: {
            articleId: article.id,
            status: json.status || article.verificationStatus || 'PENDING',
            credibility: json.credibility,
            confidence: typeof json.confidence === 'number' ? json.confidence : 0.7,
            timestamp: json.timestamp || new Date().toISOString(),
            debate: json.debate,
          },
          mode: 'live',
        };
      }
    }
  } catch {
    // fall through to synthesis
  }
  return { data: synthesizeVerification(article), mode: 'demo' };
}

/** Build a VerificationResult from the article's stored bias analysis. */
export function synthesizeVerification(article: Article): VerificationResult {
  const analysis = article.biasAnalysis;
  const debate = analysis
    ? {
        progressive: analysis.progressive.text,
        conservative: analysis.conservative.text,
        omissionFocused: analysis.omission.text,
        moderatorVerdict: analysis.moderator.text,
        confidence: 0.78,
      }
    : {
        progressive:
          'This article presents a progressive perspective that highlights systemic factors and structural context behind the reported developments.',
        conservative:
          'From a conservative viewpoint, the article emphasizes market mechanisms, individual agency, and cautions against overreach in the underlying policy response.',
        omissionFocused:
          'The coverage underweights international comparisons and historical context that would place this development in a fuller frame.',
        moderatorVerdict:
          'The reporting is broadly accurate but carries moderate framing effects. Cross-referencing with wire coverage and primary documents is recommended before drawing strong conclusions.',
        confidence: 0.72,
      };

  return {
    articleId: article.id,
    status: article.verificationStatus || 'PENDING',
    credibility: article.sourceCredibility,
    confidence: 0.78,
    timestamp: new Date().toISOString(),
    debate,
  };
}

/**
 * Return the source roster. When the live backend is reachable, the roster is
 * derived from the articles it actually serves (real outlets with credibility
 * scores); otherwise the demo roster is used.
 */
export async function fetchSources(): Promise<FetchResult<Source[]>> {
  try {
    const res = await fetchWithTimeout('/api/articles?limit=200');
    if (res.ok) {
      const json = await res.json();
      const rawList: any[] = Array.isArray(json) ? json : json.articles || [];
      if (rawList.length > 0) {
        const byName = new Map<string, Source>();
        for (const raw of rawList) {
          const name = raw.sourceName || raw.source;
          if (!name) continue;
          const existing = byName.get(name);
          if (existing) {
            existing.verifiedCount += 1;
          } else {
            byName.set(name, {
              id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
              name,
              credibility: typeof raw.sourceCredibility === 'number' ? raw.sourceCredibility : 0.5,
              biasRating: raw.biasRating || 'Center',
              verificationStatus: 'VERIFIED',
              category: 'News',
              verifiedCount: 1,
              flaggedCount: 0,
              description: `${name} — live coverage monitored by PRISM.`,
            });
          }
        }
        const roster = [...byName.values()].sort((a, b) => b.credibility - a.credibility);
        if (roster.length > 0) return { data: roster, mode: 'live' };
      }
    }
  } catch {
    // fall through to demo roster
  }
  return { data: demoSources, mode: 'demo' };
}

/** Convert any articles list into BiasComparison-style verification inputs. */
export function toVerificationInputs(articles: Article[]): any[] {
  return articles.map((a) => {
    const analysis = a.biasAnalysis;
    return {
      articleId: a.id,
      title: a.title,
      source: a.sourceName,
      sourceCredibility: a.sourceCredibility,
      summary: a.excerpt,
      debate: analysis
        ? {
            progressive: analysis.progressive.text,
            conservative: analysis.conservative.text,
            omissionFocused: analysis.omission.text,
            moderatorVerdict: analysis.moderator.text,
            confidence: 0.78,
          }
        : undefined,
      verificationTimestamp: new Date(a.timestamp).getTime(),
      verificationType: 'deep',
    };
  });
}

/** Export a report as a downloadable JSON file (used by BusinessIntelligence). */
export function downloadJson(filename: string, payload: unknown): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  triggerDownload(blob, filename);
}

/** Export a report as a downloadable CSV file. */
export function downloadCsv(filename: string, rows: Array<Record<string, unknown>>): void {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, filename);
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 500);
}
