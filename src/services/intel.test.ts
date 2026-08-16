import { describe, it, expect } from 'vitest';
import {
  INTEL_LAYERS,
  INTEL_LAYER_COUNT,
  inTimeRange,
  getLayerPoints,
  categoryLabel,
  TIME_RANGES,
} from './intelLayers';
import {
  buildWorldBrief,
  buildThreatTimeline,
  buildCii,
  buildRiskOverview,
  buildMarketPanel,
  buildMarketImpact,
  FORECASTS,
  BIG_MAC_INDEX,
  METALS_REFERENCE,
  CHINA_CORRIDORS,
  LIVE_BROADCASTS,
  LIVE_WEBCAMS,
} from './intelDerived';
import { intelCategories } from '../data/intelData';
import { Article } from '../types';

const demoArticle = (over: Partial<Article> = {}): Article => ({
  id: 'a1',
  title: 'Central bank holds rates steady amid inflation concerns',
  excerpt: 'Markets reacted calmly to the decision, analysts say.',
  category: 'Business',
  sourceName: 'BBC News',
  sourceCredibility: 0.85,
  biasRating: 'Center',
  verificationStatus: 'VERIFIED',
  timestamp: new Date().toISOString(),
  latitude: 51.5,
  longitude: -0.12,
  ...over,
});

describe('intel layer registry', () => {
  it('defines 40+ layers across the five categories', () => {
    expect(INTEL_LAYER_COUNT).toBeGreaterThanOrEqual(40);
    const cats = new Set(INTEL_LAYERS.map((l) => l.category));
    expect(cats.size).toBe(intelCategories.length);
    // Every layer has data or is live
    for (const layer of INTEL_LAYERS) {
      const hasData = (layer.points && layer.points.length > 0) || (layer.lines && layer.lines.length > 0) || layer.live;
      expect(hasData, `layer ${layer.id} has no data`).toBe(true);
    }
  });

  it('every layer id is unique', () => {
    const ids = INTEL_LAYERS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('labels categories correctly', () => {
    expect(categoryLabel('security')).toBe('Security & Defense');
    expect(categoryLabel('nuclear')).toBe('Energy & Infrastructure');
  });

  it('time range filtering respects date windows', () => {
    const now = new Date('2026-08-13T12:00:00Z');
    const old = { date: '2026-08-01T00:00:00Z' };
    const fresh = { date: '2026-08-12T00:00:00Z' };
    expect(inTimeRange(old, '7d', now)).toBe(false);
    expect(inTimeRange(fresh, '7d', now)).toBe(true);
    expect(inTimeRange(old, 'all', now)).toBe(true);
    expect(inTimeRange(fresh, '1h', now)).toBe(false);
    expect(inTimeRange({}, '24h', now)).toBe(true); // undated reference data always shown
    expect(inTimeRange(fresh, '30d', now)).toBe(true);
  });

  it('serves curated layer points synchronously', async () => {
    const layer = INTEL_LAYERS.find((l) => l.id === 'conflict-zones')!;
    const points = await getLayerPoints(layer);
    expect(points.length).toBeGreaterThan(10);
    expect(points[0]).toHaveProperty('lat');
    expect(points[0]).toHaveProperty('severity');
  });

  it('bundles real nuclear sites with coordinates', async () => {
    const layer = INTEL_LAYERS.find((l) => l.id === 'nuclear-sites')!;
    const points = await getLayerPoints(layer);
    const zaporizhzhia = points.find((p) => p.label.includes('Zaporizhzhia'));
    expect(zaporizhzhia).toBeTruthy();
    expect(zaporizhzhia!.lat).toBeCloseTo(47.5, 0);
  });
});

describe('intel derived intelligence', () => {
  it('synthesizes a world brief from live articles', () => {
    const articles = [
      demoArticle({ id: '1', title: 'Ukraine strikes reported near Kharkiv', latitude: 49.99, longitude: 36.23, timestamp: new Date(Date.now() - 3600_000).toISOString() }),
      demoArticle({ id: '2', title: 'Gaza ceasefire talks resume', latitude: 31.5, longitude: 34.47, timestamp: new Date(Date.now() - 7200_000).toISOString() }),
      demoArticle({ id: '3', title: 'Taiwan semiconductor exports surge', latitude: 24.5, longitude: 121.0, timestamp: new Date(Date.now() - 1800_000).toISOString() }),
    ];
    const brief = buildWorldBrief(articles, new Map());
    expect(brief.summary.length).toBeGreaterThan(20);
    expect(brief.sections.length).toBeGreaterThanOrEqual(2);
    expect(brief.sections[0].region.length).toBeGreaterThan(0);
  });

  it('builds a threat timeline with severity buckets', () => {
    const layerPoints = new Map<string, any[]>();
    layerPoints.set('conflict-zones', [
      { label: 'Ukraine war', lat: 48.3, lng: 37.8, severity: 1, date: '2026-08-13' },
      { label: 'Kashmir', lat: 33.0, lng: 74.5, severity: 0.6, date: '2026-08-02' },
      { label: 'Taiwan Strait', lat: 24.5, lng: 119.5, severity: 0.7, date: '2026-08-06' },
    ]);
    const timeline = buildThreatTimeline(layerPoints);
    expect(timeline.length).toBe(3);
    expect(timeline[0].severity).toBe('Critical'); // Ukraine
    expect(timeline.some((t) => t.country === 'China / Taiwan')).toBe(true);
    // Sorted most recent first
    expect(new Date(timeline[0].date).getTime()).toBeGreaterThanOrEqual(
      new Date(timeline[timeline.length - 1].date).getTime(),
    );
  });

  it('computes CII with a live activity delta', () => {
    const articles = [
      demoArticle({ id: '1', title: 'Sanctions on Russia expanded; military buildup near Ukraine' }),
      demoArticle({ id: '2', title: 'More sanctions announced on Russian energy' }),
    ];
    const cii = buildCii(articles);
    const russia = cii.find((c) => c.country === 'Russia')!;
    expect(russia.delta).toBeGreaterThan(0);
    expect(russia.score).toBeGreaterThan(66); // base 66 + delta
    // Sorted by score desc
    for (let i = 1; i < cii.length; i++) {
      expect(cii[i - 1].score).toBeGreaterThanOrEqual(cii[i].score);
    }
  });

  it('computes a risk overview with convergence + counters', () => {
    const layerPoints = new Map<string, any[]>();
    layerPoints.set('conflict-zones', [
      { label: 'Ukraine', lat: 48, lng: 38, severity: 1, date: '2026-08-13' },
      { label: 'Gaza', lat: 31.5, lng: 34.5, severity: 1, date: '2026-08-13' },
    ]);
    layerPoints.set('cable-incidents', [
      { label: 'Baltic cable damage', lat: 55.5, lng: 19.5, severity: 0.75, date: '2024-11-18' },
    ]);
    const risk = buildRiskOverview(layerPoints, '7d');
    expect(risk.activeConflictZones).toBe(2);
    expect(risk.criticalSeverity).toBe(2);
    expect(risk.convergenceScore).toBeGreaterThan(0);
  });

  it('builds a market panel derived from feed + chokepoints', () => {
    const articles = [
      demoArticle({ id: '1', title: 'Oil prices plunge as tariffs spark recession fears' }),
      demoArticle({ id: '2', title: 'Markets calm ahead of Fed decision' }),
    ];
    const layerPoints = new Map<string, any[]>();
    layerPoints.set('maritime-chokepoints', [
      { label: 'Hormuz', lat: 26.5, lng: 56.2, severity: 0.85 },
      { label: 'Bab-el-Mandeb', lat: 12.5, lng: 43.3, severity: 0.85 },
    ]);
    const panel = buildMarketPanel(articles, layerPoints);
    expect(panel.marketMentions).toBe(2);
    expect(panel.chokepointDisruptions).toBe(2);
    expect(panel.stressLevel).toBe('Stressed');
    expect(panel.marketStress).toBeGreaterThanOrEqual(40);
    expect(panel.supplyChainNote).toContain('2');
    expect(panel.nuclearCount).toBe(0); // layer not provided
  });

  it('provides forecasts and the Big Mac Index datasets', () => {
    expect(FORECASTS.length).toBeGreaterThanOrEqual(8);
    expect(new Set(FORECASTS.map((f) => f.category)).size).toBeGreaterThanOrEqual(5);
    for (const f of FORECASTS) {
      expect(f.probability).toBeGreaterThanOrEqual(0);
      expect(f.probability).toBeLessThanOrEqual(1);
    }
    expect(BIG_MAC_INDEX.length).toBeGreaterThan(10);
    const us = BIG_MAC_INDEX.find((b) => b.country === 'United States')!;
    expect(us.price).toBeCloseTo(5.69, 1);
  });

  it('defines every time range the UI uses', () => {
    expect(TIME_RANGES.map((r) => r.id)).toEqual(['1h', '6h', '24h', '48h', '7d', 'all']);
  });
});

describe('news-to-market impact model', () => {
  it('scores bearish oil coverage as a bearish Oil & Gas impact', () => {
    const impacts = buildMarketImpact([
      demoArticle({ id: '1', title: 'Oil prices plunge as recession fears hit crude demand' }),
    ]);
    expect(impacts).toHaveLength(1);
    expect(impacts[0].asset).toBe('Oil & Gas');
    expect(impacts[0].direction).toBe('bearish');
    expect(impacts[0].magnitude).toBeGreaterThan(3);
  });

  it('scores a gold surge as bullish Metals & Mining', () => {
    const impacts = buildMarketImpact([
      demoArticle({ id: '2', title: 'Gold surges to record high as safe-haven demand jumps' }),
    ]);
    expect(impacts[0].asset).toBe('Metals & Mining');
    expect(impacts[0].direction).toBe('bullish');
  });

  it('ignores articles with no market signal', () => {
    const impacts = buildMarketImpact([
      demoArticle({ id: '3', title: 'Local festival draws record crowds' }),
    ]);
    expect(impacts).toHaveLength(0);
  });

  it('sorts by magnitude descending and caps at 8', () => {
    const articles = Array.from({ length: 12 }, (_, i) =>
      demoArticle({
        id: `m${i}`,
        title: i % 2 === 0 ? 'Crude crashes as tariffs spark fears' : 'Semiconductor rally boosts chip makers',
      }),
    );
    const impacts = buildMarketImpact(articles);
    expect(impacts.length).toBeLessThanOrEqual(8);
    for (let i = 1; i < impacts.length; i++) {
      expect(impacts[i - 1].magnitude).toBeGreaterThanOrEqual(impacts[i].magnitude);
    }
  });
});

describe('markets & media reference data', () => {
  it('provides reference metal quotes with sane prices', () => {
    expect(METALS_REFERENCE.length).toBeGreaterThanOrEqual(6);
    for (const m of METALS_REFERENCE) {
      expect(m.price).toBeGreaterThan(0);
      expect(m.unit.length).toBeGreaterThan(0);
    }
    const gold = METALS_REFERENCE.find((m) => m.symbol === 'XAU')!;
    expect(gold.price).toBeGreaterThan(1000);
  });

  it('defines China logistics corridors with statuses', () => {
    expect(CHINA_CORRIDORS.length).toBeGreaterThanOrEqual(5);
    for (const c of CHINA_CORRIDORS) {
      expect(['active', 'watch', 'risk']).toContain(c.tone);
      expect(c.name.length).toBeGreaterThan(0);
    }
    expect(CHINA_CORRIDORS.some((c) => c.name.includes('Trans-Caspian'))).toBe(true);
  });

  it('includes CNN broadcast and Kyiv webcam from the spec', () => {
    expect(LIVE_BROADCASTS.some((b) => b.name.includes('CNN'))).toBe(true);
    expect(LIVE_BROADCASTS.some((b) => b.name.includes('Bloomberg'))).toBe(true);
    expect(LIVE_WEBCAMS.some((w) => w.city === 'Kyiv')).toBe(true);
    expect(LIVE_WEBCAMS.some((w) => w.city === 'Jerusalem')).toBe(true);
    expect(LIVE_WEBCAMS.some((w) => w.city === 'Washington DC')).toBe(true);
  });
});
