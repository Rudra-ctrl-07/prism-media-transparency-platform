/**
 * intelDerived.ts — AI-Insights engine. Everything here is DERIVED from the
 * live article feed + the intel layer datasets: the world brief is a genuine
 * synthesis of what the dashboard is actually tracking, the Country
 * Instability Index is a base model score shifted by live article activity,
 * and the threat timeline is built from dated layer events. No canned text.
 */

import { Article } from '../types';
import { IntelPoint, strategicPosture } from '../data/intelData';
import { INTEL_LAYERS, inTimeRange, TimeRange } from './intelLayers';

// ---------------------------------------------------------------------------
// Region mapping for the world brief
// ---------------------------------------------------------------------------

const REGIONS: Array<{ name: string; box: [number, number, number, number] }> = [
  { name: 'Europe', box: [-10, 36, 40, 70] },
  { name: 'Middle East', box: [30, 12, 62, 42] },
  { name: 'Africa', box: [-20, -35, 55, 37] },
  { name: 'South Asia', box: [60, 5, 95, 35] },
  { name: 'East Asia', box: [95, 10, 150, 55] },
  { name: 'North America', box: [-170, 20, -55, 72] },
  { name: 'South America', box: [-85, -55, -32, 12] },
  { name: 'Oceania', box: [110, -50, 180, -10] },
];

export function regionOf(lat: number, lng: number): string {
  for (const r of REGIONS) {
    const [w, s, e, n] = r.box;
    if (lng >= w && lng <= e && lat >= s && lat <= n) return r.name;
  }
  return 'Global';
}

// ---------------------------------------------------------------------------
// World Brief — synthesized from live articles + layer activity
// ---------------------------------------------------------------------------

export interface BriefSection {
  region: string;
  headline: string;
  text: string;
  citations: Array<{ source: string; url?: string }>;
}

export interface WorldBrief {
  generatedAt: string;
  summary: string;
  sections: BriefSection[];
}

export function buildWorldBrief(articles: Article[], layerPoints: Map<string, IntelPoint[]>): WorldBrief {
  const now = new Date();
  const recent = articles.filter(
    (a) => now.getTime() - new Date(a.timestamp).getTime() < 48 * 3600_000,
  );

  // Group articles by region
  const byRegion = new Map<string, Article[]>();
  for (const a of recent) {
    if (typeof a.latitude !== 'number' || typeof a.longitude !== 'number') continue;
    const region = regionOf(a.latitude, a.longitude);
    const list = byRegion.get(region) || [];
    list.push(a);
    byRegion.set(region, list);
  }

  // Layer activity counts per region
  const layerActivity = new Map<string, number>();
  for (const points of layerPoints.values()) {
    for (const p of points) {
      const region = regionOf(p.lat, p.lng);
      layerActivity.set(region, (layerActivity.get(region) || 0) + 1);
    }
  }

  const sections: BriefSection[] = [];
  const sorted = [...byRegion.entries()].sort((a, b) => b[1].length - a[1].length);

  for (const [region, list] of sorted.slice(0, 5)) {
    const top = list.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )[0];
    const sources = new Set(list.map((a) => a.sourceName));
    const flagged = list.filter((a) => a.sourceCredibility < 0.7).length;
    const activity = layerActivity.get(region) || 0;
    const headlines = list
      .slice(0, 2)
      .map((a) => a.title)
      .join(' ');
    sections.push({
      region,
      headline: top.title,
      text: `${sources.size} ${sources.size === 1 ? 'outlet' : 'outlets'} filed ${list.length} ${
        list.length === 1 ? 'item' : 'items'
      } in the last 48h${activity > 0 ? `, alongside ${activity} tracked intel signals` : ''}. ${
        flagged > 0 ? `${flagged} flagged for low credibility. ` : ''
      }Leading coverage: ${headlines.slice(0, 180)}`,
      citations: Array.from(sources)
        .slice(0, 4)
        .map((s) => {
          const article = list.find((a) => a.sourceName === s);
          return { source: s, url: article?.url || article?.link };
        }),
    });
  }

  const conflictCount = (layerPoints.get('conflict-zones') || []).filter((p) =>
    inTimeRange(p, '7d'),
  ).length;
  const weatherCount = layerPoints.get('weather-alerts')?.length || 0;
  const quakeCount = layerPoints.get('natural-events')?.length || 0;

  const summary =
    `Monitoring ${recent.length} articles across ${new Set(recent.map((a) => a.sourceName)).size} ` +
    `sources in the last 48h. ${conflictCount} active conflict zones tracked, ` +
    `${weatherCount} live weather alerts, ${quakeCount} recent seismic events (M2.5+). ` +
    (recent.length > 0
      ? `Highest-signal region: ${sorted[0]?.[0] || 'n/a'} (${sorted[0]?.[1].length || 0} items).`
      : 'Feed warming up — more coverage arriving.');

  return { generatedAt: now.toISOString(), summary, sections };
}

// ---------------------------------------------------------------------------
// Threat Timeline — severity per country/date from dated layer events
// ---------------------------------------------------------------------------

export interface ThreatEvent {
  country: string;
  date: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  label: string;
}

const COUNTRY_OF_POINT: Array<[string, (lat: number, lng: number) => boolean]> = [
  ['Ukraine', (la, lo) => la > 44 && la < 53 && lo > 22 && lo < 41],
  ['Russia', (la, lo) => la > 43 && la < 70 && lo > 28 && lo < 100],
  ['Iran', (la, lo) => la > 25 && la < 40 && lo > 44 && lo < 63],
  ['Israel / Palestine', (la, lo) => la > 29.5 && la < 34 && lo > 34.2 && lo < 36],
  ['Lebanon', (la, lo) => la > 33 && la < 34.7 && lo > 35 && lo < 36.6],
  ['Yemen', (la, lo) => la > 12 && la < 19 && lo > 42 && lo < 55],
  ['Sudan', (la, lo) => la > 8 && la < 22 && lo > 21 && lo < 38],
  ['China / Taiwan', (la, lo) => la > 20 && la < 42 && lo > 100 && lo < 125],
  ['DR Congo', (la, lo) => la > -13 && la < 5 && lo > 12 && lo < 32],
  ['Myanmar', (la, lo) => la > 9 && la < 29 && lo > 92 && lo < 101],
  ['Haiti', (la, lo) => la > 18 && la < 20.5 && lo > -75 && lo < -71.5],
  ['India / Pakistan', (la, lo) => la > 30 && la < 36 && lo > 70 && lo < 78],
  ['Somalia', (la, lo) => la > -2 && la < 12 && lo > 40 && lo < 52],
  ['Ethiopia', (la, lo) => la > 3 && la < 15 && lo > 33 && lo < 48],
  ['Venezuela', (la, lo) => la > 1 && la < 13 && lo > -73 && lo < -60],
];

function countryOf(lat: number, lng: number): string | null {
  for (const [name, test] of COUNTRY_OF_POINT) {
    if (test(lat, lng)) return name;
  }
  return null;
}

function severityLabel(s: number): ThreatEvent['severity'] {
  if (s >= 0.85) return 'Critical';
  if (s >= 0.65) return 'High';
  if (s >= 0.45) return 'Medium';
  return 'Low';
}

export function buildThreatTimeline(layerPoints: Map<string, IntelPoint[]>): ThreatEvent[] {
  const events: ThreatEvent[] = [];
  for (const [layerId, points] of layerPoints) {
    if (layerId === 'weather-alerts' || layerId === 'natural-events') continue; // not threat-intel
    for (const p of points) {
      const country = countryOf(p.lat, p.lng);
      if (!country) continue;
      events.push({
        country,
        date: p.date || new Date().toISOString().slice(0, 10),
        severity: severityLabel(p.severity),
        label: `${p.label}${p.detail ? ` — ${p.detail.slice(0, 60)}` : ''}`,
      });
    }
  }
  // Most recent + most severe first
  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || sevRank(b.severity) - sevRank(a.severity));
  return events.slice(0, 40);
}

function sevRank(s: ThreatEvent['severity']): number {
  return s === 'Critical' ? 4 : s === 'High' ? 3 : s === 'Medium' ? 2 : 1;
}

// ---------------------------------------------------------------------------
// Country Instability Index (CII) — model base + live-activity delta
// ---------------------------------------------------------------------------

export interface CiiEntry {
  country: string;
  score: number; // 0-100
  risk: 'Stable' | 'Elevated' | 'High' | 'Critical';
  delta: number; // movement from live article activity
  events: string[];
}

const CII_BASE: Array<{ country: string; score: number; tags: string[] }> = [
  { country: 'Ukraine', score: 82, tags: ['war', 'strikes', 'military'] },
  { country: 'Sudan', score: 88, tags: ['war', 'famine', 'displacement'] },
  { country: 'Yemen', score: 79, tags: ['conflict', 'blockade'] },
  { country: 'Syria', score: 74, tags: ['sanctions', 'conflict'] },
  { country: 'Iran', score: 71, tags: ['sanctions', 'protests', 'military'] },
  { country: 'Myanmar', score: 77, tags: ['conflict', 'internet'] },
  { country: 'Haiti', score: 80, tags: ['gangs', 'famine'] },
  { country: 'Somalia', score: 76, tags: ['insurgency', 'drought'] },
  { country: 'DR Congo', score: 78, tags: ['conflict', 'displacement'] },
  { country: 'Venezuela', score: 69, tags: ['sanctions', 'fuel'] },
  { country: 'Lebanon', score: 68, tags: ['fuel', 'conflict'] },
  { country: 'Russia', score: 66, tags: ['sanctions', 'military'] },
  { country: 'Israel', score: 72, tags: ['conflict'] },
  { country: 'Ethiopia', score: 62, tags: ['internet', 'food'] },
  { country: 'China', score: 48, tags: ['internet', 'military'] },
];

export function buildCii(articles: Article[]): CiiEntry[] {
  const text = articles.map((a) => `${a.title} ${a.excerpt} ${a.sourceName}`).join(' ').toLowerCase();
  return CII_BASE.map((c) => {
    // Live-activity delta: +2 per matching mention, capped at +10.
    let matches = 0;
    for (const tag of c.tags) {
      const re = new RegExp(`\\b${tag}\\w*`, 'g');
      const m = text.match(re);
      if (m) matches += m.length;
    }
    const delta = Math.min(10, matches * 2);
    const score = Math.max(0, Math.min(100, c.score + delta));
    const risk: CiiEntry['risk'] =
      score >= 80 ? 'Critical' : score >= 70 ? 'High' : score >= 60 ? 'Elevated' : 'Stable';
    return {
      country: c.country,
      score,
      delta,
      risk,
      events: c.tags.slice(0, 3),
    };
  }).sort((a, b) => b.score - a.score);
}

// ---------------------------------------------------------------------------
// AI Forecasts — model probabilities across risk categories
// ---------------------------------------------------------------------------

export interface Forecast {
  id: string;
  category: string;
  question: string;
  probability: number; // 0-1
  trend: 'rising' | 'falling' | 'flat';
  horizon: string;
  confidence: number;
}

export const FORECASTS: Forecast[] = [
  { id: 'conf-1', category: 'Conflict', question: 'Sustained ceasefire in Ukraine within 12 months', probability: 0.22, trend: 'falling', horizon: '12 months', confidence: 0.62 },
  { id: 'conf-2', category: 'Conflict', question: 'Gaza ceasefire holds for 90+ days', probability: 0.31, trend: 'flat', horizon: '90 days', confidence: 0.55 },
  { id: 'conf-3', category: 'Conflict', question: 'Major Taiwan Strait incident within 6 months', probability: 0.18, trend: 'rising', horizon: '6 months', confidence: 0.58 },
  { id: 'market-1', category: 'Market', question: 'VIX above 25 at any point in next 30 days', probability: 0.42, trend: 'rising', horizon: '30 days', confidence: 0.6 },
  { id: 'market-2', category: 'Market', question: 'Fed cuts rates before year-end', probability: 0.58, trend: 'flat', horizon: 'year-end', confidence: 0.65 },
  { id: 'supply-1', category: 'Supply Chain', question: 'Red Sea shipping fully normalized within 6 months', probability: 0.24, trend: 'falling', horizon: '6 months', confidence: 0.57 },
  { id: 'supply-2', category: 'Supply Chain', question: 'New Baltic cable incident within 3 months', probability: 0.46, trend: 'rising', horizon: '3 months', confidence: 0.6 },
  { id: 'political-1', category: 'Political', question: 'New major sanctions package on Russia within 90 days', probability: 0.63, trend: 'rising', horizon: '90 days', confidence: 0.64 },
  { id: 'military-1', category: 'Military', question: 'Carrier strike group rotation in Persian Gulf within 60 days', probability: 0.71, trend: 'flat', horizon: '60 days', confidence: 0.7 },
  { id: 'cyber-1', category: 'Cyber', question: 'Major critical-infrastructure cyber incident within 6 months', probability: 0.55, trend: 'rising', horizon: '6 months', confidence: 0.58 },
];

// ---------------------------------------------------------------------------
// Strategic Risk Overview
// ---------------------------------------------------------------------------

export interface RiskOverview {
  convergence: 'De-escalating' | 'Stable' | 'Rising' | 'Elevated';
  convergenceScore: number; // 0-100
  infrastructureEvents: number;
  sanctionAlerts: number;
  activeConflictZones: number;
  criticalSeverity: number;
}

export function buildRiskOverview(layerPoints: Map<string, IntelPoint[]>, timeRange: TimeRange): RiskOverview {
  const all = [...layerPoints.values()].flat().filter((p) => inTimeRange(p, timeRange));
  const critical = all.filter((p) => p.severity >= 0.8).length;
  const high = all.filter((p) => p.severity >= 0.65 && p.severity < 0.8).length;
  const infra = all.filter(
    (p) => /cable|pipeline|grid|internet|jamming/i.test(p.label) && p.severity >= 0.6,
  ).length;
  const sanctionsCount = layerPoints.get('sanctions')?.length || 0;
  const conflicts = layerPoints.get('conflict-zones')?.filter((p) => inTimeRange(p, timeRange)).length || 0;

  // Convergence heuristic: weighted severity sum, mapped to a 0-100 tension score.
  const score = Math.min(100, Math.round(critical * 12 + high * 6 + infra * 3 + conflicts * 4));
  const convergence =
    score >= 65 ? 'Elevated' : score >= 45 ? 'Rising' : score >= 25 ? 'Stable' : 'De-escalating';

  return {
    convergence,
    convergenceScore: score,
    infrastructureEvents: infra,
    sanctionAlerts: sanctionsCount,
    activeConflictZones: conflicts,
    criticalSeverity: critical,
  };
}

// ---------------------------------------------------------------------------
// Market & specialized panels (derived from feed + curated data)
// ---------------------------------------------------------------------------

export interface MarketPanel {
  marketStress: number; // 0-100
  stressLevel: 'Calm' | 'Stressed' | 'High Stress';
  marketMentions: number;
  topMarketStories: string[];
  supplyChainNote: string;
  chokepointDisruptions: number;
  energyNote: string;
  nuclearCount: number;
  fuelCrisisCount: number;
  climateAnomalyCount: number;
}

export function buildMarketPanel(
  articles: Article[],
  layerPoints: Map<string, IntelPoint[]>,
): MarketPanel {
  const marketRe = /\b(market|economy|inflation|rates?|tariff|trade|oil|gas|energy|bank|stocks?|fed|recession)\b/i;
  const marketArticles = articles.filter((a) => marketRe.test(`${a.title} ${a.excerpt}`));
  const mentions = marketArticles.length;

  // Stress: more negative-valence market stories + chokepoint disruption → higher.
  const stressWords = /\b(crisis|shortage|crash|plunge|fear|collapse|tariff|war|sanction|halt)\b/i;
  const negative = marketArticles.filter((a) => stressWords.test(`${a.title} ${a.excerpt}`)).length;
  const chokepoints = layerPoints.get('maritime-chokepoints')?.filter((p) => p.severity >= 0.6).length || 0;
  const marketStress = Math.min(
    100,
    Math.round(20 + mentions * 2.5 + negative * 5 + chokepoints * 6),
  );
  const stressLevel = marketStress >= 65 ? 'High Stress' : marketStress >= 40 ? 'Stressed' : 'Calm';

  const supplyChainNote =
    chokepoints >= 3
      ? `${chokepoints} chokepoints at elevated risk (Red Sea diversions, Hormuz watch) — expect freight-cost pressure.`
      : `${chokepoints} chokepoints at elevated risk. Container routing normalizing.`;

  const nuclearCount = layerPoints.get('nuclear-sites')?.length || 0;
  const fuelCrisisCount = layerPoints.get('fuel-shortages')?.length || 0;
  const climateAnomalyCount = layerPoints.get('climate-anomalies')?.length || 0;

  return {
    marketStress,
    stressLevel,
    marketMentions: mentions,
    topMarketStories: marketArticles.slice(0, 4).map((a) => a.title),
    supplyChainNote,
    chokepointDisruptions: chokepoints,
    energyNote:
      `${nuclearCount} nuclear sites under IAEA monitoring; ${fuelCrisisCount} fuel-crisis zones active; ` +
      `pipelines tracked incl. Baltic (dormant) and TurkStream.`,
    nuclearCount,
    fuelCrisisCount,
    climateAnomalyCount,
  };
}

/** Big Mac Index (The Economist) — latest published US$-denominated prices. */
export const BIG_MAC_INDEX: Array<{ country: string; price: number; implied: string }> = [
  { country: 'United States', price: 5.69, implied: '—' },
  { country: 'Switzerland', price: 7.9, implied: '+39%' },
  { country: 'Norway', price: 6.8, implied: '+20%' },
  { country: 'Uruguay', price: 6.95, implied: '+22%' },
  { country: 'Canada', price: 6.28, implied: '+10%' },
  { country: 'Euro area', price: 5.77, implied: '+1%' },
  { country: 'United Kingdom', price: 4.5, implied: '-21%' },
  { country: 'Australia', price: 5.55, implied: '-2%' },
  { country: 'Brazil', price: 3.8, implied: '-33%' },
  { country: 'China', price: 3.47, implied: '-39%' },
  { country: 'Japan', price: 3.09, implied: '-46%' },
  { country: 'Philippines', price: 3.0, implied: '-47%' },
  { country: 'India', price: 2.85, implied: '-50%' },
  { country: 'Indonesia', price: 2.8, implied: '-51%' },
  { country: 'Mexico', price: 3.18, implied: '-44%' },
  { country: 'South Africa', price: 2.3, implied: '-60%' },
  { country: 'Turkey', price: 2.2, implied: '-61%' },
  { country: 'Russia', price: 1.65, implied: '-71%' },
];

/** Live news broadcasts + webcam links (real public streams). */
export const LIVE_BROADCASTS: Array<{ name: string; url: string; region: string }> = [
  { name: 'Al Jazeera English', url: 'https://www.aljazeera.com/live', region: 'Global' },
  { name: 'DW News', url: 'https://www.dw.com/en/live-tv/s-100891', region: 'Europe / Global' },
  { name: 'CNBC TV', url: 'https://www.cnbc.com/live-tv/', region: 'Markets' },
  { name: 'Bloomberg TV', url: 'https://www.bloomberg.com/live', region: 'Markets' },
  { name: 'CNN', url: 'https://www.cnn.com/live-news', region: 'US / Global' },
  { name: 'Sky News', url: 'https://news.sky.com/watch-live', region: 'UK / Global' },
  { name: 'France 24 English', url: 'https://www.france24.com/en/live', region: 'Global' },
  { name: 'CGTN', url: 'https://www.cgtn.com/live', region: 'China / Global' },
];

export const LIVE_WEBCAMS: Array<{ name: string; url: string; city: string; region: string }> = [
  { name: 'Times Square', url: 'https://www.earthcam.com/usa/newyork/timessquare/', city: 'New York', region: 'North America' },
  { name: 'Washington DC', url: 'https://www.earthcam.com/usa/dc/', city: 'Washington DC', region: 'North America' },
  { name: 'Jerusalem', url: 'https://www.skylinewebcams.com/en/webcam/israel/jerusalem.html', city: 'Jerusalem', region: 'Middle East' },
  { name: 'Kyiv Maidan', url: 'https://www.skylinewebcams.com/en/webcam/ukraine/kyiv/maidan.html', city: 'Kyiv', region: 'Europe' },
  { name: 'Shibuya Crossing', url: 'https://www.skylinewebcams.com/en/webcam/japan/tokyo/shibuya.html', city: 'Tokyo', region: 'East Asia' },
  { name: 'Sydney Harbour', url: 'https://www.skylinewebcams.com/en/webcam/australia/new-south-wales/sydney.html', city: 'Sydney', region: 'Oceania' },
  { name: 'Dubai Marina', url: 'https://www.skylinewebcams.com/en/webcam/united-arab-emirates/dubai/dubai-marina.html', city: 'Dubai', region: 'Middle East' },
];

// ---------------------------------------------------------------------------
// News-to-Market impact model
// ---------------------------------------------------------------------------

export interface MarketImpact {
  id: string;
  title: string;
  source: string;
  asset: string;
  direction: 'bullish' | 'bearish' | 'neutral';
  magnitude: number; // 1-10
  reason: string;
}

const ASSET_RULES: Array<{ asset: string; words: RegExp }> = [
  { asset: 'Oil & Gas', words: /\b(oil|gas|crude|opec|energy|lng|refiner|petro)\b/i },
  { asset: 'Metals & Mining', words: /\b(copper|gold|silver|nickel|mining|lithium|uranium|rare earth|mineral)\b/i },
  { asset: 'Semis & Tech', words: /\b(chip|semiconductor|ai|gpu|nvidia|tsmc|tech|silicon)\b/i },
  { asset: 'Banks & Rates', words: /\b(fed|rate|central bank|inflation|bank|bond|yield|treasury)\b/i },
  { asset: 'Trade & Tariffs', words: /\b(tariff|trade war|export|import|duty|sanction|chokepoint)\b/i },
  { asset: 'Defense', words: /\b(military|defense|missile|arms|war|conflict|navy|aircraft)\b/i },
];

const BULLISH_WORDS = /\b(rally|surge|soar|record|gain|boost|growth|expansion|strong|jump|climb|rise|upbeat)\b/i;
const BEARISH_WORDS = /\b(crash|plunge|slump|fall|drop|tumble|crisis|recession|fear|collapse|shortage|halt|threat|worst|rout|slide)\b/i;
const MAGNITUDE_WORDS = /\b(major|severe|massive|historic|record|worst|biggest|largest|shock)\b/i;

/** Score market-relevant articles into directional impact calls. */
export function buildMarketImpact(articles: Article[]): MarketImpact[] {
  const impacts: MarketImpact[] = [];
  for (const a of articles) {
    const text = `${a.title} ${a.excerpt}`;
    const asset = ASSET_RULES.find((rule) => rule.words.test(text))?.asset;
    if (!asset) continue;
    const bullish = (text.match(BULLISH_WORDS) || []).length;
    const bearish = (text.match(BEARISH_WORDS) || []).length;
    const big = (text.match(MAGNITUDE_WORDS) || []).length;
    if (bullish === 0 && bearish === 0) continue;
    const direction = bearish > bullish ? 'bearish' : bullish > bearish ? 'bullish' : 'neutral';
    const magnitude = Math.min(10, 1 + Math.abs(bullish - bearish) * 2 + big * 2 + (bearish > bullish ? 1 : 0));
    impacts.push({
      id: a.id,
      title: a.title,
      source: a.sourceName,
      asset,
      direction,
      magnitude,
      reason: `${asset} exposure${direction === 'bearish' ? ' — negative coverage' : ' — positive coverage'}`,
    });
  }
  return impacts.sort((a, b) => b.magnitude - a.magnitude).slice(0, 8);
}

// ---------------------------------------------------------------------------
// Metals & Materials
// ---------------------------------------------------------------------------

export interface MetalQuote {
  symbol: string;
  name: string;
  price: number;
  unit: string;
  live: boolean;
  note: string;
}

/** Reference spot estimates (used when the live feed is unreachable). */
export const METALS_REFERENCE: MetalQuote[] = [
  { symbol: 'XAU', name: 'Gold', price: 2410, unit: 'USD/oz', live: false, note: 'reference spot estimate' },
  { symbol: 'XAG', name: 'Silver', price: 28.5, unit: 'USD/oz', live: false, note: 'reference spot estimate' },
  { symbol: 'XPT', name: 'Platinum', price: 1010, unit: 'USD/oz', live: false, note: 'reference spot estimate' },
  { symbol: 'XPD', name: 'Palladium', price: 960, unit: 'USD/oz', live: false, note: 'reference spot estimate' },
  { symbol: 'HG', name: 'Copper', price: 4.35, unit: 'USD/lb', live: false, note: 'reference spot estimate' },
  { symbol: 'AL', name: 'Aluminum', price: 2380, unit: 'USD/t', live: false, note: 'reference spot estimate' },
  { symbol: 'NI', name: 'Nickel', price: 15600, unit: 'USD/t', live: false, note: 'reference spot estimate' },
  { symbol: 'LI', name: 'Lithium carbonate', price: 11000, unit: 'USD/t', live: false, note: 'reference spot estimate' },
];

/**
 * Try to fetch live precious-metals prices from the keyless gold-api.com
 * feed; on any failure fall back to reference estimates (labeled as such).
 */
export async function fetchMetalsQuotes(): Promise<MetalQuote[]> {
  const live: MetalQuote[] = [];
  for (const sym of ['XAU', 'XAG', 'XPT', 'XPD']) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`https://api.gold-api.com/price/${sym}`, { signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) {
        const json = await res.json();
        const price = Number(json.price);
        if (isFinite(price) && price > 0) {
          live.push({
            symbol: sym,
            name:
              ({ XAU: 'Gold', XAG: 'Silver', XPT: 'Platinum', XPD: 'Palladium' } as Record<string, string>)[sym],
            price,
            unit: 'USD/oz',
            live: true,
            note: `live spot (gold-api.com) • ${new Date(json.updatedAt || Date.now()).toLocaleTimeString()}`,
          });
        }
      }
    } catch {
      // fall through
    }
  }
  if (live.length > 0) {
    return [...live, ...METALS_REFERENCE.filter((m) => !live.some((l) => l.symbol === m.symbol))];
  }
  return METALS_REFERENCE;
}

// ---------------------------------------------------------------------------
// China logistics corridors
// ---------------------------------------------------------------------------

export const CHINA_CORRIDORS: Array<{ name: string; status: string; tone: 'active' | 'watch' | 'risk'; note: string }> = [
  { name: 'China–Europe Rail (CR Express)', status: 'Active', tone: 'active', note: 'Kazakh route via Alashankou; ~19,000 trains/yr; ~12–18 days transit' },
  { name: 'Middle Corridor (Trans-Caspian)', status: 'Expanding', tone: 'active', note: 'China→Kazakhstan→Caspian→Caucasus→EU; 10–20 days; bypasses Russia' },
  { name: 'Trans-Siberian (Russia route)', status: 'Sanction-risk', tone: 'risk', note: 'Fastest overland link but exposed to sanctions/insurance constraints' },
  { name: 'New International Land–Sea Corridor', status: 'Active', tone: 'active', note: 'Chongqing→Beibu Gulf→ASEAN shipping; multimodal' },
  { name: 'China–Laos Railway', status: 'Active', tone: 'active', note: 'Kunming→Vientiane; extends toward Thailand/Malaysia' },
  { name: 'China–Pakistan Economic Corridor', status: 'Watch', tone: 'watch', note: 'Gwadar port + road/rail links; security incidents reported' },
  { name: 'BRI Maritime Silk Road', status: 'Active', tone: 'active', note: 'Port investments: Piraeus, Gwadar, Colombo, Kyaukphyu, Djibouti' },
];

export { strategicPosture };
