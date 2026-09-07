/**
 * FocalPointsTimeline.tsx — Focal Points & Threat Timeline
 *
 * Displays clustered news signals by country/region along with threat level
 * indicators (Critical, High, Medium) mapped over recent days. Aggregates
 * data from conflict zones, GDELT events, and intel hotspots.
 */

import { useMemo, useState } from 'react';
import { AlertTriangle, Clock, Globe, TrendingUp, ChevronDown, ChevronRight, Filter } from 'lucide-react';
import { conflictZones, borderTensions, countryInstability } from '../data/intelData';

interface FocalPoint {
  id: string;
  region: string;
  country: string;
  threatLevel: 'critical' | 'high' | 'medium' | 'low';
  score: number;
  sources: number;
  signals: string[];
  trend: 'rising' | 'stable' | 'falling';
  lastUpdate: string;
}

function computeFocalPoints(): FocalPoint[] {
  const regionMap = new Map<string, FocalPoint>();

  // Merge conflict zones
  for (const cz of conflictZones) {
    if (cz.severity < 0.5) continue;
    const country = cz.detail?.split(',')[0] || cz.label.split('—')[0].trim();
    const key = country.toLowerCase().replace(/[^a-z]/g, '');

    if (!regionMap.has(key)) {
      regionMap.set(key, {
        id: key,
        region: country,
        country,
        threatLevel: cz.severity >= 0.9 ? 'critical' : cz.severity >= 0.7 ? 'high' : 'medium',
        score: cz.severity * 100,
        sources: 1,
        signals: [],
        trend: 'rising',
        lastUpdate: cz.date || new Date().toISOString().slice(0, 10),
      });
    }
    const fp = regionMap.get(key)!;
    fp.sources++;
    fp.signals.push(cz.label);
    fp.score = Math.max(fp.score, cz.severity * 100);
    fp.threatLevel = fp.score >= 90 ? 'critical' : fp.score >= 70 ? 'high' : fp.score >= 50 ? 'medium' : 'low';
  }

  // Merge border tensions
  for (const bt of borderTensions) {
    if (bt.severity < 0.5) continue;
    const country = bt.label.split('–')[0].trim();
    const key = country.toLowerCase().replace(/[^a-z]/g, '');

    if (!regionMap.has(key)) {
      regionMap.set(key, {
        id: key,
        region: country,
        country,
        threatLevel: 'medium',
        score: bt.severity * 100,
        sources: 1,
        signals: [],
        trend: 'stable',
        lastUpdate: bt.date || new Date().toISOString().slice(0, 10),
      });
    }
    const fp = regionMap.get(key)!;
    fp.sources++;
    fp.signals.push(bt.label);
    fp.score = Math.max(fp.score, bt.severity * 100);
    fp.threatLevel = fp.score >= 90 ? 'critical' : fp.score >= 70 ? 'high' : fp.score >= 50 ? 'medium' : 'low';
  }

  // Merge CII data
  for (const ci of countryInstability) {
    const key = ci.iso.toLowerCase();
    if (!regionMap.has(key)) {
      regionMap.set(key, {
        id: key,
        region: ci.country,
        country: ci.country,
        threatLevel: ci.score >= 80 ? 'critical' : ci.score >= 60 ? 'high' : ci.score >= 40 ? 'medium' : 'low',
        score: ci.score,
        sources: 1,
        signals: ci.factors,
        trend: ci.trend,
        lastUpdate: new Date().toISOString().slice(0, 10),
      });
    }
    const fp = regionMap.get(key)!;
    fp.score = Math.max(fp.score, ci.score);
    fp.trend = ci.trend;
    fp.signals.push(...ci.factors);
    fp.threatLevel = fp.score >= 80 ? 'critical' : fp.score >= 60 ? 'high' : fp.score >= 40 ? 'medium' : 'low';
  }

  return Array.from(regionMap.values()).sort((a, b) => b.score - a.score);
}

const THREAT_COLORS = {
  critical: { bg: 'bg-red-500', text: 'text-white', dot: 'bg-red-500', border: 'border-red-500' },
  high: { bg: 'bg-orange-500', text: 'text-white', dot: 'bg-orange-500', border: 'border-orange-500' },
  medium: { bg: 'bg-yellow-500', text: 'text-arcade-ink', dot: 'bg-yellow-500', border: 'border-yellow-500' },
  low: { bg: 'bg-green-500', text: 'text-white', dot: 'bg-green-500', border: 'border-green-500' },
};

export function FocalPointsTimeline() {
  const [filter, setFilter] = useState<'all' | 'critical' | 'high' | 'medium'>('all');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'score' | 'trend' | 'sources'>('score');

  const focalPoints = useMemo(() => {
    const pts = computeFocalPoints();
    let filtered = filter === 'all' ? pts : pts.filter((p) => p.threatLevel === filter);
    if (sortBy === 'score') filtered.sort((a, b) => b.score - a.score);
    else if (sortBy === 'sources') filtered.sort((a, b) => b.sources - a.sources);
    else filtered.sort((a, b) => {
      const order = { rising: 0, stable: 1, falling: 2 };
      return order[a.trend] - order[b.trend];
    });
    return filtered;
  }, [filter, sortBy]);

  const stats = useMemo(() => {
    const pts = computeFocalPoints();
    return {
      critical: pts.filter((p) => p.threatLevel === 'critical').length,
      high: pts.filter((p) => p.threatLevel === 'high').length,
      medium: pts.filter((p) => p.threatLevel === 'medium').length,
      total: pts.length,
    };
  }, []);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-silver-grey bg-surface/80 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <h2 className="font-headline-md text-[15px] font-semibold text-on-surface">
              Focal Points & Threat Timeline
            </h2>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-on-surface-variant" />
            <span className="text-[10px] text-on-surface-variant">Updated {new Date().toLocaleTimeString()}</span>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-3 mb-2">
          <span className="flex items-center gap-1 text-[10px] font-bold">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            {stats.critical} Critical
          </span>
          <span className="flex items-center gap-1 text-[10px] font-bold">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            {stats.high} High
          </span>
          <span className="flex items-center gap-1 text-[10px] font-bold">
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            {stats.medium} Medium
          </span>
          <span className="text-[10px] text-on-surface-variant ml-auto">{stats.total} total</span>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {(['all', 'critical', 'high', 'medium'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-[9px] px-1.5 py-0.5 font-bold uppercase ${
                  filter === f ? 'bg-primary text-on-primary' : 'bg-surface border border-silver-grey'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="ml-auto flex gap-1">
            {(['score', 'trend', 'sources'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={`text-[9px] px-1.5 py-0.5 font-bold uppercase ${
                  sortBy === s ? 'bg-on-surface text-surface' : 'bg-surface border border-silver-grey'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {focalPoints.map((fp) => {
          const tc = THREAT_COLORS[fp.threatLevel];
          const isExpanded = expanded.has(fp.id);

          return (
            <div
              key={fp.id}
              className={`border-2 rounded-lg overflow-hidden transition-all ${tc.border} bg-surface`}
            >
              <button
                onClick={() => toggle(fp.id)}
                className="w-full flex items-center gap-3 p-3 hover:bg-surface-container-low transition-colors"
              >
                <div className={`w-3 h-3 rounded-full ${tc.dot} shrink-0`} />
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-bold text-on-surface">{fp.region}</span>
                    <span className={`text-[8px] px-1 py-0.5 font-bold uppercase ${tc.bg} ${tc.text}`}>
                      {fp.threatLevel}
                    </span>
                    {fp.trend === 'rising' && (
                      <span className="text-[9px] text-red-500 font-bold">↑ RISING</span>
                    )}
                    {fp.trend === 'falling' && (
                      <span className="text-[9px] text-green-500 font-bold">↓ FALLING</span>
                    )}
                  </div>
                  <p className="text-[10px] text-on-surface-variant mt-0.5">
                    {fp.sources} sources • {fp.signals.length} signals • Score: {Math.round(fp.score)}
                  </p>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-on-surface-variant shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-on-surface-variant shrink-0" />
                )}
              </button>

              {isExpanded && (
                <div className="px-3 pb-3 border-t border-silver-grey/50 pt-2">
                  <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
                    Intelligence Signals
                  </p>
                  <div className="space-y-1">
                    {fp.signals.slice(0, 8).map((sig, i) => (
                      <div key={i} className="flex items-center gap-2 text-[10px] text-on-surface-variant">
                        <span className="w-1 h-1 rounded-full bg-on-surface-variant/40 shrink-0" />
                        <span>{sig}</span>
                      </div>
                    ))}
                    {fp.signals.length > 8 && (
                      <span className="text-[9px] text-on-surface-variant/60">
                        +{fp.signals.length - 8} more signals
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[9px] text-on-surface-variant">Last update: {fp.lastUpdate}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {focalPoints.length === 0 && (
          <div className="text-center py-8">
            <Globe className="w-8 h-8 text-on-surface-variant/40 mx-auto mb-2" />
            <p className="text-[12px] text-on-surface-variant">No focal points match the current filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default FocalPointsTimeline;
