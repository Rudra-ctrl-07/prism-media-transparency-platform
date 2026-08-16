/**
 * tools/publisher.ts — the agent's "hands" for publishing.
 *
 * Drafts are always written as markdown files (zero-config). When WordPress
 * credentials are configured and auto-publish is enabled, drafts are pushed
 * to the WP REST API. Human-in-the-loop: unless autoPublish is on, posts stay
 * drafts and a human approves them before they go live.
 */

import fs from 'fs';
import path from 'path';
import { AgentConfig, AgentPost } from '../types';

/** Render a draft as a markdown file with YAML-ish front matter. */
export function renderPostMarkdown(post: AgentPost): string {
  const links = post.affiliateLinks
    .map((l) => `  - keyword: "${l.keyword}"\n    url: "${l.url}"`)
    .join('\n');
  return [
    '---',
    `title: "${post.title}"`,
    `slug: ${post.slug}`,
    `status: ${post.status}`,
    `created: ${post.createdAt}`,
    `sourceTopic: "${post.sourceTopic}"`,
    post.sourceUrl ? `sourceUrl: ${post.sourceUrl}` : '',
    `keywords: [${post.keywords.map((k) => `"${k}"`).join(', ')}]`,
    links ? `affiliateLinks:\n${links}` : 'affiliateLinks: []',
    '---',
    '',
    post.content,
    '',
  ]
    .filter((line) => line !== '')
    .join('\n');
}

/** Write a draft to the output directory; returns the file path. */
export function saveDraft(config: AgentConfig, post: AgentPost): string {
  fs.mkdirSync(config.outputDir, { recursive: true });
  const filePath = path.join(config.outputDir, `${post.slug}.md`);
  fs.writeFileSync(filePath, renderPostMarkdown(post), 'utf-8');
  return filePath;
}

/** True when WordPress publishing is configured. */
export function canPublishToWordPress(config: AgentConfig): boolean {
  return Boolean(config.wordpress);
}

/**
 * Push a post to WordPress via REST API. Uses Basic auth with an
 * application password. Returns the created post id.
 */
export async function publishToWordPress(
  config: AgentConfig,
  post: AgentPost,
): Promise<{ id: number; link: string }> {
  const wp = config.wordpress;
  if (!wp) throw new Error('WordPress is not configured');

  const auth = Buffer.from(`${wp.username}:${wp.appPassword}`).toString('base64');
  const res = await fetch(`${wp.url.replace(/\/$/, '')}/wp-json/wp/v2/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({
      title: post.title,
      content: post.content,
      slug: post.slug,
      status: 'publish',
      excerpt: post.summary,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`WordPress publish failed (${res.status}): ${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as { id?: number; link?: string };
  return { id: data.id ?? 0, link: data.link || '' };
}
