/**
 * MapView — MapLibre GL (WebGL) with dark basemap tiles.
 *
 * Uses CartoDB Dark Matter raster tiles rendered via MapLibre GL WebGL.
 * All overlays, markers, clusters, and popups are rendered via WebGL.
 *
 * - Each article is a circle marker colored by its credibility score.
 * - When zoomed out, nearby articles are merged into a numbered cluster.
 * - A legend explains the credibility color scale.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

// ---------------------------------------------------------------------------
// Dark basemap style (MapLibre GL + CartoDB Dark Matter raster tiles)
// ---------------------------------------------------------------------------

function buildDarkStyle(): maplibregl.StyleSpecification {
  return {
    version: 8,
    sources: {
      'carto-dark': {
        type: 'raster',
        tiles: [
          'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
          'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
          'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        ],
        tileSize: 256,
        attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://osm.org/copyright">OSM</a>',
        maxzoom: 19,
      },
    },
    layers: [
      {
        id: 'carto-dark-layer',
        type: 'raster',
        source: 'carto-dark',
        minzoom: 0,
        maxzoom: 22,
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const MapView = ({
  articles: sharedArticles,
  loading: sharedLoading,
  hoveredSource,
  onHoverSource,
  hoveredArticleId,
}: {
  articles?: any[];
  loading?: boolean;
  hoveredSource?: string | null;
  onHoverSource?: (source: string | null) => void;
  hoveredArticleId?: string | null;
} = {}) => {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  // Fetch articles (skipped when the dashboard shell passes shared articles)
  useEffect(() => {
    if (sharedArticles) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/articles?limit=500');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) setArticles(Array.isArray(data) ? data : data.articles || []);
      } catch (err) {
        if (!cancelled) {
          console.error('Map fetch failed:', err);
          setError('Failed to load map data.');
          setArticles([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [sharedArticles]);

  const displayArticles = (sharedArticles || articles).filter(
    (a: any) =>
      typeof a.latitude === 'number' &&
      typeof a.longitude === 'number' &&
      !isNaN(a.latitude) &&
      !isNaN(a.longitude),
  );

  // Store marker elements for cleanup
  const markersRef = useRef<maplibregl.Marker[]>([]);

  // Build clusters (lightweight grid clustering)
  const buildClusters = useCallback((arts: any[], zoom: number) => {
    if (arts.length === 0) return [];
    if (zoom >= 9) {
      return arts.map((a) => ({
        lat: a.latitude,
        lng: a.longitude,
        count: 1,
        color: getCredibilityColorHex(a.sourceCredibility || 0.5),
        articles: [a],
      }));
    }
    const cellSize = 90 / Math.pow(2, zoom);
    const cells = new Map<string, any[]>();
    for (const a of arts) {
      const key = `${Math.floor(a.latitude / cellSize)},${Math.floor(a.longitude / cellSize)}`;
      const list = cells.get(key) || [];
      list.push(a);
      cells.set(key, list);
    }
    return Array.from(cells.values()).map((list) => {
      const lat = list.reduce((s: number, a: any) => s + a.latitude, 0) / list.length;
      const lng = list.reduce((s: number, a: any) => s + a.longitude, 0) / list.length;
      const avgCred =
        list.reduce((s: number, a: any) => s + (a.sourceCredibility || 0.5), 0) / list.length;
      return { lat, lng, count: list.length, color: getCredibilityColorHex(avgCred), articles: list };
    });
  }, []);

  // Initialize MapLibre map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: buildDarkStyle(),
      center: [0, 20],
      zoom: 2,
      attributionControl: false,
    });

    // Attribution: bottom-right
    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      'bottom-right',
    );

    // Zoom control: bottom-right
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), 'bottom-right');

    mapRef.current = map;

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Render markers when articles or hover state changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const renderMarkers = () => {
      if (!map.isStyleLoaded()) return;

      // Clear existing markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      const zoom = map.getZoom();
      const clusters = buildClusters(displayArticles, zoom);

      const hasSourceHover = !!hoveredSource;
      const hasArticleHover = !!hoveredArticleId;
      const hasAnyHover = hasSourceHover || hasArticleHover;

      clusters.forEach((c) => {
        const clusterHasHoveredSource = hasSourceHover && c.articles.some((a: any) => a.sourceName === hoveredSource);
        const clusterHasHoveredArticle = hasArticleHover && c.articles.some((a: any) => a.id === hoveredArticleId);
        const isHighlighted = hasSourceHover
          ? clusterHasHoveredSource
          : hasArticleHover
            ? clusterHasHoveredArticle
            : false;
        const markerOpacity = hasAnyHover ? (isHighlighted ? 1.0 : 0.15) : 0.75;

        if (c.count === 1) {
          const a = c.articles[0];
          const el = document.createElement('div');
          const size = hasAnyHover && isHighlighted ? 22 : 16;
          el.style.cssText = `
            width:${size}px;height:${size}px;border-radius:50%;
            background:${c.color};border:2px solid ${hasAnyHover && isHighlighted ? '#ff4fd8' : '#fff'};
            opacity:${markerOpacity};
            box-shadow:0 1px 4px rgba(0,0,0,.4);
            cursor:pointer;transition:all .15s;
          `;
          el.title = `${a.title || ''} (${Math.round((a.sourceCredibility || 0.5) * 100)}%)`;

          const popup = new maplibregl.Popup({ offset: 15, closeButton: false }).setHTML(
            `<div style="font-size:11px;max-width:260px">` +
              `<strong>${escapeHtml(a.title || '')}</strong><br/>` +
              `<small style="color:#888">${escapeHtml(a.sourceName || a.source || '')} • ` +
              `${Math.round((a.sourceCredibility || 0.5) * 100)}% credibility</small>` +
              (a.url
                ? `<br/><a href="${escapeHtml(a.url)}" target="_blank" rel="noopener noreferrer" style="color:#3b82f6">Read original →</a>`
                : '') +
              `</div>`,
          );

          const marker = new maplibregl.Marker({ element: el })
            .setLngLat([c.lng, c.lat])
            .setPopup(popup)
            .addTo(map);

          el.addEventListener('mouseenter', () => onHoverSource?.(a.sourceName || null));
          el.addEventListener('mouseleave', () => onHoverSource?.(null));

          markersRef.current.push(marker);
        } else {
          const bgColor = hasAnyHover && isHighlighted ? '#ff4fd8' : c.color;
          const borderColor = hasAnyHover && isHighlighted ? '#ff4fd8' : '#fff';
          const shadowColor = hasAnyHover && isHighlighted ? 'rgba(255,79,216,.5)' : 'rgba(0,0,0,.35)';
          const scale = hasAnyHover && isHighlighted ? 1.15 : 1;

          const el = document.createElement('div');
          el.style.cssText = `
            width:42px;height:42px;border-radius:50%;
            display:flex;align-items:center;justify-content:center;
            background:${bgColor};color:#fff;font-weight:700;font-size:14px;
            border:2px solid ${borderColor};
            box-shadow:0 2px 6px ${shadowColor};
            opacity:${markerOpacity};
            transform:scale(${scale});
            cursor:pointer;transition:all .15s;
          `;
          el.textContent = String(c.count);

          const avgCred = Math.round(
            c.articles.reduce((s: number, a: any) => s + (a.sourceCredibility || 0.5), 0) /
              c.articles.length * 100,
          );
          const list = c.articles
            .map(
              (a: any) =>
                `• ${escapeHtml(a.title || '')} <small>(${Math.round((a.sourceCredibility || 0.5) * 100)}%)</small>`,
            )
            .join('<br/>');

          const popup = new maplibregl.Popup({ offset: 15, closeButton: false }).setHTML(
            `<div style="font-size:11px;max-width:260px">` +
              `<strong>${c.count} articles nearby</strong><br/>` +
              `<small>Avg credibility: ${avgCred}%</small><br/><br/>${list}</div>`,
          );

          const marker = new maplibregl.Marker({ element: el })
            .setLngLat([c.lng, c.lat])
            .setPopup(popup)
            .addTo(map);

          el.addEventListener('mouseenter', () => onHoverSource?.(dominantSource(c.articles)));
          el.addEventListener('mouseleave', () => onHoverSource?.(null));

          markersRef.current.push(marker);
        }
      });
    };

    // Wait for style to load
    if (map.isStyleLoaded()) {
      renderMarkers();
    } else {
      map.on('load', renderMarkers);
      return () => { map.off('load', renderMarkers); };
    }
  }, [displayArticles, hoveredSource, hoveredArticleId, buildClusters, onHoverSource]);

  const showLoading = sharedArticles ? !!sharedLoading : loading;

  if (showLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full border-4 border-primary/20 border-t-primary w-12 h-12"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-on-surface-variant">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      {/* Credibility legend — white card, black rule, hard shadow */}
      <div className="absolute bottom-8 right-4 z-[1000] bg-white border-2 border-arcade-ink shadow-brutal px-3 py-2 space-y-1">
        <p className="text-label-sm font-bold text-arcade-ink">Credibility</p>
        {[
          { color: '#22c55e', label: 'High (≥80%)' },
          { color: '#ffe600', label: 'Medium (50–79%)' },
          { color: '#ef4444', label: 'Low (<50%)' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2 text-label-sm font-semibold text-arcade-ink">
            <span
              className="w-3 h-3 border-2 border-arcade-ink"
              style={{ backgroundColor: item.color }}
            />
            {item.label}
          </div>
        ))}
        <p className="pt-1 border-t-2 border-arcade-ink text-label-sm font-semibold text-arcade-ink/60">
          Numbers = clustered articles — zoom in to split
        </p>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCredibilityColorHex(score: number): string {
  if (score >= 0.8) return '#22c55e';
  if (score >= 0.5) return '#ffe600';
  return '#ef4444';
}

function dominantSource(articles: any[]): string {
  const freq = new Map<string, number>();
  for (const a of articles) {
    const name = a.sourceName || a.source || '';
    freq.set(name, (freq.get(name) || 0) + 1);
  }
  let best = '';
  let bestCount = 0;
  for (const [name, count] of freq) {
    if (count > bestCount) {
      best = name;
      bestCount = count;
    }
  }
  return best;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default MapView;
