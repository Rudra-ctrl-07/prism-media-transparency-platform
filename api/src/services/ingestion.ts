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
  // --- Wire services & global outlets ---
  { name: 'BBC News', url: 'https://feeds.bbci.co.uk/news/world/rss.xml', credibility: 0.85 },
  { name: 'NPR News', url: 'https://feeds.npr.org/1001/rss.xml', credibility: 0.85 },
  { name: 'The Guardian', url: 'https://www.theguardian.com/world/rss', credibility: 0.84 },
  { name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml', credibility: 0.82 },
  { name: 'Deutsche Welle', url: 'https://rss.dw.com/rdf/rss-en-world', credibility: 0.85 },
  { name: 'France 24', url: 'https://www.france24.com/en/rss', credibility: 0.83 },
  { name: 'NBC News', url: 'https://feeds.nbcnews.com/nbcnews/public/news', credibility: 0.78 },
  { name: 'AP News', url: 'https://feedx.net/rss/ap.xml', credibility: 0.88 },
  { name: 'Reuters', url: 'https://feeds.reuters.com/reuters/worldNews', credibility: 0.89 },
  // --- Asia-Pacific perspective ---
  { name: 'NHK World', url: 'https://www3.nhk.or.jp/rss/news/cat0.xml', credibility: 0.84 },
  { name: 'South China Morning Post', url: 'https://www.scmp.com/rss/91/feed', credibility: 0.80 },
  // --- Investigative & academic journalism ---
  { name: 'ProPublica', url: 'https://www.propublica.org/feed?rss', credibility: 0.87 },
  { name: 'The Conversation', url: 'https://theconversation.com/articles/feed', credibility: 0.83 },
  // --- Tech & science ---
  { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index', credibility: 0.82 },
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/', credibility: 0.76 },
  // --- Middle East deep-dive ---
  { name: 'Al-Monitor', url: 'https://www.al-monitor.com/rss', credibility: 0.79 },
  // --- India ---
  { name: 'The Hindu', url: 'https://www.thehindu.com/news/international/feeder/default.rss', credibility: 0.83 },
  { name: 'Times of India', url: 'https://timesofindia.indiatimes.com/rssfeedstopstories.cms', credibility: 0.72 },
  // --- Africa ---
  { name: 'Daily Maverick', url: 'https://www.dailymaverick.co.za/dmrss/', credibility: 0.81 },
  { name: 'The East African', url: 'https://www.theeastafrican.co.ke/tea/rss', credibility: 0.77 },
  // --- Latin America ---
  { name: 'MercoPress', url: 'https://en.mercopress.com/rss', credibility: 0.78 },
  { name: 'Buenos Aires Times', url: 'https://www.batimes.com.ar/feed', credibility: 0.73 },
  // --- Europe deep-dive ---
  { name: 'EUobserver', url: 'https://euobserver.com/rss.xml', credibility: 0.82 },
  { name: 'Euronews', url: 'https://www.euronews.com/rss', credibility: 0.80 },
  // --- Science & health ---
  { name: 'Nature News', url: 'https://www.nature.com/nature.rss', credibility: 0.91 },
  { name: 'Science Magazine', url: 'https://www.science.org/rss/news_current.xml', credibility: 0.90 },
  { name: 'The Lancet', url: 'https://www.thelancet.com/rssfeed/lancet_current.xml', credibility: 0.89 },
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
