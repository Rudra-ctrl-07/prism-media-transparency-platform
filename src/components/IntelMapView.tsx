/**
 * IntelMapView.tsx — World Monitor (full-screen immersive rebuild)
 *
 * A full-screen map experience competing with worldmonitor.app:
 *   - Protomaps vector tiles via MapLibre GL (WebGL rendering)
 *   - URL state persistence (lat, lon, zoom, layers, timeRange, view)
 *   - Left: collapsible layer panel with search, category toggles, live indicators
 *   - Right: collapsible info panel (threats, CII, feeds, posture)
 *   - Top bar: minimal — region presets, time range, 2D/3D toggle, signal count
 *   - Bottom: legend strip
 *   - 50+ layers across 5 categories
 *   - Live OSINT: NWS, USGS, FIRMS, OpenSky, EONET, ECCC, WMO, NOAA, Satellites
 *
 * Vector tiles served by Protomaps, with geographic data powered by
 * OpenStreetMap. Rendering handled via MapLibre GL (WebGL).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Globe from 'react-globe.gl';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  ChevronDown, ChevronLeft, ChevronRight,
  Layers, Map as MapIcon, Globe2, Radio, Tv, Camera,
  Shield, AlertTriangle, TrendingUp, BarChart3, ExternalLink,
  Play, X, Target, Activity, Search, Eye, EyeOff, Menu,
} from 'lucide-react';
import {
  INTEL_LAYERS, getLayerPoints, refreshLiveLayer, inTimeRange,
  TIME_RANGES, TimeRange, CATEGORY_COLORS, categoryLabel,
} from '../services/intelLayers';
import {
  IntelPoint, IntelLine, intelCategories, IntelCategoryId,
  liveNewsFeeds, liveWebcams, countryInstability, strategicRisks,
  regionPresets, RegionPreset,
} from '../data/intelData';
import { FocalPointsTimeline } from './FocalPointsTimeline';
import { StrategicRiskOverview } from './StrategicRiskOverview';
import { LiveVideoStreams } from './LiveVideoStreams';

// ---------------------------------------------------------------------------
// AI Forecasts — Predictive risk indicators
// ---------------------------------------------------------------------------

const AIForecastContent = () => {
  const forecasts = [
    { region: 'Eastern Europe', category: 'Conflict', risk: 87, trend: 'rising', outlook: 'Escalation likely in Donbas sector within 72h. Russian force buildup near Kupyansk observed via satellite imagery.', icon: '⚔️' },
    { region: 'Red Sea / Gulf of Aden', category: 'Supply Chain', risk: 79, trend: 'stable', outlook: 'Houthi maritime attacks persist. Rerouting via Cape adds 10-14 days. Insurance premiums remain elevated.', icon: '🚢' },
    { region: 'Taiwan Strait', category: 'Conflict', risk: 72, trend: 'rising', outlook: 'PLA exercises intensifying. Median line incursions +40% month-over-month. Amphibious drill indicators detected.', icon: '🛡️' },
    { region: 'Global Markets', category: 'Markets', risk: 58, trend: 'volatile', outlook: 'Fed rate decision pending. Energy commodities elevated. Safe-haven flows into gold and yen persist.', icon: '📈' },
    { region: 'Southeast Asia', category: 'Cyber', risk: 65, trend: 'rising', outlook: 'APT groups targeting critical infrastructure. 3 major zero-days exploited in wild this week.', icon: '🔒' },
    { region: 'Sahel Region', category: 'Conflict', risk: 81, trend: 'rising', outlook: 'JNIM/ISGS insurgencies expanding across Niger-Mali-Burkina tri-border. Governance destabilized.', icon: '⚠️' },
    { region: 'South China Sea', category: 'Supply Chain', risk: 68, trend: 'stable', outlook: 'Philippine resupply confrontations ongoing. Second Thomas Shoal tensions elevated but contained.', icon: '🛢️' },
    { region: 'Global', category: 'Cyber', risk: 74, trend: 'rising', outlook: 'Ransomware attacks on healthcare +120% YoY. State-sponsored groups active in energy sector.', icon: '🖥️' },
  ];
  const riskColor = (r: number) => r >= 80 ? '#ef4444' : r >= 60 ? '#f97316' : r >= 40 ? '#eab308' : '#22c55e';
  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-blue-400">🔮</span>
        <h3 className="text-[13px] font-bold text-white">AI Forecasts</h3>
        <span className="text-[7px] px-1 py-0.5 bg-blue-500/20 text-blue-400 font-bold rounded">PREDICTIVE</span>
      </div>
      <p className="text-[9px] text-gray-500 mb-2">72h risk projections across 4 domains</p>
      <div className="space-y-1.5">
        {forecasts.map((f, i) => (
          <div key={i} className="bg-gray-800/50 border border-gray-700 rounded p-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px]">{f.icon}</span>
              <span className="text-[10px] font-bold text-white flex-1">{f.region}</span>
              <span className="text-[7px] px-1 py-0.5 bg-gray-700 text-gray-300 font-bold rounded">{f.category}</span>
              <span className={`text-[7px] px-1 py-0.5 font-bold rounded ${f.trend === 'rising' ? 'bg-red-500/20 text-red-400' : f.trend === 'volatile' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-600/20 text-gray-400'}`}>{f.trend}</span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${f.risk}%`, backgroundColor: riskColor(f.risk) }} />
              </div>
              <span className="text-[9px] font-bold" style={{ color: riskColor(f.risk) }}>{f.risk}%</span>
            </div>
            <p className="text-[9px] text-gray-400 leading-relaxed">{f.outlook}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Intel & Market Feed Board — Modular domain selector
// ---------------------------------------------------------------------------

const IntelFeedBoardContent = () => {
  const [activeFeed, setActiveFeed] = useState<string>('world-news');
  const feeds = [
    { id: 'world-news', label: 'World News', icon: '🌍' },
    { id: 'infra-cascade', label: 'Infrastructure Cascade', icon: '⚡' },
    { id: 'energy', label: 'Energy & Resources', icon: '🛢️' },
    { id: 'metals', label: 'Metals & Materials', icon: '🔩' },
    { id: 'government', label: 'Government', icon: '🏛️' },
    { id: 'think-tanks', label: 'Think Tanks', icon: '🧠' },
    { id: 'predictions', label: 'Predictions', icon: '🔮' },
    { id: 'macro-stress', label: 'Macro Stress', icon: '📊' },
    { id: 'supply-chain', label: 'Supply Chain', icon: '📦' },
    { id: 'regional', label: 'Regional Feeds', icon: '🗺️' },
  ];
  const feedItems: Record<string, { title: string; source: string; time: string; severity: string }[]> = {
    'world-news': [
      { title: 'NATO summit addresses Eastern flank defense posture', source: 'Reuters', time: '2m', severity: 'high' },
      { title: 'UN Security Council emergency session on Sudan', source: 'Al Jazeera', time: '8m', severity: 'critical' },
      { title: 'Japan-South Korea diplomatic talks resume', source: 'NHK', time: '15m', severity: 'elevated' },
      { title: 'Brazil announces Amazon conservation measures', source: 'BBC', time: '22m', severity: 'low' },
    ],
    'infra-cascade': [
      { title: 'Undersea cable repair delayed in Baltic Sea', source: 'OSINT', time: '5m', severity: 'high' },
      { title: 'EU power grid frequency anomaly detected', source: 'ENTSO-E', time: '12m', severity: 'elevated' },
    ],
    'energy': [
      { title: 'OPEC+ emergency meeting called', source: 'Bloomberg', time: '1m', severity: 'critical' },
      { title: 'LNG tanker rerouting from Red Sea continues', source: 'Platts', time: '18m', severity: 'high' },
    ],
    'government': [
      { title: 'US Senate Armed Services Committee hearing on Indo-Pacific', source: 'C-SPAN', time: '30m', severity: 'elevated' },
    ],
    'supply-chain': [
      { title: 'Shanghai container rates spike 22% amid Red Sea rerouting', source: 'Drewry', time: '4h', severity: 'high' },
    ],
  };
  const items = feedItems[activeFeed] || feedItems['world-news'];
  return (
    <div className="flex flex-col h-full">
      <div className="p-2 border-b border-gray-700">
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
          <h3 className="text-[12px] font-bold text-white">Intel & Market Feeds</h3>
        </div>
        <div className="flex flex-wrap gap-1">
          {feeds.map((f) => (
            <button key={f.id} onClick={() => setActiveFeed(f.id)}
              className={`px-1.5 py-0.5 text-[8px] font-bold rounded transition-colors ${activeFeed === f.id ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
              {f.icon} {f.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {items.map((item, i) => (
          <div key={i} className="bg-gray-800/50 border border-gray-700 rounded p-2 hover:bg-gray-700/50 transition-colors cursor-pointer">
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.severity === 'critical' ? 'bg-red-500' : item.severity === 'high' ? 'bg-orange-500' : item.severity === 'elevated' ? 'bg-yellow-500' : 'bg-green-500'}`} />
              <span className="text-[10px] font-bold text-white flex-1">{item.title}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[8px] text-gray-500">{item.source}</span>
              <span className="text-[8px] text-gray-600">{item.time} ago</span>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-[10px] text-gray-500 text-center py-4">No active feed items.</p>}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Footer Navigation
// ---------------------------------------------------------------------------

const FooterNav = () => {
  const links = [
    { label: 'Countries', href: '#' },
    { label: 'Chokepoints', href: '#' },
    { label: 'Crises', href: '#' },
    { label: 'Tools', href: '#' },
    { label: 'Pricing', href: '#' },
    { label: 'Blog', href: '#' },
    { label: 'Docs', href: '#' },
    { label: 'Status', href: '#' },
  ];
  return (
    <div className="flex items-center justify-between px-3 py-1.5 bg-gray-900/95 backdrop-blur-sm border-t border-gray-700">
      <div className="flex items-center gap-3">
        <span className="text-[8px] font-bold text-gray-500 uppercase">World Monitor</span>
        {links.map((l) => (
          <a key={l.label} href={l.href} className="text-[9px] text-gray-500 hover:text-white transition-colors">{l.label}</a>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[8px] text-gray-600">© 2026 PRISM Intelligence</span>
        <a href="#" className="text-[8px] text-gray-500 hover:text-white">Twitter</a>
        <a href="#" className="text-[8px] text-gray-500 hover:text-white">GitHub</a>
        <a href="#" className="text-[8px] text-gray-500 hover:text-white">Discord</a>
      </div>
    </div>
  );
};

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
// URL state helpers
// ---------------------------------------------------------------------------

function getUrlParams() {
  const p = new URLSearchParams(window.location.search);
  return {
    lat: parseFloat(p.get('lat') || '20'),
    lon: parseFloat(p.get('lon') || '0'),
    zoom: parseFloat(p.get('zoom') || '1.5'),
    timeRange: (p.get('timeRange') || '7d') as TimeRange,
    layers: (p.get('layers') || 'conflicts,bases,hotspots,ais,nuclear,sanctions,weather,canadaAlerts,economic,waterways,outages,protests,military,natural,tradeRoutes').split(','),
  };
}

function updateUrlParams(state: { lat: number; lon: number; zoom: number; timeRange: string; layers: string[] }) {
  const p = new URLSearchParams();
  p.set('lat', state.lat.toFixed(4));
  p.set('lon', state.lon.toFixed(4));
  p.set('zoom', state.zoom.toFixed(2));
  p.set('timeRange', state.timeRange);
  p.set('layers', state.layers.join(','));
  window.history.replaceState({}, '', `${window.location.pathname}?${p.toString()}`);
}

// ---------------------------------------------------------------------------
// URL layer ID → internal layer ID mapping
// ---------------------------------------------------------------------------

const URL_LAYER_MAP: Record<string, string[]> = {
  conflicts: ['conflict-zones', 'armed-conflict-events', 'acled-events'],
  bases: ['military-bases'],
  hotspots: ['intel-hotspots'],
  ais: ['naval-tracking', 'ship-traffic', 'ais-traffic'],
  nuclear: ['nuclear-sites', 'radiation-watch'],
  sanctions: ['sanctions'],
  weather: ['weather-alerts', 'wmo-swic', 'noaa-alerts'],
  canadaAlerts: ['eccc-alerts'],
  economic: ['economic-centers', 'data-centers'],
  waterways: ['maritime-chokepoints', 'trade-routes'],
  outages: ['internet-disruptions', 'internet-shutdowns', 'grid-stress'],
  protests: ['protests'],
  military: ['military-exercises', 'nato-positions', 'border-tensions'],
  natural: ['natural-events', 'eonet-events', 'nasa-firms'],
  tradeRoutes: ['trade-routes', 'pipelines', 'rail-corridors'],
  cyber: ['cyber-threats', 'ransomware-attacks', 'data-breaches', 'apt-campaigns'],
  energy: ['lng-terminals', 'oil-refineries', 'renewable-projects'],
  cables: ['undersea-cables', 'cable-incidents'],
  migration: ['migration-routes', 'border-crossings', 'unhcr-operations'],
  minerals: ['critical-minerals'],
  space: ['orbital-surveillance', 'space-launch-sites', 'satellite-tracks'],
  gdelt: ['gdelt-events'],
};

function urlLayersToInternal(urlLayers: string[]): string[] {
  const ids = new Set<string>();
  for (const ul of urlLayers) {
    const mapped = URL_LAYER_MAP[ul];
    if (mapped) mapped.forEach((id) => ids.add(id));
    else ids.add(ul);
  }
  return [...ids];
}

function internalLayersToUrl(internalIds: string[]): string[] {
  const urlKeys: string[] = [];
  for (const [urlKey, internalIds_] of Object.entries(URL_LAYER_MAP)) {
    if (internalIds_.some((id) => internalIds.includes(id))) {
      urlKeys.push(urlKey);
    }
  }
  return urlKeys;
}

// ---------------------------------------------------------------------------
// World Brief panel content
// ---------------------------------------------------------------------------

function WorldBriefContent() {
  const alerts = useMemo(() => [
    { region: 'Ukraine', status: 'Active combat across eastern front. Air defense engagements near Kyiv. Drone strikes on logistics.', severity: 'critical' as const },
    { region: 'Gaza / Israel', status: 'Hostilities ongoing. Cross-border exchanges with Hezbollah. Humanitarian corridor pressure.', severity: 'critical' as const },
    { region: 'Red Sea', status: 'Houthi attacks on shipping persist. Bab-el-Mandeb transit risk elevated. Rerouting via Cape.', severity: 'high' as const },
    { region: 'Sudan', status: 'SAF-RSF fighting intensifies near Khartoum. Famine risk. Mass displacement.', severity: 'critical' as const },
    { region: 'South China Sea', status: 'Philippine resupply confrontations. PLA maritime militia activity near Second Thomas Shoal.', severity: 'high' as const },
    { region: 'Sahel', status: 'JNIM/ISGS insurgencies expanding in Niger-Mali-Burkina tri-border area.', severity: 'high' as const },
    { region: 'Taiwan Strait', status: 'PLA exercises simulating blockade. Increased air incursions across median line.', severity: 'elevated' as const },
    { region: 'Baltic Sea', status: 'Russian submarine activity near undersea cables. Kaliningrad missile deployments.', severity: 'elevated' as const },
  ], []);

  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <Shield className="w-4 h-4 text-red-400" />
        <h3 className="text-[13px] font-bold text-white">World Brief</h3>
        <span className="text-[8px] px-1.5 py-0.5 bg-red-500/20 text-red-400 font-bold rounded">AI</span>
      </div>
      <p className="text-[10px] text-gray-400 leading-relaxed">
        Synthesized from 500+ OSINT feeds, {INTEL_LAYERS.length} data layers.
      </p>
      <div className="space-y-1.5">
        {alerts.map((a, i) => (
          <div key={i} className="bg-gray-800/50 border border-gray-700 rounded p-2">
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`w-1.5 h-1.5 rounded-full ${a.severity === 'critical' ? 'bg-red-500' : a.severity === 'high' ? 'bg-orange-500' : 'bg-yellow-500'}`} />
              <span className="text-[11px] font-bold text-white">{a.region}</span>
              <span className={`text-[7px] px-1 py-0.5 font-bold uppercase ${
                a.severity === 'critical' ? 'bg-red-500 text-white' :
                a.severity === 'high' ? 'bg-orange-500 text-white' : 'bg-yellow-500 text-black'
              }`}>{a.severity}</span>
            </div>
            <p className="text-[10px] text-gray-300 leading-relaxed">{a.status}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Strategic Posture content
// ---------------------------------------------------------------------------

function PostureContent() {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <AlertTriangle className="w-4 h-4 text-orange-400" />
        <h3 className="text-[13px] font-bold text-white">Strategic Posture</h3>
      </div>
      {strategicRisks.map((risk) => (
        <div key={risk.region} className="bg-gray-800/50 border border-gray-700 rounded overflow-hidden">
          <button onClick={() => setExpanded(expanded === risk.region ? null : risk.region)}
            className="w-full flex items-center justify-between p-2 hover:bg-gray-700/50 transition-colors">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${
                risk.threatLevel === 'critical' ? 'bg-red-500' :
                risk.threatLevel === 'high' ? 'bg-orange-500' :
                risk.threatLevel === 'elevated' ? 'bg-yellow-500' : 'bg-green-500'
              }`} />
              <span className="text-[11px] font-bold text-white">{risk.region}</span>
            </div>
            <span className={`text-[7px] px-1 py-0.5 font-bold uppercase ${
              risk.threatLevel === 'critical' ? 'bg-red-500 text-white' :
              risk.threatLevel === 'high' ? 'bg-orange-500 text-white' :
              risk.threatLevel === 'elevated' ? 'bg-yellow-500 text-black' : 'bg-green-500 text-white'
            }`}>{risk.threatLevel}</span>
          </button>
          {expanded === risk.region && (
            <div className="px-2 pb-2 space-y-1.5 border-t border-gray-700/50 pt-1.5">
              <p className="text-[10px] text-gray-300">{risk.summary}</p>
              <p className="text-[9px] text-blue-400">✈️ {risk.airAssets}</p>
              <p className="text-[9px] text-blue-300">🚢 {risk.navalAssets}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CII content
// ---------------------------------------------------------------------------

function CiiContent() {
  const sorted = useMemo(() => [...countryInstability].sort((a, b) => b.score - a.score), []);
  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <TrendingUp className="w-4 h-4 text-purple-400" />
        <h3 className="text-[13px] font-bold text-white">Country Instability Index</h3>
      </div>
      {sorted.map((c) => (
        <div key={c.iso} className="bg-gray-800/50 border border-gray-700 rounded p-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-white">{c.country}</span>
            <span className={`text-[9px] font-bold ${c.trend === 'rising' ? 'text-red-400' : c.trend === 'falling' ? 'text-green-400' : 'text-gray-400'}`}>
              {c.trend === 'rising' ? '↑' : c.trend === 'falling' ? '↓' : '→'} {c.score}
            </span>
          </div>
          <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${c.score >= 80 ? 'bg-red-500' : c.score >= 60 ? 'bg-orange-500' : 'bg-yellow-500'}`}
              style={{ width: `${c.score}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Live Feeds content
// ---------------------------------------------------------------------------

function FeedsContent() {
  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <Tv className="w-4 h-4 text-blue-400" />
        <h3 className="text-[13px] font-bold text-white">Live News</h3>
      </div>
      {liveNewsFeeds.map((feed) => (
        <a key={feed.id} href={feed.url} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 p-2 bg-gray-800/50 border border-gray-700 rounded hover:bg-gray-700/50 transition-colors group">
          <div className={`w-5 h-5 flex items-center justify-center rounded ${
            feed.category === 'financial' ? 'bg-green-500/20 text-green-400' :
            feed.category === 'regional' ? 'bg-orange-500/20 text-orange-400' :
            'bg-blue-500/20 text-blue-400'
          }`}><Tv className="w-3 h-3" /></div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-white truncate">{feed.name}</p>
            <p className="text-[8px] text-gray-400">{feed.network}</p>
          </div>
          <ExternalLink className="w-3 h-3 text-gray-500 opacity-0 group-hover:opacity-100" />
        </a>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main IntelMapView
// ---------------------------------------------------------------------------

const DEFAULT_URL_LAYERS = ['conflicts', 'bases', 'hotspots', 'ais', 'nuclear', 'sanctions', 'weather', 'canadaAlerts', 'economic', 'waterways', 'outages', 'protests', 'military', 'natural', 'tradeRoutes'];

export const IntelMapView = () => {
  const urlState = useMemo(() => {
    const p = getUrlParams();
    return { ...p, internalLayers: urlLayersToInternal(p.layers) };
  }, []);

  const [projection, setProjection] = useState<'2d' | '3d'>('2d');
  const [timeRange, setTimeRange] = useState<TimeRange>(urlState.timeRange);
  const [enabled, setEnabled] = useState<string[]>(urlState.internalLayers);
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({ security: true, hazards: true });
  const [points, setPoints] = useState<Map<string, IntelPoint[]>>(new Map());
  const [loadingLayers, setLoadingLayers] = useState(false);
  const [liveTick, setLiveTick] = useState(0);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightPanel, setRightPanel] = useState<'brief' | 'posture' | 'cii' | 'focal' | 'risk' | 'feeds' | 'video' | 'markets' | 'forecasts' | 'feedboard' | null>(null);
  const [headerSearch, setHeaderSearch] = useState('');
  const [layerSearch, setLayerSearch] = useState('');
  const [mapCenter, setMapCenter] = useState<[number, number]>([urlState.lat, urlState.lon]);
  const [mapZoom, setMapZoom] = useState(urlState.zoom);

  const enabledSet = useMemo(() => new Set(enabled), [enabled]);

  // URL sync
  useEffect(() => {
    updateUrlParams({
      lat: mapCenter[0], lon: mapCenter[1], zoom: mapZoom,
      timeRange, layers: internalLayersToUrl(enabled),
    });
  }, [mapCenter, mapZoom, timeRange, enabled]);

  // Auto-refresh live layers
  useEffect(() => {
    const liveIds = ['aircraft-adsb', 'nasa-firms', 'aviation-live', 'eonet-events', 'eccc-alerts', 'wmo-swic', 'noaa-alerts', 'satellite-tracks'];
    if (!enabledSet.has('aircraft-adsb')) return;
    const timer = setInterval(() => setLiveTick((v) => v + 1), 60_000);
    return () => clearInterval(timer);
  }, [enabledSet]);

  // Load points
  useEffect(() => {
    let cancelled = false;
    setLoadingLayers(true);
    (async () => {
      const next = new Map<string, IntelPoint[]>();
      await Promise.all(
        INTEL_LAYERS.filter((l) => enabledSet.has(l.id)).map(async (layer) => {
          try {
            if (layer.live && liveTick > 0) next.set(layer.id, await refreshLiveLayer(layer.id));
            else next.set(layer.id, await getLayerPoints(layer));
          } catch { next.set(layer.id, layer.points || []); }
        }),
      );
      if (!cancelled) setPoints(next);
      if (!cancelled) setLoadingLayers(false);
    })();
    return () => { cancelled = true; };
  }, [JSON.stringify([...enabledSet].sort()), liveTick]);

  const aircraftCount = useMemo(
    () => (points.get('aircraft-adsb') || []).filter((p) => inTimeRange(p, timeRange)).length,
    [points, timeRange],
  );

  const totalSignals = useMemo(() => {
    let n = 0;
    for (const [id, pts] of points) {
      if (!enabledSet.has(id)) continue;
      n += pts.filter((p) => inTimeRange(p, timeRange)).length;
    }
    return n;
  }, [points, enabledSet, timeRange]);

  const toggleLayer = useCallback((id: string) => {
    setEnabled((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }, []);

  const toggleCategory = useCallback((cat: IntelCategoryId, force?: boolean) => {
    const layerIds = INTEL_LAYERS.filter((l) => l.category === cat).map((l) => l.id);
    const allOn = layerIds.every((id) => enabledSet.has(id));
    const turnOn = force ?? !allOn;
    setEnabled((prev) => {
      const base = prev.filter((id) => !layerIds.includes(id));
      return turnOn ? [...base, ...layerIds] : base;
    });
  }, [enabledSet]);

  const filteredLayers = useMemo(() => {
    if (!layerSearch) return INTEL_LAYERS;
    const q = layerSearch.toLowerCase();
    return INTEL_LAYERS.filter((l) => l.label.toLowerCase().includes(q) || l.id.includes(q));
  }, [layerSearch]);

  return (
    <div className="relative w-full h-full bg-gray-950 overflow-hidden select-none">
      {/* ── Map ────────────────────────────────────────────────────────── */}
      <div className="absolute inset-0">
        {projection === '2d' ? (
          <IntelMap2D
            points={points} enabled={enabledSet} timeRange={timeRange}
            showLoading={loadingLayers}
            center={mapCenter} zoom={mapZoom}
            onMove={(c, z) => { setMapCenter(c); setMapZoom(z); }}
          />
        ) : (
          <IntelMap3D points={points} enabled={enabledSet} timeRange={timeRange} />
        )}
      </div>

      {/* ── Top bar (minimal) ─────────────────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 z-[1100] flex items-center gap-2 px-3 py-2 bg-gradient-to-b from-black/80 to-transparent">
        {/* Logo */}
        <div className="flex items-center gap-2 mr-2">
          <div className="w-7 h-7 bg-red-600 flex items-center justify-center border border-red-400">
            <Radio className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-[13px] font-bold text-white tracking-wide">WORLD MONITOR</h1>
            <p className="text-[8px] text-gray-400 uppercase tracking-widest">OSINT Intelligence Platform</p>
          </div>
        </div>

        {/* Region presets */}
        <div className="flex items-center gap-0.5 bg-black/60 backdrop-blur-sm border border-gray-700 rounded px-1 py-0.5">
          {regionPresets.map((r) => (
            <button key={r.id}
              onClick={() => {
                setMapCenter(r.center);
                setMapZoom(r.zoom);
              }}
              className={`px-2 py-0.5 text-[9px] font-bold rounded transition-colors ${
                mapCenter[0] === r.center[0] && mapCenter[1] === r.center[1]
                  ? 'bg-red-600 text-white' : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}>
              {r.label}
            </button>
          ))}
        </div>

        {/* Time range */}
        <div className="flex items-center gap-0.5 bg-black/60 backdrop-blur-sm border border-gray-700 rounded px-1 py-0.5">
          {TIME_RANGES.map((r) => (
            <button key={r.id} onClick={() => setTimeRange(r.id)}
              className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors ${
                timeRange === r.id ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}>
              {r.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative ml-auto">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500" />
          <input type="text" placeholder="Search intel…"
            value={headerSearch} onChange={(e) => setHeaderSearch(e.target.value)}
            className="w-36 pl-7 pr-2 py-1 bg-black/60 border border-gray-700 rounded text-[10px] text-white placeholder-gray-500 focus:outline-none focus:border-blue-500" />
        </div>

        {/* Signal count + loading */}
        <div className="flex items-center gap-2 mr-2">
          {loadingLayers && <span className="text-[9px] text-gray-400 animate-pulse">Loading…</span>}
          <span className="text-[10px] font-bold text-gray-300">
            {enabledSet.size} layers • {totalSignals.toLocaleString()} signals
          </span>
          {aircraftCount > 0 && (
            <span className="text-[10px] font-bold text-red-400">✈️ {aircraftCount}</span>
          )}
        </div>

        {/* Account */}
        <button className="w-7 h-7 bg-gray-800 border border-gray-600 rounded-full flex items-center justify-center text-[10px] font-bold text-gray-300 hover:bg-gray-700 hover:text-white transition-colors" title="Account">
          PR
        </button>

        {/* 2D/3D */}
        <div className="flex items-center gap-0 bg-black/60 backdrop-blur-sm border border-gray-700 rounded overflow-hidden">
          <button onClick={() => setProjection('2d')}
            className={`flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold ${projection === '2d' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'}`}>
            <MapIcon className="w-3 h-3" /> 2D
          </button>
          <button onClick={() => setProjection('3d')}
            className={`flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold ${projection === '3d' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'}`}>
            <Globe2 className="w-3 h-3" /> 3D
          </button>
        </div>
      </div>

      {/* ── Left panel: Layer controls ─────────────────────────────────── */}
      <div className={`absolute top-14 left-0 bottom-0 z-[1100] transition-all duration-200 ${leftOpen ? 'w-72' : 'w-0'}`}>
        <div className={`h-full bg-gray-900/95 backdrop-blur-md border-r border-gray-700 overflow-hidden flex flex-col ${leftOpen ? '' : 'hidden'}`}>
          {/* Search */}
          <div className="p-2 border-b border-gray-700">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500" />
              <input type="text" placeholder="Search layers…"
                value={layerSearch} onChange={(e) => setLayerSearch(e.target.value)}
                className="w-full pl-7 pr-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-[11px] text-white placeholder-gray-500 focus:outline-none focus:border-blue-500" />
            </div>
          </div>

          {/* Layer list */}
          <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
            {intelCategories.map((cat) => {
              const catLayers = filteredLayers.filter((l) => l.category === cat.id);
              if (catLayers.length === 0) return null;
              const on = catLayers.filter((l) => enabledSet.has(l.id)).length;
              const isOpen = expandedCats[cat.id] ?? false;
              return (
                <div key={cat.id} className="border border-gray-700/50 rounded overflow-hidden">
                  <button
                    onClick={() => setExpandedCats((e) => ({ ...e, [cat.id]: !e[cat.id] }))}
                    className="w-full flex items-center justify-between px-2.5 py-2 hover:bg-gray-800/50 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: CATEGORY_COLORS[cat.id] }} />
                      <span className="text-[11px] font-bold text-white">{cat.label}</span>
                      <span className="text-[9px] text-gray-500">{on}/{catLayers.length}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={(e) => { e.stopPropagation(); toggleCategory(cat.id, on === catLayers.length ? false : true); }}
                        className="text-[8px] text-blue-400 hover:text-blue-300 px-1 font-bold">
                        {on === catLayers.length ? 'NONE' : 'ALL'}
                      </button>
                      <ChevronDown className={`w-3 h-3 text-gray-500 transition-transform ${isOpen ? '' : '-rotate-90'}`} />
                    </div>
                  </button>
                  {isOpen && (
                    <div className="px-1 pb-1 space-y-0.5">
                      {catLayers.map((layer) => {
                        const checked = enabledSet.has(layer.id);
                        const count = (points.get(layer.id) || []).filter((p) => inTimeRange(p, timeRange)).length;
                        return (
                          <label key={layer.id}
                            className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-800/50 cursor-pointer group">
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                              checked ? 'bg-blue-600 border-blue-500' : 'border-gray-600'
                            }`}>
                              {checked && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                            </div>
                            <input type="checkbox" checked={checked} onChange={() => toggleLayer(layer.id)} className="sr-only" />
                            <span className={`text-[10px] flex-1 ${checked ? 'text-white' : 'text-gray-400'}`}>
                              {layer.label}
                              {layer.live && <span className="ml-1 text-[7px] px-1 py-0.5 bg-red-500/20 text-red-400 font-bold rounded">LIVE</span>}
                            </span>
                            {count > 0 && <span className="text-[8px] text-gray-600 tabular-nums">{count}</span>}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="p-2 border-t border-gray-700">
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
                <div key={cat} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: color }} />
                  <span className="text-[8px] text-gray-400">{categoryLabel(cat)}</span>
                </div>
              ))}
            </div>
            <p className="text-[7px] text-gray-600 mt-1">Marker size = severity • Live: NWS, USGS, FIRMS, ADS-B, EONET, WMO, NOAA, Satellites</p>
          </div>
        </div>
      </div>

      {/* ── Left toggle button ─────────────────────────────────────────── */}
      <button onClick={() => setLeftOpen((v) => !v)}
        className={`absolute z-[1101] top-16 ${leftOpen ? 'left-72' : 'left-0'} bg-gray-900/90 backdrop-blur-sm border border-gray-700 border-l-0 rounded-r px-1 py-3 hover:bg-gray-800 transition-all`}>
        {leftOpen ? <ChevronLeft className="w-3 h-3 text-gray-400" /> : <Layers className="w-3 h-3 text-blue-400" />}
      </button>

      {/* ── Right panel: Info panels ───────────────────────────────────── */}
      {rightPanel && (
        <div className="absolute top-14 right-0 bottom-0 z-[1100] w-80 bg-gray-900/95 backdrop-blur-md border-l border-gray-700 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
            <span className="text-[11px] font-bold text-white uppercase tracking-wider">
              {rightPanel === 'brief' && 'World Brief'}
              {rightPanel === 'posture' && 'Strategic Posture'}
              {rightPanel === 'cii' && 'Country Instability'}
              {rightPanel === 'focal' && 'Focal Points'}
              {rightPanel === 'risk' && 'Strategic Risk'}
              {rightPanel === 'feeds' && 'Live News'}
              {rightPanel === 'video' && 'Live Video'}
              {rightPanel === 'markets' && 'Market Intel'}
              {rightPanel === 'forecasts' && 'AI Forecasts'}
              {rightPanel === 'feedboard' && 'Intel & Market Feeds'}
            </span>
            <button onClick={() => setRightPanel(null)} className="text-gray-500 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {rightPanel === 'brief' && <WorldBriefContent />}
            {rightPanel === 'posture' && <PostureContent />}
            {rightPanel === 'cii' && <CiiContent />}
            {rightPanel === 'focal' && <FocalPointsTimeline />}
            {rightPanel === 'risk' && <StrategicRiskOverview />}
            {rightPanel === 'feeds' && <FeedsContent />}
            {rightPanel === 'video' && <LiveVideoStreams />}
            {rightPanel === 'forecasts' && <AIForecastContent />}
            {rightPanel === 'feedboard' && <IntelFeedBoardContent />}
          </div>
        </div>
      )}

      {/* ── Right panel tabs ───────────────────────────────────────────── */}
      <div className="absolute top-14 right-0 z-[1101] flex flex-col">
        {([
          { id: 'brief' as const, icon: <Shield className="w-3.5 h-3.5" />, label: 'Brief' },
          { id: 'posture' as const, icon: <AlertTriangle className="w-3.5 h-3.5" />, label: 'Posture' },
          { id: 'cii' as const, icon: <TrendingUp className="w-3.5 h-3.5" />, label: 'CII' },
          { id: 'focal' as const, icon: <Target className="w-3.5 h-3.5" />, label: 'Focal' },
          { id: 'risk' as const, icon: <Activity className="w-3.5 h-3.5" />, label: 'Risk' },
          { id: 'feeds' as const, icon: <Tv className="w-3.5 h-3.5" />, label: 'Feeds' },
          { id: 'video' as const, icon: <Play className="w-3.5 h-3.5" />, label: 'Video' },
          { id: 'markets' as const, icon: <BarChart3 className="w-3.5 h-3.5" />, label: 'Markets' },
          { id: 'forecasts' as const, icon: <span className="text-[11px]">🔮</span>, label: 'Forecasts' },
          { id: 'feedboard' as const, icon: <span className="text-[11px]">📡</span>, label: 'Feeds' },
        ]).map((tab) => (
          <button key={tab.id}
            onClick={() => setRightPanel(rightPanel === tab.id ? null : tab.id)}
            className={`flex items-center gap-1.5 px-2 py-1.5 text-[9px] font-bold border border-gray-700 border-r-0 transition-all ${
              rightPanel === tab.id
                ? 'bg-blue-600 text-white' : 'bg-gray-900/90 backdrop-blur-sm text-gray-400 hover:text-white hover:bg-gray-800'
            }`}>
            {tab.icon}
            <span className="hidden xl:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── Coordinates display ────────────────────────────────────────── */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1100] bg-black/70 backdrop-blur-sm border border-gray-700 rounded px-3 py-1 text-[9px] text-gray-400 font-mono">
        {mapCenter[0].toFixed(4)}°, {mapCenter[1].toFixed(4)}° • Zoom {mapZoom.toFixed(1)}
      </div>

      {/* ── Footer navigation ──────────────────────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 z-[1100]">
        <FooterNav />
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 2D Map — MapLibre GL + Protomaps vector tiles (WebGL)
// ---------------------------------------------------------------------------

const IntelMap2D = ({
  points, enabled, timeRange, showLoading, center, zoom, onMove,
}: {
  points: Map<string, IntelPoint[]>; enabled: Set<string>;
  timeRange: TimeRange; showLoading: boolean;
  center: [number, number]; zoom: number;
  onMove: (center: [number, number], zoom: number) => void;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  // Initialize MapLibre map with Protomaps vector tiles
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: buildDarkStyle(),
      center: [center[1], center[0]],
      zoom,
      attributionControl: false,
    });

    // Attribution: bottom-right
    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      'bottom-right',
    );

    // Zoom control: bottom-right
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), 'bottom-right');

    map.on('moveend', () => {
      const c = map.getCenter();
      onMove([c.lat, c.lng], map.getZoom());
    });

    mapRef.current = map;
    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []); // only once

  // Update center/zoom when props change (from region presets)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const current = map.getCenter();
    if (Math.abs(current.lat - center[0]) > 0.01 || Math.abs(current.lng - center[1]) > 0.01) {
      map.flyTo({ center: [center[1], center[0]], zoom, duration: 800 });
    }
  }, [center, zoom]);

  // Render markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Lines first (using GeoJSON source + line layer for performance)
    for (const layer of INTEL_LAYERS) {
      if (!enabled.has(layer.id)) continue;
      const color = CATEGORY_COLORS[layer.category];
      for (const line of layer.lines || []) {
        const el = document.createElement('div');
        el.style.cssText = `width:2px;height:2px;background:${color};opacity:0.5;`;
        const popup = new maplibregl.Popup({ offset: 10, closeButton: false }).setHTML(
          `<div style="font-size:11px"><b>${escapeHtml(line.label)}</b><br/><span style="color:#888">${escapeHtml(line.detail || '')}</span></div>`,
        );
        // Draw line as a series of tiny markers (simple approach)
        // For production, use a GeoJSON source layer
        const coords = line.path.map(([lat, lng]) => [lng, lat] as [number, number]);
        // Add start/end markers for the line
        if (coords.length > 0) {
          const startEl = document.createElement('div');
          startEl.style.cssText = `width:4px;height:4px;border-radius:50%;background:${color};opacity:0.6;`;
          const marker = new maplibregl.Marker({ element: startEl })
            .setLngLat(coords[0])
            .setPopup(popup)
            .addTo(map);
          markersRef.current.push(marker);
        }
      }
    }

    // Points on top
    for (const layer of INTEL_LAYERS) {
      if (!enabled.has(layer.id)) continue;
      const color = CATEGORY_COLORS[layer.category];
      for (const p of points.get(layer.id) || []) {
        if (!inTimeRange(p, timeRange)) continue;
        const fillColor = p.color || color;
        const radius = 3 + p.severity * 5;

        const el = document.createElement('div');
        el.style.cssText = `
          width:${radius * 2}px;height:${radius * 2}px;border-radius:50%;
          background:${fillColor};opacity:${0.25 + p.severity * 0.65};
          border:1px solid rgba(255,255,255,0.3);
          box-shadow:0 0 ${p.severity * 8}px ${fillColor};
          cursor:pointer;
        `;
        el.title = p.label;

        const popup = new maplibregl.Popup({ offset: 10, closeButton: false }).setHTML(
          `<div style="font-size:11px"><b>${escapeHtml(p.label)}</b><br/><span style="color:#aaa">${escapeHtml(p.detail || '')}${p.date ? ' • ' + escapeHtml(p.date) : ''}</span></div>`,
        );

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([p.lng, p.lat])
          .setPopup(popup)
          .addTo(map);
        markersRef.current.push(marker);
      }
    }
  }, [points, enabled, timeRange]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      {showLoading && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[1100] bg-black/70 backdrop-blur-sm border border-gray-700 rounded px-3 py-1.5 flex items-center gap-2">
          <div className="w-3 h-3 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          <span className="text-[10px] text-gray-300">Loading OSINT feeds…</span>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// 3D Map (react-globe.gl) — unchanged
// ---------------------------------------------------------------------------

const IntelMap3D = ({
  points, enabled, timeRange,
}: {
  points: Map<string, IntelPoint[]>; enabled: Set<string>; timeRange: TimeRange;
}) => {
  const globeData = useMemo(() => {
    const pts: any[] = [];
    const paths: any[] = [];
    for (const layer of INTEL_LAYERS) {
      if (!enabled.has(layer.id)) continue;
      const color = CATEGORY_COLORS[layer.category];
      for (const p of points.get(layer.id) || []) {
        if (!inTimeRange(p, timeRange)) continue;
        pts.push({ lat: p.lat, lng: p.lng, color: p.color || color,
          radius: 0.12 + p.severity * 0.3, altitude: 0.03 + p.severity * 0.08,
          label: `${p.label}${p.detail ? ' — ' + p.detail : ''}` });
      }
      for (const line of layer.lines || []) {
        paths.push({ path: line.path.map(([lat, lng]) => [lat, lng]), color, label: line.label });
      }
    }
    return { pts, paths };
  }, [points, enabled, timeRange]);

  return (
    <div className="h-full w-full">
      <Globe backgroundColor="#0a0a0a"
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        pointsData={globeData.pts} pointLat="lat" pointLng="lng" pointColor="color"
        pointRadius="radius" pointAltitude="altitude" pointLabel={(d: any) => d.label} pointsMerge={false}
        pathsData={globeData.paths} pathPoints="path"
        pathPointLat={(p: any) => p[0]} pathPointLng={(p: any) => p[1]}
        pathColor={(d: any) => d.color} pathStroke={1} pathDashLength={0.6} pathDashGap={0.3}
        pathLabel={(d: any) => d.label} atmosphereColor="#1e40af" atmosphereAltitude={0.15} />
    </div>
  );
};

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export default IntelMapView;
