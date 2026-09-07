/**
 * DailyDigest.tsx — a daily briefing view that aggregates the most
 * important stories, credibility trends, and alert highlights from the
 * current article set. Designed for quick consumption at the start of
 * a session.
 */

import { useMemo, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { Article } from '../types';

interface DailyDigestProps {
  articles: Article[];
  loading: boolean;
  onRefresh: () => void;
  onSelectArticle: (article: Article) => void;
  onNavigateToFeed: () => void;
}

export function DailyDigest({
  articles,
  loading,
  onRefresh,
  onSelectArticle,
  onNavigateToFeed,
}: DailyDigestProps) {
  const [sortBy, setSortBy] = useState<'credibility' | 'recent' | 'flagged'>('recent');

  // --- Derived data ---
  const stats = useMemo(() => {
    const total = articles.length;
    const sources = new Set(articles.map((a) => a.sourceName)).size;
    const avgCred =
      total > 0
        ? articles.reduce((s, a) => s + a.sourceCredibility, 0) / total
        : 0;
    const flagged = articles.filter(
      (a) => a.verificationStatus === 'MISLEADING' || a.sourceCredibility < 0.7,
    ).length;
    const verified = articles.filter(
      (a) => a.verificationStatus === 'VERIFIED' && a.sourceCredibility >= 0.7,
    ).length;
    const pending = total - flagged - verified;
    return { total, sources, avgCred, flagged, verified, pending };
  }, [articles]);

  // Top stories: highest credibility or most recent
  const topStories = useMemo(() => {
    const sorted = [...articles];
    if (sortBy === 'credibility') {
      sorted.sort((a, b) => b.sourceCredibility - a.sourceCredibility);
    } else if (sortBy === 'flagged') {
      sorted.sort(
        (a, b) =>
          (a.verificationStatus === 'MISLEADING' ? 0 : 1) -
          (b.verificationStatus === 'MISLEADING' ? 0 : 1),
      );
    } else {
      sorted.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );
    }
    return sorted.slice(0, 10);
  }, [articles, sortBy]);

  // Source breakdown
  const sourceBreakdown = useMemo(() => {
    const bySource = new Map<
      string,
      { count: number; avgCred: number; flagged: number }
    >();
    for (const a of articles) {
      const existing = bySource.get(a.sourceName) || { count: 0, avgCred: 0, flagged: 0 };
      existing.count++;
      existing.avgCred += a.sourceCredibility;
      if (a.verificationStatus === 'MISLEADING' || a.sourceCredibility < 0.7) {
        existing.flagged++;
      }
      bySource.set(a.sourceName, existing);
    }
    return Array.from(bySource.entries())
      .map(([name, data]) => ({
        name,
        count: data.count,
        avgCred: data.avgCred / data.count,
        flagged: data.flagged,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [articles]);

  // Category distribution
  const categoryDist = useMemo(() => {
    const byCat = new Map<string, number>();
    for (const a of articles) {
      byCat.set(a.category, (byCat.get(a.category) || 0) + 1);
    }
    return Array.from(byCat.entries())
      .sort((a, b) => b[1] - a[1]);
  }, [articles]);

  // Flagged articles for the alerts section
  const flaggedArticles = useMemo(
    () =>
      articles
        .filter(
          (a) => a.verificationStatus === 'MISLEADING' || a.sourceCredibility < 0.7,
        )
        .sort((a, b) => a.sourceCredibility - b.sourceCredibility)
        .slice(0, 5),
    [articles],
  );

  // Recent articles (last 24h)
  const recentArticles = useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return articles.filter((a) => new Date(a.timestamp).getTime() > cutoff);
  }, [articles]);

  // Helper: credibility bar color
  const credBar = (cred: number) => {
    if (cred >= 0.85) return 'bg-emerald-500';
    if (cred >= 0.7) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const credText = (cred: number) => {
    if (cred >= 0.85) return 'text-emerald-700';
    if (cred >= 0.7) return 'text-amber-700';
    return 'text-red-700';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-arcade-ink/30 mx-auto mb-3" />
          <p className="text-[12px] font-bold text-arcade-ink/50">Loading digest…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-headline-lg text-[28px] tracking-brutal text-arcade-ink">
              Daily Digest
            </h1>
            <p className="text-[12px] text-arcade-ink/60 font-semibold mt-1">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}{' '}
              • {stats.total} articles from {stats.sources} sources
            </p>
          </div>
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border-2 border-arcade-ink text-[11px] font-bold shadow-brutal-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
          >
            <RefreshCw className="w-3 h-3" />
            Refresh
          </button>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Total Articles"
            value={stats.total}
            icon={<BarChart3 className="w-4 h-4" />}
            color="bg-white"
          />
          <StatCard
            label="Avg Credibility"
            value={`${Math.round(stats.avgCred * 100)}%`}
            icon={<TrendingUp className="w-4 h-4" />}
            color="bg-white"
            valueColor={credText(stats.avgCred)}
          />
          <StatCard
            label="Verified"
            value={stats.verified}
            icon={<CheckCircle className="w-4 h-4" />}
            color="bg-white"
            valueColor="text-emerald-700"
          />
          <StatCard
            label="Flagged"
            value={stats.flagged}
            icon={<AlertTriangle className="w-4 h-4" />}
            color="bg-white"
            valueColor={stats.flagged > 0 ? 'text-red-700' : 'text-emerald-700'}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main column: Top stories */}
          <div className="lg:col-span-2 space-y-6">
            {/* Sort controls */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-arcade-ink/60 uppercase tracking-wider">
                Sort by:
              </span>
              {(['recent', 'credibility', 'flagged'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSortBy(s)}
                  className={`px-2.5 py-1 text-[11px] font-bold border-2 border-arcade-ink transition-all ${
                    sortBy === s
                      ? 'bg-arcade-ink text-arcade-yellow shadow-brutal-sm'
                      : 'bg-white text-arcade-ink shadow-brutal-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none'
                  }`}
                >
                  {s === 'recent' ? 'Most Recent' : s === 'credibility' ? 'Highest Cred' : 'Flagged First'}
                </button>
              ))}
            </div>

            {/* Story list */}
            <div className="space-y-3">
              {topStories.map((article, idx) => (
                <button
                  key={article.id}
                  onClick={() => onSelectArticle(article)}
                  className="w-full text-left bg-white border-2 border-arcade-ink p-4 shadow-brutal-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-[11px] font-bold text-arcade-ink/40 mt-0.5 w-5 shrink-0">
                      {idx + 1}.
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-arcade-ink line-clamp-2">
                        {article.title}
                      </p>
                      <p className="text-[11px] text-arcade-ink/60 mt-1 line-clamp-1">
                        {article.excerpt}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] font-bold text-arcade-ink/70">
                          {article.sourceName}
                        </span>
                        <span className="text-[10px] text-arcade-ink/30">•</span>
                        <span className="text-[10px] text-arcade-ink/50">
                          {article.category}
                        </span>
                        <span className="text-[10px] text-arcade-ink/30">•</span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 ${
                            article.sourceCredibility >= 0.85
                              ? 'bg-emerald-100 text-emerald-800'
                              : article.sourceCredibility >= 0.7
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {Math.round(article.sourceCredibility * 100)}%
                        </span>
                        <span className="text-[10px] text-arcade-ink/40 flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {formatTimeAgo(new Date(article.timestamp))}
                        </span>
                      </div>
                    </div>
                    <ExternalLink className="w-3 h-3 text-arcade-ink/20 mt-1 shrink-0" />
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={onNavigateToFeed}
              className="w-full py-2.5 text-[12px] font-bold text-arcade-ink border-2 border-dashed border-arcade-ink/30 hover:border-arcade-ink/60 hover:bg-arcade-yellow/20 transition-all"
            >
              View all {articles.length} articles →
            </button>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Alerts */}
            {flaggedArticles.length > 0 && (
              <DigestSection title="⚠️ Flagged Articles" count={flaggedArticles.length}>
                <ul className="space-y-2">
                  {flaggedArticles.map((a) => (
                    <li key={a.id}>
                      <button
                        onClick={() => onSelectArticle(a)}
                        className="w-full text-left p-2.5 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors"
                      >
                        <p className="text-[11px] font-bold text-red-900 line-clamp-1">
                          {a.title}
                        </p>
                        <p className="text-[10px] text-red-700/70 mt-0.5">
                          {a.sourceName} •{' '}
                          {a.verificationStatus === 'MISLEADING'
                            ? 'Misleading'
                            : `${Math.round(a.sourceCredibility * 100)}% cred`}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              </DigestSection>
            )}

            {/* Source breakdown */}
            <DigestSection title="📰 Top Sources" count={sourceBreakdown.length}>
              <ul className="space-y-2">
                {sourceBreakdown.map((s) => (
                  <li key={s.name} className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-arcade-ink truncate">
                          {s.name}
                        </span>
                        <span className="text-[10px] text-arcade-ink/50">
                          {s.count} articles
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 bg-arcade-ink/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${credBar(s.avgCred)}`}
                          style={{ width: `${s.avgCred * 100}%` }}
                        />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </DigestSection>

            {/* Category distribution */}
            <DigestSection title="📊 Categories" count={categoryDist.length}>
              <ul className="space-y-1.5">
                {categoryDist.map(([cat, count]) => (
                  <li key={cat} className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-arcade-ink">
                      {cat}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-arcade-ink/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-arcade-blue rounded-full"
                          style={{
                            width: `${(count / articles.length) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-arcade-ink/60 w-6 text-right">
                        {count}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </DigestSection>

            {/* Quick stats */}
            <DigestSection title="🕐 Last 24 Hours" count={recentArticles.length}>
              <p className="text-[11px] text-arcade-ink/70 font-semibold">
                {recentArticles.length} of {articles.length} articles published in the last 24
                hours.
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div className="p-2 bg-emerald-50 border border-emerald-200">
                  <p className="text-[10px] font-bold text-emerald-700">Verified</p>
                  <p className="text-[16px] font-bold text-emerald-900">
                    {
                      recentArticles.filter(
                        (a) =>
                          a.verificationStatus === 'VERIFIED' &&
                          a.sourceCredibility >= 0.7,
                      ).length
                    }
                  </p>
                </div>
                <div className="p-2 bg-red-50 border border-red-200">
                  <p className="text-[10px] font-bold text-red-700">Flagged</p>
                  <p className="text-[16px] font-bold text-red-900">
                    {
                      recentArticles.filter(
                        (a) =>
                          a.verificationStatus === 'MISLEADING' ||
                          a.sourceCredibility < 0.7,
                      ).length
                    }
                  </p>
                </div>
              </div>
            </DigestSection>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Sub-components ---

function StatCard({
  label,
  value,
  icon,
  color,
  valueColor,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  valueColor?: string;
}) {
  return (
    <div
      className={`${color} border-2 border-arcade-ink p-4 shadow-brutal-sm`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-arcade-ink/40">{icon}</span>
        <span className="text-[10px] font-bold text-arcade-ink/60 uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className={`text-[24px] font-bold ${valueColor || 'text-arcade-ink'}`}>
        {value}
      </p>
    </div>
  );
}

function DigestSection({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border-2 border-arcade-ink shadow-brutal-sm">
      <div className="flex items-center justify-between px-3 py-2 border-b-2 border-arcade-ink">
        <h3 className="text-[12px] font-bold text-arcade-ink uppercase tracking-wider">
          {title}
        </h3>
        {count !== undefined && (
          <span className="text-[10px] font-bold text-arcade-ink/50">{count}</span>
        )}
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return `${Math.floor(diffH / 24)}d ago`;
}
