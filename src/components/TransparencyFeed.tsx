import { useEffect, useMemo, useState } from 'react';
import { Bookmark, GitCompareArrows } from 'lucide-react';
import { VerificationModal } from './VerificationModal';
import { Article } from '../types';
import { DataMode, fetchArticles } from '../services/dataService';
import { MAX_COMPARE } from './BiasComparePanel';

interface TransparencyFeedProps {
  /** Shared articles from the dashboard shell (when provided, the feed does not self-fetch). */
  articles?: Article[];
  mode?: DataMode;
  loading?: boolean;
  lastUpdated?: Date | null;
  onRefresh?: () => void;
  onExport?: (kind: 'json' | 'csv') => void;
  /** Persisted saved articles (snapshots) from the dashboard shell. */
  savedArticles?: Article[];
  isSaved?: (id: string) => boolean;
  onToggleSave?: (article: any) => void;
  /** Comparison workflow — selection is shared with the Bias Compare panel. */
  compareIds?: string[];
  onToggleCompare?: (id: string) => void;
  onClearCompare?: () => void;
  onOpenCompare?: () => void;
}

export const TransparencyFeed = ({
  articles: sharedArticles,
  mode = 'live',
  loading: sharedLoading,
  lastUpdated,
  onRefresh,
  onExport,
  savedArticles = [],
  isSaved,
  onToggleSave,
  compareIds = [],
  onToggleCompare,
  onClearCompare,
  onOpenCompare,
}: TransparencyFeedProps) => {
  const [articles, setArticles] = useState<Array<any>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<any | null>(null);

  // Filters
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [minCredibility, setMinCredibility] = useState<number>(0);
  const [showSaved, setShowSaved] = useState<'all' | 'saved'>('all');

  // Self-fetch mode (when used standalone, without the dashboard shell)
  useEffect(() => {
    if (sharedArticles) return;
    let cancelled = false;
    const fetchArticlesData = async () => {
      try {
        setLoading(true);
        const result = await fetchArticles({ limit: 20 });
        if (cancelled) return;
        setArticles(result.data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch articles:', err);
        if (!cancelled) {
          setError('Failed to load articles. Please try again later.');
          setArticles([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchArticlesData();
    return () => {
      cancelled = true;
    };
  }, [sharedArticles]);

  const isLoading = sharedArticles ? !!sharedLoading : loading;

  // Filtering
  const sourceOptions = useMemo(() => {
    const list = sharedArticles || articles;
    return Array.from(new Set(list.map((a) => a.sourceName || a.source))).sort();
  }, [sharedArticles, articles]);

  const matchesFilters = (a: any): boolean => {
    const source = a.sourceName || a.source || '';
    const credibility = typeof a.sourceCredibility === 'number' ? a.sourceCredibility : 0.5;
    const category = a.category || 'Home';
    if (sourceFilter !== 'all' && source !== sourceFilter) return false;
    if (categoryFilter !== 'all' && category !== categoryFilter) return false;
    if (credibility < minCredibility) return false;
    return true;
  };

  const filteredArticles = useMemo(() => {
    const list = sharedArticles || articles;
    return list.filter(matchesFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharedArticles, articles, sourceFilter, categoryFilter, minCredibility]);

  // Saved-article mode renders from persisted snapshots (works even when the
  // article has dropped out of the live feed).
  const savedFiltered = useMemo(() => {
    return savedArticles.filter(matchesFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedArticles, sourceFilter, categoryFilter, minCredibility]);

  // Normalize articles into the card's expected shape (handles both the
  // backend format and the shared Article type).
  const cardArticles = useMemo(() => {
    const base = showSaved === 'saved' ? savedFiltered : filteredArticles;
    return base.map(normalizeCard);
  }, [showSaved, savedFiltered, filteredArticles]);

  const compareCount = compareIds.length;
  const atCompareCap = compareCount >= MAX_COMPARE;

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full border-4 border-primary/20 border-t-primary w-12 h-12"></div>
        <p className="mt-4 text-label-sm text-on-surface-variant">Loading transparency feed...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-label-sm text-on-surface-variant">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 bg-primary text-on-primary px-4 py-2 rounded hover:bg-primary/90 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const displayList = cardArticles;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <span className="text-label-sm font-label-sm uppercase tracking-widest text-on-surface-variant">
            Live Intelligence
          </span>
          <h2 className="font-headline-lg text-headline-lg mb-0">Transparency Feed</h2>
        </div>

        <div className="flex items-center gap-2">
          {mode === 'demo' && (
            <span className="px-2.5 py-1 rounded-full border border-amber-500/40 bg-amber-500/10 text-label-sm text-amber-700">
              DEMO DATA
            </span>
          )}
          {lastUpdated && (
            <span className="text-label-sm text-on-surface-variant">
              Updated {formatTimeAgo(lastUpdated)}
            </span>
          )}
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="px-3 py-1.5 rounded-lg border border-silver-grey text-label-sm font-medium hover:bg-surface-container-low transition-colors"
            >
              ⟳ Refresh
            </button>
          )}
          {onExport && (
            <>
              <button
                onClick={() => onExport('json')}
                className="px-3 py-1.5 rounded-lg border border-silver-grey text-label-sm font-medium hover:bg-surface-container-low transition-colors"
              >
                Export JSON
              </button>
              <button
                onClick={() => onExport('csv')}
                className="px-3 py-1.5 rounded-lg border border-silver-grey text-label-sm font-medium hover:bg-surface-container-low transition-colors"
              >
                Export CSV
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg border border-silver-grey bg-surface-container-lowest">
        <label className="flex items-center gap-2 text-label-sm text-on-surface-variant">
          Show
          <select
            value={showSaved}
            onChange={(e) => setShowSaved(e.target.value as 'all' | 'saved')}
            className="border border-silver-grey rounded px-2 py-1 text-label-sm bg-surface text-on-surface"
          >
            <option value="all">All articles</option>
            <option value="saved">Saved ({savedArticles.length})</option>
          </select>
        </label>

        <label className="flex items-center gap-2 text-label-sm text-on-surface-variant">
          Source
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="border border-silver-grey rounded px-2 py-1 text-label-sm bg-surface text-on-surface"
          >
            <option value="all">All sources</option>
            {sourceOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-label-sm text-on-surface-variant">
          Category
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="border border-silver-grey rounded px-2 py-1 text-label-sm bg-surface text-on-surface"
          >
            <option value="all">All categories</option>
            {['Home', 'Business', 'Politics', 'Science', 'Tech'].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-label-sm text-on-surface-variant">
          Min credibility
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={minCredibility}
            onChange={(e) => setMinCredibility(parseFloat(e.target.value))}
            className="w-32"
          />
          <span className="w-10 text-on-surface">{Math.round(minCredibility * 100)}%</span>
        </label>

        {(sourceFilter !== 'all' || categoryFilter !== 'all' || minCredibility > 0) && (
          <button
            onClick={() => {
              setSourceFilter('all');
              setCategoryFilter('all');
              setMinCredibility(0);
            }}
            className="text-label-sm text-primary underline"
          >
            Clear filters
          </button>
        )}

        <span className="ml-auto text-label-sm text-on-surface-variant">
          {displayList.length} article{displayList.length === 1 ? '' : 's'}
        </span>
      </div>

      {displayList.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-label-sm text-on-surface-variant">
            {showSaved === 'saved'
              ? savedArticles.length === 0
                ? 'No saved articles yet. Use the bookmark button on any article to keep it here across sessions.'
                : 'No saved articles match the current filters.'
              : 'No articles match the current filters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {displayList.map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              isSaved={isSaved?.(article.id) ?? false}
              onToggleSave={onToggleSave}
              compared={compareIds.includes(article.id)}
              compareDisabled={atCompareCap && !compareIds.includes(article.id)}
              onToggleCompare={onToggleCompare}
              onViewAnalysis={() => {
                const base = showSaved === 'saved' ? savedFiltered : filteredArticles;
                setSelectedArticle(base.find((a) => a.id === article.id) || article);
              }}
            />
          ))}
        </div>
      )}

      {/* Floating compare bar */}
      {onToggleCompare && compareCount > 0 && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-2.5 rounded-full bg-deep-charcoal text-white shadow-xl border border-white/10">
          <GitCompareArrows className="w-4 h-4 text-transparency-teal" />
          <span className="text-label-sm">
            {compareCount} article{compareCount === 1 ? '' : 's'} selected
            {compareCount < 2 ? ' — pick at least 2 to compare' : ''}
            {compareCount >= MAX_COMPARE ? ` (max ${MAX_COMPARE})` : ''}
          </span>
          {onClearCompare && (
            <button
              onClick={onClearCompare}
              className="text-label-sm text-white/60 hover:text-white transition-colors"
            >
              Clear
            </button>
          )}
          {onOpenCompare && (
            <button
              onClick={onOpenCompare}
              className={`px-3 py-1 rounded-full text-label-sm font-semibold transition-colors ${
                compareCount >= 2
                  ? 'bg-transparency-teal text-white hover:bg-transparency-teal/90'
                  : 'bg-white/20 text-white/70'
              }`}
            >
              Compare →
            </button>
          )}
        </div>
      )}

      <VerificationModal
        isOpen={selectedArticle !== null}
        onClose={() => setSelectedArticle(null)}
        articleId={selectedArticle?.id || ''}
        title={selectedArticle?.title || ''}
        source={selectedArticle?.sourceName || selectedArticle?.source || ''}
        summary={selectedArticle?.excerpt || selectedArticle?.summary || ''}
        sourceCredibility={selectedArticle?.sourceCredibility || 0.5}
        article={selectedArticle}
      />
    </div>
  );
};

interface CardArticle {
  id: string;
  title: string;
  source: string;
  sourceCredibility: number; // 0 to 1
  summary: string;
  publishedAt: Date;
  url: string;
}

function normalizeCard(a: any): CardArticle {
  return {
    id: a.id,
    title: a.title,
    source: a.sourceName || a.source || 'Unknown',
    sourceCredibility: typeof a.sourceCredibility === 'number' ? a.sourceCredibility : 0.5,
    summary: a.excerpt || a.summary || '',
    publishedAt: a.publishedAt ? new Date(a.publishedAt) : new Date(a.timestamp || Date.now()),
    url: a.url || a.link || '#',
  };
}

const ArticleCard = ({
  article,
  isSaved,
  onToggleSave,
  compared,
  compareDisabled,
  onToggleCompare,
  onViewAnalysis,
}: {
  article: CardArticle;
  isSaved?: boolean;
  onToggleSave?: (article: any) => void;
  compared?: boolean;
  compareDisabled?: boolean;
  onToggleCompare?: (id: string) => void;
  onViewAnalysis?: () => void;
}) => {
  const credibilityPercentage = Math.round(article.sourceCredibility * 100);
  const timeAgo = formatTimeAgo(article.publishedAt);

  return (
    <div className="group border-t border-silver-grey py-6 flex flex-col md:flex-row gap-6 items-start">
      <div className="flex-shrink-0">
        <div className="relative w-24 h-24">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" fill="none" r="40" stroke="#E0E0E0" strokeWidth="8" />
            <circle
              className="radial-gauge"
              cx="50"
              cy="50"
              fill="none"
              r="40"
              stroke={getCredibilityColor(article.sourceCredibility)}
              strokeDasharray="251.2"
              strokeDashoffset={calculateDashOffset(article.sourceCredibility)}
              strokeWidth="8"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center font-label-md text-primary">
            {credibilityPercentage}%
          </div>
        </div>
      </div>
      <div className="flex-grow">
        <div className="flex gap-4 mb-2 font-label-sm text-on-surface-variant">
          <span>{article.source}</span>
          <span>•</span>
          <span>{timeAgo}</span>
        </div>
        <h3
          className="font-headline-md text-headline-md mb-3 max-w-2xl group-hover:text-transparency-teal transition-colors hover:underline"
        >
          <a href={article.url} target="_blank" rel="noopener noreferrer" className="underline">
            {article.title}
          </a>
        </h3>
        <p className="font-body-md text-body-md text-on-surface-variant max-w-xl">
          {article.summary}
        </p>
        <div className="flex gap-2 mt-4">
          <span className={`px-3 py-1 bg-surface border border-silver-grey text-label-sm uppercase`}>
            {credibilityPercentage >= 80 ? 'High' : credibilityPercentage >= 50 ? 'Medium' : 'Low'} Credibility
          </span>
          <span className={`px-3 py-1 bg-surface border border-silver-grey text-label-sm uppercase`}>
            Verified
          </span>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          {onViewAnalysis && (
            <button
              onClick={onViewAnalysis}
              className="bg-primary text-on-primary px-4 py-2 rounded hover:bg-primary/90 transition-colors text-sm"
            >
              View Analysis
            </button>
          )}
          {onToggleSave && (
            <button
              onClick={() => onToggleSave(article)}
              className={`px-4 py-2 rounded border text-sm flex items-center gap-1.5 transition-colors ${
                isSaved
                  ? 'bg-transparency-teal/10 border-transparency-teal text-transparency-teal'
                  : 'bg-surface border-silver-grey text-on-surface-variant hover:border-primary hover:text-primary'
              }`}
              title={isSaved ? 'Remove from saved' : 'Save for later'}
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
              {isSaved ? 'Saved' : 'Save'}
            </button>
          )}
          {onToggleCompare && (
            <label
              className={`px-4 py-2 rounded border text-sm flex items-center gap-1.5 cursor-pointer transition-colors ${
                compared
                  ? 'bg-transparency-teal/10 border-transparency-teal text-transparency-teal'
                  : compareDisabled
                  ? 'opacity-40 cursor-not-allowed'
                  : 'bg-surface border-silver-grey text-on-surface-variant hover:border-primary hover:text-primary'
              }`}
              title={
                compareDisabled
                  ? `Comparison limit reached (max ${MAX_COMPARE})`
                  : compared
                  ? 'Remove from comparison'
                  : 'Add to comparison'
              }
            >
              <input
                type="checkbox"
                checked={!!compared}
                disabled={compareDisabled}
                onChange={() => onToggleCompare(article.id)}
                className="accent-transparency-teal"
              />
              Compare
            </label>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper functions
function getCredibilityColor(score: number): string {
  if (score >= 0.8) return '#008080'; // teal
  if (score >= 0.5) return '#F9A825'; // amber
  return '#BA1A1A'; // error red
}

function calculateDashOffset(score: number): number {
  const fullDash = 251.2;
  const offset = fullDash - (score * fullDash);
  return offset;
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  }
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  }
  const days = Math.floor(diffInSeconds / 86400);
  return `${days} ${days === 1 ? 'day' : 'days'} ago`;
}
