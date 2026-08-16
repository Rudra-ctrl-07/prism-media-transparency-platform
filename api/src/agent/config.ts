/**
 * config.ts — agent configuration loaded from environment variables.
 *
 * The agent is zero-config: with no vars set it runs in demo mode
 * (sandbox LLM, no affiliate links, drafts only) so the loop is fully
 * exercisable. Set the vars below to go live:
 *
 *   AGENT_ENABLED=true
 *   AGENT_NICHE="smart home security"
 *   AGENT_MAX_POSTS_PER_RUN=2
 *   AGENT_MAX_ITERATIONS=3
 *   AGENT_MAX_AFFILIATE_LINKS_PER_POST=3
 *   AGENT_AFFILIATE_KEYWORDS='{"security camera":"https://amzn.to/xxx", ...}'
 *   AGENT_AFFILIATE_TAG="your-tag-20"           (used to build search links)
 *   AGENT_OUTPUT_DIR="data/agent-posts"
 *   AGENT_MEMORY_FILE="data/agent-memory.json"
 *   AGENT_AUTO_PUBLISH=false
 *   AGENT_WORDPRESS_URL="https://example.com"
 *   AGENT_WORDPRESS_USER="admin"
 *   AGENT_WORDPRESS_APP_PASSWORD="xxxx xxxx xxxx xxxx"
 */

import { AgentConfig } from './types';

function parseIntSafe(value: string | undefined, fallback: number): number {
  const n = Number.parseInt(value || '', 10);
  return Number.isFinite(n) ? n : fallback;
}

function parseAffiliateKeywords(raw?: string): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (err) {
    console.warn('[agent] AGENT_AFFILIATE_KEYWORDS is not valid JSON, ignoring:', (err as Error).message);
    return {};
  }
}

export function loadAgentConfig(env: NodeJS.ProcessEnv = process.env): AgentConfig {
  const wordpress =
    env.AGENT_WORDPRESS_URL && env.AGENT_WORDPRESS_USER && env.AGENT_WORDPRESS_APP_PASSWORD
      ? {
          url: env.AGENT_WORDPRESS_URL,
          username: env.AGENT_WORDPRESS_USER,
          appPassword: env.AGENT_WORDPRESS_APP_PASSWORD,
        }
      : undefined;

  return {
    enabled: env.AGENT_ENABLED !== 'false',
    niche: env.AGENT_NICHE || 'smart home security',
    maxPostsPerRun: parseIntSafe(env.AGENT_MAX_POSTS_PER_RUN, 2),
    maxIterations: parseIntSafe(env.AGENT_MAX_ITERATIONS, 3),
    affiliateKeywords: parseAffiliateKeywords(env.AGENT_AFFILIATE_KEYWORDS),
    affiliateTag: env.AGENT_AFFILIATE_TAG || undefined,
    maxAffiliateLinksPerPost: parseIntSafe(env.AGENT_MAX_AFFILIATE_LINKS_PER_POST, 3),
    outputDir: env.AGENT_OUTPUT_DIR || 'data/agent-posts',
    memoryFile: env.AGENT_MEMORY_FILE || 'data/agent-memory.json',
    autoPublish: env.AGENT_AUTO_PUBLISH === 'true',
    wordpress,
  };
}
