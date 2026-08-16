import { describe, it, expect } from 'vitest';
import { extractKeywords, clusterStories } from './storyClustering';
import { demoArticles } from './demoData';

const now = Date.now();
const iso = (hoursAgo: number) => new Date(now - hoursAgo * 3600_000).toISOString();

function makeArticle(
  id: string,
  title: string,
  excerpt: string,
  sourceName: string,
  sourceCredibility = 0.85,
) {
  return {
    id,
    title,
    excerpt,
    content: excerpt,
    category: 'Home' as const,
    sourceName,
    sourceCredibility,
    biasRating: 'Center' as const,
    verificationStatus: 'VERIFIED' as const,
    timestamp: iso(1),
  };
}

describe('extractKeywords', () => {
  it('drops stopwords and short tokens, de-duplicates', () => {
    const kw = extractKeywords('The central bank holds rates steady and stable rate rate');
    expect(kw).toContain('central');
    expect(kw).toContain('rates');
    expect(kw).toContain('steady');
    expect(kw).not.toContain('the');
    expect(kw).not.toContain('and');
    // 'rate' appears 3 times but must appear once in the result
    expect(kw.filter((k) => k === 'rate').length).toBe(1);
    expect(new Set(kw).size).toBe(kw.length);
  });

  it('normalizes case and punctuation', () => {
    const kw = extractKeywords('Climate, Finance: TALKS intensify!');
    expect(kw).toContain('climate');
    expect(kw).toContain('finance');
    expect(kw).toContain('talks');
  });
});

describe('clusterStories', () => {
  it('groups articles sharing topic keywords into one story', () => {
    const articles = [
      makeArticle('a1', 'Central banks hold rates steady as inflation cools', 'Policymakers kept the benchmark rate unchanged amid easing inflation.', 'Reuters'),
      makeArticle('a2', 'Inflation cools slowly as easing expectations fade', 'New consumer price figures show inflation cooling more slowly than expected.', 'Associated Press'),
      makeArticle('a3', 'Markets rally on trade deal optimism', 'Investors cheered the new trade agreement between the two economies.', 'Bloomberg'),
    ];

    const clusters = clusterStories(articles);
    const story = clusters.find((c) => c.articleCount === 2);

    expect(story).toBeDefined();
    expect(story?.articles.map((a) => a.id).sort()).toEqual(['a1', 'a2']);
    expect(story?.sourceCount).toBe(2);
    expect(story?.sources.sort()).toEqual(['Associated Press', 'Reuters']);
  });

  it('counts distinct sources even when many articles come from one outlet', () => {
    const articles = [
      makeArticle('b1', 'Flood warnings issued after severe storm', 'A powerful storm drove flood warnings across the region.', 'Reuters'),
      makeArticle('b2', 'Severe storm prompts fresh flood warnings', 'Authorities issued flood warnings as the storm moved inland.', 'Reuters'),
      makeArticle('b3', 'Flood warnings remain as storm passes', 'Residents kept watch as flood warnings stayed in place.', 'BBC'),
    ];

    const clusters = clusterStories(articles);
    const story = clusters.find((c) => c.articleCount >= 2);
    expect(story).toBeDefined();
    // 3 articles but only 2 distinct outlets.
    expect(story?.articleCount).toBe(3);
    expect(story?.sourceCount).toBe(2);
    expect(story?.sources.sort()).toEqual(['BBC', 'Reuters']);
  });

  it('keeps unrelated articles as singletons', () => {
    const articles = [
      makeArticle('c1', 'Semiconductor exports restricted', 'New rules limit advanced chip exports.', 'Reuters'),
      makeArticle('c2', 'Vaccine trial shows strong efficacy', 'Late-stage trial results exceeded expectations.', 'AP'),
      makeArticle('c3', 'Space agency confirms orbital milestone', 'The agency deployed a new observation platform.', 'BBC'),
    ];
    const clusters = clusterStories(articles);
    expect(clusters.every((c) => c.articleCount === 1)).toBe(true);
    expect(clusters.length).toBe(3);
  });

  it('computes credibility range and latest timestamp', () => {
    const articles = [
      makeArticle('d1', 'Trade deal reached on digital services', 'Negotiators agreed on digital trade rules.', 'Reuters', 0.92),
      makeArticle('d2', 'Digital trade rules finalized in talks', 'Negotiators finalized the digital services chapters.', 'AP', 0.8),
    ];
    const story = clusterStories(articles)[0];
    expect(story.minCredibility).toBe(0.8);
    expect(story.maxCredibility).toBe(0.92);
    expect(story.latestTimestamp).toBeTruthy();
    expect(story.keywords.length).toBeGreaterThan(0);
  });
});

describe('demo data integration', () => {
  it('produces corroborated multi-source stories from the demo dataset', () => {
    const clusters = clusterStories(demoArticles);
    const stories = clusters.filter((c) => c.articleCount > 1);
    const multiSource = stories.filter((c) => c.sourceCount >= 2);

    // The demo set intentionally includes a central-bank story covered by
    // Reuters, AP, and BBC — so at least one 3-source story must exist.
    expect(multiSource.length).toBeGreaterThanOrEqual(1);
    const threePlus = multiSource.find((c) => c.sourceCount >= 3);
    expect(threePlus).toBeDefined();
    expect(threePlus?.sources).toContain('Reuters World');
    expect(threePlus?.sources).toContain('Associated Press');
    expect(threePlus?.sources).toContain('BBC News');
  });
});
