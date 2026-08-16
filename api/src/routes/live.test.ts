import { describe, it, expect } from 'vitest';
import { compactAdsbStates, isLikelyMilitary } from './live';

// OpenSky state row shape:
// [icao24, callsign, origin_country, time_position, last_contact, longitude,
//  latitude, baro_altitude, on_ground, velocity, true_track, vertical_rate,
//  sensors, geo_altitude, squawk, spi, position_source, category]
const row = (over: Partial<Record<number, any>> = {}) => {
  const base: any[] = [
    'abc123', 'UAL1234', 'United States', 1786600000, 1786600000,
    2.35, 48.85, 10668, 0, 250, 180, 0, null, 10660, 1234, false, 0, 0,
  ];
  for (const [idx, val] of Object.entries(over)) base[Number(idx)] = val;
  return base;
};

describe('compactAdsbStates', () => {
  it('compacts valid rows into the frontend shape', () => {
    const out = compactAdsbStates([row()]);
    expect(out).toHaveLength(1);
    const a = out[0];
    expect(a.icao24).toBe('ABC123'); // uppercased
    expect(a.callsign).toBe('UAL1234');
    expect(a.origin).toBe('United States');
    expect(a.lat).toBeCloseTo(48.85, 2);
    expect(a.lng).toBeCloseTo(2.35, 2);
    expect(a.altitude).toBeCloseTo(10668, 0);
    expect(a.velocity).toBeCloseTo(250, 0);
    expect(a.onGround).toBe(false);
  });

  it('drops rows without a position', () => {
    const bad = row();
    bad[5] = null; // longitude
    const out = compactAdsbStates([bad]);
    expect(out).toHaveLength(0);
  });

  it('treats missing fields as null rather than crashing', () => {
    const sparse = [null, undefined, [], row({ 1: null, 7: null, 9: null })];
    const out = compactAdsbStates(sparse as any[]);
    expect(out).toHaveLength(1);
    expect(out[0].callsign).toBeNull();
    expect(out[0].altitude).toBeNull();
    expect(out[0].velocity).toBeNull();
  });

  it('flags likely-military aircraft via the heuristic', () => {
    const militaryRow = row({ 1: 'RCH145' });
    const out = compactAdsbStates([militaryRow]);
    expect(out[0].military).toBe(true);
  });
});

describe('isLikelyMilitary', () => {
  it('recognizes common military callsign patterns', () => {
    for (const cs of ['RCH145', 'REACH911', 'GAF660', 'NATO32', 'SENTRY60', 'FALCON1', 'COPTER57']) {
      expect(isLikelyMilitary(cs, 'abc')).toBe(true);
    }
  });

  it('does not flag civilian callsigns', () => {
    for (const cs of ['UAL1234', 'DLH456', 'SWA2203', 'AAL123', 'BAW117']) {
      expect(isLikelyMilitary(cs, 'abc')).toBe(false);
    }
  });

  it('flags six-letter alphanumeric callsigns with no digits (common military pattern)', () => {
    expect(isLikelyMilitary('QUIDXX', 'abc')).toBe(true);
    expect(isLikelyMilitary('ABCDEF', 'abc')).toBe(true);
  });

  it('returns false for empty callsigns', () => {
    expect(isLikelyMilitary('', 'abc')).toBe(false);
    expect(isLikelyMilitary('   ', 'abc')).toBe(false);
  });
});
