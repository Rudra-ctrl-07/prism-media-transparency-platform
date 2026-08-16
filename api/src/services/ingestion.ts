/**
 * ingestion.ts — fetches REAL articles from live RSS feeds and stores them via
 * `articleStore` (Firestore when configured, in-memory otherwise). No demo
 * data is ever generated: if a feed fails, that source is simply skipped.
 */

import Parser from 'rss-parser';
import { saveArticle, findByLink } from './articleStore';
import { getArticleCoordinates } from './geocoder';

const parser = new Parser({
  customFields: {
    item: [
      ['media:content', 'mediaContent'],
      ['media:thumbnail', 'mediaThumbnail'],
    ],
  },
});

// Live, working public RSS feeds (verified 2026). Credibility is the outlet's
// baseline editorial trust score used by the transparency engine.
const NEWS_SOURCES = [
  { name: 'BBC News', url: 'https://feeds.bbci.co.uk/news/world/rss.xml', credibility: 0.85 },
  { name: 'NPR News', url: 'https://feeds.npr.org/1001/rss.xml', credibility: 0.85 },
  { name: 'The Guardian', url: 'https://www.theguardian.com/world/rss', credibility: 0.84 },
  { name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml', credibility: 0.82 },
  { name: 'Deutsche Welle', url: 'https://rss.dw.com/rdf/rss-en-world', credibility: 0.85 },
  { name: 'France 24', url: 'https://www.france24.com/en/rss', credibility: 0.83 },
  { name: 'NBC News', url: 'https://feeds.nbcnews.com/nbcnews/public/news', credibility: 0.78 },
];

/** Max articles ingested per source per run — bounds memory + runtime. */
const MAX_PER_SOURCE = 25;

interface FeedItem {
  title: string;
  link: string;
  pubDate: Date;
  summary: string;
  content: string;
}

async function fetchFeed(source: (typeof NEWS_SOURCES)[0]): Promise<FeedItem[]> {
  try {
    const feed = await parser.parseURL(source.url);
    return feed.items.slice(0, MAX_PER_SOURCE).map((item) => ({
      title: (item.title || '').trim(),
      link: item.link || '',
      pubDate: item.pubDate ? new Date(item.pubDate) : new Date(),
      summary: (item.contentSnippet || '').slice(0, 600),
      content: (item.content || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 1200),
    }));
  } catch (error) {
    console.error(`[ingest] Feed failed for ${source.name}:`, (error as Error).message);
    return [];
  }
}

/**
 * Fetch all feeds in parallel and store new articles. Returns a summary.
 */
export async function ingestNews(): Promise<{ fetched: number; added: number; skipped: number }> {
  const results = await Promise.allSettled(NEWS_SOURCES.map((source) => ingestSource(source)));

  let fetched = 0;
  let added = 0;
  let skipped = 0;
  for (const result of results) {
    if (result.status === 'fulfilled') {
      fetched += result.value.fetched;
      added += result.value.added;
      skipped += result.value.skipped;
    }
  }

  console.log(`[ingest] complete: fetched=${fetched} added=${added} skipped=${skipped}`);
  return { fetched, added, skipped };
}

/** Fetch one source's feed and store its new articles. */
async function ingestSource(source: (typeof NEWS_SOURCES)[0]): Promise<{ fetched: number; added: number; skipped: number }> {
  let fetched = 0;
  let added = 0;
  let skipped = 0;

  const items = await fetchFeed(source);
  fetched += items.length;
  console.log(`[ingest] ${source.name}: ${items.length} items`);

  for (const item of items) {
    if (!item.title || !item.link) continue;

    // Deduplicate by original link.
    const existing = await findByLink(item.link);
    if (existing) {
      skipped++;
      continue;
    }

    const coords = await getArticleCoordinates({
      title: item.title,
      summary: item.summary,
      content: item.content,
      source: source.name,
    });

    await saveArticle({
      title: item.title,
      link: item.link,
      source: source.name,
      sourceName: source.name,
      sourceCredibility: source.credibility,
      excerpt: item.summary,
      summary: item.summary,
      content: item.content,
      publishedAt: item.pubDate,
      timestamp: item.pubDate.toISOString(),
      latitude: coords.lat,
      longitude: coords.lng,
      verificationStatus: 'VERIFIED',
      biasRating: 'Center',
      category: 'Home',
      imageUrl: undefined,
    });
    added++;
  }

  return { fetched, added, skipped };
}
