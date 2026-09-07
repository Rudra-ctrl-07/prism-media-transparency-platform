/**
 * intelLayers.ts — the Intel Map layer registry: 40+ toggleable layers in
 * five categories. Curated layers read bundled real-world datasets
 * (`data/intelData.ts`); two layers are LIVE: NWS weather alerts and USGS
 * earthquakes (both free, keyless public APIs). Live fetches are cached for
 * 60s so toggling layers doesn't hammer the APIs.
 */

import React from 'react';
import {
  IntelLayerDef,
  IntelPoint,
  IntelLine,
  militaryBases,
  conflictZones,
  militaryExercises,
  borderTensions,
  natoPositions,
  gasStorage,
  railCorridors,
  marinePiracy,
  floodZones,
  internetShutdowns,
  launchSites,
  dataCenters,
  nuclearSites,
  gammaIrradiators,
  radiationWatch,
  pipelines,
  fuelShortages,
  underseaCables,
  cableIncidents,
  maritimeChokepoints,
  shipTraffic,
  tradeRoutes,
  aviation,
  fires,
  climateAnomalies,
  internetDisruptions,
  gpsJamming,
  cyberThreats,
  gridStress,
  foodInsecurity,
  protests,
  displacementFlows,
  refugeeCamps,
  sanctions,
  economicCenters,
  criticalMinerals,
  orbitalSurveillance,
  ransomwareAttacks,
  dataBreaches,
  aptCampaigns,
  lngTerminals,
  oilRefineries,
  renewableProjects,
  powerGridLinks,
  migrationRoutes,
  borderCrossings,
  unhcrOperations,
  liveNewsFeeds,
  liveWebcams,
  countryInstability,
  strategicRisks,
  regionPresets,
  LiveFeed,
  LiveWebcam,
  CountryInstability,
  StrategicRisk,
  RegionPreset,
} from '../data/intelData';

// ---------------------------------------------------------------------------
// Layer registry
// ---------------------------------------------------------------------------

export const INTEL_LAYERS: IntelLayerDef[] = [
  // Security & Defense (10)
  { id: 'conflict-zones', label: 'Conflict Zones', category: 'security', points: conflictZones },
  { id: 'aircraft-adsb', label: 'Live Aircraft (ADS-B)', category: 'security', live: true },
  { id: 'military-bases', label: 'Military Bases', category: 'security', points: militaryBases },
  { id: 'military-exercises', label: 'Military Exercises', category: 'security', points: militaryExercises },
  { id: 'border-tensions', label: 'Border Tensions', category: 'security', points: borderTensions },
  { id: 'nato-positions', label: 'NATO Forward Positions', category: 'security', points: natoPositions },
  { id: 'intel-hotspots', label: 'Intel Hotspots', category: 'security', points: [
    { label: 'Taiwan Strait monitoring', lat: 24.5, lng: 119.5, severity: 0.7, date: '2026-08-13', detail: 'High-signal transits' },
    { label: 'Black Sea corridor', lat: 44.5, lng: 33.0, severity: 0.75, date: '2026-08-13', detail: 'Grain corridor, drone strikes' },
    { label: 'Hormuz shipping watch', lat: 26.5, lng: 56.2, severity: 0.7, date: '2026-08-12', detail: 'Seizure risk elevated' },
    { label: 'Sahel SIGINT focus', lat: 14.5, lng: 1.0, severity: 0.6, date: '2026-08-10', detail: 'Drone activity, EW' },
    { label: 'Korean Peninsula DMZ', lat: 38.3, lng: 127.3, severity: 0.65, date: '2026-08-09', detail: 'Ballistic tests, balloon ops' },
    { label: 'Baltic seafloor watch', lat: 56.0, lng: 20.0, severity: 0.65, date: '2026-08-08', detail: 'Cable/vessel anomaly monitoring' },
    { label: 'Indian Ocean naval watch', lat: -5.0, lng: 65.0, severity: 0.5, date: '2026-08-01', detail: 'Task-force transits' },
  ] },
  { id: 'naval-tracking', label: 'Naval Tracking (AIS)', category: 'security', points: [
    { label: 'Carrier strike group — Pacific', lat: 25.0, lng: 145.0, severity: 0.6, date: '2026-08-12', detail: 'CSG underway' },
    { label: 'Carrier strike group — Med', lat: 35.0, lng: 20.0, severity: 0.6, date: '2026-08-11', detail: 'CSG in eastern Med' },
    { label: 'Russian surface group — Black Sea', lat: 44.0, lng: 34.0, severity: 0.7, date: '2026-08-10', detail: 'Patrol + logistics' },
    { label: 'PLA flotilla — East China Sea', lat: 28.0, lng: 124.0, severity: 0.6, date: '2026-08-09', detail: 'Exercise formation' },
    { label: 'Baltic task force', lat: 57.5, lng: 19.5, severity: 0.55, date: '2026-08-08', detail: 'NATO monitoring' },
    { label: 'Gulf escort group', lat: 26.0, lng: 54.0, severity: 0.55, date: '2026-08-07', detail: 'Maritime security ops' },
    { label: 'Indian Ocean solo transit', lat: -10.0, lng: 70.0, severity: 0.5, date: '2026-08-05', detail: 'Unidentified contact' },
  ] },
  { id: 'armed-conflict-events', label: 'Armed Conflict Events', category: 'security', points: [
    { label: 'Strike — Kyiv region', lat: 50.45, lng: 30.52, severity: 0.8, date: '2026-08-13', detail: 'Air-defense engagements' },
    { label: 'Shelling — Donetsk front', lat: 48.02, lng: 37.8, severity: 0.9, date: '2026-08-13', detail: 'Artillery duels' },
    { label: 'Airstrike — Gaza', lat: 31.5, lng: 34.47, severity: 0.9, date: '2026-08-12', detail: 'Reported strike' },
    { label: 'Drone strike — Red Sea', lat: 16.0, lng: 42.0, severity: 0.8, date: '2026-08-12', detail: 'Houthi USV/USV attack' },
    { label: 'Skirmish — Khartoum', lat: 15.5, lng: 32.56, severity: 0.85, date: '2026-08-11', detail: 'RSF/SAF contact' },
    { label: 'Clash — North Kivu', lat: -1.68, lng: 29.22, severity: 0.85, date: '2026-08-10', detail: 'M23 offensive' },
    { label: 'Cross-border — Lebanon', lat: 33.28, lng: 35.57, severity: 0.8, date: '2026-08-10', detail: 'Rocket exchanges' },
    { label: 'IED — Sahel patrol', lat: 13.5, lng: 1.5, severity: 0.7, date: '2026-08-08', detail: 'Ambush reported' },
  ] },

  // Nuclear & Energy (8)
  { id: 'nuclear-sites', label: 'Nuclear Sites', category: 'nuclear', points: nuclearSites },
  { id: 'gamma-irradiators', label: 'Gamma Irradiators', category: 'nuclear', points: gammaIrradiators },
  { id: 'radiation-watch', label: 'Radiation Watch', category: 'nuclear', points: radiationWatch },
  { id: 'pipelines', label: 'Pipelines', category: 'nuclear', lines: pipelines },
  { id: 'gas-storage', label: 'Storage Facilities (gas)', category: 'nuclear', points: gasStorage },
  { id: 'data-centers', label: 'AI Data Centers', category: 'nuclear', points: dataCenters },
  { id: 'fuel-shortages', label: 'Fuel Shortages', category: 'nuclear', points: fuelShortages },
  { id: 'undersea-cables', label: 'Undersea Cables', category: 'nuclear', points: underseaCables },
  { id: 'cable-incidents', label: 'Cable Incidents', category: 'nuclear', points: cableIncidents },

  // Transport & Chokepoints (7)
  { id: 'ship-traffic', label: 'Ship Traffic (AIS density)', category: 'transport', points: shipTraffic },
  { id: 'aviation', label: 'Aviation & Airspace', category: 'transport', points: aviation },
  { id: 'trade-routes', label: 'Trade Routes', category: 'transport', lines: tradeRoutes },
  { id: 'rail-corridors', label: 'Rail Corridors', category: 'transport', lines: railCorridors },
  { id: 'maritime-chokepoints', label: 'Maritime Chokepoints', category: 'transport', points: maritimeChokepoints },
  { id: 'natural-events', label: 'Natural Events (USGS quakes)', category: 'transport', live: true },
  { id: 'weather-alerts', label: 'Weather Alerts (NWS)', category: 'transport', live: true },

  // Disruptions & Hazards (10)
  { id: 'fires', label: 'Fires', category: 'hazards', points: fires },
  { id: 'floods', label: 'Floods', category: 'hazards', points: floodZones },
  { id: 'marine-piracy', label: 'Marine Piracy', category: 'hazards', points: marinePiracy },
  { id: 'climate-anomalies', label: 'Climate Anomalies', category: 'hazards', points: climateAnomalies },
  { id: 'internet-disruptions', label: 'Internet Disruptions', category: 'hazards', points: internetDisruptions },
  { id: 'internet-shutdowns', label: 'Internet Shutdowns', category: 'hazards', points: internetShutdowns },
  { id: 'gps-jamming', label: 'GPS Jamming', category: 'hazards', points: gpsJamming },
  { id: 'cyber-threats', label: 'Cyber Threats', category: 'hazards', points: cyberThreats },
  { id: 'grid-stress', label: 'Grid Stress', category: 'hazards', points: gridStress },
  { id: 'food-insecurity', label: 'Food Insecurity (IPC)', category: 'hazards', points: foodInsecurity },

  // Socio-Political & Economic (7)
  { id: 'protests', label: 'Protests', category: 'socio', points: protests },
  { id: 'displacement-flows', label: 'Displacement Flows', category: 'socio', points: displacementFlows },
  { id: 'refugee-camps', label: 'Refugee Camps', category: 'socio', points: refugeeCamps },
  { id: 'sanctions', label: 'OFAC Sanctions', category: 'socio', points: sanctions },
  { id: 'economic-centers', label: 'Economic Centers', category: 'socio', points: economicCenters },
  { id: 'critical-minerals', label: 'Critical Minerals', category: 'socio', points: criticalMinerals },
  { id: 'orbital-surveillance', label: 'Orbital Surveillance', category: 'socio', points: orbitalSurveillance },
  { id: 'space-launch-sites', label: 'Space Launch Sites', category: 'security', points: launchSites },

  // --- Expanded Cyber layers ---
  { id: 'ransomware-attacks', label: 'Ransomware Attacks', category: 'hazards', points: ransomwareAttacks },
  { id: 'data-breaches', label: 'Data Breaches', category: 'hazards', points: dataBreaches },
  { id: 'apt-campaigns', label: 'APT Campaigns', category: 'hazards', points: aptCampaigns },

  // --- Expanded Energy layers ---
  { id: 'lng-terminals', label: 'LNG Terminals', category: 'nuclear', points: lngTerminals },
  { id: 'oil-refineries', label: 'Oil Refineries', category: 'nuclear', points: oilRefineries },
  { id: 'renewable-projects', label: 'Renewable Mega-Projects', category: 'nuclear', points: renewableProjects },
  { id: 'power-grid-links', label: 'Power Grid Interconnections', category: 'nuclear', lines: powerGridLinks },

  // --- Expanded Migration layers ---
  { id: 'migration-routes', label: 'Migration Routes', category: 'socio', lines: migrationRoutes },
  { id: 'border-crossings', label: 'Border Crossing Hotspots', category: 'socio', points: borderCrossings },
  { id: 'unhcr-operations', label: 'UNHCR Major Operations', category: 'socio', points: unhcrOperations },

  // --- OSINT Live Layers (500+ feeds) ---
  { id: 'nasa-firms', label: '🔥 NASA FIRMS (Live Fires)', category: 'hazards', live: true },
  { id: 'aviation-live', label: '✈️ OpenSky Live Aviation', category: 'transport', live: true },
  { id: 'eonet-events', label: '🌍 NASA EONET (Natural Events)', category: 'hazards', live: true },
  { id: 'eccc-alerts', label: '🇨🇦 ECCC Weather Alerts', category: 'transport', live: true },
  { id: 'wmo-swic', label: '🌍 WMO Severe Weather', category: 'transport', live: true },
  { id: 'noaa-alerts', label: '🇺🇸 NOAA Active Alerts', category: 'transport', live: true },
  { id: 'gdelt-events', label: '📰 GDELT Global Events', category: 'socio', live: true },
  { id: 'acled-events', label: '⚔️ ACLED Conflict Events', category: 'security', live: true },
  { id: 'ais-traffic', label: '🚢 AIS Live Ship Traffic', category: 'transport', live: true },
  { id: 'satellite-tracks', label: '🛰️ Satellite Tracking (SGP4)', category: 'security', live: true },
];

export const INTEL_LAYER_COUNT = INTEL_LAYERS.length;

// ---------------------------------------------------------------------------
// Live fetchers (NWS alerts + USGS earthquakes), cached 60s
// ---------------------------------------------------------------------------

const liveCache = new Map<string, { at: number; points: IntelPoint[] }>();
const LIVE_TTL_MS = 60_000;

async function fetchWithTimeout(url: string, ms = 8000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchLiveWithTimeout(url: string, ms = 8000): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/** NWS active weather alerts (US) — free keyless public API. NWS policy
 *  requires a descriptive User-Agent; without one it returns 400. */
async function fetchNwsAlerts(): Promise<IntelPoint[]> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch('https://api.weather.gov/alerts/active', {
      signal: controller.signal,
      headers: { 'User-Agent': 'PRISM-OSINT-Dashboard/1.0 (geopolitical intelligence dashboard; contact: prism@example.com)' },
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const features: any[] = Array.isArray(json?.features) ? json.features : [];
    return features
      .map((f) => {
        const props = f.properties || {};
        const geo = f.geometry || {};
        let lat: number | null = null;
        let lng: number | null = null;
        if (geo.type === 'Point') {
          lng = geo.coordinates?.[0];
          lat = geo.coordinates?.[1];
        } else if (geo.type === 'Polygon') {
          const ring = geo.coordinates?.[0]?.[0];
          if (ring) { lng = ring[0]; lat = ring[1]; }
        }
        if (lat == null || lng == null) return null;
        const sev = String(props.severity || 'Minor').toUpperCase();
        const severity = sev === 'EXTREME' ? 1 : sev === 'SEVERE' ? 0.8 : sev === 'MODERATE' ? 0.6 : 0.4;
        return {
          label: `${props.event || 'Weather alert'} — ${props.areaDesc?.split(';')[0] || ''}`.slice(0, 60),
          lat, lng, severity,
          date: new Date().toISOString().slice(0, 10),
          detail: `${props.headline || ''}`.slice(0, 90),
        } as IntelPoint;
      })
      .filter(Boolean) as IntelPoint[];
  } catch {
    return [];
  }
}

/** USGS live earthquakes (2.5+, past day) — free keyless public API. */
async function fetchUsgsQuakes(): Promise<IntelPoint[]> {
  try {
    const json = await fetchLiveWithTimeout(
      'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson',
    );
    const features: any[] = Array.isArray(json?.features) ? json.features : [];
    return features.slice(0, 60).map((f) => {
      const props = f.properties || {};
      const [lng, lat] = f.geometry?.coordinates || [];
      const mag = typeof props.mag === 'number' ? props.mag : 0;
      return {
        label: `${props.place || 'Earthquake'} (M${mag.toFixed(1)})`.slice(0, 60),
        lat, lng,
        severity: Math.min(1, Math.max(0.35, mag / 8)),
        date: new Date(props.time || Date.now()).toISOString().slice(0, 10),
        detail: `Magnitude ${mag.toFixed(1)} • ${new Date(props.time).toLocaleString()}`,
      } as IntelPoint;
    });
  } catch {
    return [];
  }
}

/** Live ADS-B aircraft (proxied through the backend → OpenSky, server-cached). */
async function fetchAircraft(): Promise<IntelPoint[]> {
  try {
    const res = await fetchWithTimeout('/api/live/adsb', 8000);
    if (!res.ok) return [];
    const json = await res.json();
    const states: any[] = Array.isArray(json.states) ? json.states : [];
    return states.map((s) => ({
      label: s.callsign || s.icao24 || 'Aircraft',
      lat: s.lat,
      lng: s.lng,
      severity: s.military ? 0.85 : 0.4,
      date: new Date().toISOString().slice(0, 10),
      color: s.military ? '#f87171' : '#34d399',
      detail:
        `${s.origin || 'Unknown origin'} • ` +
        `${s.altitude != null ? Math.round(s.altitude * 3.281).toLocaleString() + ' ft' : 'ground'}` +
        `${s.velocity != null ? ' • ' + Math.round(s.velocity * 1.944).toLocaleString() + ' kt' : ''}` +
        `${s.military ? ' • likely military' : ''}`,
    }));
  } catch {
    return [];
  }
}

/** Fetch a layer's points; live layers hit their API (cached), others read bundled data. */
export async function getLayerPoints(layer: IntelLayerDef): Promise<IntelPoint[]> {
  if (!layer.live) return layer.points || [];
  const cached = liveCache.get(layer.id);
  if (cached && Date.now() - cached.at < LIVE_TTL_MS) return cached.points;

  let points: IntelPoint[] = [];
  if (layer.id === 'weather-alerts') points = await fetchNwsAlerts();
  else if (layer.id === 'natural-events') points = await fetchUsgsQuakes();
  else if (layer.id === 'aircraft-adsb') points = await fetchAircraft();
  else if (layer.id === 'nasa-firms') { const { fetchNasaFirms } = await import('./osintFetchers'); points = await fetchNasaFirms(); }
  else if (layer.id === 'aviation-live') { const { fetchOpenSkyFlights } = await import('./osintFetchers'); points = await fetchOpenSkyFlights(); }
  else if (layer.id === 'eonet-events') { const { fetchNasaEonet } = await import('./osintFetchers'); points = await fetchNasaEonet(); }
  else if (layer.id === 'eccc-alerts') { const { fetchEcccAlerts } = await import('./osintFetchers'); points = await fetchEcccAlerts(); }
  else if (layer.id === 'wmo-swic') { const { fetchWmoSwic } = await import('./osintFetchers'); points = await fetchWmoSwic(); }
  else if (layer.id === 'noaa-alerts') { const { fetchNoaaAlerts } = await import('./osintFetchers'); points = await fetchNoaaAlerts(); }
  else if (layer.id === 'gdelt-events') { const { fetchGdeltGeolocated } = await import('./osintFetchers'); points = await fetchGdeltGeolocated(); }
  else if (layer.id === 'acled-events') { const { fetchAcledEvents } = await import('./osintFetchers'); points = await fetchAcledEvents(); }
  else if (layer.id === 'ais-traffic') { const { fetchAisShipTraffic } = await import('./osintFetchers'); points = await fetchAisShipTraffic(); }
  else if (layer.id === 'satellite-tracks') { const { fetchSatellitePositions } = await import('./satelliteTracker'); points = await fetchSatellitePositions(); }
  liveCache.set(layer.id, { at: Date.now(), points });
  return points;
}

/** Bypass the client cache for a live layer (used for periodic ADS-B refresh). */
export async function refreshLiveLayer(layerId: string): Promise<IntelPoint[]> {
  const layer = INTEL_LAYERS.find((l) => l.id === layerId);
  if (!layer || !layer.live) return [];
  liveCache.delete(layerId);
  return getLayerPoints(layer);
}

/** Reset the live cache (used by tests). */
export function resetIntelLiveCache(): void {
  liveCache.clear();
}

/**
 * React hook: fetch (and cache) points for a set of layers. Returns a map
 * keyed by layer id. Refetches when the requested id set changes.
 */
export function useIntelLayerPoints(layerIds: string[]): Map<string, IntelPoint[]> {
  const [points, setPoints] = React.useState<Map<string, IntelPoint[]>>(new Map());
  const key = layerIds.slice().sort().join(',');

  React.useEffect(() => {
    let cancelled = false;
    const ids = key ? key.split(',') : [];
    (async () => {
      const next = new Map<string, IntelPoint[]>();
      await Promise.all(
        ids.map(async (id) => {
          const layer = INTEL_LAYERS.find((l) => l.id === id);
          if (!layer) return;
          try {
            next.set(id, await getLayerPoints(layer));
          } catch {
            next.set(id, layer.points || []);
          }
        }),
      );
      if (!cancelled) setPoints(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [key]);

  return points;
}

// ---------------------------------------------------------------------------
// Time-range filter
// ---------------------------------------------------------------------------

export type TimeRange = '1h' | '6h' | '24h' | '48h' | '7d' | '30d' | 'all';

export const TIME_RANGES: { id: TimeRange; label: string }[] = [
  { id: '1h', label: '1h' },
  { id: '6h', label: '6h' },
  { id: '24h', label: '24h' },
  { id: '48h', label: '48h' },
  { id: '7d', label: '7d' },
  { id: 'all', label: 'All-time' },
];

/** True when a point's date falls within the range. Undated reference data is always shown. */
export function inTimeRange(point: { date?: string }, range: TimeRange, now = new Date()): boolean {
  if (!point.date || range === 'all') return true;
  const t = new Date(point.date).getTime();
  if (isNaN(t)) return true;
  const hours =
    range === '1h' ? 1
    : range === '6h' ? 6
    : range === '24h' ? 24
    : range === '48h' ? 48
    : range === '7d' ? 24 * 7
    : range === '30d' ? 24 * 30
    : 0;
  return now.getTime() - t <= hours * 3600_000;
}

// ---------------------------------------------------------------------------
// Rendering helpers
// ---------------------------------------------------------------------------

export const CATEGORY_COLORS: Record<string, string> = {
  security: '#ef4444', // Geopolitical & Military — red
  nuclear: '#f59e0b', // Infrastructure & Trade — amber
  transport: '#3b82f6', // Transport & Chokepoints — blue
  hazards: '#8b5cf6', // Environmental & Risk — purple
  socio: '#10b981', // Socio-Political & Economic — green
};

export function severityColor(severity: number, base: string): string {
  // Blend severity into marker opacity/glow — color stays category-based for
  // readability, opacity conveys severity.
  return base;
}

/** Category label lookup. */
export function categoryLabel(category: string): string {
  return (
    {
      security: 'Geopolitical & Military',
      nuclear: 'Infrastructure & Trade',
      transport: 'Transport & Chokepoints',
      hazards: 'Environmental & Risk',
      socio: 'Socio-Political & Economic',
    }[category] || category
  );
}

export function linesOf(layer: IntelLayerDef): IntelLine[] {
  return layer.lines || [];
}
