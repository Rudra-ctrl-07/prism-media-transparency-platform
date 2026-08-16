/**
 * types.ts — shared types for the PRISM Content & Affiliate Agent.
 *
 * The agent follows the four-pillar agent architecture:
 *   Brain     → LLM wrapper (see brain.ts)
 *   Brainstem → system prompt / prompt contract (see brainstem.ts)
 *   Hands     → tools: research, affiliate links, publisher (see tools/)
 *   Memory    → long-term memory file store (see memory.ts)
 *
 * All persistence is zero-config: when no Firebase service account is
 * configured the agent keeps its posts + memory in local JSON files under
 * `data/` so it works out of the box, mirroring the rest of the API.
 */

/** A single affiliate link the agent can drop into content. */
export interface AffiliateLink {
  /** Keyword that triggered the link (e.g. "security camera"). */
  keyword: string;
  /** Destination URL (affiliate-tagged). */
  url: string;
}

/** Engagement metrics recorded for a post (clicks/impressions/revenue). */
export interface PostMetrics {
  clicks: number;
  impressions: number;
  /** Affiliate conversions attributed to the post. */
  conversions: number;
  /** Total revenue attributed to the post (kept in sync with RevenueEntry). */
  revenue: number;
  updatedAt: string;
}

/** A piece of content produced by the agent. */
export interface AgentPost {
  id: string;
  title: string;
  slug: string;
  summary: string;
  /** Full article in markdown, affiliate links already inserted. */
  content: string;
  /** SEO-ish keywords the article targets. */
  keywords: string[];
  affiliateLinks: AffiliateLink[];
  /** 'draft' = awaiting human approval, 'published' = live. */
  status: 'draft' | 'published';
  /** The trending topic this post was derived from. */
  sourceTopic: string;
  sourceUrl?: string;
  createdAt: string;
  publishedAt?: string;
  /** WordPress post id when pushed to a WP site. */
  wordpressId?: number;
  /** Live engagement metrics — feeds the observe step's winner detection. */
  metrics?: PostMetrics;
}

/** Aggregate performance of a keyword across posts (used to find winners). */
export interface KeywordPerformance {
  keyword: string;
  clicks: number;
  impressions: number;
  revenue: number;
  /** How many posts targeted this keyword. */
  postCount: number;
  /** Click-through rate (clicks / impressions), 0 when no impressions. */
  ctr: number;
  /** Revenue per click — a strong winner signal for affiliate content. */
  revenuePerClick: number;
}

/** A recorded affiliate payout / ad earning for a post. */
export interface RevenueEntry {
  amount: number;
  source: string;
  date: string;
  postId?: string;
}

/** Long-term memory: what the agent has done, learned, and earned. */
export interface AgentMemory {
  posts: AgentPost[];
  mistakes: string[];
  preferences: Record<string, string>;
  revenue: RevenueEntry[];
  lastRun: string | null;
}

/** Result of one observe→think→act run. */
export interface AgentRunResult {
  runId: string;
  startedAt: string;
  finishedAt: string;
  postsCreated: number;
  skipped: { topic: string; reason: string }[];
  errors: string[];
  /** True when the LLM was unavailable and sandbox stubs were used. */
  sandbox: boolean;
  posts: AgentPost[];
}

/** Agent configuration, loaded from env vars (see config.ts). */
export interface AgentConfig {
  enabled: boolean;
  /** Content niche the agent writes about, e.g. "smart home security". */
  niche: string;
  /** Max posts generated per run. */
  maxPostsPerRun: number;
  /** Hard cap on observe→think→act iterations (guardrail). */
  maxIterations: number;
  /** Keyword → affiliate URL map. Empty when only a tag is configured. */
  affiliateKeywords: Record<string, string>;
  /** Affiliate tag (e.g. Amazon tag) used to build search links. */
  affiliateTag?: string;
  /** Max affiliate links inserted per post (guardrail). */
  maxAffiliateLinksPerPost: number;
  /** Where draft markdown files are written. */
  outputDir: string;
  /** Where long-term memory is stored. */
  memoryFile: string;
  /** Publish without human approval (false = human-in-the-loop). */
  autoPublish: boolean;
  /** Optional WordPress REST API credentials for real publishing. */
  wordpress?: { url: string; username: string; appPassword: string };
}
