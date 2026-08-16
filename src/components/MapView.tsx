/**
 * MapView — Leaflet map with credibility-colored markers and lightweight
 * grid clustering (no external cluster plugin needed).
 *
 * - Each article is a circle marker colored by its credibility score
 *   (teal = high, amber = medium, red = low).
 * - When zoomed out, nearby articles are merged into a numbered cluster
 *   circle; zooming in splits clusters until individual articles appear.
 * - A legend explains the credibility color scale.
 */

import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export const MapView = ({
  articles: sharedArticles,
  loading: sharedLoading,
}: {
  articles?: any[];
  loading?: boolean;
} = {}) => {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement | null>(null);

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
    return () => {
      cancelled = true;
    };
  }, [sharedArticles]);

  const displayArticles = (sharedArticles || articles).filter(
    (a: any) =>
      typeof a.latitude === 'number' &&
      typeof a.longitude === 'number' &&
      !isNaN(a.latitude) &&
      !isNaN(a.longitude),
  );

  // Initialize map + cluster layer
  useEffect(() => {
    if (!mapRef.current) return;
    const map = L.map(mapRef.current, { center: [20, 0], zoom: 2 });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);

    // Rebuild markers from the current zoom level's clustering.
    const render = () => {
      layerGroup.clearLayers();
      const zoom = map.getZoom();
      const clusters = buildClusters(displayArticles, zoom);

      clusters.forEach((c) => {
        if (c.count === 1) {
          const marker = L.circleMarker([c.lat, c.lng], {
            radius: 8,
            stroke: true,
            weight: 2,
            color: '#ffffff',
            fillColor: c.color,
            fillOpacity: 0.75,
          });
          const a = c.articles[0];
          marker.bindPopup(
            `<div><strong>${escapeHtml(a.title || '')}</strong><br/>` +
              `<small>${escapeHtml(a.sourceName || a.source || '')} • ` +
              `${Math.round((a.sourceCredibility || 0.5) * 100)}% credibility</small>` +
              (a.url ? `<br/><a href="${escapeHtml(a.url)}" target="_blank" rel="noopener noreferrer">Read original →</a>` : '') +
              `</div>`,
          );
          layerGroup.addLayer(marker);
        } else {
          const icon = L.divIcon({
            className: '',
            html: `<div style="width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:${c.color};color:#fff;font-weight:700;font-size:14px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)">${c.count}</div>`,
            iconSize: [42, 42],
            iconAnchor: [21, 21],
          });
          const marker = L.marker([c.lat, c.lng], { icon });
          const avgCred = Math.round(
            c.articles.reduce((s, a) => s + (a.sourceCredibility || 0.5), 0) /
              c.articles.length *
              100,
          );
          const list = c.articles
            .map(
              (a) =>
                `• ${escapeHtml(a.title || '')} <small>(${Math.round(
                  (a.sourceCredibility || 0.5) * 100,
                )}%)</small>`,
            )
            .join('<br/>');
          marker.bindPopup(
            `<div><strong>${c.count} articles nearby</strong><br/>` +
              `<small>Avg credibility: ${avgCred}%</small><br/><br/>${list}</div>`,
          );
          layerGroup.addLayer(marker);
        }
      });
    };

    render();
    map.on('zoomend', render);

    return () => {
      map.remove();
    };
  }, [displayArticles]);

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
      <div ref={mapRef} className="h-full w-full" />
      {/* Credibility legend — white card, black rule, hard shadow */}
      <div className="absolute bottom-4 right-4 z-[1000] bg-white border-2 border-arcade-ink shadow-brutal px-3 py-2 space-y-1">
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
// Lightweight grid clustering
// ---------------------------------------------------------------------------

interface Cluster {
  lat: number;
  lng: number;
  count: number;
  color: string;
  articles: any[];
}

function getCredibilityColorHex(score: number): string {
  if (score >= 0.8) return '#22c55e'; // arcade green
  if (score >= 0.5) return '#ffe600'; // arcade yellow
  return '#ef4444'; // red
}

/**
 * Group articles into grid cells whose size shrinks as zoom increases.
 * Above zoom 9 every article gets its own marker.
 */
function buildClusters(articles: any[], zoom: number): Cluster[] {
  if (articles.length === 0) return [];
  if (zoom >= 9) {
    return articles.map((a) => ({
      lat: a.latitude,
      lng: a.longitude,
      count: 1,
      color: getCredibilityColorHex(a.sourceCredibility || 0.5),
      articles: [a],
    }));
  }

  const cellSize = 90 / Math.pow(2, zoom); // degrees per cell
  const cells = new Map<string, any[]>();

  for (const a of articles) {
    const key = `${Math.floor(a.latitude / cellSize)},${Math.floor(a.longitude / cellSize)}`;
    const list = cells.get(key) || [];
    list.push(a);
    cells.set(key, list);
  }

  return Array.from(cells.values()).map((list) => {
    const lat = list.reduce((s, a) => s + a.latitude, 0) / list.length;
    const lng = list.reduce((s, a) => s + a.longitude, 0) / list.length;
    const avgCred =
      list.reduce((s, a) => s + (a.sourceCredibility || 0.5), 0) / list.length;
    return { lat, lng, count: list.length, color: getCredibilityColorHex(avgCred), articles: list };
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default MapView;
