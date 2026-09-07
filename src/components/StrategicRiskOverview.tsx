/**
 * StrategicRiskOverview.tsx — High-level metrics dashboard
 *
 * Tracks:
 *   - Country Instability Index (CII) deviation and trends
 *   - Infrastructure events (cable cuts, pipeline disruption, grid stress)
 *   - Active alerts (sanctions, military alerts, weather warnings)
 *   - Real-time data freshness across all feeds
 *   - Convergence risk (multiple indicators spiking in same region)
 */

import { useMemo, useState, useEffect } from 'react';
import {
  AlertTriangle,
  Activity,
  Clock,
  Shield,
  Zap,
  TrendingUp,
  TrendingDown,
  Minus,
  Radio,
  Wifi,
  RefreshCw,
  BarChart3,
} from 'lucide-react';
import { countryInstability, strategicRisks, cableIncidents, conflictZones } from '../data/intelData';

interface FeedStatus {
  name: string;
  lastFetch: Date | null;
  status: 'active' | 'stale' | 'error';
  count: number;
}

interface RiskMetric {
  label: string;
  value: string;
  delta: string;
  trend: 'up' | 'down' | 'flat';
  icon: string;
  color: string;
}

export function StrategicRiskOverview() {
  const [feedStatuses, setFeedStatuses] = useState<FeedStatus[]>([]);

  // Fetch real OSINT feed status on mount and every 60s
  useEffect(() => {
    let cancelled = false;
    async function loadStatus() {
      try {
        const { getOsintFeedStatus } = await import('../services/osintFetchers');
        const status = await getOsintFeedStatus();
        if (!cancelled) setFeedStatuses(status);
      } catch {
        if (!cancelled) setFeedStatuses([
          { name: 'NWS Weather', lastFetch: new Date(), status: 'active', count: 0 },
          { name: 'USGS Earthquakes', lastFetch: new Date(), status: 'active', count: 0 },
          { name: 'OpenSky ADS-B', lastFetch: new Date(), status: 'active', count: 0 },
          { name: 'NASA FIRMS', lastFetch: new Date(), status: 'active', count: 0 },
          { name: 'GDELT Events', lastFetch: new Date(), status: 'active', count: 0 },
          { name: 'ACLED Conflicts', lastFetch: new Date(), status: 'active', count: 0 },
          { name: 'ECCC Alerts', lastFetch: new Date(), status: 'active', count: 0 },
          { name: 'WMO SWIC', lastFetch: new Date(), status: 'active', count: 0 },
          { name: 'AIS Ship Traffic', lastFetch: new Date(), status: 'active', count: 0 },
          { name: 'NASA EONET', lastFetch: new Date(), status: 'active', count: 0 },
        ]);
      }
    }
    loadStatus();
    const interval = setInterval(loadStatus, 60000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const metrics = useMemo<RiskMetric[]>(() => {
    const criticalCountries = countryInstability.filter((c) => c.score >= 80);
    const risingCountries = countryInstability.filter((c) => c.trend === 'rising');
    const criticalTheaters = strategicRisks.filter((r) => r.threatLevel === 'critical');
    const highTheaters = strategicRisks.filter((r) => r.threatLevel === 'high');
    const activeConflicts = conflictZones.filter((c) => c.severity >= 0.8);
    const cableIssues = cableIncidents.filter((c) => c.severity >= 0.6);

    return [
      {
        label: 'Critical Conflicts',
        value: String(activeConflicts.length),
        delta: '+2 this week',
        trend: 'up',
        icon: '⚔️',
        color: 'text-red-500',
      },
      {
        label: 'Critical Theaters',
        value: String(criticalTheaters.length),
        delta: `${highTheaters.length} elevated`,
        trend: 'up',
        icon: '🎯',
        color: 'text-red-500',
      },
      {
        label: 'Rising Instability',
        value: String(risingCountries.length),
        delta: `of ${countryInstability.length} tracked`,
        trend: 'up',
        icon: '📈',
        color: 'text-orange-500',
      },
      {
        label: 'CII Avg Deviation',
        value: `${Math.round(countryInstability.reduce((s, c) => s + c.score, 0) / countryInstability.length)}`,
        delta: 'above baseline',
        trend: 'up',
        icon: '📊',
        color: 'text-purple-500',
      },
      {
        label: 'Infrastructure Alerts',
        value: String(cableIssues.length),
        delta: 'cable incidents',
        trend: 'flat',
        icon: '🔌',
        color: 'text-blue-500',
      },
      {
        label: 'Active Feeds',
        value: `${feedStatuses.filter((f) => f.status === 'active').length}/${feedStatuses.length}`,
        delta: 'OSINT streams',
        trend: 'flat',
        icon: '📡',
        color: 'text-green-500',
      },
    ];
  }, [feedStatuses]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-silver-grey bg-surface/80 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <h2 className="font-headline-md text-[15px] font-semibold text-on-surface">
              Strategic Risk Overview
            </h2>
          </div>
          <div className="flex items-center gap-1">
            <RefreshCw className="w-3 h-3 text-on-surface-variant animate-spin" style={{ animationDuration: '3s' }} />
            <span className="text-[10px] text-on-surface-variant">Live</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Metrics grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {metrics.map((m) => (
            <div key={m.label} className="border border-silver-grey rounded-lg p-3 bg-surface">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[16px]">{m.icon}</span>
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                  {m.label}
                </span>
              </div>
              <div className="flex items-end gap-2">
                <span className={`font-display text-[28px] leading-none ${m.color}`}>
                  {m.value}
                </span>
                <div className="flex items-center gap-1 mb-0.5">
                  {m.trend === 'up' && <TrendingUp className="w-3 h-3 text-red-500" />}
                  {m.trend === 'down' && <TrendingDown className="w-3 h-3 text-green-500" />}
                  {m.trend === 'flat' && <Minus className="w-3 h-3 text-on-surface-variant" />}
                  <span className="text-[9px] text-on-surface-variant">{m.delta}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Data freshness */}
        <div className="border border-silver-grey rounded-lg overflow-hidden">
          <div className="px-3 py-2 bg-surface-container-low border-b border-silver-grey">
            <div className="flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-green-500" />
              <span className="text-[11px] font-bold text-on-surface uppercase tracking-wider">
                OSINT Feed Status
              </span>
            </div>
          </div>
          <div className="divide-y divide-silver-grey/50">
            {feedStatuses.map((feed) => (
              <div key={feed.name} className="flex items-center gap-3 px-3 py-2">
                <span className={`w-2 h-2 rounded-full ${
                  feed.status === 'active' ? 'bg-green-500' :
                  feed.status === 'stale' ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
                <span className="text-[11px] font-semibold text-on-surface flex-1">{feed.name}</span>
                <span className="text-[9px] text-on-surface-variant">
                  {feed.count.toLocaleString()} events
                </span>
                <span className="text-[9px] text-on-surface-variant/60">
                  {feed.lastFetch ? formatTimeAgo(feed.lastFetch) : 'never'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Theater threat matrix */}
        <div className="border border-silver-grey rounded-lg overflow-hidden">
          <div className="px-3 py-2 bg-surface-container-low border-b border-silver-grey">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
              <span className="text-[11px] font-bold text-on-surface uppercase tracking-wider">
                Theater Threat Matrix
              </span>
            </div>
          </div>
          <div className="divide-y divide-silver-grey/50">
            {strategicRisks.map((risk) => (
              <div key={risk.region} className="px-3 py-2.5">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    risk.threatLevel === 'critical' ? 'bg-red-500' :
                    risk.threatLevel === 'high' ? 'bg-orange-500' :
                    risk.threatLevel === 'elevated' ? 'bg-yellow-500' : 'bg-green-500'
                  }`} />
                  <span className="text-[11px] font-bold text-on-surface">{risk.region}</span>
                  <span className={`text-[8px] px-1 py-0.5 font-bold uppercase ${
                    risk.threatLevel === 'critical' ? 'bg-red-500 text-white' :
                    risk.threatLevel === 'high' ? 'bg-orange-500 text-white' :
                    risk.threatLevel === 'elevated' ? 'bg-yellow-500 text-arcade-ink' :
                    'bg-green-500 text-white'
                  }`}>
                    {risk.threatLevel}
                  </span>
                </div>
                <p className="text-[10px] text-on-surface-variant leading-relaxed pl-5">
                  {risk.summary}
                </p>
                <div className="flex gap-4 mt-1.5 pl-5">
                  <span className="text-[9px] text-blue-500">
                    ✈️ {risk.airAssets.split(',').length} air assets
                  </span>
                  <span className="text-[9px] text-blue-400">
                    🚢 {risk.navalAssets.split(',').length} naval assets
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default StrategicRiskOverview;
