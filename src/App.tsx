/**
 * Unified App.tsx for the merged PRISM project.
 *
 * After merging all three iterations, the router exposes:
 *   /                       — main dashboard (map-centric home + tool views)
 *   /landing                — editorial landing page (from Prizm_Large)
 *   /methodology            — methodology page (from Prizm_Large)
 *   /pricing                — pricing page (from Prizm_Large)
 *   /verification/:id       — full-page Verification Report (from Prizm_Large)
 *   /login, /upgrade        — auth and Pro upgrade (from New_Prizm core)
 *
 * The dashboard is powered by a shared data layer (`services/dataService`)
 * that streams live articles when the backend is reachable and falls back to
 * clearly-badged demo data otherwise — so the product is fully explorable
 * out of the box, with no external credentials required.
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { useCallback, useEffect, useMemo, useState, FormEvent } from 'react';
import { Bell, Plus, X, Trash2, LayoutGrid, ChevronDown, Check } from 'lucide-react';
import { SearchBar } from './components/SearchBar';
import { DailyDigest } from './components/DailyDigest';
import { requestNotificationPermission, checkAndNotify } from './utils/notifications';
import { useLocalStorageState } from './utils/storage';
import { TransparencyFeed } from './components/TransparencyFeed';
import { StoryTrackerView } from './components/StoryTrackerView';
import { NewsTicker } from './components/NewsTicker';
import { DashboardView, AlertItem } from './components/DashboardView';
import { MapView } from './components/MapView';
import { GlobeView } from './components/GlobeView';
import { BiasComparePanel, MAX_COMPARE } from './components/BiasComparePanel';

import { IntelMapView } from './components/IntelMapView';
import { IntelBriefView } from './components/IntelBriefView';
import { IntelMarketsView } from './components/IntelMarketsView';
import BusinessIntelligence from './components/BusinessIntelligence';
import AgentPanel from './components/AgentPanel';
import DebateEngine from './components/DebateEngine';
import GeminiChatbot from './components/GeminiChatbot';
import SourceDirectory from './components/SourceDirectory';
import AccountIdentityWrapper from './components/AccountIdentityWrapper';
import AppShell from './components/AppShell';
import Landing from './pages/Landing';
import Methodology from './pages/Methodology';
import Pricing from './pages/Pricing';
import VerificationReport from './pages/VerificationReport';
import LoginPage from './pages/LoginPage';
import UpgradePage from './pages/UpgradePage';
import { useAuth } from './context/AuthContext';
import { Article, Source } from './types';
import {
  fetchArticles,
  fetchSources,
  downloadJson,
  downloadCsv,
  DataMode,
} from './services/dataService';

// Protected route: redirects to /login if no auth
const RequireAuth = ({ children }: { children: JSX.Element }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

type TabKey =
  | 'dashboard'
  | 'digest'
  | 'intel'
  | 'brief'
  | 'markets'
  | 'feed'
  | 'stories'
  | 'map'
  | 'globe'
  | 'business'
  | 'agent'
  | 'bias'
  | 'debate'
  | 'directory'
  | 'chat';

const TABS: { key: TabKey; label: string; glyph: string }[] = [
  { key: 'dashboard', label: 'Dashboard', glyph: '🛰️' },
  { key: 'digest', label: 'Daily Digest', glyph: '📋' },
  { key: 'intel', label: 'Intel Map', glyph: '🗺️' },
  { key: 'brief', label: 'Intel Brief', glyph: '📡' },
  { key: 'markets', label: 'Markets & Feeds', glyph: '📈' },
  { key: 'feed', label: 'Feed', glyph: '📰' },
  { key: 'stories', label: 'Story Tracker', glyph: '🕸️' },
  { key: 'map', label: 'Map View', glyph: '📍' },
  { key: 'globe', label: 'Globe View', glyph: '🌍' },
  { key: 'business', label: 'Business Intel', glyph: '🏦' },
  { key: 'agent', label: 'Agent Studio', glyph: '🤖💰' },
  { key: 'bias', label: 'Bias Compare', glyph: '⚖️' },
  { key: 'debate', label: 'Multi-Agent Debate', glyph: '🎙️' },
  { key: 'directory', label: 'Sources', glyph: '🔎' },
  { key: 'chat', label: 'AI Chat', glyph: '🤖' },
];

const LIVE_REFRESH_MS = 60_000;
/** While in demo mode, keep probing for the live backend so the dashboard
 *  flips to LIVE automatically once the backend (or its ingestion) is up. */
const DEMO_RETRY_MS = 20_000;

/** A user-defined watch alert: notify when articles mention `query`. */
interface UserAlert {
  id: string;
  query: string;
  source: string; // 'all' or a specific source name
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Dashboard shell — header, LIVE indicator, tools menu, views.
// ---------------------------------------------------------------------------

const AppLayout = () => {
  // Persisted across sessions (localStorage)
  const [activeTab, setActiveTab] = useLocalStorageState<TabKey>('prism:active-tab', 'dashboard');
  const [savedArticles, setSavedArticles] = useLocalStorageState<Article[]>('prism:saved-articles', []);
  const [dismissedAlertIds, setDismissedAlertIds] = useLocalStorageState<string[]>(
    'prism:dismissed-alerts',
    [],
  );
  const [userAlerts, setUserAlerts] = useLocalStorageState<UserAlert[]>('prism:user-alerts', []);
  const [compareIds, setCompareIds] = useLocalStorageState<string[]>('prism:compare-selection', []);

  // Ephemeral state
  const [articles, setArticles] = useState<Article[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [mode, setMode] = useState<DataMode>('live');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [alertArticle, setAlertArticle] = useState<Article | null>(null);
  const [showWatchPanel, setShowWatchPanel] = useState(false);
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const [watchQuery, setWatchQuery] = useState('');
  const [watchSource, setWatchSource] = useState('all');

  // Shared article loading — tries the live backend, falls back to demo data.
  const loadArticles = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    else setRefreshing(true);
    try {
      const result = await fetchArticles({ limit: 60 });
      setArticles(result.data);
      setMode(result.mode);
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadArticles(true);
    fetchSources().then((r) => setSources(r.data));
  }, [loadArticles]);

  // Auto-refresh while live; keep probing for the backend while in demo.
  useEffect(() => {
    const timer = setInterval(
      () => loadArticles(false),
      mode === 'live' ? LIVE_REFRESH_MS : DEMO_RETRY_MS,
    );
    return () => clearInterval(timer);
  }, [mode, loadArticles]);

  // Derived dashboard stats
  const stats = useMemo(() => {
    const flagged = articles.filter(
      (a) => a.verificationStatus === 'MISLEADING' || a.sourceCredibility < 0.7,
    );
    const avgCred =
      articles.length > 0
        ? articles.reduce((sum, a) => sum + a.sourceCredibility, 0) / articles.length
        : 0;
    const sourcesCount = new Set(articles.map((a) => a.sourceName)).size;
    return {
      total: articles.length,
      sourcesCount,
      avgCred,
      flagged: flagged.length,
    };
  }, [articles]);

  // System alerts: flagged / low-credibility articles (auto-derived)
  const alerts = useMemo(
    () =>
      articles.filter(
        (a) => a.verificationStatus === 'MISLEADING' || a.sourceCredibility < 0.7,
      ),
    [articles],
  );

  // Watch-alert matches: articles matching a user-defined watch query
  const watchMatches = useMemo(() => {
    const matches: AlertItem[] = [];
    for (const a of articles) {
      for (const al of userAlerts) {
        const q = al.query.trim().toLowerCase();
        if (!q) continue;
        if (al.source && al.source !== 'all' && a.sourceName !== al.source) continue;
        const hay = `${a.title} ${a.excerpt} ${a.sourceName}`.toLowerCase();
        if (hay.includes(q)) {
          matches.push({ key: `${a.id}:${al.id}`, article: a, kind: 'watch', watchQuery: al.query });
        }
      }
    }
    return matches;
  }, [articles, userAlerts]);

  // Everything shown in the ticker, minus what the user dismissed.
  const alertItems = useMemo(() => {
    const dismissed = new Set(dismissedAlertIds);
    const system: AlertItem[] = alerts
      .filter((a) => !dismissed.has(a.id))
      .map((a) => ({ key: `sys:${a.id}`, article: a, kind: 'system' as const }));
    const watch = watchMatches.filter((m) => !dismissed.has(m.article.id));
    return [...system, ...watch];
  }, [alerts, watchMatches, dismissedAlertIds]);

  // Saved articles (persisted snapshots so they survive even if the article
  // drops out of the live feed).
  const savedIds = useMemo(() => new Set(savedArticles.map((a) => a.id)), [savedArticles]);

  const toggleSaveArticle = useCallback(
    (article: any) => {
      setSavedArticles((prev) => {
        const id = article?.id;
        if (!id) return prev;
        if (prev.some((a) => a.id === id)) return prev.filter((a) => a.id !== id);
        const snapshot: Article = {
          id,
          title: article.title || 'Untitled',
          excerpt: article.excerpt || article.summary || '',
          content: article.content,
          category: article.category || 'Home',
          sourceName: article.sourceName || article.source || 'Unknown',
          sourceCredibility:
            typeof article.sourceCredibility === 'number' ? article.sourceCredibility : 0.5,
          biasRating: article.biasRating || 'Center',
          verificationStatus: article.verificationStatus || 'PENDING',
          timestamp: article.timestamp || article.publishedAt || new Date().toISOString(),
          url: article.url || article.link,
          latitude: article.latitude,
          longitude: article.longitude,
          biasAnalysis: article.biasAnalysis,
          biasAxes: article.biasAxes,
          groundingUrls: article.groundingUrls,
        };
        return [...prev, snapshot];
      });
    },
    [setSavedArticles],
  );

  // Comparison workflow — shared between feed checkboxes and the Bias panel
  const toggleCompare = useCallback(
    (id: string) => {
      setCompareIds((prev) => {
        if (prev.includes(id)) return prev.filter((x) => x !== id);
        if (prev.length >= MAX_COMPARE) return prev;
        return [...prev, id];
      });
    },
    [setCompareIds],
  );

  const clearCompare = useCallback(() => setCompareIds([]), [setCompareIds]);

  const dismissAlert = useCallback(
    (articleId: string) => {
      setDismissedAlertIds((prev) => (prev.includes(articleId) ? prev : [...prev, articleId]));
    },
    [setDismissedAlertIds],
  );

  const clearAllAlerts = useCallback(() => {
    setDismissedAlertIds((prev) => {
      const ids = alertItems.map((i) => i.article.id);
      return [...new Set([...prev, ...ids])];
    });
  }, [alertItems, setDismissedAlertIds]);

  const addWatchAlert = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      const q = watchQuery.trim();
      if (!q) return;
      setUserAlerts((prev) => [
        ...prev,
        {
          id: `watch-${Date.now()}`,
          query: q,
          source: watchSource,
          createdAt: new Date().toISOString(),
        },
      ]);
      setWatchQuery('');
      setShowWatchPanel(false);
    },
    [watchQuery, watchSource, setUserAlerts],
  );

  // Browser notifications for watch alerts
  useEffect(() => {
    if (userAlerts.length > 0 && articles.length > 0) {
      checkAndNotify(articles, userAlerts);
    }
  }, [articles, userAlerts]);

  // Request notification permission when user creates first watch alert
  useEffect(() => {
    if (userAlerts.length === 1) {
      requestNotificationPermission();
    }
  }, [userAlerts]);

  // Debate statement — use the most recent flagged or top article as the
  // default claim so the debate view opens with a concrete subject.
  const debateStatement = useMemo(() => {
    const target = alerts[0] || articles[0];
    return target ? `${target.sourceName}: ${target.title}` : '';
  }, [alerts, articles]);

  const handleExportReport = useCallback(
    (kind: 'json' | 'csv') => {
      const payload = articles.map((a) => ({
        id: a.id,
        title: a.title,
        source: a.sourceName,
        credibility: a.sourceCredibility,
        biasRating: a.biasRating,
        verificationStatus: a.verificationStatus,
        publishedAt: a.timestamp,
        url: a.url,
      }));
      if (kind === 'json') {
        downloadJson(`prism-articles-${new Date().toISOString().slice(0, 10)}.json`, payload);
      } else {
        downloadCsv(`prism-articles-${new Date().toISOString().slice(0, 10)}.csv`, payload);
      }
    },
    [articles],
  );

  const activeLabel = TABS.find((t) => t.key === activeTab)?.label || 'Dashboard';

  return (
    <div className="h-screen flex flex-col bg-surface text-on-surface font-body-md antialiased">
      {/* Header — neo-brutalist bar: yellow canvas, black rules, hard shadows */}
      <header className="shrink-0 z-30 border-b-2 border-[#0a0a0a] bg-surface">
        <div className="flex items-center justify-between px-4 py-2.5 gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 bg-arcade-ink text-arcade-yellow font-headline-md text-base font-bold border-2 border-arcade-ink shadow-brutal-sm">
              P
            </div>
            <div className="leading-tight">
              <h1 className="font-display text-[17px] tracking-brutal text-arcade-ink">
                PRISM
              </h1>
              <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-arcade-ink/70">
                Media Transparency Platform
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* LIVE / DEMO badge — black pill with pulsing dot */}
            <div
              className={`flex items-center gap-2 px-3 py-1 border-2 border-arcade-ink text-[11px] font-bold uppercase tracking-wider ${
                mode === 'live'
                  ? 'bg-arcade-ink text-arcade-yellow shadow-brutal-sm'
                  : 'bg-white text-arcade-ink'
              }`}
              title={
                mode === 'live'
                  ? 'Streaming live articles from the PRISM ingestion backend'
                  : mode === 'empty'
                  ? 'Backend unreachable or empty — start the backend with cd api && npm run dev'
                  : 'Connecting...'
              }
            >
              <span className={`relative flex h-2 w-2 ${mode === 'live' ? '' : 'opacity-70'}`}>
                {mode === 'live' && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-70" />
                )}
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    mode === 'live' ? 'bg-red-500' : 'bg-amber-500'
                  }`}
                />
              </span>
              {mode === 'live' ? 'LIVE' : mode === 'empty' ? 'NO DATA' : 'LIVE'}
            </div>

            <span className="hidden xl:block text-[10px] font-semibold text-arcade-ink/70 whitespace-nowrap">
              {stats.sourcesCount} sources • {stats.total} articles
              {lastUpdated ? ` • ${formatTimeAgo(lastUpdated)}` : ''}
            </span>

            <button
              onClick={() => loadArticles(true)}
              disabled={refreshing || loading}
              className="flex items-center gap-1 px-2 py-1 bg-white border-2 border-arcade-ink text-[11px] font-bold shadow-brutal-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all disabled:opacity-50"
              title="Refresh articles"
            >
              <span className={refreshing ? 'inline-block animate-spin' : ''}>⟳</span>
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {/* Search */}
            <SearchBar articles={articles} onSelectArticle={setAlertArticle} />

            {/* Watch alert control */}
            <div className="relative">
              <button
                onClick={() => setShowWatchPanel((v) => !v)}
                className={`flex items-center gap-1 px-2.5 py-1 border-2 border-arcade-ink text-[11px] font-bold whitespace-nowrap transition-all ${
                  showWatchPanel
                    ? 'bg-arcade-pink text-white shadow-brutal-sm'
                    : 'bg-white text-arcade-ink shadow-brutal-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
                }`}
              >
                <Plus className="w-3 h-3" />
                Watch
                {userAlerts.length > 0 && (
                  <span className="w-4 h-4 bg-arcade-ink text-arcade-yellow text-[10px] font-bold flex items-center justify-center">
                    {userAlerts.length}
                  </span>
                )}
              </button>

              {showWatchPanel && (
                <WatchPanel
                  userAlerts={userAlerts}
                  articles={articles}
                  watchQuery={watchQuery}
                  watchSource={watchSource}
                  onQueryChange={setWatchQuery}
                  onSourceChange={setWatchSource}
                  onAdd={addWatchAlert}
                  onDelete={(id) => setUserAlerts((prev) => prev.filter((a) => a.id !== id))}
                  onClose={() => setShowWatchPanel(false)}
                />
              )}
            </div>

            {/* Tools menu (replaces the tab bar) */}
            <div className="relative">
              <button
                onClick={() => setShowToolsMenu((v) => !v)}
                className={`flex items-center gap-1 px-2 py-1.5 border-2 border-arcade-ink text-[11px] font-bold transition-all max-w-[180px] overflow-hidden ${
                  showToolsMenu
                    ? 'bg-arcade-blue text-arcade-ink shadow-brutal-sm'
                    : 'bg-white text-arcade-ink shadow-brutal-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{activeLabel}</span>
                <ChevronDown className="w-3 h-3 shrink-0" />
              </button>

              {showToolsMenu && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowToolsMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 z-40 w-64 bg-white border-2 border-arcade-ink shadow-brutal py-1.5">
                    {TABS.map((t) => (
                      <button
                        key={t.key}
                        onClick={() => {
                          setActiveTab(t.key);
                          setShowToolsMenu(false);
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-[12px] font-semibold text-left transition-colors ${
                          activeTab === t.key
                            ? 'text-arcade-ink bg-arcade-yellow'
                            : 'text-arcade-ink hover:bg-arcade-yellow/40'
                        }`}
                      >
                        <span className="text-[14px] leading-none">{t.glyph}</span>
                        <span className="flex-1">{t.label}</span>
                        {activeTab === t.key && <Check className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Arcade marquee — live headline ticker */}
      {activeTab === 'dashboard' && articles.length > 0 && (
        <div className="shrink-0">
          <NewsTicker articles={articles} label="LIVE TICKER" />
        </div>
      )}

        {/* Empty state when backend is unreachable */}
        {articles.length === 0 && !loading && (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center max-w-md">
              <div className="text-[48px] mb-4">📡</div>
              <h2 className="font-headline-md text-[20px] text-arcade-ink mb-2">
                No Live Data Available
              </h2>
              <p className="text-[12px] text-arcade-ink/60 mb-4 leading-relaxed">
                The backend is not running or has no articles yet. Start the backend
                to ingest real news from 28+ RSS feeds worldwide.
              </p>
              <div className="bg-white border-2 border-arcade-ink p-4 text-left">
                <p className="text-[11px] font-bold text-arcade-ink/70 mb-2">Quick start:</p>
                <code className="block text-[11px] font-mono text-arcade-ink bg-arcade-yellow/30 p-2 border border-arcade-ink/20">
                  cd api && npm install && npm run dev
                </code>
                <p className="text-[10px] text-arcade-ink/50 mt-2">
                  Backend runs on port 3000, frontend proxies API calls automatically.
                </p>
              </div>
            </div>
          </div>
        )}

      {/* Breadcrumb for tool views (the dashboard itself is full-bleed) */}
      {activeTab !== 'dashboard' && (
        <div className="shrink-0 flex items-center gap-3 px-4 py-1.5 border-b-2 border-arcade-ink bg-arcade-yellow">
          <button
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-1 text-[11px] font-bold text-arcade-ink hover:text-arcade-pink transition-colors"
          >
            ← Dashboard
          </button>
          <span className="text-[10px] text-arcade-ink/50">/</span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-arcade-ink">
            {activeLabel}
          </span>
        </div>
      )}

      {/* Active view */}
      <main className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'digest' && (
          <DailyDigest
            articles={articles}
            loading={loading}
            onRefresh={() => loadArticles(true)}
            onSelectArticle={setAlertArticle}
            onNavigateToFeed={() => setActiveTab('feed')}
          />
        )}
        {activeTab === 'dashboard' && (
          <DashboardView
            articles={articles}
            mode={mode}
            loading={loading}
            alertItems={alertItems}
            onDismissAlert={dismissAlert}
            onClearAlerts={clearAllAlerts}
            onOpenArticle={setAlertArticle}
            savedIds={savedIds}
            onToggleSave={toggleSaveArticle}
            onOpenFeed={() => setActiveTab('feed')}
            onOpenStories={() => setActiveTab('stories')}
            onOpenIntel={() => setActiveTab('intel')}
          />
        )}
        {activeTab === 'feed' && (
          <div className="h-full overflow-y-auto p-4">
            <TransparencyFeed
              articles={articles}
              mode={mode}
              loading={loading}
              lastUpdated={lastUpdated}
              onRefresh={() => loadArticles(true)}
              onExport={(kind) => handleExportReport(kind)}
              savedArticles={savedArticles}
              isSaved={(id) => savedIds.has(id)}
              onToggleSave={toggleSaveArticle}
              compareIds={compareIds}
              onToggleCompare={toggleCompare}
              onClearCompare={clearCompare}
              onOpenCompare={() => setActiveTab('bias')}
            />
          </div>
        )}
        {activeTab === 'stories' && (
          <div className="h-full overflow-y-auto">
            <StoryTrackerView articles={articles} loading={loading} live={mode === 'live'} />
          </div>
        )}
        {activeTab === 'map' && (
          <div className="h-full p-4">
            <div className="h-full rounded-xl overflow-hidden border border-silver-grey">
              <MapView articles={articles} loading={loading} />
            </div>
          </div>
        )}

        {activeTab === 'intel' && <IntelMapView />}
        {activeTab === 'brief' && <IntelBriefView articles={articles} />}
        {activeTab === 'markets' && <IntelMarketsView articles={articles} />}
        {activeTab === 'globe' && <GlobeView articles={articles} loading={loading} />}
        {activeTab === 'business' && (
          <div className="h-full overflow-y-auto">
            <BusinessIntelligence
              onExportToDrive={async (report) => downloadJson(`prism-report-${Date.now()}.json`, report)}
              onSyncToSheets={async (report) => downloadCsv(`prism-matrix-${Date.now()}.csv`, [report])}
            />
          </div>
        )}
        {activeTab === 'agent' && <AgentPanel />}
        {activeTab === 'bias' && (
          <div className="h-full overflow-y-auto">
            <BiasComparePanel
              articles={articles}
              selectedIds={compareIds}
              onToggle={toggleCompare}
              onClear={clearCompare}
            />
          </div>
        )}
        {activeTab === 'debate' && (
          <div className="h-full overflow-y-auto p-4 md:p-8">
            <h2 className="font-headline-lg text-headline-lg mb-2">Multi-Agent Debate</h2>
            <p className="text-body-md text-on-surface-variant mb-6">
              Three independent voices analyze the same claim — progressive, conservative, and
              omission-focused — with a moderator synthesis. This is the core primitive behind
              PRISM&rsquo;s deep verification.
            </p>
            <DebateEngine statement={debateStatement} />
          </div>
        )}
        {activeTab === 'directory' && (
          <div className="h-full overflow-y-auto">
            <SourceDirectory
              sources={sources}
              onSearchMaps={async (query) => ({
                text: `Located registry and transparency resources near "${query}". Open the embedded map and external links for verified locations.`,
                mapsGrounding: [
                  {
                    uri: `https://www.google.com/maps/search/${encodeURIComponent(query)}`,
                    title: `Registry & transparency offices near ${query}`,
                  },
                ],
              })}
              mapsGroundingResult={null}
              isSearchingMaps={false}
            />
          </div>
        )}
        {activeTab === 'chat' && <GeminiChatbot />}
      </main>

      {/* Alert detail modal */}
      {alertArticle && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setAlertArticle(null)}
        >
          <div
            className="bg-surface rounded-lg p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto border border-silver-grey"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <span
                className={`px-3 py-1 rounded-full text-label-sm font-semibold ${
                  alertArticle.verificationStatus === 'MISLEADING'
                    ? 'bg-error/10 text-error'
                    : alertArticle.sourceCredibility < 0.7
                    ? 'bg-amber-500/10 text-amber-400'
                    : 'bg-transparency-teal/10 text-transparency-teal'
                }`}
              >
                {alertArticle.verificationStatus === 'MISLEADING'
                  ? 'MISLEADING'
                  : alertArticle.sourceCredibility < 0.7
                  ? 'LOW CREDIBILITY'
                  : 'VERIFIED'}
              </span>
              <button
                onClick={() => setAlertArticle(null)}
                className="text-on-surface-variant hover:text-on-surface"
              >
                ✕
              </button>
            </div>
            <h3 className="font-headline-md text-headline-md mb-2">{alertArticle.title}</h3>
            <p className="text-label-sm text-on-surface-variant mb-1">
              {alertArticle.sourceName} • {Math.round(alertArticle.sourceCredibility * 100)}% credibility
              {alertArticle.url && (
                <>
                  {' '}
                  •{' '}
                  <a
                    href={alertArticle.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-transparency-teal hover:underline"
                  >
                    read original ↗
                  </a>
                </>
              )}
            </p>
            <p className="text-body-md text-on-surface mb-4">{alertArticle.excerpt}</p>
            {alertArticle.biasAnalysis?.moderator ? (
              <div className="border border-silver-grey rounded-lg p-3 text-body-sm text-on-surface-variant">
                <span className="font-semibold text-on-surface">Moderator verdict:</span>{' '}
                {alertArticle.biasAnalysis.moderator.text}
              </div>
            ) : (
              <div className="border border-silver-grey rounded-lg p-3 text-body-sm text-on-surface-variant">
                <span className="font-semibold text-on-surface">Source verdict:</span> ingested live
                from {alertArticle.sourceName} with baseline credibility of{' '}
                {Math.round(alertArticle.sourceCredibility * 100)}%. Open the article and run
                Multi-Agent Debate or Deep Verification for a full analysis.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Watch-alert management panel (create, list, delete persisted watch alerts)
// ---------------------------------------------------------------------------

const WatchPanel = ({
  userAlerts,
  articles,
  watchQuery,
  watchSource,
  onQueryChange,
  onSourceChange,
  onAdd,
  onDelete,
  onClose,
}: {
  userAlerts: UserAlert[];
  articles: Article[];
  watchQuery: string;
  watchSource: string;
  onQueryChange: (v: string) => void;
  onSourceChange: (v: string) => void;
  onAdd: (e: FormEvent) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) => {
  const sourceOptions = useMemo(
    () => Array.from(new Set(articles.map((a) => a.sourceName))).sort(),
    [articles],
  );

  return (
    <div className="absolute right-0 top-full mt-1 z-40 w-80 bg-surface border border-silver-grey rounded-lg shadow-lg p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-label-sm font-semibold text-on-surface uppercase tracking-wider">
          Watch alerts
        </h4>
        <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface">
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={onAdd} className="space-y-2">
        <input
          type="text"
          placeholder="Topic or keyword… e.g. semiconductors"
          value={watchQuery}
          onChange={(e) => onQueryChange(e.target.value)}
          className="w-full px-3 py-1.5 rounded-lg border border-silver-grey text-label-sm bg-surface-container-lowest text-on-surface focus:outline-none focus:border-primary"
        />
        <div className="flex gap-2">
          <select
            value={watchSource}
            onChange={(e) => onSourceChange(e.target.value)}
            className="flex-1 px-2.5 py-1.5 rounded-lg border border-silver-grey text-label-sm bg-surface-container-lowest text-on-surface focus:outline-none"
          >
            <option value="all">All sources</option>
            {sourceOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={!watchQuery.trim()}
            className="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-label-sm font-medium disabled:opacity-40"
          >
            Add
          </button>
        </div>
      </form>

      {userAlerts.length === 0 ? (
        <p className="text-label-sm text-on-surface-variant/60">
          No watch alerts yet. Articles mentioning your topic will appear in the ticker.
        </p>
      ) : (
        <ul className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin">
          {userAlerts.map((alert) => {
            const q = alert.query.trim().toLowerCase();
            const count = q
              ? articles.filter((a) => {
                  if (alert.source !== 'all' && a.sourceName !== alert.source) return false;
                  return `${a.title} ${a.excerpt} ${a.sourceName}`.toLowerCase().includes(q);
                }).length
              : 0;
            return (
              <li
                key={alert.id}
                className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border border-silver-grey bg-surface-container-lowest"
              >
                <div className="min-w-0">
                  <p className="text-label-sm text-on-surface truncate">“{alert.query}”</p>
                  <p className="text-label-sm text-on-surface-variant/70">
                    {alert.source === 'all' ? 'All sources' : alert.source} • {count} matching
                    article{count === 1 ? '' : 's'}
                  </p>
                </div>
                <button
                  onClick={() => onDelete(alert.id)}
                  className="text-on-surface-variant hover:text-error shrink-0"
                  title="Delete watch alert"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

function formatTimeAgo(date: Date): string {
  const diffSeconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSeconds < 60) return 'just now';
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  return `${Math.floor(diffSeconds / 86400)}d ago`;
}

const App = () => {
  return (
    <Routes>
      {/* Public editorial pages */}
      <Route
        path="/landing"
        element={
          <AppShell activeRoute="#/landing">
            <Landing onCtaClick={() => (window.location.hash = '#/')} />
          </AppShell>
        }
      />
      <Route
        path="/methodology"
        element={
          <AppShell activeRoute="#/methodology">
            <Methodology />
          </AppShell>
        }
      />
      <Route
        path="/pricing"
        element={
          <AppShell activeRoute="#/pricing">
            <Pricing />
          </AppShell>
        }
      />
      <Route
        path="/verification/:id"
        element={
          <AppShell activeRoute="#/verification">
            <VerificationReportWrapper />
          </AppShell>
        }
      />

      {/* World Monitor — standalone full-screen map */}
      <Route path="/world-monitor" element={<IntelMapView />} />

      {/* Auth */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected */}
      <Route
        path="/upgrade"
        element={
          <RequireAuth>
            <UpgradePage />
          </RequireAuth>
        }
      />
      <Route
        path="/account"
        element={
          <RequireAuth>
            <AppShell activeRoute="#/account">
              <AccountIdentityWrapper />
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/"
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

// Read ?id=... for the verification report
import { useParams } from 'react-router-dom';
const VerificationReportWrapper = () => {
  const { id } = useParams();
  return (
    <VerificationReport
      article={
        {
          id: id || '',
          title: 'Verification Report',
          excerpt: '',
          category: 'Home',
          sourceName: 'PRISM',
          sourceCredibility: 90,
          biasRating: 'Center',
          verificationStatus: 'VERIFIED',
          timestamp: new Date().toISOString(),
        } as any
      }
      onBack={() => (window.location.hash = '#/')}
    />
  );
};

export default App;
