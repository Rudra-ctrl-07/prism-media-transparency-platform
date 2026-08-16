/**
 * agentLoop.ts — the autonomous Observe → Think → Act loop.
 *
 *   [Observe] pull trending topics relevant to the niche
 *   [Think]   LLM plans a publishable article (title, keywords, outline)
 *   [Act]     LLM writes the article; affiliate links are inserted
 *   [Observe] post is saved to memory + disk; loop repeats or exits
 *
 * Guardrails: max iterations, topic dedupe against memory, harmful-topic
 * blocklist, affiliate-link cap, and human-in-the-loop publishing.
 */

import { loadAgentConfig } from './config';
import { brainJson } from './brain';
import { PLANNER_SYSTEM_PROMPT, WRITER_SYSTEM_PROMPT, hasAgentError } from './brainstem';
import { AgentMemoryStore } from './memory';
import { observeTrends, nicheRelevance } from './tools/research';
import { matchAffiliateKeywords, insertAffiliateLinks, buildSearchUrl } from './tools/affiliate';
import { saveDraft, publishToWordPress, canPublishToWordPress } from './tools/publisher';
import { AgentConfig, AgentPost, AgentRunResult, AffiliateLink } from './types';

/** Harmful-topic guardrail: skip topics that could get content rejected. */
const BLOCKED_PATTERNS = [
  /\b(hack|hacking|exploit|crack)\b.*\b(software|account|system|game|instagram|facebook)s?\b/i,
  /\b(weapon|explosive|bomb)s?\b/i,
  /\b(drug|pharma|steroid|prescription)s?\b.*\b(buy|cheap|online)s?\b/i,
  /\b(casino|gambling|betting)\b/i,
  /\b(counterfeit|fake)\b.*\b(money|id|passport|document)s?\b/i,
  /\b(porn|adult)\b/i,
  /\b(illegal|fraud|scam)s?\b.*\b(how|guide|make|earn)s?\b/i,
];

export function isBlockedTopic(title: string): boolean {
  return BLOCKED_PATTERNS.some((re) => re.test(title));
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function makeId(): string {
  return `post-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Deterministic sandbox planner (used when no LLM is configured). */
function sandboxPlan(topicTitle: string, niche: string) {
  return {
    title: topicTitle.length > 90 ? topicTitle.slice(0, 87) + '...' : topicTitle,
    slug: slugify(topicTitle),
    summary: `A practical guide to ${topicTitle.toLowerCase()} — what to know and what to buy, written for ${niche} shoppers.`,
    keywords: [niche, `${niche} guide`, `${niche} best picks`],
    outline: ['What you need to know', 'Key things to compare', 'Our recommendations'],
    targetAffiliate: niche,
  };
}

/** Deterministic sandbox writer (used when no LLM is configured). */
function sandboxWriter(plan: any, topicTitle: string): { content: string; recommendedLinks: any[] } {
  const kw = plan.keywords?.[0] || plan.targetAffiliate || topicTitle;
  const content = [
    `# ${plan.title}`,
    '',
    plan.summary,
    '',
    '## What you need to know',
    `The latest news around "${topicTitle}" matters if you are shopping for ${plan.targetAffiliate}. ` +
      'Trends change fast, so focus on the features that actually affect your daily use.',
    '',
    '## Key things to compare',
    '- Build quality and warranty',
    '- Real-world performance vs. spec-sheet claims',
    '- Long-term cost, not just the sticker price',
    '',
    '## Our recommendations',
    `For most people, the best choice in ${plan.targetAffiliate} balances price and reliability. ` +
      'Compare a few leading models, read independent reviews, and buy from a retailer with a good return policy.',
    '',
    '*This article was generated in sandbox mode. Configure GOOGLE_API_KEY for live LLM content.*',
    '',
  ].join('\n');
  return { content, recommendedLinks: [{ keyword: kw, reason: 'primary affiliate target' }] };
}

export interface RunAgentOptions {
  config?: Partial<AgentConfig>;
  /** Override topic list (used by tests and the manual endpoint). */
  topics?: string[];
  /** Force sandbox even when an LLM is available (tests). */
  forceSandbox?: boolean;
}

/**
 * Run one Observe → Think → Act cycle for a topic. Returns a post, or null
 * when the topic is skipped (blocked / deduped / failed).
 */
async function runTopic(
  config: AgentConfig,
  store: AgentMemoryStore,
  topicTitle: string,
  sourceUrl?: string,
  source?: string,
  forceSandbox = false,
): Promise<AgentPost | null> {
  if (isBlockedTopic(topicTitle)) {
    console.warn(`[agent loop] Skipped blocked topic: ${topicTitle}`);
    return null;
  }
  const slug = slugify(topicTitle);
  if (store.isCovered(slug)) {
    console.warn(`[agent loop] Skipped already-covered topic: ${topicTitle}`);
    return null;
  }

  // ── Think: plan the article ────────────────────────────────────────────
  let plan: any = null;
  if (!forceSandbox) {
    const planRes = await brainJson(
      `Niche: ${config.niche}\nTrending topic: "${topicTitle}"\nPlan a publishable article that can earn affiliate revenue.`,
      PLANNER_SYSTEM_PROMPT,
    );
    if (!planRes.sandbox && planRes.data && !hasAgentError(planRes.data)) {
      plan = planRes.data;
    }
  }
  if (!plan) plan = sandboxPlan(topicTitle, config.niche);

  // ── Act: write the article ─────────────────────────────────────────────
  let article: { content: string; recommendedLinks?: any[] } | null = null;
  if (!forceSandbox) {
    const writeRes = await brainJson(
      `Niche: ${config.niche}\nWrite this article:\n${JSON.stringify(plan)}`,
      WRITER_SYSTEM_PROMPT,
    );
    if (!writeRes.sandbox && writeRes.data && writeRes.data.content && !hasAgentError(writeRes.data)) {
      article = writeRes.data;
    }
  }
  if (!article) article = sandboxWriter(plan, topicTitle);

  // ── Act: insert affiliate links (the monetization hand) ────────────────
  const keywordText = `${article.content} ${(plan.keywords || []).join(' ')} ${plan.targetAffiliate || ''}`;
  let links = matchAffiliateKeywords(keywordText, config.affiliateKeywords, config.affiliateTag);
  // If only a tag is configured, build search links for the article keywords.
  if (links.length === 0 && config.affiliateTag) {
    const candidates = [plan.targetAffiliate, ...(plan.keywords || [])].filter(Boolean);
    links = [...new Set(candidates)].slice(0, config.maxAffiliateLinksPerPost).map(
      (kw) => ({ keyword: kw, url: buildSearchUrl(config.affiliateTag!, kw) }) as AffiliateLink,
    );
  }
  const { content, inserted } = insertAffiliateLinks(article.content, links, config.maxAffiliateLinksPerPost);

  const post: AgentPost = {
    id: makeId(),
    title: plan.title || topicTitle,
    slug,
    summary: plan.summary || '',
    content,
    keywords: plan.keywords || [],
    affiliateLinks: inserted,
    status: 'draft',
    sourceTopic: topicTitle,
    sourceUrl,
    createdAt: new Date().toISOString(),
  };

  // ── Observe: persist ───────────────────────────────────────────────────
  saveDraft(config, post);

  // Human-in-the-loop: only auto-publish when explicitly enabled + configured.
  if (config.autoPublish && canPublishToWordPress(config)) {
    try {
      const wp = await publishToWordPress(config, post);
      post.status = 'published';
      post.publishedAt = new Date().toISOString();
      post.wordpressId = wp.id;
    } catch (err) {
      console.error('[agent loop] Auto-publish failed, keeping draft:', (err as Error).message);
      store.recordRun([`Publish failed (slug: ${slug}): ${(err as Error).message}`]);
    }
  }

  store.addPost(post);
  return post;
}

/**
 * Run the agent: observe trending topics, then think+act on each one.
 * Exits after maxPostsPerRun posts or when topics run out.
 */
export async function runAgentRun(opts: RunAgentOptions = {}): Promise<AgentRunResult> {
  const config: AgentConfig = { ...loadAgentConfig(), ...(opts.config || {}) };
  const store = new AgentMemoryStore(config.memoryFile);

  const runId = `run-${Date.now().toString(36)}`;
  const startedAt = new Date().toISOString();
  const skipped: { topic: string; reason: string }[] = [];
  const errors: string[] = [];
  const posts: AgentPost[] = [];
  const sandbox = !process.env.GOOGLE_API_KEY && !process.env.GEMINI_API_KEY;

  let topics: { title: string; url?: string; source?: string; derivedFromWinner?: boolean }[] = [];
  if (opts.topics && opts.topics.length > 0) {
    topics = opts.topics.map((title) => ({ title }));
  } else {
    try {
      // Observe with the performance feedback loop: winner-similar topics are
      // boosted and follow-up topics derived from proven winners come first.
      topics = await observeTrends(config, { memory: store, limit: config.maxPostsPerRun * 3 });
    } catch (err) {
      console.error('[agent loop] Observe step failed:', (err as Error).message);
      errors.push(`Observe failed: ${(err as Error).message}`);
    }
  }

  let iterations = 0;
  for (const topic of topics) {
    if (posts.length >= config.maxPostsPerRun) break;
    if (iterations >= config.maxIterations) break;
    iterations++;

    const slug = slugify(topic.title);
    if (store.isCovered(slug)) {
      skipped.push({ topic: topic.title, reason: 'already covered' });
      continue;
    }
    if (isBlockedTopic(topic.title)) {
      skipped.push({ topic: topic.title, reason: 'blocked topic' });
      continue;
    }
    // Winner-derived follow-ups are explicit double-downs — they bypass the
    // niche-relevance filter (the winner keyword already proved itself).
    if (nicheRelevance(topic.title, config.niche) === 0 && !opts.topics && !topic.derivedFromWinner) {
      skipped.push({ topic: topic.title, reason: 'not relevant to niche' });
      continue;
    }

    try {
      const post = await runTopic(config, store, topic.title, topic.url, topic.source, opts.forceSandbox);
      if (post) posts.push(post);
    } catch (err) {
      console.error('[agent loop] Topic failed:', (err as Error).message);
      errors.push(`${topic.title}: ${(err as Error).message}`);
      store.recordRun([`Failed topic "${topic.title}" (slug: ${slug}): ${(err as Error).message}`]);
    }
  }

  store.recordRun();
  return {
    runId,
    startedAt,
    finishedAt: new Date().toISOString(),
    postsCreated: posts.length,
    skipped,
    errors,
    sandbox,
    posts,
  };
}
