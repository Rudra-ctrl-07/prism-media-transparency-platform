/**
 * IntelBriefView — AI Insights & Real-Time Summaries.
 *
 * World Brief (synthesized from live coverage), Threat Timeline (severity per
 * country/date from dated intel events), Strategic Posture (air/naval asset
 * deployment across active theaters), AI Forecasts (probability models),
 * Country Instability Index (base model + live-activity delta), and a
 * Strategic Risk Overview.
 */

import { useMemo, useState } from 'react';
import { AlertTriangle, BrainCircuit, Crosshair, Radar, ShieldAlert, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { Article } from '../types';
import { strategicPosture } from '../data/intelData';
import { useIntelLayerPoints, INTEL_LAYERS, TimeRange } from '../services/intelLayers';
import {
  buildWorldBrief,
  buildThreatTimeline,
  buildCii,
  buildRiskOverview,
  FORECASTS,
  ThreatEvent,
} from '../services/intelDerived';

const BRIEF_LAYER_IDS = INTEL_LAYERS.map((l) => l.id);

export const IntelBriefView = ({ articles }: { articles: Article[] }) => {
  const layerPoints = useIntelLayerPoints(BRIEF_LAYER_IDS);
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [briefTab, setBriefTab] = useState<'brief' | 'threats' | 'posture' | 'forecasts' | 'cii'>('brief');

  const brief = useMemo(() => buildWorldBrief(articles, layerPoints), [articles, layerPoints]);
  const threats = useMemo(() => buildThreatTimeline(layerPoints), [layerPoints]);
  const cii = useMemo(() => buildCii(articles), [articles]);
  const risk = useMemo(() => buildRiskOverview(layerPoints, timeRange), [layerPoints, timeRange]);

  const briefSections = brief.sections;

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 space-y-5">
      {/* Risk overview strip */}
      <RiskStrip risk={risk} />

      {/* Tab navigation */}
      <div className="flex flex-wrap items-center gap-1.5">
        <TabButton active={briefTab === 'brief'} onClick={() => setBriefTab('brief')} icon={<BrainCircuit className="w-3.5 h-3.5" />} label="World Brief" />
        <TabButton active={briefTab === 'threats'} onClick={() => setBriefTab('threats')} icon={<AlertTriangle className="w-3.5 h-3.5" />} label="Threat Timeline" count={threats.length} />
        <TabButton active={briefTab === 'posture'} onClick={() => setBriefTab('posture')} icon={<Crosshair className="w-3.5 h-3.5" />} label="Strategic Posture" />
        <TabButton active={briefTab === 'forecasts'} onClick={() => setBriefTab('forecasts')} icon={<Radar className="w-3.5 h-3.5" />} label="AI Forecasts" />
        <TabButton active={briefTab === 'cii'} onClick={() => setBriefTab('cii')} icon={<ShieldAlert className="w-3.5 h-3.5" />} label="Instability Index" />
      </div>

      {briefTab === 'brief' && (
        <div className="space-y-4">
          <div className="border border-silver-grey rounded-xl p-5 bg-surface-container-lowest">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-label-sm font-semibold uppercase tracking-wider text-on-surface">
                World Brief
              </h3>
              <span className="text-[10px] text-on-surface-variant">
                {new Date(brief.generatedAt).toLocaleTimeString()} • derived from {articles.length} live articles
              </span>
            </div>
            <p className="text-body-md text-on-surface leading-relaxed">{brief.summary}</p>
          </div>

          {briefSections.length === 0 ? (
            <p className="text-label-sm text-on-surface-variant/60 border border-silver-grey rounded-lg p-4">
              No geolocated coverage in the last 48h yet — the brief updates as articles stream in.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {briefSections.map((s) => (
                <div key={s.region} className="border border-silver-grey rounded-xl p-4 bg-surface-container-lowest">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-transparency-teal">
                    {s.region}
                  </span>
                  <h4 className="font-headline-md text-[15px] font-semibold text-on-surface leading-snug mt-1 mb-1.5">
                    {s.headline}
                  </h4>
                  <p className="text-[12px] text-on-surface-variant leading-relaxed">{s.text}</p>
                  {s.citations.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2.5 border-t border-silver-grey">
                      {s.citations.map((c) =>
                        c.url ? (
                          <a
                            key={c.source}
                            href={c.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-transparency-teal border border-transparency-teal/30 rounded px-1.5 py-0.5 hover:bg-transparency-teal/10 transition-colors"
                          >
                            {c.source} ↗
                          </a>
                        ) : (
                          <span
                            key={c.source}
                            className="text-[10px] text-on-surface-variant/70 border border-silver-grey rounded px-1.5 py-0.5"
                          >
                            {c.source}
                          </span>
                        ),
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {briefTab === 'threats' && (
        <div className="border border-silver-grey rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-silver-grey bg-surface-container-low flex items-center justify-between">
            <h3 className="text-label-sm font-semibold uppercase tracking-wider text-on-surface">
              Threat Timeline & Snapshot
            </h3>
            <div className="flex items-center gap-1 bg-surface-container-lowest border border-silver-grey rounded-lg p-0.5">
              {(['7d', '30d', 'all'] as TimeRange[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium ${timeRange === r ? 'bg-primary text-on-primary' : 'text-on-surface-variant'}`}
                >
                  {r === 'all' ? 'All' : r}
                </button>
              ))}
            </div>
          </div>
          <div className="divide-y divide-silver-grey max-h-[60vh] overflow-y-auto">
            {threats.length === 0 ? (
              <p className="p-4 text-label-sm text-on-surface-variant/60">No dated threat events in range.</p>
            ) : (
              threats.map((t, i) => <ThreatRow key={i} event={t} />)
            )}
          </div>
        </div>
      )}

      {briefTab === 'posture' && (
        <div className="space-y-3">
          <p className="text-label-sm text-on-surface-variant">
            Real-time air and naval asset deployment status across active theaters (model estimate, updated daily).
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {strategicPosture.map((t) => (
              <div key={t.theater} className="border border-silver-grey rounded-xl p-4 bg-surface-container-lowest">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-label-md font-semibold text-on-surface">{t.theater}</h4>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      t.posture === 'Critical'
                        ? 'bg-error/15 text-error'
                        : t.posture === 'High'
                        ? 'bg-amber-400/15 text-amber-400'
                        : 'bg-transparency-teal/15 text-transparency-teal'
                    }`}
                  >
                    {t.posture.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-4 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase tracking-wider text-on-surface-variant">Air</span>
                    <span className="text-lg font-semibold text-on-surface">{t.air}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase tracking-wider text-on-surface-variant">Naval</span>
                    <span className="text-lg font-semibold text-on-surface">{t.naval}</span>
                  </div>
                  <div className="ml-auto flex items-end gap-0.5 h-8">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <span
                        key={i}
                        className="w-1.5 rounded-sm"
                        style={{
                          height: `${30 + ((t.air + t.naval * 2 + i * 7) % 50)}%`,
                          backgroundColor: i < Math.ceil((t.air + t.naval) / 30) ? '#22c55e' : '#0a0a0a',
                        }}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-[11px] text-on-surface-variant">{t.note}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {briefTab === 'forecasts' && (
        <div className="space-y-3">
          <p className="text-label-sm text-on-surface-variant">
            Predictive probability models across risk categories (model estimates, not guarantees).
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FORECASTS.map((f) => (
              <div key={f.id} className="border border-silver-grey rounded-xl p-4 bg-surface-container-lowest">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-transparency-teal">{f.category}</span>
                  <span className="text-[10px] text-on-surface-variant">{f.horizon}</span>
                </div>
                <p className="text-label-md text-on-surface leading-snug mb-2.5">{f.question}</p>
                <div className="flex items-center gap-2.5">
                  <div className="flex-1 h-2 bg-surface-container-high rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${f.probability * 100}%`,
                        backgroundColor: f.probability >= 0.6 ? '#ef4444' : f.probability >= 0.4 ? '#ff4fd8' : '#22c55e',
                      }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-on-surface w-11 text-right">
                    {(f.probability * 100).toFixed(0)}%
                  </span>
                  {f.trend === 'rising' ? (
                    <TrendingUp className="w-4 h-4 text-error" />
                  ) : f.trend === 'falling' ? (
                    <TrendingDown className="w-4 h-4 text-transparency-teal" />
                  ) : (
                    <Minus className="w-4 h-4 text-on-surface-variant/50" />
                  )}
                </div>
                <p className="text-[10px] text-on-surface-variant/70 mt-1.5">
                  confidence {(f.confidence * 100).toFixed(0)}%
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {briefTab === 'cii' && (
        <div className="space-y-3">
          <p className="text-label-sm text-on-surface-variant">
            Country Instability Index — model base score shifted live by article activity in the current feed.
          </p>
          <div className="border border-silver-grey rounded-xl overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-surface-container-low text-[10px] uppercase tracking-wider text-on-surface-variant">
                <tr>
                  <th className="px-4 py-2.5">Country</th>
                  <th className="px-4 py-2.5 w-40">Score</th>
                  <th className="px-4 py-2.5">Risk</th>
                  <th className="px-4 py-2.5 hidden md:table-cell">Live delta</th>
                  <th className="px-4 py-2.5 hidden lg:table-cell">Signals</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-silver-grey">
                {cii.map((c) => (
                  <tr key={c.country} className="hover:bg-surface-container-lowest/60">
                    <td className="px-4 py-2.5 text-label-sm font-medium text-on-surface">{c.country}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${c.score}%`,
                              backgroundColor: c.score >= 80 ? '#ef4444' : c.score >= 70 ? '#ff4fd8' : c.score >= 60 ? '#4fc3f7' : '#22c55e',
                            }}
                          />
                        </div>
                        <span className="text-label-sm font-semibold text-on-surface w-8 text-right">{c.score}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          c.risk === 'Critical'
                            ? 'bg-error/15 text-error'
                            : c.risk === 'High'
                            ? 'bg-amber-400/15 text-amber-400'
                            : c.risk === 'Elevated'
                            ? 'bg-violet-400/15 text-violet-300'
                            : 'bg-transparency-teal/15 text-transparency-teal'
                        }`}
                      >
                        {c.risk.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-label-sm hidden md:table-cell">
                      <span className={c.delta > 0 ? 'text-error' : 'text-on-surface-variant'}>
                        {c.delta > 0 ? `+${c.delta}` : '0'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 hidden lg:table-cell">
                      <div className="flex gap-1">
                        {c.events.map((e) => (
                          <span key={e} className="text-[9px] uppercase tracking-wider text-on-surface-variant/70 border border-silver-grey rounded px-1.5 py-0.5">
                            {e}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

const RiskStrip = ({ risk }: { risk: ReturnType<typeof buildRiskOverview> }) => {
  const color =
    risk.convergence === 'Elevated'
      ? 'text-error'
      : risk.convergence === 'Rising'
      ? 'text-amber-400'
      : risk.convergence === 'Stable'
      ? 'text-violet-300'
      : 'text-transparency-teal';
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      <div className="border border-silver-grey rounded-xl p-3 bg-surface-container-lowest">
        <p className="text-[10px] uppercase tracking-wider text-on-surface-variant mb-1">Convergence</p>
        <p className={`text-label-md font-bold ${color}`}>{risk.convergence.toUpperCase()}</p>
        <p className="text-[10px] text-on-surface-variant/70">tension score {risk.convergenceScore}/100</p>
      </div>
      <div className="border border-silver-grey rounded-xl p-3 bg-surface-container-lowest">
        <p className="text-[10px] uppercase tracking-wider text-on-surface-variant mb-1">Active conflicts</p>
        <p className="text-label-md font-bold text-on-surface">{risk.activeConflictZones}</p>
        <p className="text-[10px] text-on-surface-variant/70">zones in range</p>
      </div>
      <div className="border border-silver-grey rounded-xl p-3 bg-surface-container-lowest">
        <p className="text-[10px] uppercase tracking-wider text-on-surface-variant mb-1">Critical severity</p>
        <p className="text-label-md font-bold text-error">{risk.criticalSeverity}</p>
        <p className="text-[10px] text-on-surface-variant/70">signals ≥ 0.8</p>
      </div>
      <div className="border border-silver-grey rounded-xl p-3 bg-surface-container-lowest">
        <p className="text-[10px] uppercase tracking-wider text-on-surface-variant mb-1">Infrastructure events</p>
        <p className="text-label-md font-bold text-amber-400">{risk.infrastructureEvents}</p>
        <p className="text-[10px] text-on-surface-variant/70">cables · pipelines · grid</p>
      </div>
      <div className="border border-silver-grey rounded-xl p-3 bg-surface-container-lowest">
        <p className="text-[10px] uppercase tracking-wider text-on-surface-variant mb-1">OFAC sanctions</p>
        <p className="text-label-md font-bold text-transparency-teal">{risk.sanctionAlerts}</p>
        <p className="text-[10px] text-on-surface-variant/70">active programs</p>
      </div>
    </div>
  );
};

const TabButton = ({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count?: number;
}) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-medium transition-colors ${
      active
        ? 'bg-primary text-on-primary border-primary'
        : 'border-silver-grey text-on-surface-variant hover:text-on-surface hover:border-outline'
    }`}
  >
    {icon}
    {label}
    {typeof count === 'number' && count > 0 && (
      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${active ? 'bg-on-primary/20' : 'bg-surface-container-high'}`}>
        {count}
      </span>
    )}
  </button>
);

const ThreatRow = ({ event }: { event: ThreatEvent }) => {
  const colors: Record<ThreatEvent['severity'], string> = {
    Critical: 'bg-error/15 text-error border-error/30',
    High: 'bg-amber-400/15 text-amber-400 border-amber-400/30',
    Medium: 'bg-violet-400/15 text-violet-300 border-violet-400/30',
    Low: 'bg-transparency-teal/15 text-transparency-teal border-transparency-teal/30',
  };
  return (
    <div className="flex items-start gap-3 px-4 py-2.5 hover:bg-surface-container-lowest/60">
      <div className="w-20 shrink-0">
        <span className="text-[11px] font-semibold text-on-surface">{event.country}</span>
        <p className="text-[9px] text-on-surface-variant/70">{event.date}</p>
      </div>
      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 mt-0.5 ${colors[event.severity]}`}>
        {event.severity.toUpperCase()}
      </span>
      <p className="text-[11px] text-on-surface-variant leading-snug">{event.label}</p>
    </div>
  );
};

export default IntelBriefView;
