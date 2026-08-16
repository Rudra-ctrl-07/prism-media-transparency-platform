import { useState, useEffect } from 'react';
import Globe from 'react-globe.gl';

export const GlobeView = ({
  articles: sharedArticles,
  loading: sharedLoading,
}: {
  articles?: any[];
  loading?: boolean;
} = {}) => {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'points' | 'hexbins'>('points');

  // Filter states (same as MapView)
  const [filters, setFilters] = useState({
    sources: [] as string[],
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      end: new Date()
    },
    minCredibility: 0
  });

  // Fetch articles with filters (skipped when the dashboard shell passes shared articles)
  const fetchArticles = async () => {
    if (sharedArticles) return;
    try {
      setLoading(true);
      setError(null);

      // Build query parameters from filters
      const params = new URLSearchParams();

      if (filters.sources.length > 0) {
        filters.sources.forEach(source => {
          params.append('source', source);
        });
      }

      params.append('startDate', filters.dateRange.start.toISOString());
      params.append('endDate', filters.dateRange.end.toISOString());
      params.append('minCredibility', filters.minCredibility.toString());
      params.append('limit', '1000'); // Get more articles for globe

      const response = await fetch(`/api/articles?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: any[] = await response.json();
      setArticles(data);
    } catch (err) {
      console.error('Error fetching articles:', err);
      setError('Failed to load globe data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, [filters, sharedArticles]);

  // Helper function to convert credibility score to hex color
  const getCredibilityColorHex = (score: number): string => {
    if (score >= 0.8) return '#008080'; // teal
    if (score >= 0.5) return '#F9A825'; // amber
    return '#BA1A1A'; // error red
  };

  // Color a hexbin by the average credibility of its member articles
  const hexBinColor = (hex: any): string => {
    const pts: any[] = hex?.points || [];
    if (pts.length === 0) return '#555555';
    const avg =
      pts.reduce((s, p) => s + (p.article?.sourceCredibility ?? p.sourceCredibility ?? 0.5), 0) /
      pts.length;
    return getCredibilityColorHex(avg);
  };

  // Apply the filter controls to whatever source is active (shared or self-fetched)
  const displayArticles = (sharedArticles || articles).filter((article: any) => {
    const source = article.sourceName || article.source || '';
    if (filters.sources.length > 0 && !filters.sources.includes(source)) return false;
    const published = new Date(article.timestamp || article.publishedAt || Date.now());
    if (published < filters.dateRange.start || published > filters.dateRange.end) return false;
    const cred = typeof article.sourceCredibility === 'number' ? article.sourceCredibility : 0.5;
    if (cred < filters.minCredibility) return false;
    return true;
  });

  // Filter articles with valid coordinates and map to globe points
  const pointsData = displayArticles
    .filter(article =>
      article.latitude !== undefined &&
      article.longitude !== undefined &&
      article.latitude !== null &&
      article.longitude !== null &&
      !isNaN(article.latitude) &&
      !isNaN(article.longitude)
    )
    .map(article => ({
      lat: Number(article.latitude),
      lng: Number(article.longitude),
      color: getCredibilityColorHex(article.sourceCredibility || 0.5),
      size: 0.08,
      altitude: 0.12,
      name: article.title ? (article.title.length > 50 ? article.title.substring(0, 50) + '...' : article.title) : 'Article',
      article
    }));

  const showLoading = sharedArticles ? !!sharedLoading : loading;

  if (showLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex space-x-4">
          <div className="inline-block animate-spin rounded-full border-4 border-primary/20 border-t-primary w-12 h-12"></div>
          <div className="space-y-1">
            <p className="text-label-sm text-on-surface-variant">Loading globe data...</p>
            <p className="text-body-xs text-on-surface-variant/60">
              Applying filters: {filters.sources.length > 0 ? `${filters.sources.length} sources` : 'All sources'},
              {` ${Math.floor((filters.dateRange.end.getTime() - filters.dateRange.start.getTime()) / (1000 * 60 * 60 * 24))} days`},
              {` min credibility: ${(filters.minCredibility * 100).toFixed(0)}%`}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-center">
        <div>
          <p className="text-label-sm text-on-surface-variant mb-4">{error}</p>
          <button
            onClick={() => fetchArticles()}
            className="bg-primary text-on-primary px-4 py-2 rounded hover:bg-primary/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative">
      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-surface/50 backdrop-blur-sm border-b border-silver-grey z-10">
        {/* View mode toggle */}
        <div className="flex items-center gap-1 bg-surface-container-lowest border border-silver-grey rounded-lg p-0.5">
          {(['points', 'hexbins'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 rounded-md text-label-sm font-medium capitalize transition-colors ${
                viewMode === mode
                  ? 'bg-primary text-on-primary'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              {mode === 'points' ? 'Points' : 'Clusters'}
            </button>
          ))}
        </div>

        {/* Source Filter */}
        <div className="flex-1 sm:flex-1 min-w-[200px]">
          <label className="block text-label-sm font-medium mb-1 text-on-surface-variant">
            News Sources
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Reuters World', value: 'Reuters World' },
              { label: 'Associated Press', value: 'Associated Press' },
              { label: 'BBC News', value: 'BBC News' },
              { label: 'NPR News', value: 'NPR News' }
            ].map((source) => (
              <label key={source.value} className="flex items-center gap-1 text-body-xs">
                <input
                  type="checkbox"
                  checked={filters.sources.includes(source.value)}
                  onChange={(e) => {
                    const newSources = e.target.checked
                      ? [...filters.sources, source.value]
                      : filters.sources.filter(s => s !== source.value);
                    setFilters(prev => ({ ...prev, sources: newSources }));
                  }}
                />
                <span>{source.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="flex-1 sm:flex-1 min-w-[200px]">
          <label className="block text-label-sm font-medium mb-1 text-on-surface-variant">
            Date Range
          </label>
          <div className="flex gap-2">
            <input
              type="date"
              value={filters.dateRange.start.toISOString().split('T')[0]}
              onChange={(e) => {
                const date = new Date(e.target.value);
                setFilters(prev => ({
                  ...prev,
                  dateRange: {
                    ...prev.dateRange,
                    start: date
                  }
                }));
              }}
              className="border border-on-surface-variant/20 rounded px-2 py-1 text-sm bg-surface text-on-surface"
            />
            <span className="text-body-xs text-on-surface-variant">to</span>
            <input
              type="date"
              value={filters.dateRange.end.toISOString().split('T')[0]}
              onChange={(e) => {
                const date = new Date(e.target.value);
                setFilters(prev => ({
                  ...prev,
                  dateRange: {
                    ...prev.dateRange,
                    end: date
                  }
                }));
              }}
              className="border border-on-surface-variant/20 rounded px-2 py-1 text-sm bg-surface text-on-surface"
            />
          </div>
        </div>

        {/* Credibility Filter */}
        <div className="flex-1 sm:flex-1 min-w-[120px]">
          <label className="block text-label-sm font-medium mb-1 text-on-surface-variant">
            Min Credibility
          </label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={filters.minCredibility}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                setFilters(prev => ({ ...prev, minCredibility: value }));
              }}
              className="w-full"
            />
            <div className="text-center text-body-xs">
              <span>{(filters.minCredibility * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>

        {/* Reset Button */}
        <div className="flex-1 sm:flex-1">
          <button
            onClick={() => {
              setFilters({
                sources: [],
                dateRange: {
                  start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                  end: new Date()
                },
                minCredibility: 0
              });
            }}
            className="w-full bg-primary text-on-primary px-3 py-2 rounded hover:bg-primary/90 transition-colors text-xs"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Globe Container */}
      <div className="flex-1 w-full h-full bg-black">
        {displayArticles.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center">
            <p className="text-label-sm text-on-surface-variant">
              No articles match the current filters.
            </p>
          </div>
        ) : (
          <Globe
            backgroundColor="#000000"
            pointsData={viewMode === 'points' ? pointsData : undefined}
            pointLat="lat"
            pointLng="lng"
            pointColor="color"
            pointRadius={0.08}
            pointAltitude={0.12}
            pointLabel={(d: any) => d.name}
            onPointClick={(d: any) => console.log('Clicked article:', d)}
            hexBinPointsData={viewMode === 'hexbins' ? pointsData : undefined}
            hexBinPointLat="lat"
            hexBinPointLng="lng"
            hexBinResolution={4}
            hexMargin={0.3}
            hexTopColor={(hex: any) => hexBinColor(hex)}
            hexSideColor={(hex: any) => hexBinColor(hex)}
            hexAltitude={(hex: any) =>
              0.05 + Math.min(0.7, (hex.points?.length || 0) * 0.12)
            }
            hexLabel={(hex: any) =>
              `${hex.points?.length || 0} article${(hex.points?.length || 0) === 1 ? '' : 's'} here`
            }
            onHexClick={(hex: any) =>
              console.log('Clicked cluster:', hex.points?.length, 'articles')
            }
          />
        )}
      </div>

      {/* Article count indicator */}
      <div className="absolute top-20 left-4 flex items-center gap-2 px-3 py-1 bg-primary/90 backdrop-blur-sm rounded-md text-on-primary z-10">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-primary rounded-full mr-1"></div>
          <span className="text-xs font-medium">{displayArticles.length}</span>
        </div>
        <span className="text-xs">articles</span>
      </div>

      {/* Credibility legend */}
      <div className="absolute bottom-4 right-4 z-10 bg-black/70 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-2 space-y-1 text-white">
        <p className="text-label-sm font-semibold">Credibility</p>
        {[
          { color: '#008080', label: 'High (≥80%)' },
          { color: '#F9A825', label: 'Medium (50–79%)' },
          { color: '#BA1A1A', label: 'Low (<50%)' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2 text-label-sm text-white/80">
            <span
              className="w-3 h-3 rounded-full border border-white/30"
              style={{ backgroundColor: item.color }}
            />
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
};
