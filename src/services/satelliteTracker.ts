/**
 * satelliteTracker.ts — SGP4-based satellite position calculator.
 *
 * Uses Two-Line Element (TLE) sets from Celestrak/Space-Track to compute
 * real-time satellite positions in the browser. Implements a simplified
 * SGP4 propagator for the key military/reconnaissance/Starlink constellations.
 *
 * Sources:
 *   - Celestrak TLE data: https://celestrak.org/NORAD/elements/
 *   - Space-Track: https://www.space-track.org/
 *   - JSO: https://github.com/Hamswan/SGP4 (simplified implementation)
 */

import { IntelPoint } from '../data/intelData';

// ---------------------------------------------------------------------------
// TLE data for key satellites (updated batch)
// ---------------------------------------------------------------------------

export interface TleSatellite {
  name: string;
  noradId: string;
  tle1: string;
  tle2: string;
  category: 'military' | 'reconnaissance' | 'navigation' | 'communication' | 'science' | 'starlink';
}

/**
 * Key military/reconnaissance satellites with approximate TLE data.
 * In production, these would be fetched from Celestrak API.
 */
export const KEY_SATELLITES: TleSatellite[] = [
  // US Military / Reconnaissance
  { name: 'USA-326 (KH-11)', noradId: '54216', tle1: '1 54216U 22085A   24245.50000000  .00000000  00000-0  00000-0 0  9990', tle2: '2 54216  97.9000  15.0000 0002000  90.0000 270.1000 14.80000000 10000', category: 'reconnaissance' },
  { name: 'USA-338 (NROL)', noradId: '57053', tle1: '1 57053U 23078A   24245.50000000  .00000000  00000-0  00000-0 0  9990', tle2: '2 57053  63.4000  45.0000 0001000  90.0000 270.1000 15.20000000  5000', category: 'military' },
  { name: 'USA-340 (SBIRS GEO-6)', noradId: '57300', tle1: '1 57300U 23089A   24245.50000000  .00000000  00000-0  00000-0 0  9990', tle2: '2 57300   0.0500  82.0000 0000100  90.0000 270.1000  1.00270000  3000', category: 'military' },
  { name: 'USA-314 (GPS III-6)', noradId: '55268', tle1: '1 55268U 23009A   24245.50000000  .00000000  00000-0  00000-0 0  9990', tle2: '2 55268  55.0000  30.0000 0000500  90.0000 270.1000  2.00500000  8000', category: 'navigation' },

  // Russian Military
  { name: 'Kosmos-2560 (Tundra)', noradId: '54362', tle1: '1 54362U 22089A   24245.50000000  .00000000  00000-0  00000-0 0  9990', tle2: '2 54362  63.8000 100.0000 0003000  90.0000 270.1000  2.00200000  5000', category: 'military' },
  { name: 'Kosmos-2558 (Lotos)', noradId: '53360', tle1: '1 53360U 22063A   24245.50000000  .00000000  00000-0  00000-0 0  9990', tle2: '2 53360  67.1000 130.0000 0001000  90.0000 270.1000 14.40000000  3000', category: 'reconnaissance' },

  // Chinese Military
  { name: 'Yaogan-35A', noradId: '49326', tle1: '1 49326U 21108A   24245.50000000  .00000000  00000-0  00000-0 0  9990', tle2: '2 49326  35.0000 200.0000 0001000  90.0000 270.1000 15.00000000  6000', category: 'reconnaissance' },
  { name: 'Yaogan-35B', noradId: '49327', tle1: '1 49327U 21108B   24245.50000000  .00000000  00000-0  00000-0 0  9990', tle2: '2 49327  35.0000 200.0000 0001000  90.0000 270.1000 15.00000000  6001', category: 'reconnaissance' },

  // Science / Weather
  { name: 'ISS (ZARYA)', noradId: '25544', tle1: '1 25544U 98067A   24245.50000000  .00016717  00000-0  10270-3 0  9005', tle2: '2 25544  51.6400 250.0000 0007000 280.0000 180.1000 15.49000000400000', category: 'science' },
  { name: 'Hubble Space Telescope', noradId: '20580', tle1: '1 20580U 90037B   24245.50000000  .00001200  00000-0  60000-4 0  9000', tle2: '2 20580  28.4700 240.0000 0002700 120.0000 290.1000 15.09000000 20000', category: 'science' },
];

// ---------------------------------------------------------------------------
// Simplified SGP4 propagator
// ---------------------------------------------------------------------------

const DEG2RAD = Math.PI / 180;
const AU_KM = 149597870.7;
const EARTH_RADIUS_KM = 6371.0;
const J2000 = Date.UTC(2000, 0, 1, 12, 0, 0);

function julianDate(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}

function gmst(jd: number): number {
  const T = (jd - 2451545.0) / 36525.0;
  let theta = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T;
  return ((theta % 360) + 360) % 360;
}

/**
 * Parse TLE and compute approximate satellite position.
 * This is a simplified propagation — for full accuracy, use a proper SGP4 library.
 */
export function propagateTle(
  tle1: string,
  tle2: string,
  date: Date
): { lat: number; lng: number; altKm: number } | null {
  try {
    // Parse orbital elements from TLE
    const epochYear = parseInt(tle1.substring(18, 20));
    const epochDay = parseFloat(tle1.substring(20, 32));
    const epoch = epochYear < 57 ? 2000 + epochYear : 1900 + epochYear;

    const i = parseFloat(tle2.substring(8, 16)) * DEG2RAD; // inclination
    const raan = parseFloat(tle2.substring(17, 25)) * DEG2RAD; // RAAN
    const e = parseFloat('0.' + tle2.substring(26, 33)); // eccentricity
    const argp = parseFloat(tle2.substring(34, 42)) * DEG2RAD; // arg of perigee
    const mm = parseFloat(tle2.substring(52, 63)); // mean motion (rev/day)
    const M0 = parseFloat(tle2.substring(43, 51)) * DEG2RAD; // mean anomaly at epoch

    // Semi-major axis from mean motion
    const n = (mm * 2 * Math.PI) / 86400; // rad/s
    const mu = 398600.4418; // km³/s²
    const a = Math.pow(mu / (n * n), 1 / 3); // km

    // Time since epoch
    const epochDate = new Date(Date.UTC(epoch, 0, 1) + (epochDay - 1) * 86400000);
    const dt = (date.getTime() - epochDate.getTime()) / 1000; // seconds

    // Mean anomaly at time t
    const M = M0 + n * dt;

    // Solve Kepler's equation iteratively
    let E = M;
    for (let iter = 0; iter < 15; iter++) {
      E = M + e * Math.sin(E);
    }

    // True anomaly
    const nu = 2 * Math.atan2(
      Math.sqrt(1 + e) * Math.sin(E / 2),
      Math.sqrt(1 - e) * Math.cos(E / 2)
    );

    // Radius
    const r = a * (1 - e * Math.cos(E));

    // Position in orbital plane
    const xOrb = r * Math.cos(nu);
    const yOrb = r * Math.sin(nu);

    // Rotation to ECI
    const cosRaan = Math.cos(raan);
    const sinRaan = Math.sin(raan);
    const cosArgp = Math.cos(argp);
    const sinArgp = Math.sin(argp);
    const cosI = Math.cos(i);
    const sinI = Math.sin(i);

    const xEci = (cosRaan * cosArgp - sinRaan * sinArgp * cosI) * xOrb +
                 (-cosRaan * sinArgp - sinRaan * cosArgp * cosI) * yOrb;
    const yEci = (sinRaan * cosArgp + cosRaan * sinArgp * cosI) * xOrb +
                 (-sinRaan * sinArgp + cosRaan * cosArgp * cosI) * yOrb;
    const zEci = (sinArgp * sinI) * xOrb + (cosArgp * sinI) * yOrb;

    // Convert ECI to lat/lng
    const altKm = Math.sqrt(xEci * xEci + yEci * yEci + zEci * zEci) - EARTH_RADIUS_KM;
    const lat = Math.asin(zEci / Math.sqrt(xEci * xEci + yEci * yEci + zEci * zEci)) / DEG2RAD;
    const lngRad = Math.atan2(yEci, xEci);
    const gst = gmst(julianDate(date)) * DEG2RAD;
    let lng = ((lngRad - gst) / DEG2RAD + 540) % 360 - 180;

    return { lat, lng, altKm };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compute positions of all key satellites at the given time.
 * Returns IntelPoint[] for map rendering.
 */
export async function fetchSatellitePositions(date = new Date()): Promise<IntelPoint[]> {
  const points: IntelPoint[] = [];

  for (const sat of KEY_SATELLITES) {
    const pos = propagateTle(sat.tle1, sat.tle2, date);
    if (!pos) continue;

    const colorMap = {
      military: '#ff4444',
      reconnaissance: '#ff6666',
      navigation: '#4488ff',
      communication: '#44ddff',
      science: '#44ff88',
      starlink: '#aaaaaa',
    };

    points.push({
      label: `🛰️ ${sat.name}`,
      lat: pos.lat,
      lng: pos.lng,
      severity: sat.category === 'military' || sat.category === 'reconnaissance' ? 0.8 : 0.4,
      date: date.toISOString().slice(0, 10),
      color: colorMap[sat.category],
      detail: `${sat.category.toUpperCase()} • ALT: ${Math.round(pos.altKm)} km • NORAD: ${sat.noradId}`,
    });
  }

  return points;
}

/**
 * Fetch live TLE data from Celestrak for Starlink constellation.
 */
export async function fetchStarlinkPositions(): Promise<IntelPoint[]> {
  try {
    const res = await fetch(
      'https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=tle',
      { signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) return [];
    const text = await res.text();
    const lines = text.trim().split('\n').filter((l) => l.trim());

    const points: IntelPoint[] = [];
    const now = new Date();

    // Process in batches (every 50th satellite for performance)
    for (let i = 0; i < Math.min(lines.length, 300); i += 3) {
      const name = lines[i]?.trim();
      const tle1 = lines[i + 1]?.trim();
      const tle2 = lines[i + 2]?.trim();
      if (!tle1 || !tle2 || !tle1.startsWith('1 ') || !tle2.startsWith('2 ')) continue;

      const pos = propagateTle(tle1, tle2, now);
      if (!pos || pos.altKm < 300 || pos.altKm > 600) continue; // Starlink ~550km

      points.push({
        label: name || 'Starlink',
        lat: pos.lat,
        lng: pos.lng,
        severity: 0.15,
        date: now.toISOString().slice(0, 10),
        color: '#666666',
        detail: `LEO ~${Math.round(pos.altKm)} km • Starlink constellation`,
      });

      if (points.length >= 100) break; // Limit for performance
    }

    return points;
  } catch {
    return [];
  }
}
