/**
 * IntelMapView — the interactive Global Situation Map.
 *
 * - 2D / 3D projection toggle (Leaflet ↔ react-globe.gl)
 * - Time-range filter (1h / 6h / 24h / 48h / 7d / All-time)
 * - 40+ toggleable intel layers across five categories, rendered as
 *   severity-scaled markers colored by category (lines for pipelines and
 *   trade routes). Live layers (NWS weather, USGS quakes) fetch on demand.
 */

import { useEffect, useMemo, useState } from 'react';
import Globe from 'react-globe.gl';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ChevronDown, Layers, Map as MapIcon, Globe2, Radio } from 'lucide-react';
import {
  INTEL_LAYERS,
  getLayerPoints,
  refreshLiveLayer,
  inTimeRange,
  TIME_RANGES,
  TimeRange,
  CATEGORY_COLORS,
  categoryLabel,
} from '../services/intelLayers';
import { IntelPoint, IntelLine, intelCategories, IntelCategoryId } from '../data/intelData';
import { useLocalStorageState } from '../utils/storage';

const DEFAULT_LAYERS = [
  'conflict-zones',
  'weather-alerts',
  'natural-events',
  'maritime-chokepoints',
  'sanctions',
  'nuclear-sites',
  'undersea-cables',
];

export const IntelMapView = () => {
  const [projection, setProjection] = useState<'2d' | '3d'>('2d');
  const [timeRange, setTimeRange] = useLocalStorageState<TimeRange>('prism:intel-time-range', '7d');
  const [enabled, setEnabled] = useLocalStorageState<string[]>('prism:intel-layers', DEFAULT_LAYERS);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ security: true });
  const [points, setPoints] = useState<Map<string, IntelPoint[]>>(new Map());
  const [loadingLayers, setLoadingLayers] = useState(false);
  const [liveTick, setLiveTick] = useState(0);

  const enabledSet = useMemo(() => new Set(enabled), [enabled]);

  // Auto-refresh live layers (ADS-B) every 60s while enabled.
  useEffect(() => {
    if (!enabledSet.has('aircraft-adsb')) return;
    const timer = setInterval(() => setLiveTick((v) => v + 1), 60_000);
    return () => clearInterval(timer);
  }, [enabledSet]);

  // Load (and refresh) points for every enabled layer.
  useEffect(() => {
    let cancelled = false;
    setLoadingLayers(true);
    (async () => {
      const next = new Map<string, IntelPoint[]>();
      await Promise.all(
        INTEL_LAYERS.filter((l) => enabledSet.has(l.id)).map(async (layer) => {
          try {
            if (layer.live && liveTick > 0) {
              next.set(layer.id, await refreshLiveLayer(layer.id));
            } else {
              next.set(layer.id, await getLayerPoints(layer));
            }
          } catch {
            next.set(layer.id, layer.points || []);
          }
        }),
      );
      if (!cancelled) setPoints(next);
      if (!cancelled) setLoadingLayers(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [JSON.stringify([...enabledSet].sort()), liveTick]);

  const aircraftCount = useMemo(
    () => (points.get('aircraft-adsb') || []).filter((p) => inTimeRange(p, timeRange)).length,
    [points, timeRange],
  );

  const toggleLayer = (id: string) => {
    setEnabled((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleCategory = (cat: IntelCategoryId, force?: boolean) => {
    const layerIds = INTEL_LAYERS.filter((l) => l.category === cat).map((l) => l.id);
    const allOn = layerIds.every((id) => enabledSet.has(id));
    const turnOn = force ?? !allOn;
    setEnabled((prev) => {
      const base = prev.filter((id) => !layerIds.includes(id));
      return turnOn ? [...base, ...layerIds] : base;
    });
  };

  const visibleCount = useMemo(() => {
    let n = 0;
    for (const [id, pts] of points) {
      if (!enabledSet.has(id)) continue;
      n += pts.filter((p) => inTimeRange(p, timeRange)).length;
    }
    return n;
  }, [points, enabledSet, timeRange]);

  const enabledCount = enabled.length;

  return (
    <div className="flex flex-col h-full min-h-0 relative">
      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex flex-wrap items-center gap-3 px-4 py-2.5 border-b border-silver-grey bg-surface/80 backdrop-blur-sm z-20">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-transparency-teal" />
          <h2 className="font-headline-md text-[15px] font-semibold text-on-surface">
            Global Situation Map
          </h2>
          <span className="text-[11px] text-on-surface-variant">
            {enabledCount} layers • {visibleCount} signals
            {enabledSet.has('aircraft-adsb') && (
              <span className="text-transparency-teal font-semibold">
                {' '}• ADS-B {aircraftCount > 0 ? `${aircraftCount} aircraft` : 'connecting…'}
              </span>
            )}
            {loadingLayers ? ' • loading…' : ''}
          </span>
        </div>

        {/* Time range */}
        <div className="flex items-center gap-1 bg-surface-container-lowest border border-silver-grey rounded-lg p-0.5">
          {TIME_RANGES.map((r) => (
            <button
              key={r.id}
              onClick={() => setTimeRange(r.id)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                timeRange === r.id
                  ? 'bg-primary text-on-primary'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* 2D/3D toggle */}
        <div className="flex items-center gap-1 bg-surface-container-lowest border border-silver-grey rounded-lg p-0.5 ml-auto">
          <button
            onClick={() => setProjection('2d')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
              projection === '2d' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" /> 2D
          </button>
          <button
            onClick={() => setProjection('3d')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
              projection === '3d' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            <Globe2 className="w-3.5 h-3.5" /> 3D
          </button>
        </div>
      </div>

      {/* ── Map area ────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 relative">
        {projection === '2d' ? (
          <IntelMap2D
            points={points}
            enabled={enabledSet}
            timeRange={timeRange}
            showLoading={loadingLayers}
          />
        ) : (
          <IntelMap3D points={points} enabled={enabledSet} timeRange={timeRange} />
        )}

        {/* Legend */}
        <div className="absolute bottom-4 right-4 z-[1000] bg-surface/90 backdrop-blur-sm border border-silver-grey rounded-lg px-3 py-2 shadow-sm space-y-1">
          <p className="text-label-sm font-semibold text-on-surface">Layers</p>
          {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
            <div key={cat} className="flex items-center gap-2 text-label-sm text-on-surface-variant">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
              {categoryLabel(cat)}
            </div>
          ))}
          <p className="pt-1 border-t border-silver-grey/60 text-[10px] text-on-surface-variant/70">
            Marker size = severity • Live: weather, quakes, ADS-B • ADS-B red = likely military
          </p>
        </div>
      </div>

      {/* ── Layer panel (left, floating) ────────────────────────────────── */}
      <div className="absolute left-3 top-3 bottom-3 z-[1000] w-72 flex flex-col bg-surface/95 backdrop-blur-md border border-silver-grey rounded-lg shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-silver-grey">
          <span className="flex items-center gap-1.5 text-label-sm font-semibold uppercase tracking-wider text-on-surface">
            <Layers className="w-3.5 h-3.5 text-transparency-teal" />
            Intel Layers
          </span>
          <span className="text-[10px] text-on-surface-variant">{enabledCount}/{INTEL_LAYERS.length}</span>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {intelCategories.map((cat) => {
            const layers = INTEL_LAYERS.filter((l) => l.category === cat.id);
            const on = layers.filter((l) => enabledSet.has(l.id)).length;
            const isOpen = expanded[cat.id];
            return (
              <div key={cat.id} className="border border-silver-grey rounded-lg overflow-hidden">
                <div
                  className="flex items-center justify-between px-2.5 py-1.5 bg-surface-container-low cursor-pointer"
                  onClick={() => setExpanded((e) => ({ ...e, [cat.id]: !e[cat.id] }))}
                >
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold text-on-surface">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat.id] }} />
                    {cat.label}
                    <span className="text-[10px] text-on-surface-variant font-normal">({on}/{layers.length})</span>
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCategory(cat.id, on === layers.length ? false : true);
                      }}
                      className="text-[10px] text-transparency-teal hover:text-primary px-1"
                    >
                      {on === layers.length ? 'None' : 'All'}
                    </button>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-on-surface-variant transition-transform ${isOpen ? '' : '-rotate-90'}`}
                    />
                  </div>
                </div>
                {isOpen && (
                  <div className="px-1 py-1 space-y-0.5">
                    {layers.map((layer) => {
                      const checked = enabledSet.has(layer.id);
                      const count = (points.get(layer.id) || []).filter((p) => inTimeRange(p, timeRange)).length;
                      return (
                        <label
                          key={layer.id}
                          className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-surface-container-low cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleLayer(layer.id)}
                            className="accent-primary w-3.5 h-3.5"
                          />
                          <span className={`text-[11px] flex-1 ${checked ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                            {layer.label}
                            {layer.live && <span className="text-transparency-teal text-[9px] font-bold ml-1">LIVE</span>}
                          </span>
                          <span className="text-[9px] text-on-surface-variant/60">{count}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 2D renderer (Leaflet)
// ---------------------------------------------------------------------------

const IntelMap2D = ({
  points,
  enabled,
  timeRange,
  showLoading,
}: {
  points: Map<string, IntelPoint[]>;
  enabled: Set<string>;
  timeRange: TimeRange;
  showLoading: boolean;
}) => {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  const rendered = useMemo(() => {
    const pts: Array<{ point: IntelPoint; color: string; layer: string }> = [];
    const lines: Array<{ line: IntelLine; color: string }> = [];
    for (const layer of INTEL_LAYERS) {
      if (!enabled.has(layer.id)) continue;
      const color = CATEGORY_COLORS[layer.category];
      for (const p of points.get(layer.id) || []) {
        if (inTimeRange(p, timeRange)) pts.push({ point: p, color, layer: layer.label });
      }
      for (const line of layer.lines || []) {
        lines.push({ line, color });
      }
    }
    return { pts, lines };
  }, [points, enabled, timeRange]);

  useEffect(() => {
    if (!container) return;
    const map = L.map(container, { center: [25, 10], zoom: 2, zoomControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);

    const render = () => {
      layerGroup.clearLayers();
      // Lines under points
      for (const { line, color } of rendered.lines) {
        L.polyline(
          line.path.map(([lat, lng]) => [lat, lng] as [number, number]),
          { color, weight: 1.5, opacity: 0.55, dashArray: '4 6' },
        )
          .bindPopup(`<strong>${escapeHtml(line.label)}</strong><br/><small>${escapeHtml(line.detail || '')}</small>`)
          .addTo(layerGroup);
      }
      for (const { point, color, layer } of rendered.pts) {
        const fillColor = point.color || color;
        const radius = 4 + point.severity * 6;
        const marker = L.circleMarker([point.lat, point.lng], {
          radius,
          stroke: true,
          weight: 1.5,
          color: '#ffffff',
          fillColor,
          fillOpacity: 0.35 + point.severity * 0.55,
        });
        const label = point.color ? 'Live aircraft' : layer;
        marker
          .bindPopup(
            `<div><strong>${escapeHtml(point.label)}</strong><br/>` +
              `<small>${escapeHtml(label)}${point.detail ? ' • ' + escapeHtml(point.detail) : ''}` +
              `${point.date ? ' • ' + escapeHtml(point.date) : ''}</small></div>`,
          )
          .addTo(layerGroup);
      }
    };

    render();
    map.on('zoomend', render);
    return () => {
      map.remove();
    };
  }, [container, rendered]);

  if (showLoading && rendered.pts.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full border-4 border-primary/20 border-t-primary w-10 h-10" />
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div ref={setContainer} className="h-full w-full" />
      {rendered.pts.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-label-sm text-on-surface-variant bg-surface/80 px-3 py-1.5 rounded-lg">
            No intel layers enabled — open a category on the left.
          </p>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// 3D renderer (react-globe.gl)
// ---------------------------------------------------------------------------

const IntelMap3D = ({
  points,
  enabled,
  timeRange,
}: {
  points: Map<string, IntelPoint[]>;
  enabled: Set<string>;
  timeRange: TimeRange;
}) => {
  const globeData = useMemo(() => {
    const pts: any[] = [];
    const paths: any[] = [];
    for (const layer of INTEL_LAYERS) {
      if (!enabled.has(layer.id)) continue;
      const color = CATEGORY_COLORS[layer.category];
      for (const p of points.get(layer.id) || []) {
        if (!inTimeRange(p, timeRange)) continue;
        pts.push({
          lat: p.lat,
          lng: p.lng,
          color: p.color || color,
          radius: 0.12 + p.severity * 0.3,
          altitude: 0.03 + p.severity * 0.08,
          label: `${p.label}${p.detail ? ' — ' + p.detail : ''}`,
        });
      }
      for (const line of layer.lines || []) {
        paths.push({
          path: line.path.map(([lat, lng]) => [lat, lng]),
          color,
          label: line.label,
        });
      }
    }
    return { pts, paths };
  }, [points, enabled, timeRange]);

  return (
    <div className="h-full w-full bg-black">
      <Globe
        backgroundColor="#000000"
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        pointsData={globeData.pts}
        pointLat="lat"
        pointLng="lng"
        pointColor="color"
        pointRadius="radius"
        pointAltitude="altitude"
        pointLabel={(d: any) => d.label}
        pointsMerge={false}
        pathsData={globeData.paths}
        pathPoints="path"
        pathPointLat={(p: any) => p[0]}
        pathPointLng={(p: any) => p[1]}
        pathColor={(d: any) => d.color}
        pathStroke={1}
        pathDashLength={0.6}
        pathDashGap={0.3}
        pathLabel={(d: any) => d.label}
        atmosphereColor="#4fc3f7"
        atmosphereAltitude={0.18}
      />
    </div>
  );
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default IntelMapView;
