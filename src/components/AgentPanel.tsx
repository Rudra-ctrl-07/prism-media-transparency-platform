/**
 * AgentPanel — control panel for the PRISM Content & Affiliate Agent.
 *
 * Lets you:
 *   - See agent status (niche, LLM/sandbox mode, affiliate config, revenue)
 *   - Run one observe→think→act cycle (optionally with custom niche/topics)
 *   - Browse produced posts (draft / published)
 *   - Publish a draft (human-in-the-loop) or record an affiliate payout
 *   - Inspect long-term memory (mistakes, preferences, revenue)
 *
 * Self-contained component — no global state — mirrors the AutomatonPanel
 * pattern for talking to the backend through the Vite /api proxy.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Bot,
  Play,
  FileText,
  CheckCircle2,
  CircleDollarSign,
  Loader2,
  ExternalLink,
  ChevronDown,
  Database,
  RefreshCw,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { getAuthHeader } from '../firebase-compat';

const API_BASE = (import.meta as any).env?.VITE_API_BASE || '';

// ── API shapes (mirror api/src/agent/types.ts) ────────────────────────
interface AffiliateLink {
  keyword: string;
  url: string;
}

interface AgentPost {
  id: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  keywords: string[];
  affiliateLinks: AffiliateLink[];
  status: 'draft' | 'published';
  sourceTopic: string;
  sourceUrl?: string;
  createdAt: string;
  publishedAt?: string;
  wordpressId?: number;
  metrics?: {
    clicks: number;
    impressions: number;
    conversions: number;
    revenue: number;
    updatedAt: string;
  };
}

interface KeywordPerformance {
  keyword: string;
  clicks: number;
  impressions: number;
  revenue: number;
  postCount: number;
  ctr: number;
  revenuePerClick: number;
}

interface AgentStatus {
  enabled: boolean;
  niche: string;
  maxPostsPerRun: number;
  maxIterations: number;
  maxAffiliateLinksPerPost: number;
  autoPublish: boolean;
  wordpressConfigured: boolean;
  affiliateKeywordsConfigured: number;
  affiliateTagConfigured: boolean;
  llmConfigured: boolean;
  memory: {
    posts: number;
    published: number;
    mistakes: number;
    totalRevenue: number;
    lastRun: string | null;
    winners: KeywordPerformance[];
    losers: KeywordPerformance[];
  };
}

interface RunResult {
  runId: string;
  postsCreated: number;
  skipped: { topic: string; reason: string }[];
  errors: string[];
  sandbox: boolean;
  posts: AgentPost[];
}

interface AgentMemory {
  lastRun: string | null;
  posts: AgentPost[];
  mistakes: string[];
  preferences: Record<string, string>;
  revenue: { amount: number; source: string; date: string; postId?: string }[];
}

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const authHeader = await getAuthHeader();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...authHeader, ...(init?.headers || {}) },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new ApiError(res.status, `${res.status} ${res.statusText}${body ? ` — ${body.slice(0, 200)}` : ''}`);
  }
  return res.json();
}

function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function money(n: number): string {
  return `$${n.toFixed(2)}`;
}

export const AgentPanel = () => {
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [posts, setPosts] = useState<AgentPost[]>([]);
  const [memory, setMemory] = useState<AgentMemory | null>(null);
  const [filter, setFilter] = useState<'all' | 'draft' | 'published'>('all');

  const [niche, setNiche] = useState('');
  const [maxPosts, setMaxPosts] = useState(2);
  const [customTopics, setCustomTopics] = useState('');
  const [busy, setBusy] = useState(false);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [revenueFor, setRevenueFor] = useState<string | null>(null);
  const [revenueAmount, setRevenueAmount] = useState('');
  const [metricsFor, setMetricsFor] = useState<string | null>(null);
  const [metricsClicks, setMetricsClicks] = useState('');
  const [metricsImpressions, setMetricsImpressions] = useState('');
  const [showMemory, setShowMemory] = useState(false);
  const [proRequired, setProRequired] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [s, p, m] = await Promise.all([
        api<AgentStatus>('/api/agent/status'),
        api<AgentPost[]>('/api/agent/posts'),
        api<AgentMemory>('/api/agent/memory'),
      ]);
      setStatus(s);
      setPosts(p);
      setMemory(m);
      setError(null);
    } catch (e: any) {
      console.error('agent status failed:', e);
      setError(`Backend unreachable — is the API running? (${e.message})`);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const runAgent = async () => {
    setBusy(true);
    setError(null);
    setRunResult(null);
    try {
      const body: any = {};
      if (niche.trim()) body.niche = niche.trim();
      if (maxPosts > 0) body.maxPosts = maxPosts;
      if (customTopics.trim()) {
        body.topics = customTopics
          .split('\n')
          .map((t) => t.trim())
          .filter(Boolean)
          .slice(0, 5);
      }
      const result = await api<RunResult>('/api/agent/run', { method: 'POST', body: JSON.stringify(body) });
      setRunResult(result);
      setProRequired(false);
      await refresh();
    } catch (e: any) {
      if (e instanceof ApiError && e.status === 403) {
        setProRequired(true);
        setError('This feature requires a PRISM Pro subscription.');
      } else {
        setError(`Run failed: ${e.message}`);
      }
    } finally {
      setBusy(false);
    }
  };

  const publishPost = async (id: string) => {
    try {
      const result = await api<{ published: boolean; post?: AgentPost }>(`/api/agent/posts/${id}/publish`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      if (result.published) await refresh();
    } catch (e: any) {
      setError(`Publish failed: ${e.message}`);
    }
  };

  const recordRevenue = async (id: string) => {
    const amt = Number(revenueAmount);
    if (!Number.isFinite(amt) || amt < 0) return;
    try {
      await api(`/api/agent/posts/${id}/revenue`, {
        method: 'POST',
        body: JSON.stringify({ amount: amt, source: 'affiliate' }),
      });
      setRevenueFor(null);
      setRevenueAmount('');
      await refresh();
    } catch (e: any) {
      setError(`Revenue record failed: ${e.message}`);
    }
  };

  const recordMetrics = async (id: string) => {
    const clicks = Number(metricsClicks) || 0;
    const impressions = Number(metricsImpressions) || 0;
    if (clicks === 0 && impressions === 0) return;
    try {
      await api(`/api/agent/posts/${id}/metrics`, {
        method: 'POST',
        body: JSON.stringify({ clicks, impressions }),
      });
      setMetricsFor(null);
      setMetricsClicks('');
      setMetricsImpressions('');
      await refresh();
    } catch (e: any) {
      setError(`Metrics record failed: ${e.message}`);
    }
  };

  const filteredPosts = posts.filter((p) => filter === 'all' || p.status === filter);
  const totalRevenue = status?.memory.totalRevenue ?? 0;
  const isSandbox = status ? !status.llmConfigured : false;

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="text-label-sm font-label-sm uppercase tracking-widest text-on-surface-variant">
            Autonomous Content Engine
          </span>
          <h2 className="font-headline-lg text-headline-lg mb-0 flex items-center gap-2">
            <Bot className="w-6 h-6" /> Agent Studio
          </h2>
          <p className="text-label-sm text-on-surface-variant mt-1 max-w-2xl">
            Observe → Think → Act loop that turns trending topics into affiliate-linked articles.
            Drafts wait for your approval before going live — that is the human-in-the-loop guardrail.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {status && (
            <>
              <span
                className={`px-2.5 py-1 rounded-full border text-label-sm font-semibold ${
                  isSandbox
                    ? 'bg-amber-400/15 text-amber-400 border-amber-400/40'
                    : 'bg-transparency-teal/10 text-transparency-teal border-transparency-teal/40'
                }`}
                title={isSandbox ? 'No GOOGLE_API_KEY set — sandbox content' : 'Gemini LLM configured'}
              >
                {isSandbox ? '🟡 SANDBOX LLM' : '🟢 LLM LIVE'}
              </span>
              <span className="px-2.5 py-1 rounded-full border border-silver-grey text-label-sm text-on-surface-variant">
                <CircleDollarSign className="inline w-3.5 h-3.5 mr-1" />
                {money(totalRevenue)} earned
              </span>
            </>
          )}
          <button
            onClick={refresh}
            className="flex items-center gap-1.5 px-2.5 py-1.5 border-2 border-arcade-ink bg-white text-arcade-ink text-[11px] font-bold shadow-brutal-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {proRequired && (
        <div className="border-2 border-arcade-ink bg-arcade-pink text-arcade-ink px-4 py-3 shadow-brutal-sm flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-bold text-label-md">👑 Agent runs are a PRISM Pro feature</p>
            <p className="text-[11px] font-semibold mt-0.5">
              Subscribe to unlock autonomous content generation — the LLM calls that power each run are
              included in Pro.
            </p>
          </div>
          <a
            href="/upgrade"
            className="px-4 py-2 border-2 border-arcade-ink bg-arcade-ink text-arcade-yellow text-[11px] font-bold shadow-brutal-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all whitespace-nowrap"
          >
            Upgrade to Pro →
          </a>
        </div>
      )}

      {error && !proRequired && (
        <div className="border-2 border-arcade-ink bg-arcade-pink text-arcade-ink px-3 py-2 text-label-sm font-semibold shadow-brutal-sm">
          ⚠ {error}
        </div>
      )}

      {/* Winners strip — the observe step doubles down on these */}
      {status && (status.memory.winners?.length > 0 || status.memory.losers?.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="border border-silver-grey rounded-xl p-3 bg-surface-container-lowest">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-transparency-teal mb-2 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" /> Winning topics — agent doubles down here
            </h3>
            {status.memory.winners.length === 0 ? (
              <p className="text-[11px] text-on-surface-variant/60">
                No winners yet — publish posts and record clicks/impressions to teach the agent.
              </p>
            ) : (
              <ul className="space-y-1">
                {status.memory.winners.map((w) => (
                  <li key={w.keyword} className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-on-surface">{w.keyword}</span>
                    <span className="text-on-surface-variant">
                      {w.clicks} clicks{w.postCount > 1 ? ` • ${w.postCount} posts` : ''}
                      {w.revenue > 0 ? ` • $${w.revenue.toFixed(2)}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="border border-silver-grey rounded-xl p-3 bg-surface-container-lowest">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-2 flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5" /> Losing topics — agent steers away
            </h3>
            {status.memory.losers.length === 0 ? (
              <p className="text-[11px] text-on-surface-variant/60">
                No losers yet — keywords that get impressions but zero clicks land here.
              </p>
            ) : (
              <ul className="space-y-1">
                {status.memory.losers.map((w) => (
                  <li key={w.keyword} className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-on-surface">{w.keyword}</span>
                    <span className="text-on-surface-variant">{w.impressions} impressions • 0 clicks</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Run + status strip */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Run controls */}
        <div className="lg:col-span-2 border border-silver-grey rounded-xl p-4 bg-surface-container-lowest space-y-3">
          <h3 className="text-label-sm font-semibold uppercase tracking-wider text-on-surface">Run the agent</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <label className="block">
              <span className="text-[10px] uppercase tracking-wider text-on-surface-variant">Niche (optional)</span>
              <input
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                placeholder={status?.niche || 'e.g. smart home security'}
                className="mt-1 w-full px-3 py-1.5 rounded-lg border border-silver-grey text-label-sm bg-surface-container-lowest text-on-surface focus:outline-none focus:border-primary"
              />
            </label>
            <label className="block">
              <span className="text-[10px] uppercase tracking-wider text-on-surface-variant">Max posts</span>
              <input
                type="number"
                min={1}
                max={10}
                value={maxPosts}
                onChange={(e) => setMaxPosts(Number(e.target.value))}
                className="mt-1 w-full px-3 py-1.5 rounded-lg border border-silver-grey text-label-sm bg-surface-container-lowest text-on-surface focus:outline-none focus:border-primary"
              />
            </label>
          </div>
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider text-on-surface-variant">
              Custom topics (one per line, optional)
            </span>
            <textarea
              value={customTopics}
              onChange={(e) => setCustomTopics(e.target.value)}
              rows={2}
              placeholder={'Best video doorbells under $100\nRing vs Nest comparison'}
              className="mt-1 w-full px-3 py-1.5 rounded-lg border border-silver-grey text-label-sm bg-surface-container-lowest text-on-surface focus:outline-none focus:border-primary"
            />
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={runAgent}
              disabled={busy}
              title={proRequired ? 'PRISM Pro subscription required' : 'Run one observe→think→act cycle'}
              className={`flex items-center gap-2 px-4 py-2 border-2 border-arcade-ink text-arcade-ink text-label-sm font-bold shadow-brutal-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all disabled:opacity-50 ${
                proRequired ? 'bg-arcade-pink' : 'bg-arcade-green'
              }`}
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {busy ? 'Running loop…' : 'Run Observe → Think → Act'}
            </button>
            {status && (
              <span className="text-[10px] text-on-surface-variant">
                niche: <b>{status.niche}</b> • {status.affiliateKeywordsConfigured} keyword
                link{status.affiliateKeywordsConfigured === 1 ? '' : 's'}
                {status.affiliateTagConfigured ? ' + tag' : ''} •{' '}
                {status.wordpressConfigured ? 'WordPress ✓' : 'drafts only'}
              </span>
            )}
          </div>

          {runResult && (
            <div className="border border-silver-grey rounded-lg p-3 bg-surface-container-low text-[12px] space-y-1">
              <div className="flex items-center gap-2 font-semibold text-on-surface">
                <CheckCircle2 className="w-4 h-4 text-transparency-teal" />
                Run {runResult.runId} — {runResult.postsCreated} post{runResult.postsCreated === 1 ? '' : 's'} created
                {runResult.sandbox ? ' (sandbox mode)' : ''}
              </div>
              {runResult.skipped.length > 0 && (
                <p className="text-on-surface-variant">
                  skipped: {runResult.skipped.map((s) => `"${s.topic}" (${s.reason})`).join(', ')}
                </p>
              )}
              {runResult.errors.length > 0 && (
                <p className="text-error">{runResult.errors.join('; ')}</p>
              )}
              {runResult.posts.length === 0 && (
                <p className="text-on-surface-variant">
                  No new posts — topics were already covered, blocked, or nothing matched the niche.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Status card */}
        {status && (
          <div className="border border-silver-grey rounded-xl p-4 bg-surface-container-lowest space-y-2.5">
            <h3 className="text-label-sm font-semibold uppercase tracking-wider text-on-surface">Agent status</h3>
            <StatRow label="Posts produced" value={String(status.memory.posts)} />
            <StatRow label="Published" value={String(status.memory.published)} />
            <StatRow label="Total revenue" value={money(totalRevenue)} accent />
            <StatRow label="Mistakes learned" value={String(status.memory.mistakes)} />
            <StatRow label="Last run" value={formatDate(status.memory.lastRun)} />
            <div className="pt-1.5 border-t border-silver-grey">
              <p className="text-[10px] text-on-surface-variant leading-relaxed">
                Iteration cap: <b>{status.maxIterations}</b> • affiliate link cap:{' '}
                <b>{status.maxAffiliateLinksPerPost}/post</b> • auto-publish:{' '}
                <b>{status.autoPublish ? 'on' : 'off (human approval)'}</b>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Posts */}
      <div className="border border-silver-grey rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-silver-grey bg-surface-container-low flex items-center justify-between">
          <h3 className="text-label-sm font-semibold uppercase tracking-wider text-on-surface flex items-center gap-2">
            <FileText className="w-4 h-4" /> Posts ({filteredPosts.length})
          </h3>
          <div className="flex items-center gap-1 bg-surface-container-lowest border border-silver-grey rounded-lg p-0.5">
            {(['all', 'draft', 'published'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-0.5 rounded text-[10px] font-medium capitalize ${
                  filter === f ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {filteredPosts.length === 0 ? (
          <div className="p-8 text-center">
            <Bot className="w-8 h-8 mx-auto mb-2 text-on-surface-variant/40" />
            <p className="text-label-sm text-on-surface-variant">
              No posts yet. Hit <b>Run</b> above to generate your first article.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-silver-grey">
            {filteredPosts.map((post) => {
              const expanded = expandedId === post.id;
              return (
                <li key={post.id} className="hover:bg-surface-container-lowest/60">
                  <div className="px-4 py-3 flex items-center gap-3">
                    <button
                      onClick={() => setExpandedId(expanded ? null : post.id)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <p className="text-label-md font-semibold text-on-surface truncate">{post.title}</p>
                      <p className="text-[10px] text-on-surface-variant/70 mt-0.5">
                        {post.sourceTopic} • {formatDate(post.createdAt)} •{' '}
                        {post.affiliateLinks.length} affiliate link{post.affiliateLinks.length === 1 ? '' : 's'}
                        {post.wordpressId ? ` • WP #${post.wordpressId}` : ''}
                        {post.metrics && post.metrics.impressions > 0
                          ? ` • ${post.metrics.clicks}/${post.metrics.impressions} clicks`
                          : ''}
                      </p>
                    </button>
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                        post.status === 'published'
                          ? 'bg-transparency-teal/15 text-transparency-teal border-transparency-teal/30'
                          : 'bg-amber-400/15 text-amber-400 border-amber-400/30'
                      }`}
                    >
                      {post.status.toUpperCase()}
                    </span>
                    {post.status === 'draft' ? (
                      <button
                        onClick={() => publishPost(post.id)}
                        className="shrink-0 flex items-center gap-1 px-2.5 py-1 border-2 border-arcade-ink bg-arcade-blue text-arcade-ink text-[10px] font-bold shadow-brutal-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
                        title="Human-in-the-loop approval: publish this draft"
                      >
                        Publish
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => setMetricsFor(metricsFor === post.id ? null : post.id)}
                          className="shrink-0 flex items-center gap-1 px-2.5 py-1 border-2 border-arcade-ink bg-arcade-blue text-arcade-ink text-[10px] font-bold shadow-brutal-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
                          title="Log clicks/impressions so the agent learns what wins"
                        >
                          Metrics
                        </button>
                        <button
                          onClick={() => setRevenueFor(revenueFor === post.id ? null : post.id)}
                          className="shrink-0 flex items-center gap-1 px-2.5 py-1 border-2 border-arcade-ink bg-arcade-pink text-arcade-ink text-[10px] font-bold shadow-brutal-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
                        >
                          <CircleDollarSign className="w-3 h-3" /> Earned
                        </button>
                      </>
                    )}
                    <ChevronDown
                      className={`w-4 h-4 text-on-surface-variant shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
                    />
                  </div>

                  {/* Metrics recorder — feeds the observe-step winner learning */}
                  {metricsFor === post.id && (
                    <div className="px-4 pb-3 flex flex-wrap items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        value={metricsClicks}
                        onChange={(e) => setMetricsClicks(e.target.value)}
                        placeholder="clicks"
                        className="w-24 px-2.5 py-1 rounded-lg border border-silver-grey text-label-sm bg-surface-container-lowest text-on-surface focus:outline-none focus:border-primary"
                      />
                      <input
                        type="number"
                        min={0}
                        value={metricsImpressions}
                        onChange={(e) => setMetricsImpressions(e.target.value)}
                        placeholder="impressions"
                        className="w-28 px-2.5 py-1 rounded-lg border border-silver-grey text-label-sm bg-surface-container-lowest text-on-surface focus:outline-none focus:border-primary"
                      />
                      <button
                        onClick={() => recordMetrics(post.id)}
                        disabled={!(Number(metricsClicks) > 0 || Number(metricsImpressions) > 0)}
                        className="px-2.5 py-1 rounded-lg bg-primary text-on-primary text-[10px] font-medium disabled:opacity-40"
                      >
                        Log metrics
                      </button>
                      <span className="text-[10px] text-on-surface-variant">
                        the agent learns this keyword wins and doubles down on it
                      </span>
                    </div>
                  )}

                  {/* Revenue recorder */}
                  {revenueFor === post.id && (
                    <div className="px-4 pb-3 flex items-center gap-2">
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        value={revenueAmount}
                        onChange={(e) => setRevenueAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-32 px-2.5 py-1 rounded-lg border border-silver-grey text-label-sm bg-surface-container-lowest text-on-surface focus:outline-none focus:border-primary"
                      />
                      <button
                        onClick={() => recordRevenue(post.id)}
                        disabled={!Number.isFinite(Number(revenueAmount)) || Number(revenueAmount) < 0}
                        className="px-2.5 py-1 rounded-lg bg-primary text-on-primary text-[10px] font-medium disabled:opacity-40"
                      >
                        Record payout
                      </button>
                      <span className="text-[10px] text-on-surface-variant">
                        log an affiliate commission from this post
                      </span>
                    </div>
                  )}

                  {/* Expanded post */}
                  {expanded && (
                    <div className="px-4 pb-4 space-y-2">
                      {post.summary && (
                        <p className="text-[12px] text-on-surface-variant">{post.summary}</p>
                      )}
                      {post.affiliateLinks.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {post.affiliateLinks.map((l) => (
                            <a
                              key={l.url}
                              href={l.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-transparency-teal border border-transparency-teal/30 rounded px-1.5 py-0.5 hover:bg-transparency-teal/10 transition-colors flex items-center gap-1"
                            >
                              {l.keyword} <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          ))}
                        </div>
                      )}
                      <pre className="text-[11px] leading-relaxed text-on-surface whitespace-pre-wrap font-mono bg-surface-container-low rounded-lg p-3 max-h-80 overflow-y-auto">
                        {post.content}
                      </pre>
                      {post.sourceUrl && (
                        <a
                          href={post.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-on-surface-variant underline hover:text-primary"
                        >
                          Source: {post.sourceTopic} ↗
                        </a>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Memory */}
      <div className="border border-silver-grey rounded-xl overflow-hidden">
        <button
          onClick={() => setShowMemory((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 bg-surface-container-low hover:bg-surface-container-lowest transition-colors"
        >
          <span className="text-label-sm font-semibold uppercase tracking-wider text-on-surface flex items-center gap-2">
            <Database className="w-4 h-4" /> Long-term memory
            {memory && (
              <span className="text-[10px] font-normal normal-case text-on-surface-variant">
                {memory.posts.length} posts • {memory.mistakes.length} mistakes •{' '}
                {memory.revenue.length} payouts
              </span>
            )}
          </span>
          <ChevronDown className={`w-4 h-4 text-on-surface-variant transition-transform ${showMemory ? 'rotate-180' : ''}`} />
        </button>
        {showMemory && memory && (
          <div className="px-4 py-3 grid grid-cols-1 md:grid-cols-2 gap-4 bg-surface-container-lowest">
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
                Mistakes learned (dedupes failing topics)
              </h4>
              {memory.mistakes.length === 0 ? (
                <p className="text-[11px] text-on-surface-variant/60">None recorded yet.</p>
              ) : (
                <ul className="space-y-1">
                  {memory.mistakes.slice(-5).map((m, i) => (
                    <li key={i} className="text-[11px] text-on-surface-variant leading-snug">
                      • {m}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
                Revenue log
              </h4>
              {memory.revenue.length === 0 ? (
                <p className="text-[11px] text-on-surface-variant/60">
                  No payouts yet. Publish a post, then log what it earned.
                </p>
              ) : (
                <ul className="space-y-1">
                  {memory.revenue.map((r, i) => (
                    <li key={i} className="text-[11px] text-on-surface-variant leading-snug">
                      • {money(r.amount)} — {r.source} ({r.date})
                      {r.postId ? ` · ${r.postId}` : ''}
                    </li>
                  ))}
                </ul>
              )}
              {Object.keys(memory.preferences).length > 0 && (
                <>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1.5 mt-3">
                    Preferences
                  </h4>
                  <ul className="space-y-1">
                    {Object.entries(memory.preferences).map(([k, v]) => (
                      <li key={k} className="text-[11px] text-on-surface-variant leading-snug">
                        • {k}: {v}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const StatRow = ({ label, value, accent }: { label: string; value: string; accent?: boolean }) => (
  <div className="flex items-center justify-between">
    <span className="text-[10px] uppercase tracking-wider text-on-surface-variant">{label}</span>
    <span className={`text-label-md font-semibold ${accent ? 'text-transparency-teal' : 'text-on-surface'}`}>
      {value}
    </span>
  </div>
);

export default AgentPanel;
