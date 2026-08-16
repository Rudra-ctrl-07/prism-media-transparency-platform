/**
 * tools/affiliate.ts — the agent's "hands" for monetization: affiliate links.
 *
 * The engine matches keywords that appear in an article against a configured
 * keyword → URL map (or builds search links from an affiliate tag), then
 * inserts markdown links at the first natural occurrence of each keyword.
 * Guardrails: a max number of links per post and no duplicate insertions.
 */

import { AffiliateLink } from '../types';

/**
 * Build a search-based affiliate URL from a tag + keyword.
 * Works with Amazon Associates-style tags: `?tag=`.
 */
export function buildSearchUrl(tag: string, keyword: string): string {
  const q = encodeURIComponent(keyword.trim()).replace(/%20/g, '+');
  return `https://www.amazon.com/s?k=${q}&tag=${encodeURIComponent(tag)}`;
}

/** Escape regex special chars so keywords can be used in RegExp safely. */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** First word-boundary index of `needle` in `haystack`, or -1. */
function indexOfWord(haystack: string, needle: string): number {
  const re = new RegExp(`\\b${escapeRegExp(needle)}\\b`, 'i');
  const m = re.exec(haystack);
  return m ? m.index : -1;
}

/**
 * Find which configured affiliate keywords appear in the text (as whole
 * words — "security camera" will not match inside "security cameras").
 * Returns links in the order the keyword first appears in the text.
 */
export function matchAffiliateKeywords(
  text: string,
  affiliateKeywords: Record<string, string>,
  tag?: string,
): AffiliateLink[] {
  const entries = Object.entries(affiliateKeywords);
  const found: { keyword: string; url: string; index: number }[] = [];

  for (const [keyword, url] of entries) {
    const idx = indexOfWord(text, keyword);
    if (idx !== -1) found.push({ keyword, url, index: idx });
  }

  // If no explicit mapping hit but a tag is configured, build search links
  // from the most common nouns later — handled by callers via buildSearchUrl.
  found.sort((a, b) => a.index - b.index);
  return found.map(({ keyword, url }) => ({ keyword, url }));
}

/**
 * Insert `[keyword](url)` markdown links at the first occurrence of each
 * keyword in the article, up to `max`. Skips keywords already linked.
 */
export function insertAffiliateLinks(
  content: string,
  links: AffiliateLink[],
  max: number,
): { content: string; inserted: AffiliateLink[] } {
  let out = content;
  const inserted: AffiliateLink[] = [];

  for (const link of links) {
    if (inserted.length >= max) break;
    const kw = link.keyword.trim();
    if (!kw) continue;

    const idx = indexOfWord(out, kw);
    if (idx === -1) continue;

    // Skip if this occurrence is already inside a markdown link `[...](...)`.
    const before = out.slice(0, idx);
    const openBracket = before.lastIndexOf('[');
    const closeBracket = before.lastIndexOf(']');
    if (openBracket > closeBracket) continue; // inside link text

    const markdown = `[${kw}](${link.url})`;
    out = out.slice(0, idx) + markdown + out.slice(idx + kw.length);
    inserted.push(link);
  }

  return { content: out, inserted };
}
