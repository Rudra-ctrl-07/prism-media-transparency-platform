/**
 * StoryTrackerView — groups articles into stories and shows how many outlets
 * corroborate each one. Backed by `services/storyClustering`, which links
 * articles sharing significant topic keywords and returns story metadata
 * (sources, credibility range, latest update). Derives live from the shared
 * dashboard article list, so it refreshes with the feed.
 */

import { useMemo, useState } from 'react';
import { Newspaper, Users, ShieldCheck, ChevronDown, ExternalLink, Clock } from 'lucide-react';
import { Article } from '../types';
import { clusterStories, StoryCluster } from '../services/storyClustering';
import { VerificationModal } from './VerificationModal';

interface StoryTrackerViewProps {
  articles: Article[];
  loading?: boolean;
  live?: boolean;
}

type SortKey = 'corroboration' | 'recent';

export const StoryTrackerView = ({ articles, loading, live }: StoryTrackerViewProps) => {
  const [sortBy, setSortBy] = useState<SortKey>('corroboration');
  const [showSolo, setShowSolo] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  const clusters = useMemo(() => clusterStories(articles), [articles]);

  const sorted = useMemo(() => {
    const list = [...clusters];
    if (sortBy === 'corroboration') {
      list.sort(
        (a, b) =>
          b.sourceCount - a.sourceCount ||
          b.articleCount - a.articleCount ||
          new Date(b.latestTimestamp).getTime() - new Date(a.latestTimestamp).getTime(),
      );
    } else {
      list.sort(
        (a, b) => new Date(b.latestTimestamp).getTime() - new Date(a.latestTimestamp).getTime(),
      );
    }
    return list;
  }, [clusters, sortBy]);

  const stories = sorted.filter((c) => c.articleCount > 1);
  const solos = sorted.filter((c) => c.articleCount === 1);
  const corroborated = stories.filter((c) => c.sourceCount >= 2).length;

  if (loading && articles.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full border-4 border-primary/20 border-t-primary w-12 h-12"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="text-label-sm font-label-sm uppercase tracking-widest text-on-surface-variant">
            {live ? 'Live' : 'Feed'} Story Tracking
          </span>
          <h2 className="font-headline-lg text-headline-lg mb-0">Story Tracker</h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2.5 py-1 rounded-full border border-silver-grey text-label-sm text-on-surface-variant">
            {stories.length} stories
          </span>
          <span className="px-2.5 py-1 rounded-full border border-silver-grey text-label-sm text-on-surface-variant">
            {articles.length} articles
          </span>
          <span className="px-2.5 py-1 rounded-full border border-transparency-teal/40 bg-transparency-teal/5 text-label-sm text-transparency-teal">
            {corroborated} corroborated by 2+ sources
          </span>
          <label className="flex items-center gap-2 text-label-sm text-on-surface-variant">
            Sort
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="border border-silver-grey rounded px-2 py-1 text-label-sm bg-surface text-on-surface"
            >
              <option value="corroboration">Most corroborated</option>
              <option value="recent">Most recent</option>
            </select>
          </label>
        </div>
      </div>

      {stories.length === 0 ? (
        <div className="text-center py-16 border border-silver-grey rounded-lg bg-surface-container-lowest">
          <Newspaper className="w-8 h-8 mx-auto mb-2 text-on-surface-variant/40" />
          <p className="text-body-md text-on-surface-variant">
            No corroborated stories yet. As outlets cover the same topics, they&rsquo;ll appear here
            grouped with corroboration counts.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {stories.map((story) => (
            <StoryCard
              key={story.id}
              story={story}
              onViewArticle={(a) => setSelectedArticle(a)}
            />
          ))}
        </div>
      )}

      {/* Solo coverage */}
      {solos.length > 0 && (
        <div className="border border-silver-grey rounded-lg bg-surface-container-lowest overflow-hidden">
          <button
            onClick={() => setShowSolo((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-surface-container-low transition-colors"
          >
            <span className="text-label-sm font-semibold text-on-surface uppercase tracking-wider">
              Solo coverage ({solos.length} articles — single source)
            </span>
            <ChevronDown
              className={`w-4 h-4 text-on-surface-variant transition-transform ${
                showSolo ? 'rotate-180' : ''
              }`}
            />
          </button>
          {showSolo && (
            <ul className="divide-y divide-silver-grey/60 border-t border-silver-grey">
              {solos.map((story) => {
                const a = story.articles[0];
                return (
                  <li key={a.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                    <button
                      onClick={() => setSelectedArticle(a)}
                      className="text-body-sm text-on-surface hover:text-transparency-teal transition-colors text-left"
                    >
                      {a.title}
                    </button>
                    <span className="text-label-sm text-on-surface-variant whitespace-nowrap">
                      {a.sourceName} • {formatTimeAgo(new Date(a.timestamp))}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      <VerificationModal
        isOpen={selectedArticle !== null}
        onClose={() => setSelectedArticle(null)}
        articleId={selectedArticle?.id || ''}
        title={selectedArticle?.title || ''}
        source={selectedArticle?.sourceName || ''}
        summary={selectedArticle?.excerpt || ''}
        sourceCredibility={selectedArticle?.sourceCredibility || 0.5}
        article={selectedArticle}
      />
    </div>
  );
};

const StoryCard = ({
  story,
  onViewArticle,
}: {
  story: StoryCluster;
  onViewArticle: (a: Article) => void;
}) => {
  const latest = new Date(story.latestTimestamp);
  const head = story.articles[0];

  return (
    <div className="border border-silver-grey rounded-lg bg-surface-container-lowest p-5 space-y-4">
      {/* Corroboration row */}
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-label-sm font-semibold ${
            story.sourceCount >= 3
              ? 'bg-transparency-teal/10 text-transparency-teal border border-transparency-teal/40'
              : story.sourceCount === 2
              ? 'bg-amber-500/10 text-amber-700 border border-amber-500/40'
              : 'bg-surface border border-silver-grey text-on-surface-variant'
          }`}
          title={`${story.sourceCount} distinct outlet${story.sourceCount === 1 ? '' : 's'} covering this story`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          {story.sourceCount} source{story.sourceCount === 1 ? '' : 's'}
        </span>
        {/* Source dots */}
        <span className="flex items-center gap-1" title={story.sources.join(', ')}>
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={`w-2 h-2 rounded-full ${
                i < story.sourceCount ? 'bg-transparency-teal' : 'bg-silver-grey'
              }`}
            />
          ))}
        </span>
        <span className="text-label-sm text-on-surface-variant">
          {story.articleCount} article{story.articleCount === 1 ? '' : 's'} •{' '}
          {Math.round(story.minCredibility * 100)}–{Math.round(story.maxCredibility * 100)}%
          credibility
        </span>
        <span className="ml-auto flex items-center gap-1 text-label-sm text-on-surface-variant/70">
          <Clock className="w-3.5 h-3.5" />
          latest {formatTimeAgo(latest)}
        </span>
      </div>

      {/* Headline */}
      <div>
        <h3 className="font-headline-md text-headline-md mb-1.5">
          <a
            href={head.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-transparency-teal transition-colors"
          >
            {head.title}
          </a>
        </h3>
        {story.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {story.keywords.map((k) => (
              <span
                key={k}
                className="px-2 py-0.5 rounded-full bg-surface border border-silver-grey text-label-sm text-on-surface-variant"
              >
                {k}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Member articles */}
      <ul className="space-y-1.5">
        {story.articles.map((a) => (
          <li
            key={a.id}
            className="flex items-center gap-3 px-3 py-2 rounded-lg border border-silver-grey/70 bg-surface hover:bg-surface-container-low transition-colors"
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                a.sourceCredibility >= 0.8
                  ? 'bg-transparency-teal'
                  : a.sourceCredibility >= 0.5
                  ? 'bg-amber-500'
                  : 'bg-error'
              }`}
              title={`${Math.round(a.sourceCredibility * 100)}% credibility`}
            />
            <button
              onClick={() => onViewArticle(a)}
              className="flex-1 min-w-0 text-left text-body-sm text-on-surface hover:text-transparency-teal transition-colors truncate"
              title="View verification analysis"
            >
              {a.title}
            </button>
            <span className="text-label-sm text-on-surface-variant whitespace-nowrap hidden sm:inline">
              {a.sourceName}
            </span>
            <span className="text-label-sm text-on-surface-variant/70 whitespace-nowrap hidden md:inline">
              {Math.round(a.sourceCredibility * 100)}%
            </span>
            <span className="text-label-sm text-on-surface-variant/70 whitespace-nowrap hidden md:inline">
              {formatTimeAgo(new Date(a.timestamp))}
            </span>
            <a
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-on-surface-variant hover:text-primary shrink-0"
              title="Open original article"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </li>
        ))}
      </ul>
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

export default StoryTrackerView;
