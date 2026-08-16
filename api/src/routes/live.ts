/**
 * live.ts — live telemetry proxies for the OSINT command center.
 *
 * These endpoints fetch real-time public data SERVER-SIDE (avoiding CORS and
 * keeping API keys out of the browser) and cache aggressively so free-tier
 * rate limits are respected.
 *
 * /api/live/adsb — live aircraft positions from the OpenSky Network
 * (https://opensky-network.org). Anonymous tier allows ~400 requests/day and
 * requires ≥10s between requests, so we cache for 5 minutes: worst case ~288
 * upstream calls/day, and every client request is served from cache.
 */

import { Router } from 'express';

const router = Router();

// ---------------------------------------------------------------------------
// ADS-B (OpenSky Network)
// ---------------------------------------------------------------------------

export interface AdsbState {
  icao24: string;
  callsign: string | null;
  origin: string | null;
  lat: number | null;
  lng: number | null;
  altitude: number | null; // meters (barometric)
  velocity: number | null; // m/s
  onGround: boolean;
  military: boolean;
}

/**
 * OpenSky state rows:
 * [icao24, callsign, origin_country, time_position, last_contact, longitude,
 *  latitude, baro_altitude, on_ground, velocity, true_track, vertical_rate,
 *  sensors, geo_altitude, squawk, spi, position_source, category]
 */
export function compactAdsbStates(rows: any[]): AdsbState[] {
  const out: AdsbState[] = [];
  for (const r of rows) {
    if (!Array.isArray(r) || r.length < 9) continue;
    const icao24 = String(r[0] || '').toUpperCase();
    const lat = typeof r[6] === 'number' ? r[6] : null;
    const lng = typeof r[5] === 'number' ? r[5] : null;
    if (lat == null || lng == null) continue;
    out.push({
      icao24,
      callsign: r[1] ? String(r[1]).trim() : null,
      origin: r[2] ? String(r[2]) : null,
      lat,
      lng,
      altitude: typeof r[7] === 'number' ? r[7] : null,
      velocity: typeof r[9] === 'number' ? r[9] : null,
      onGround: Boolean(r[8]),
      military: isLikelyMilitary(String(r[1] || ''), String(r[0] || '')),
    });
  }
  return out;
}

/**
 * Heuristic for likely-military aircraft: NATO/callsign patterns used by
 * military flights (REACH, RCH, GAF, NATO, SENTRY, TIGER, DUKE, JAKE, BONZO,
 * GUARDDOG, CONVOY, GHOST, COPTER, plus callsigns ending in specific tags).
 * This is a best-effort signal, not a definitive registry.
 */
export function isLikelyMilitary(callsign: string, icao24: string): boolean {
  const cs = callsign.trim().toUpperCase();
  if (!cs) return false;
  const PATTERNS = [
    'NATO', 'REACH', 'RCH', 'GAF', 'AMC', 'SENTRY', 'TIGER', 'DUKE', 'JAKE',
    'BONZO', 'GUARDDOG', 'CONVOY', 'GHOST', 'COPTER', 'MIL', 'USAF', 'RCH',
    'FALCON', 'FORCE', 'FIGHTER', 'HOMER', 'QUID', 'COBRA', 'VIPER', 'DEMON',
  ];
  if (PATTERNS.some((p) => cs.startsWith(p))) return true;
  // Six-letter alphanumeric with no digits is a common non-civil pattern
  if (/^[A-Z]{6}$/.test(cs)) return true;
  return false;
}

let adsbCache: { at: number; data: { time: number; states: AdsbState[] } } | null = null;
const ADSB_CACHE_MS = 5 * 60_000; // 5 min — respects OpenSky anonymous quota

router.get('/adsb', async (_req, res) => {
  if (adsbCache && Date.now() - adsbCache.at < ADSB_CACHE_MS) {
    return res.json({ ...adsbCache.data, cached: true });
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    const resp = await fetch('https://opensky-network.org/api/states/all', {
      signal: controller.signal,
      headers: { 'User-Agent': 'PRISM-OSINT/1.0' },
    });
    clearTimeout(timer);
    if (!resp.ok) throw new Error(`OpenSky HTTP ${resp.status}`);
    const json: any = await resp.json();
    let states = compactAdsbStates(json.states || []);
    // Cap for the map: sample evenly so global coverage is preserved.
    const MAX = 800;
    if (states.length > MAX) {
      const step = Math.ceil(states.length / MAX);
      states = states.filter((_, i) => i % step === 0).slice(0, MAX);
    }
    adsbCache = { at: Date.now(), data: { time: Number(json.time) || Date.now(), states } };
    res.json({ ...adsbCache.data, cached: false });
  } catch (error) {
    console.error('[live] OpenSky fetch failed:', (error as Error).message);
    // Serve stale cache when upstream fails — stale positions beat nothing.
    if (adsbCache) {
      return res.json({ ...adsbCache.data, cached: true, stale: true });
    }
    res.status(502).json({ error: 'ADS-B feed unavailable', states: [] });
  }
});

export default router;
