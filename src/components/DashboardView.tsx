/**
 * DashboardView — the map-centric home screen.
 *
 * Three panes on one screen, like a real intelligence dashboard:
 *   left   — compact live feed rail (filterable, save/bookmark)
 *   center — the credibility map (dominant surface)
 *   right  — alerts rail + corroborated stories summary
 *
 * The tool views (Bias Compare, Debate, Business, Globe…) live behind the
 * header's Tools menu; this screen is the default landing so the product
 * reads as a dashboard, not a tabbed app.
 */

import { useMemo, useState } from 'react';
import { Bell, Bookmark, ChevronRight, Layers, Radio, X } from 'lucide-react';
import { MapView } from './MapView';
import { Article } from '../types';
import { DataMode } from '../services/dataService';
import { clusterStories } from '../services/storyClustering';

export interface AlertItem {
  key: string;
  article: Article;
  kind: 'system' | 'watch';
  watchQuery?: string;
}

interface DashboardViewProps {
  articles: Article[];
  mode: DataMode;
  loading: boolean;
  alertItems: AlertItem[];
  onDismissAlert: (articleId: string) => void;
  onClearAlerts: () => void;
  onOpenArticle: (article: Article) => void;
  savedIds: Set<string>;
  onToggleSave: (article: Article) => void;
  onOpenFeed: () => void;
  onOpenStories: () => void;
  onOpenIntel: () => void;
}

export const DashboardView = ({
  articles,
  mode,
  loading,
  alertItems,
  onDismissAlert,
  onClearAlerts,
  onOpenArticle,
  savedIds,
  onToggleSave,
  onOpenFeed,
  onOpenStories,
  onOpenIntel,
}: DashboardViewProps) => {
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  const sources = useMemo(
    () => Array.from(new Set(articles.map((a) => a.sourceName))).sort(),
    [articles],
  );

  const filteredArticles = useMemo(
    () => (sourceFilter === 'all' ? articles : articles.filter((a) => a.sourceName === sourceFilter)),
    [articles, sourceFilter],
  );

  // Corroborated stories, most-corroborated first — the top few go in the rail.
  const stories = useMemo(() => clusterStories(articles), [articles]);
  const topStories = stories.slice(0, 4);
  const corroborated = stories.filter((s) => s.sourceCount >= 2).length;

  const flagged = articles.filter(
    (a) => a.verificationStatus === 'MISLEADING' || a.sourceCredibility < 0.7,
  ).length;
  const avgCred =
    articles.length > 0
      ? (articles.reduce((s, a) => s + a.sourceCredibility, 0) / articles.length) * 100
      : 0;

  return (
    <div className="flex h-full min-h-0">
      {/* ── LEFT RAIL: live feed ─────────────────────────────────────────── */}
      <aside className="w-[320px] shrink-0 flex flex-col min-h-0 border-r-2 border-arcade-ink bg-white">
        <div className="px-4 py-3 border-b-2 border-arcade-ink flex items-center justify-between">
          <div>
            <h2 className="font-display text-[15px] tracking-brutal text-arcade-ink flex items-center gap-1.5">
              📰 Live Feed
            </h2>
            <p className="text-label-sm font-semibold text-arcade-ink/60">
              {articles.length} articles • {sources.length} sources
            </p>
          </div>
          <button
            onClick={onOpenFeed}
            className="flex items-center gap-1 text-label-sm font-bold text-arcade-ink bg-arcade-yellow border-2 border-arcade-ink px-1.5 py-0.5 shadow-brutal-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
            title="Open full feed view"
          >
            Full feed <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Source filter chips */}
        <div className="px-4 py-2 border-b-2 border-arcade-ink flex gap-1.5 overflow-x-auto">
          <SourceChip label="All" active={sourceFilter === 'all'} onClick={() => setSourceFilter('all')} />
          {sources.slice(0, 6).map((s) => (
            <SourceChip
              key={s}
              label={s}
              active={sourceFilter === s}
              onClick={() => setSourceFilter(s)}
            />
          ))}
        </div>

        {/* Compact article rows */}
        <div className="flex-1 min-h-0 overflow-y-auto px-2 py-2 space-y-1">
          {loading && articles.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="animate-spin border-2 border-arcade-ink border-t-arcade-yellow w-8 h-8" />
            </div>
          ) : filteredArticles.length === 0 ? (
            <p className="text-label-sm font-semibold text-arcade-ink/60 text-center mt-8 px-4">
              No articles for this filter.
            </p>
          ) : (
            filteredArticles.map((a) => (
              <div
                key={a.id}
                className="group relative flex items-start gap-2.5 px-2.5 py-2 border-2 border-transparent hover:border-arcade-ink hover:bg-arcade-yellow/40 cursor-pointer transition-all"
                onClick={() => onOpenArticle(a)}
              >
                <span
                  className="mt-1.5 w-2.5 h-2.5 shrink-0 border-2 border-arcade-ink"
                  style={{ backgroundColor: credColor(a.sourceCredibility) }}
                  title={`${Math.round(a.sourceCredibility * 100)}% credibility`}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-label-sm font-semibold text-arcade-ink leading-snug line-clamp-2">
                    {a.title}
                  </p>
                  <p className="text-[11px] font-semibold text-arcade-ink/50 mt-0.5 truncate">
                    {a.sourceName} • {timeAgo(a.timestamp)}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSave(a);
                  }}
                  className={`shrink-0 mt-0.5 p-1 transition-colors ${
                    savedIds.has(a.id)
                      ? 'text-arcade-pink'
                      : 'text-arcade-ink/40 opacity-0 group-hover:opacity-100 hover:text-arcade-ink'
                  }`}
                  title={savedIds.has(a.id) ? 'Unsave' : 'Save article'}
                >
                  <Bookmark className="w-3.5 h-3.5" fill={savedIds.has(a.id) ? 'currentColor' : 'none'} />
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* ── CENTER: credibility map ──────────────────────────────────────── */}
      <div className="flex-1 min-w-0 relative">
        <MapView articles={articles} loading={loading} />

        {/* Overlay: live coverage header — white card, black rule, hard shadow */}
        <div className="absolute top-4 left-4 z-[1000] bg-white border-2 border-arcade-ink shadow-brutal px-3 py-2">
          <div className="flex items-center gap-2">
            <Radio className={`w-3.5 h-3.5 ${mode === 'live' ? 'text-arcade-pink' : 'text-amber-500'}`} />
            <span className="text-label-sm font-bold text-arcade-ink uppercase tracking-wider">
              World Coverage
            </span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 ${
                mode === 'live' ? 'bg-arcade-ink text-arcade-yellow' : 'bg-amber-400 text-arcade-ink'
              }`}
            >
              {mode === 'live' ? 'LIVE' : 'DEMO'}
            </span>
          </div>
          <p className="text-[11px] font-semibold text-arcade-ink/60 mt-0.5">
            {flagged > 0 ? `${flagged} flagged · ` : ''}
            avg credibility {avgCred.toFixed(0)}%
          </p>
          <button
            onClick={onOpenIntel}
            className="mt-2 pointer-events-auto flex items-center gap-1.5 px-2.5 py-1 bg-arcade-blue border-2 border-arcade-ink text-arcade-ink text-[11px] font-bold shadow-brutal-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
          >
            <Layers className="w-3 h-3" />
            🛰️ Intel layers & signals →
          </button>
        </div>
      </div>

      {/* ── RIGHT RAIL: alerts + stories ─────────────────────────────────── */}
      <aside className="w-[340px] shrink-0 flex flex-col min-h-0 border-l-2 border-arcade-ink bg-white">
        {/* Alerts */}
        <div className="px-4 py-3 border-b-2 border-arcade-ink">
          <div className="flex items-center justify-between mb-2">
            <h3 className="flex items-center gap-2 text-label-sm font-bold uppercase tracking-wider text-arcade-ink">
              <span className="text-[13px]">🚨</span>
              <span className="relative flex h-2 w-2">
                {alertItems.length > 0 && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-60" />
                )}
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    alertItems.length > 0 ? 'bg-error' : 'bg-arcade-ink/40'
                  }`}
                />
              </span>
              Alerts
            </h3>
            {alertItems.length > 0 && (
              <button
                onClick={onClearAlerts}
                className="text-[11px] font-bold text-arcade-ink/60 hover:text-arcade-ink underline underline-offset-2"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="space-y-1.5 max-h-[38vh] overflow-y-auto">
            {alertItems.length === 0 ? (
              <p className="text-label-sm font-semibold text-arcade-ink/60">
                No active alerts. Articles flagged for low credibility or
                misleading framing appear here.
              </p>
            ) : (
              alertItems.map((item) => (
                <div
                  key={item.key}
                  className="group flex items-start gap-2 px-2.5 py-2 border-2 bg-white cursor-pointer hover:bg-arcade-yellow/30 transition-colors shadow-brutal-sm"
                  style={{
                    borderColor: item.kind === 'watch' ? '#ff4fd8' : '#ef4444',
                  }}
                  onClick={() => onOpenArticle(item.article)}
                >
                  {item.kind === 'watch' && <Bell className="w-3.5 h-3.5 text-arcade-pink mt-0.5 shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-label-sm font-semibold text-arcade-ink leading-snug line-clamp-2">
                      {item.article.title}
                    </p>
                    <p className="text-[11px] font-semibold text-arcade-ink/50 mt-0.5">
                      {item.article.sourceName} •{' '}
                      {item.kind === 'watch'
                        ? `watch “${item.watchQuery}”`
                        : `${Math.round(item.article.sourceCredibility * 100)}% credibility`}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDismissAlert(item.article.id);
                    }}
                    className="shrink-0 p-0.5 text-arcade-ink/40 opacity-0 group-hover:opacity-100 hover:text-arcade-ink transition-opacity"
                    title="Dismiss alert"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Stories */}
        <div className="flex-1 min-h-0 flex flex-col px-4 py-3 border-t-2 border-arcade-ink">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-label-sm font-bold uppercase tracking-wider text-arcade-ink">
              🕸️ Stories
            </h3>
            <button
              onClick={onOpenStories}
              className="flex items-center gap-1 text-label-sm font-bold text-arcade-ink bg-arcade-yellow border-2 border-arcade-ink px-1.5 py-0.5 shadow-brutal-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
            >
              Track all <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[11px] font-semibold text-arcade-ink/60 mb-2">
            {corroborated} of {stories.length} stories corroborated by 2+ sources
          </p>

          <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
            {stories.length === 0 ? (
              <p className="text-label-sm font-semibold text-arcade-ink/60">
                Waiting for coverage…
              </p>
            ) : (
              topStories.map((story) => (
                <button
                  key={story.id}
                  onClick={onOpenStories}
                  className="w-full text-left px-2.5 py-2 border-2 border-arcade-ink bg-white hover:bg-arcade-yellow/40 transition-colors shadow-brutal-sm"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 border-2 border-arcade-ink ${
                        story.sourceCount >= 3 ? 'bg-arcade-green text-white' : 'bg-arcade-yellow text-arcade-ink'
                      }`}
                    >
                      {story.sourceCount} sources
                    </span>
                    <span className="text-[10px] font-bold text-arcade-ink/60">
                      {story.articleCount} articles
                    </span>
                  </div>
                  <p className="text-label-sm font-semibold text-arcade-ink leading-snug line-clamp-2">
                    {story.headline}
                  </p>
                  <div className="flex items-center gap-1 mt-1.5">
                    {story.sources.slice(0, 4).map((s, i) => (
                      <span
                        key={s}
                        className="w-2 h-2 border border-arcade-ink"
                        style={{ backgroundColor: credColor(story.articles[i]?.sourceCredibility ?? 0.8) }}
                        title={s}
                      />
                    ))}
                    <span className="text-[10px] font-semibold text-arcade-ink/60 ml-1 truncate">
                      {story.sources.join(' · ')}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </aside>
    </div>
  );
};

const SourceChip = ({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`shrink-0 px-2 py-0.5 border-2 border-arcade-ink text-[11px] font-bold transition-all ${
      active
        ? 'bg-arcade-ink text-arcade-yellow shadow-brutal-sm'
        : 'bg-white text-arcade-ink hover:bg-arcade-yellow'
    }`}
  >
    {label}
  </button>
);

function credColor(score: number): string {
  if (score >= 0.8) return '#22c55e'; // arcade green
  if (score >= 0.5) return '#ffe600'; // arcade yellow
  return '#ef4444'; // arcade red
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default DashboardView;
