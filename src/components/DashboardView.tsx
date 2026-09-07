/**
 * DashboardView — the map-centric home screen.
 *
 * Top section: three panes (live feed rail, credibility map, alerts + stories).
 * Below the fold: scrollable info panels — Source Breakdown, Category Distribution,
 * Trending Topics, Geographic Distribution, and Key Corroborated Stories.
 *
 * The whole view scrolls so users discover more data as they scroll down.
 */

import { useMemo, useState, useCallback, useEffect } from 'react';
import { Bell, Bookmark, ChevronRight, Radio, X, Globe, TrendingUp, BarChart3, ChevronDown } from 'lucide-react';
import { MapView } from './MapView';
import { Article } from '../types';
import { DataMode } from '../services/dataService';
import { useLocalStorageState } from '../utils/storage';
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
  // Collapsible section states — persisted to localStorage
  const [expandSources, setExpandSources] = useLocalStorageState('prism:panel-sources', true);
  const [expandVerify, setExpandVerify] = useLocalStorageState('prism:panel-verify', true);
  const [expandTrending, setExpandTrending] = useLocalStorageState('prism:panel-trending', true);
  const [expandTimeline, setExpandTimeline] = useLocalStorageState('prism:panel-timeline', false);
  const [expandHourly, setExpandHourly] = useLocalStorageState('prism:panel-hourly', true);
  const [expandCredSource, setExpandCredSource] = useLocalStorageState('prism:panel-credsource', true);
  const allExpanded = expandSources && expandVerify && expandTrending && expandTimeline && expandHourly && expandCredSource;
  const toggleAll = useCallback(() => {
    const next = !allExpanded;
    setExpandSources(next);
    setExpandVerify(next);
    setExpandTrending(next);
    setExpandTimeline(next);
    setExpandHourly(next);
    setExpandCredSource(next);
  }, [allExpanded]);
  const [hoveredSource, setHoveredSource] = useState<string | null>(null);
  const [hoveredArticleId, setHoveredArticleId] = useState<string | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore when typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;

      switch (e.key) {
        case 'Escape':
          if (showShortcuts) { setShowShortcuts(false); break; }
          if (sourceFilter !== 'all') { setSourceFilter('all'); break; }
          if (hoveredSource) { setHoveredSource(null); break; }
          if (hoveredArticleId) { setHoveredArticleId(null); break; }
          break;
        case '?':
          e.preventDefault();
          setShowShortcuts((v) => !v);
          break;
        case '1': togglePanel('sources'); break;
        case '2': togglePanel('verify'); break;
        case '3': togglePanel('trending'); break;
        case '4': togglePanel('timeline'); break;
        case '5': togglePanel('hourly'); break;
        case '6': togglePanel('credsource'); break;
        case 'a': case 'A': if (!e.ctrlKey && !e.metaKey) toggleAll(); break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [sourceFilter, hoveredSource, hoveredArticleId, showShortcuts, toggleAll]);

  const togglePanel = useCallback((panel: string) => {
    switch (panel) {
      case 'sources': setExpandSources((v) => !v); break;
      case 'verify': setExpandVerify((v) => !v); break;
      case 'trending': setExpandTrending((v) => !v); break;
      case 'timeline': setExpandTimeline((v) => !v); break;
      case 'hourly': setExpandHourly((v) => !v); break;
      case 'credsource': setExpandCredSource((v) => !v); break;
    }
  }, []);

  const sources = useMemo(
    () => Array.from(new Set(articles.map((a) => a.sourceName))).sort(),
    [articles],
  );

  const filteredArticles = useMemo(
    () => (sourceFilter === 'all' ? articles : articles.filter((a) => a.sourceName === sourceFilter)),
    [articles, sourceFilter],
  );

  // Corroborated stories, most-corroborated first
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

  // ── Derived stats for below-the-fold panels ──
  const sourceStats = useMemo(() => {
    const map = new Map<string, { count: number; totalCred: number }>();
    for (const a of articles) {
      const existing = map.get(a.sourceName) || { count: 0, totalCred: 0 };
      existing.count++;
      existing.totalCred += a.sourceCredibility;
      map.set(a.sourceName, existing);
    }
    return Array.from(map.entries())
      .map(([name, s]) => ({
        name,
        count: s.count,
        avgCred: Math.round((s.totalCred / s.count) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }, [articles]);

  const categoryStats = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of articles) {
      const cat = a.category || 'Uncategorized';
      map.set(cat, (map.get(cat) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [articles]);

  const regionStats = useMemo(() => {
    const map = new Map<string, { count: number; avgCred: number }>();
    for (const a of articles) {
      const region = guessRegion(a);
      const existing = map.get(region) || { count: 0, avgCred: 0 };
      existing.count++;
      existing.avgCred += a.sourceCredibility;
      map.set(region, existing);
    }
    return Array.from(map.entries())
      .map(([name, s]) => ({
        name,
        count: s.count,
        avgCred: Math.round((s.avgCred / s.count) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }, [articles]);

  const verifiedCount = articles.filter((a) => a.verificationStatus === 'VERIFIED').length;
  const misleadingCount = articles.filter((a) => a.verificationStatus === 'MISLEADING').length;
  const pendingCount = articles.filter((a) => a.verificationStatus === 'PENDING').length;
  const highCredCount = articles.filter((a) => a.sourceCredibility >= 0.8).length;

  return (
    <div className="h-full overflow-hidden relative">
      {/* ═══════════ TOP SECTION: three-panel layout ═══════════ */}
      <div className="flex h-full">
        {/* ── LEFT RAIL: live feed ─────────────────────────────────────────── */}
        <aside className="w-[300px] shrink-0 flex flex-col min-h-0 border-r-2 border-arcade-ink bg-white">
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
          <div className="px-4 py-2 border-b-2 border-arcade-ink flex gap-1 overflow-x-auto scrollbar-thin">
            <SourceChip label="All" active={sourceFilter === 'all'} onClick={() => setSourceFilter('all')} />
            {sources.slice(0, 12).map((s) => (
              <SourceChip
                key={s}
                label={s}
                active={sourceFilter === s}
                onClick={() => setSourceFilter(s)}
                onHover={() => setHoveredSource(s)}
                onLeave={() => setHoveredSource(null)}
                dimmed={!!hoveredSource && hoveredSource !== s}
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
              filteredArticles.map((a) => {
                const isArticleHovered = hoveredArticleId === a.id;
                const hasAnyHover = !!hoveredSource || !!hoveredArticleId;
                return (
                <div
                  key={a.id}
                  className={`group relative flex items-start gap-2.5 px-2.5 py-2 border-2 cursor-pointer transition-all ${
                    isArticleHovered
                      ? 'border-arcade-pink bg-arcade-pink/10'
                      : hasAnyHover && !isArticleHovered
                      ? 'border-transparent opacity-50'
                      : 'border-transparent hover:border-arcade-ink hover:bg-arcade-yellow/40'
                  }`}
                  onClick={() => onOpenArticle(a)}
                  onMouseEnter={() => setHoveredArticleId(a.id)}
                  onMouseLeave={() => setHoveredArticleId(null)}
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
                );
              })
            )}
          </div>
        </aside>

        {/* ── CENTER: credibility map ──────────────────────────────────────── */}
        <div className="flex-1 min-w-0 relative">
          <MapView articles={filteredArticles} loading={loading} hoveredSource={hoveredSource} onHoverSource={setHoveredSource} hoveredArticleId={hoveredArticleId} />

          {/* Overlay: live coverage header */}
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
              🗺️ Open Intel Map →
            </button>
          </div>

          {/* Active filter indicator */}
          {sourceFilter !== 'all' && (
            <div className="absolute top-4 right-4 z-[1000] bg-arcade-pink border-2 border-arcade-ink shadow-brutal px-3 py-2 flex items-center gap-2">
              <span className="text-[11px] font-bold text-white">
                Filtered: {sourceFilter}
              </span>
              <span className="text-[10px] font-bold text-white/70">
                {filteredArticles.length} of {articles.length}
              </span>
              <button
                onClick={() => setSourceFilter('all')}
                className="ml-1 px-1.5 py-0.5 bg-white border border-arcade-ink text-[10px] font-bold text-arcade-ink hover:bg-arcade-yellow transition-colors"
              >
                ✕ Clear
              </button>
            </div>
          )}
        </div>

        {/* ── RIGHT RAIL: alerts + stories ─────────────────────────────────── */}
        <aside className="w-[320px] shrink-0 flex flex-col min-h-0 border-l-2 border-arcade-ink bg-white">
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
                          ? `watch "${item.watchQuery}"`
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

      {/* ── Analytics drawer toggle button ── */}
      <button
        onClick={() => setAnalyticsOpen((v) => !v)}
        className="absolute top-1/2 right-0 z-[1001] -translate-y-1/2 bg-white border-2 border-arcade-ink border-r-0 px-1.5 py-4 shadow-brutal-sm hover:bg-arcade-yellow transition-colors writing-mode-vertical"
        title="Analytics & Insights"
      >
        <span className="text-[10px] font-bold text-arcade-ink tracking-widest" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
          {analyticsOpen ? '✕ Close' : '📊 Analytics'}
        </span>
      </button>

      {/* ═══════════ ANALYTICS DRAWER (slide from right) ═══════════ */}
      {articles.length > 0 && (
        <div className={`absolute top-0 right-0 bottom-0 z-[1000] w-[480px] bg-arcade-yellow/20 border-l-2 border-arcade-ink overflow-y-auto transition-transform duration-300 ease-in-out ${analyticsOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          {/* ── Stats summary row ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border-b-2 border-arcade-ink">
            <StatCard icon="📰" label="Total Articles" value={articles.length} sub={`${sources.length} sources`} />
            <StatCard icon="✅" label="Verified" value={verifiedCount} sub={`${Math.round((verifiedCount / articles.length) * 100)}%`} color="green" />
            <StatCard icon="⚠️" label="Flagged" value={flagged} sub={flagged > 0 ? 'needs review' : 'all clear'} color={flagged > 0 ? 'red' : 'green'} />
            <StatCard icon="📊" label="Avg Credibility" value={`${avgCred.toFixed(0)}%`} sub={avgCred >= 80 ? 'high trust' : avgCred >= 60 ? 'moderate' : 'low trust'} color={avgCred >= 80 ? 'green' : avgCred >= 60 ? 'yellow' : 'red'} />
          </div>

          {/* Expand / Collapse all */}
          <div className="px-5 py-2 flex justify-end border-b-2 border-arcade-ink bg-white">
            <button
              onClick={toggleAll}
              className="flex items-center gap-1.5 px-2.5 py-1 border-2 border-arcade-ink text-[10px] font-bold text-arcade-ink bg-white hover:bg-arcade-yellow transition-colors shadow-brutal-sm"
            >
              {allExpanded ? (
                <>
                  <ChevronDown className="w-3 h-3 rotate-90 transition-transform" />
                  Collapse all
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3 -rotate-90 transition-transform" />
                  Expand all
                </>
              )}
            </button>
          </div>

          {/* ── Three-column info grid ── */}
          <CollapsibleSection title="Source Breakdown · Categories · Regions" icon="📊" expanded={expandSources} onToggle={() => setExpandSources(!expandSources)}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
            {/* Source Breakdown */}
            <div className="p-5 border-b-2 md:border-b-0 md:border-r-2 border-arcade-ink">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-arcade-ink" />
                <h3 className="font-display text-[14px] tracking-brutal text-arcade-ink uppercase">
                  Source Breakdown
                </h3>
              </div>
              <div className="space-y-2">
                {sourceStats.map((s) => {
                  const isHovered = hoveredSource === s.name;
                  const hasHover = !!hoveredSource;
                  const isFiltered = sourceFilter === s.name;
                  return (
                    <div
                      key={s.name}
                      className={`flex items-center gap-2 px-1 py-0.5 -mx-1 cursor-pointer transition-all ${
                        isFiltered ? 'bg-arcade-yellow/60 ring-2 ring-arcade-ink' : isHovered ? 'bg-arcade-yellow/50' : hasHover ? 'opacity-40' : 'hover:bg-arcade-yellow/20'
                      }`}
                      onMouseEnter={() => setHoveredSource(s.name)}
                      onMouseLeave={() => setHoveredSource(null)}
                      onClick={() => setSourceFilter(sourceFilter === s.name ? 'all' : s.name)}
                    >
                      <div className="w-24 shrink-0">
                        <p className={`text-[11px] font-bold truncate ${isHovered ? 'text-arcade-ink' : ''}`} title={s.name}>
                          {s.name}
                        </p>
                      </div>
                      <div className="flex-1 h-4 bg-white border-2 border-arcade-ink overflow-hidden">
                        <div
                          className="h-full transition-all"
                          style={{
                            width: `${(s.count / articles.length) * 100}%`,
                            backgroundColor: isHovered ? '#ff4fd8' : credColor(s.avgCred / 100),
                          }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-arcade-ink/60 w-8 text-right">
                        {s.count}
                      </span>
                      <span className="text-[10px] font-bold w-8 text-right" style={{ color: credColor(s.avgCred / 100) }}>
                        {s.avgCred}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Category Distribution */}
            <div className="p-5 border-b-2 md:border-b-0 md:border-r-2 border-arcade-ink">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-arcade-ink" />
                <h3 className="font-display text-[14px] tracking-brutal text-arcade-ink uppercase">
                  Categories
                </h3>
              </div>
              <div className="space-y-2">
                {categoryStats.map((c) => {
                  const pct = Math.round((c.count / articles.length) * 100);
                  return (
                    <div key={c.name} className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-arcade-ink w-28 truncate">
                        {categoryIcon(c.name)} {c.name}
                      </span>
                      <div className="flex-1 h-4 bg-white border-2 border-arcade-ink overflow-hidden">
                        <div
                          className="h-full bg-arcade-blue transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-arcade-ink/60 w-12 text-right">
                        {c.count} ({pct}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Geographic Distribution */}
            <div className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Globe className="w-4 h-4 text-arcade-ink" />
                <h3 className="font-display text-[14px] tracking-brutal text-arcade-ink uppercase">
                  Regions
                </h3>
              </div>
              <div className="space-y-2">
                {regionStats.map((r) => {
                  const pct = Math.round((r.count / articles.length) * 100);
                  return (
                    <div key={r.name} className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-arcade-ink w-20 truncate">
                        {regionIcon(r.name)} {r.name}
                      </span>
                      <div className="flex-1 h-4 bg-white border-2 border-arcade-ink overflow-hidden">
                        <div
                          className="h-full transition-all"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: credColor(r.avgCred / 100),
                          }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-arcade-ink/60 w-12 text-right">
                        {r.count} ({pct}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          </CollapsibleSection>

          {/* ── Verification Breakdown + Top Corroborated Stories ── */}
          <CollapsibleSection title="Verification & Corroborated Stories" icon="✅" expanded={expandVerify} onToggle={() => setExpandVerify(!expandVerify)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
            {/* Verification Breakdown */}
            <div className="p-5 border-b-2 md:border-b-0 md:border-r-2 border-arcade-ink">
              <h3 className="font-display text-[14px] tracking-brutal text-arcade-ink uppercase mb-4">
                Verification Status
              </h3>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1 text-center p-3 bg-white border-2 border-arcade-ink">
                  <p className="text-[28px] font-bold text-arcade-ink leading-none">{pendingCount}</p>
                  <p className="text-[10px] font-bold text-arcade-ink/60 mt-1 uppercase">Pending</p>
                </div>
                <div className="flex-1 text-center p-3 bg-white border-2 border-arcade-ink">
                  <p className="text-[28px] font-bold leading-none" style={{ color: '#22c55e' }}>{verifiedCount}</p>
                  <p className="text-[10px] font-bold text-arcade-ink/60 mt-1 uppercase">Verified</p>
                </div>
                <div className="flex-1 text-center p-3 bg-white border-2 border-arcade-ink">
                  <p className="text-[28px] font-bold leading-none" style={{ color: '#ef4444' }}>{misleadingCount}</p>
                  <p className="text-[10px] font-bold text-arcade-ink/60 mt-1 uppercase">Misleading</p>
                </div>
              </div>
              {/* Credibility distribution bar */}
              <div className="h-6 flex border-2 border-arcade-ink overflow-hidden">
                <div
                  className="bg-[#22c55e] h-full flex items-center justify-center"
                  style={{ width: `${Math.round((highCredCount / articles.length) * 100)}%` }}
                >
                  {highCredCount > 0 && (
                    <span className="text-[9px] font-bold text-white">{highCredCount} high</span>
                  )}
                </div>
                <div
                  className="bg-[#ffe600] h-full flex items-center justify-center"
                  style={{
                    width: `${Math.round(
                      ((articles.filter((a) => a.sourceCredibility >= 0.5 && a.sourceCredibility < 0.8).length) /
                        articles.length) *
                        100,
                    )}%`,
                  }}
                >
                  <span className="text-[9px] font-bold text-arcade-ink">
                    {articles.filter((a) => a.sourceCredibility >= 0.5 && a.sourceCredibility < 0.8).length} med
                  </span>
                </div>
                <div
                  className="bg-[#ef4444] h-full flex items-center justify-center"
                  style={{
                    width: `${Math.round(
                      ((articles.filter((a) => a.sourceCredibility < 0.5).length) / articles.length) * 100,
                    )}%`,
                  }}
                >
                  {articles.filter((a) => a.sourceCredibility < 0.5).length > 0 && (
                    <span className="text-[9px] font-bold text-white">
                      {articles.filter((a) => a.sourceCredibility < 0.5).length} low
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Top Corroborated Stories */}
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-[14px] tracking-brutal text-arcade-ink uppercase">
                  Key Corroborated Stories
                </h3>
                <button
                  onClick={onOpenStories}
                  className="text-[11px] font-bold text-arcade-ink bg-arcade-yellow border-2 border-arcade-ink px-1.5 py-0.5 shadow-brutal-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
                >
                  View all →
                </button>
              </div>
              <div className="space-y-2">
                {stories.slice(0, 5).map((story) => (
                  <div
                    key={story.id}
                    className="p-2.5 bg-white border-2 border-arcade-ink shadow-brutal-sm"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 border-2 border-arcade-ink ${
                          story.sourceCount >= 3
                            ? 'bg-arcade-green text-white'
                            : 'bg-arcade-yellow text-arcade-ink'
                        }`}
                      >
                        {story.sourceCount} sources
                      </span>
                      <span className="text-[10px] font-bold text-arcade-ink/50">
                        {story.articleCount} articles
                      </span>
                    </div>
                    <p className="text-[12px] font-bold text-arcade-ink leading-snug line-clamp-2">
                      {story.headline}
                    </p>
                    <p className="text-[10px] font-semibold text-arcade-ink/50 mt-1">
                      {story.sources.join(' · ')}
                    </p>
                  </div>
                ))}
                {stories.length === 0 && (
                  <p className="text-[12px] font-semibold text-arcade-ink/50 text-center py-4">
                    Stories will appear as articles are corroborated across sources…
                  </p>
                )}
              </div>
            </div>
          </div>
          </CollapsibleSection>

          {/* ═══ TRENDING TOPICS ═══ */}
          <CollapsibleSection title="Trending Topics" icon="🔥" expanded={expandTrending} onToggle={() => setExpandTrending(!expandTrending)}>
          <div className="bg-white">
            <div className="px-5 pt-5 pb-4">
              <p className="text-[10px] font-bold text-arcade-ink/50 mb-3">
                extracted from {articles.length} headlines
              </p>
              <div className="flex flex-wrap gap-2">
                {extractTrendingTopics(articles).slice(0, 20).map((t) => (
                  <span
                    key={t.word}
                    className="inline-flex items-center gap-1 px-2.5 py-1 border-2 border-arcade-ink bg-arcade-yellow/40 text-[11px] font-bold text-arcade-ink"
                  >
                    {t.word}
                    <span className="text-[10px] font-bold text-arcade-ink/50 bg-white border border-arcade-ink/30 px-1">
                      {t.count}
                    </span>
                  </span>
                ))}
                {extractTrendingTopics(articles).length === 0 && (
                  <p className="text-[12px] font-semibold text-arcade-ink/50">
                    Topics will appear as more articles are ingested…
                  </p>
                )}
              </div>
            </div>
          </div>
          </CollapsibleSection>

          {/* ═══ ARTICLE TIMELINE ═══ */}
          <CollapsibleSection title="Recent Articles Timeline" icon="📅" expanded={expandTimeline} onToggle={() => setExpandTimeline(!expandTimeline)}>
          <div className="bg-white">
            <div className="px-5 pt-5 pb-4">
              <p className="text-[10px] font-bold text-arcade-ink/50 mb-3">
                latest {Math.min(20, articles.length)} of {articles.length}
              </p>
              <div className="relative">
                {/* Vertical timeline line */}
                <div className="absolute left-[7px] top-0 bottom-0 w-0.5 bg-arcade-ink/20" />
                <div className="space-y-0">
                  {articles.slice(0, 20).map((a, i) => (
                    <div
                      key={a.id}
                      className="relative flex items-start gap-3 pl-5 py-2 hover:bg-arcade-yellow/20 transition-colors cursor-pointer"
                      onClick={() => onOpenArticle(a)}
                    >
                      {/* Timeline dot */}
                      <div
                        className="absolute left-0 top-2.5 w-[15px] h-[15px] border-2 border-arcade-ink z-10"
                        style={{ backgroundColor: credColor(a.sourceCredibility) }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-arcade-ink/50 whitespace-nowrap">
                            {timeAgo(a.timestamp)}
                          </span>
                          <span className="text-[10px] font-bold text-arcade-ink/40">•</span>
                          <span className="text-[10px] font-bold text-arcade-ink/60 truncate">
                            {a.sourceName}
                          </span>
                          <span
                            className="text-[9px] font-bold px-1 py-0 border border-arcade-ink/30"
                            style={{ color: credColor(a.sourceCredibility) }}
                          >
                            {Math.round(a.sourceCredibility * 100)}%
                          </span>
                        </div>
                        <p className="text-[12px] font-bold text-arcade-ink leading-snug line-clamp-1 mt-0.5">
                          {a.title}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          </CollapsibleSection>

          {/* ═══ HOURLY ACTIVITY HEATMAP ═══ */}
          <CollapsibleSection title="Activity by Hour (UTC)" icon="📊" expanded={expandHourly} onToggle={() => setExpandHourly(!expandHourly)}>
          <div className="bg-white">
            <div className="px-5 pt-5 pb-4">
              <div className="flex items-end gap-[2px] h-16">
                {Array.from({ length: 24 }, (_, hour) => {
                  const count = articles.filter((a) => {
                    const h = new Date(a.timestamp).getUTCHours();
                    return h === hour;
                  }).length;
                  const maxCount = Math.max(
                    ...Array.from({ length: 24 }, (_, h2) =>
                      articles.filter((a) => new Date(a.timestamp).getUTCHours() === h2).length,
                    ),
                    1,
                  );
                  const heightPct = Math.round((count / maxCount) * 100);
                  return (
                    <div key={hour} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full border border-arcade-ink/30 transition-all"
                        style={{
                          height: `${Math.max(heightPct, 4)}%`,
                          backgroundColor: count === 0 ? '#f5f5f5' : credColor(0.5 + (count / maxCount) * 0.4),
                        }}
                        title={`${hour}:00 UTC — ${count} articles`}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex items-end gap-[2px] mt-1">
                {Array.from({ length: 24 }, (_, hour) => (
                  <div key={hour} className="flex-1 text-center">
                    {hour % 3 === 0 && (
                      <span className="text-[8px] font-bold text-arcade-ink/40">
                        {String(hour).padStart(2, '0')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          </CollapsibleSection>

          {/* ═══ CREDIBILITY BY SOURCE (HORIZONTAL BAR CHART) ═══ */}
          <CollapsibleSection title="Credibility by Source" icon="🎯" expanded={expandCredSource} onToggle={() => setExpandCredSource(!expandCredSource)}>
          <div className="bg-white">
            <div className="px-5 pt-5 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                {sourceStats.map((s) => {
                  const isHovered = hoveredSource === s.name;
                  const hasHover = !!hoveredSource;
                  const isFiltered = sourceFilter === s.name;
                  return (
                    <div
                      key={s.name}
                      className={`flex items-center gap-2 px-1 py-0.5 -mx-1 cursor-pointer transition-all ${
                        isFiltered ? 'bg-arcade-yellow/60 ring-2 ring-arcade-ink' : isHovered ? 'bg-arcade-yellow/50' : hasHover ? 'opacity-40' : 'hover:bg-arcade-yellow/20'
                      }`}
                      onMouseEnter={() => setHoveredSource(s.name)}
                      onMouseLeave={() => setHoveredSource(null)}
                      onClick={() => setSourceFilter(sourceFilter === s.name ? 'all' : s.name)}
                    >
                      <span className="text-[11px] font-bold text-arcade-ink w-32 truncate" title={s.name}>
                        {s.name}
                      </span>
                      <div className="flex-1 flex items-center gap-1">
                        <div className="flex-1 h-3 bg-white border border-arcade-ink/30 overflow-hidden">
                          <div
                            className="h-full transition-all"
                            style={{
                              width: `${s.avgCred}%`,
                              backgroundColor: isHovered ? '#ff4fd8' : credColor(s.avgCred / 100),
                            }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-arcade-ink/60 w-8 text-right">
                          {s.avgCred}%
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-arcade-ink/40 w-6 text-right">
                        ({s.count})
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          </CollapsibleSection>

          {/* ── Footer info ── */}
          <div className="px-5 py-3 flex items-center justify-between">
            <p className="text-[10px] font-bold text-arcade-ink/40 uppercase tracking-wider">
              PRISM Media Transparency Platform — Data refreshed every 60 seconds
            </p>
            <div className="flex items-center gap-3">
              <p className="text-[10px] font-bold text-arcade-ink/40">
                {mode === 'live' ? '🟢 Live from 28+ RSS feeds' : '⚪ No live data'}
              </p>
              <button
                onClick={() => setShowShortcuts(true)}
                className="text-[10px] font-bold text-arcade-ink/40 hover:text-arcade-ink underline underline-offset-2"
                title="Keyboard shortcuts"
              >
                Press ? for shortcuts
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Keyboard shortcuts overlay ── */}
      {showShortcuts && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowShortcuts(false)}
        >
          <div
            className="bg-white border-2 border-arcade-ink shadow-brutal p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-[16px] tracking-brutal text-arcade-ink uppercase">
                ⌨️ Keyboard Shortcuts
              </h3>
              <button
                onClick={() => setShowShortcuts(false)}
                className="text-arcade-ink hover:text-arcade-pink"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1">
              {[
                { key: 'Esc', desc: 'Clear filter / dismiss overlay' },
                { key: '?', desc: 'Toggle this help panel' },
                { key: 'A', desc: 'Expand / collapse all sections' },
                { key: '1', desc: 'Toggle Sources panel' },
                { key: '2', desc: 'Toggle Verification panel' },
                { key: '3', desc: 'Toggle Trending panel' },
                { key: '4', desc: 'Toggle Timeline panel' },
                { key: '5', desc: 'Toggle Hourly Activity panel' },
                { key: '6', desc: 'Toggle Credibility by Source panel' },
              ].map((s) => (
                <div key={s.key} className="flex items-center gap-3 py-1.5">
                  <kbd className="inline-flex items-center justify-center min-w-[32px] h-6 px-1.5 bg-arcade-yellow border-2 border-arcade-ink text-[11px] font-bold text-arcade-ink">
                    {s.key}
                  </kbd>
                  <span className="text-[12px] font-semibold text-arcade-ink/70">
                    {s.desc}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[10px] font-bold text-arcade-ink/40 mt-4 pt-3 border-t-2 border-arcade-ink">
              Shortcuts are disabled while typing in inputs.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Sub-components ──

const StatCard = ({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: string;
  label: string;
  value: string | number;
  sub: string;
  color?: 'green' | 'yellow' | 'red';
}) => (
  <div className="p-4 border-r-2 border-arcade-ink last:border-r-0 bg-white">
    <div className="flex items-center gap-2 mb-1">
      <span className="text-[16px]">{icon}</span>
      <span className="text-[10px] font-bold text-arcade-ink/60 uppercase tracking-wider">{label}</span>
    </div>
    <p className="text-[24px] font-bold text-arcade-ink leading-none">{value}</p>
    <p
      className="text-[10px] font-bold mt-1"
      style={{
        color:
          color === 'green' ? '#22c55e' : color === 'red' ? '#ef4444' : color === 'yellow' ? '#d97706' : '#0a0a0a80',
      }}
    >
      {sub}
    </p>
  </div>
);

const CollapsibleSection = ({
  title,
  icon,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  icon: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) => (
  <div className="border-b-2 border-arcade-ink overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-5 py-3 bg-white hover:bg-arcade-yellow/30 transition-colors"
    >
      <div className="flex items-center gap-2">
        <span className="text-[14px]">{icon}</span>
        <h3 className="font-display text-[13px] tracking-brutal text-arcade-ink uppercase">
          {title}
        </h3>
      </div>
      <ChevronDown
        className={`w-4 h-4 text-arcade-ink transition-transform duration-300 ease-in-out ${expanded ? '' : '-rotate-90'}`}
      />
    </button>
    {/* Animated collapse using grid trick: rows transition from 0fr to 1fr */}
    <div
      className="grid transition-[grid-template-rows] duration-300 ease-in-out"
      style={{ gridTemplateRows: expanded ? '1fr' : '0fr' }}
    >
      <div className="min-h-0 overflow-hidden">
        {children}
      </div>
    </div>
  </div>
);

const SourceChip = ({
  label,
  active,
  onClick,
  onHover,
  onLeave,
  dimmed,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  onHover?: () => void;
  onLeave?: () => void;
  dimmed?: boolean;
}) => (
  <button
    onClick={onClick}
    onMouseEnter={onHover}
    onMouseLeave={onLeave}
    className={`shrink-0 px-1.5 py-0.5 border-2 border-arcade-ink text-[10px] font-bold whitespace-nowrap transition-all ${
      active
        ? 'bg-arcade-ink text-arcade-yellow shadow-brutal-sm'
        : dimmed
        ? 'bg-white text-arcade-ink/40 border-arcade-ink/30'
        : 'bg-white text-arcade-ink hover:bg-arcade-yellow'
    }`}
    title={label}
  >
    {label.length > 12 ? label.slice(0, 10) + '\u2026' : label}
  </button>
);

// ── Helpers ──

function credColor(score: number): string {
  if (score >= 0.8) return '#22c55e';
  if (score >= 0.5) return '#ffe600';
  return '#ef4444';
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function guessRegion(a: Article): string {
  const src = (a.sourceName || '').toLowerCase();
  const title = (a.title || '').toLowerCase();
  // Source-based heuristics
  if (src.includes('bbc') || src.includes('guardian') || src.includes('daily maverick')) return 'Europe/Africa';
  if (src.includes('nhk') || src.includes('hindu') || src.includes('times of india') || src.includes('scmp')) return 'Asia-Pacific';
  if (src.includes('al jazeera') || src.includes('al-monitor')) return 'Middle East';
  if (src.includes('france 24') || src.includes('dw') || src.includes('euronews') || src.includes('euobserver')) return 'Europe';
  if (src.includes('npr') || src.includes('nbc') || src.includes('propublica') || src.includes('techcrunch') || src.includes('ars')) return 'Americas';
  if (src.includes('mercopress') || src.includes('buenos')) return 'Latin America';
  // Title-based fallback
  if (/ukraine|russia|poland|germany|france|uk\b|eu\b|europe/.test(title)) return 'Europe';
  if (/china|japan|india|korea|taiwan|southeast asia/.test(title)) return 'Asia-Pacific';
  if (/iran|iraq|syria|israel|palestine|gulf|saudi|yemen|egypt/.test(title)) return 'Middle East';
  if (/africa|nigeria|kenya|south africa|ethiopia/.test(title)) return 'Africa';
  if (/us\b|united states|american|washington/.test(title)) return 'Americas';
  return 'Global';
}

function categoryIcon(cat: string): string {
  switch (cat) {
    case 'Politics': return '🏛️';
    case 'Business': return '💼';
    case 'Science': return '🔬';
    case 'Tech': return '💻';
    case 'Sports': return '⚽';
    case 'Education': return '📚';
    case 'Entertainment': return '🎬';
    case 'Health': return '🏥';
    default: return '📰';
  }
}

function regionIcon(region: string): string {
  switch (region) {
    case 'Americas': return '🌎';
    case 'Europe': return '🌍';
    case 'Europe/Africa': return '🌍';
    case 'Asia-Pacific': return '🌏';
    case 'Middle East': return '🏜️';
    case 'Africa': return '🌍';
    case 'Latin America': return '🌎';
    default: return '🌐';
  }
}

/** Extract trending topics from article titles and excerpts. */
function extractTrendingTopics(articles: Article[]): { word: string; count: number }[] {
  const STOP_WORDS = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'shall', 'can', 'its', 'it', 'he',
    'she', 'they', 'we', 'you', 'me', 'my', 'your', 'his', 'her', 'our',
    'their', 'this', 'that', 'these', 'those', 'not', 'no', 'if', 'than',
    'then', 'also', 'more', 'most', 'some', 'any', 'all', 'each', 'new',
    'says', 'said', 'say', 'after', 'before', 'over', 'about', 'into',
    'up', 'out', 'how', 'why', 'what', 'when', 'where', 'who', 'which',
    'as', 'so', 'just', 'like', 'very', 'too', 'now', 'here', 'there',
    'one', 'two', 'three', 'first', 'last', 'next', 'other', 'back',
    'been', 'still', 'even', 'while', 'during', 'between', 'through',
    'under', 'around', 'against', 'without', 'within', 'per', 'via',
  ]);
  const freq = new Map<string, number>();
  for (const a of articles) {
    const text = `${a.title || ''} ${a.excerpt || ''}`;
    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
    const seen = new Set<string>();
    for (const w of words) {
      if (!seen.has(w)) {
        freq.set(w, (freq.get(w) || 0) + 1);
        seen.add(w);
      }
    }
  }
  return Array.from(freq.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .filter((t) => t.count >= 2);
}

export default DashboardView;
