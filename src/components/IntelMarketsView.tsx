/**
 * IntelMarketsView — specialized intelligence feeds & tools:
 * live news broadcasts + webcams (real public streams), Market Stress,
 * Supply Chain, Trade Policy, Energy Complex, Climate Anomalies, and the
 * Big Mac Index (The Economist).
 */

import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, PlayCircle, Video, Gauge as GaugeIcon, Truck, Factory, Leaf, UtensilsCrossed, Coins, TrainFront, TrendingUp, TrendingDown } from 'lucide-react';
import { Article } from '../types';
import { useIntelLayerPoints } from '../services/intelLayers';
import {
  buildMarketPanel,
  buildMarketImpact,
  fetchMetalsQuotes,
  METALS_REFERENCE,
  CHINA_CORRIDORS,
  MetalQuote,
  BIG_MAC_INDEX,
  LIVE_BROADCASTS,
  LIVE_WEBCAMS,
} from '../services/intelDerived';

const PANEL_LAYER_IDS = [
  'maritime-chokepoints',
  'nuclear-sites',
  'fuel-shortages',
  'climate-anomalies',
  'sanctions',
  'trade-routes',
  'pipelines',
  'grid-stress',
];

export const IntelMarketsView = ({ articles }: { articles: Article[] }) => {
  const layerPoints = useIntelLayerPoints(PANEL_LAYER_IDS);
  const [tab, setTab] = useState<
    'live' | 'market' | 'supply' | 'energy' | 'metals' | 'impact' | 'climate' | 'bigmac' | 'china'
  >('live');

  const panel = useMemo(() => buildMarketPanel(articles, layerPoints), [articles, layerPoints]);
  const impacts = useMemo(() => buildMarketImpact(articles), [articles]);
  const [metals, setMetals] = useState<MetalQuote[]>(METALS_REFERENCE);
  const [metalsLive, setMetalsLive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchMetalsQuotes().then((quotes) => {
      if (cancelled) return;
      setMetals(quotes);
      setMetalsLive(quotes.some((q) => q.live));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 space-y-5">
      <div className="flex flex-wrap items-center gap-1.5">
        <Tab active={tab === 'live'} onClick={() => setTab('live')} icon={<PlayCircle className="w-3.5 h-3.5" />} label="Live News & Webcams" />
        <Tab active={tab === 'market'} onClick={() => setTab('market')} icon={<GaugeIcon className="w-3.5 h-3.5" />} label="Market Stress" />
        <Tab active={tab === 'metals'} onClick={() => setTab('metals')} icon={<Coins className="w-3.5 h-3.5" />} label="Metals & Materials" />
        <Tab active={tab === 'impact'} onClick={() => setTab('impact')} icon={<TrendingUp className="w-3.5 h-3.5" />} label="News-to-Market" />
        <Tab active={tab === 'supply'} onClick={() => setTab('supply')} icon={<Truck className="w-3.5 h-3.5" />} label="Supply Chain" />
        <Tab active={tab === 'china'} onClick={() => setTab('china')} icon={<TrainFront className="w-3.5 h-3.5" />} label="China Corridors" />
        <Tab active={tab === 'energy'} onClick={() => setTab('energy')} icon={<Factory className="w-3.5 h-3.5" />} label="Energy Complex" />
        <Tab active={tab === 'climate'} onClick={() => setTab('climate')} icon={<Leaf className="w-3.5 h-3.5" />} label="Climate Anomalies" />
        <Tab active={tab === 'bigmac'} onClick={() => setTab('bigmac')} icon={<UtensilsCrossed className="w-3.5 h-3.5" />} label="Big Mac Index" />
      </div>

      {tab === 'live' && <LiveTab />}
      {tab === 'market' && <MarketTab panel={panel} />}
      {tab === 'metals' && <MetalsTab metals={metals} live={metalsLive} />}
      {tab === 'impact' && <ImpactTab impacts={impacts} />}
      {tab === 'supply' && <SupplyTab panel={panel} />}
      {tab === 'china' && <ChinaTab />}
      {tab === 'energy' && <EnergyTab panel={panel} />}
      {tab === 'climate' && <ClimateTab />}
      {tab === 'bigmac' && <BigMacTab />}
    </div>
  );
};

// ---------------------------------------------------------------------------

const LiveTab = () => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
    <section>
      <h3 className="text-label-sm font-semibold uppercase tracking-wider text-on-surface mb-3">
        Live News Broadcasts
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {LIVE_BROADCASTS.map((b) => (
          <a
            key={b.name}
            href={b.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 border border-silver-grey rounded-xl p-3.5 bg-surface-container-lowest hover:border-transparency-teal/50 transition-colors group"
          >
            <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-error/15 text-error shrink-0">
              <PlayCircle className="w-5 h-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-label-sm font-semibold text-on-surface truncate">{b.name}</p>
              <p className="text-[10px] text-on-surface-variant">{b.region}</p>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-on-surface-variant/50 group-hover:text-transparency-teal" />
          </a>
        ))}
      </div>
    </section>

    <section>
      <h3 className="text-label-sm font-semibold uppercase tracking-wider text-on-surface mb-3">
        Global Webcams
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {LIVE_WEBCAMS.map((w) => (
          <a
            key={w.name}
            href={w.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 border border-silver-grey rounded-xl p-3.5 bg-surface-container-lowest hover:border-transparency-teal/50 transition-colors group"
          >
            <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-transparency-teal/15 text-transparency-teal shrink-0">
              <Video className="w-5 h-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-label-sm font-semibold text-on-surface truncate">{w.name}</p>
              <p className="text-[10px] text-on-surface-variant">{w.city} • {w.region} • live</p>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-on-surface-variant/50 group-hover:text-transparency-teal" />
          </a>
        ))}
      </div>
      <p className="text-[10px] text-on-surface-variant/60 mt-3">
        Streams open on their providers&rsquo; sites (EarthCam, SkylineWebcams, broadcaster platforms).
      </p>
    </section>
  </div>
);

const MarketTab = ({ panel }: { panel: ReturnType<typeof buildMarketPanel> }) => {
  const stressColor =
    panel.stressLevel === 'High Stress'
      ? 'text-error'
      : panel.stressLevel === 'Stressed'
      ? 'text-amber-400'
      : 'text-transparency-teal';
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="border border-silver-grey rounded-xl p-5 bg-surface-container-lowest md:col-span-2">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-label-sm font-semibold uppercase tracking-wider text-on-surface">
            Market Stress Monitor
          </h3>
          <span className={`text-label-md font-bold ${stressColor}`}>{panel.stressLevel.toUpperCase()}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative w-28 h-28 shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="42" fill="none" stroke="#232d3d" strokeWidth="10" />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke={panel.marketStress >= 65 ? '#ef4444' : panel.marketStress >= 40 ? '#ff4fd8' : '#22c55e'}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 42}`}
                strokeDashoffset={2 * Math.PI * 42 * (1 - panel.marketStress / 100)}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl font-bold text-on-surface">{panel.marketStress}</span>
            </div>
          </div>
          <div className="flex-1 space-y-2">
            <p className="text-label-sm text-on-surface">
              {panel.marketMentions} market/economy stories in the current feed,
              {panel.chokepointDisruptions} chokepoints at elevated risk.
            </p>
            <p className="text-[11px] text-on-surface-variant leading-relaxed">
              Stress is derived from live news sentiment (negative-valence market coverage) plus
              chokepoint disruption signals — a transparent proxy, not a financial-advice feed.
            </p>
          </div>
        </div>
        {panel.topMarketStories.length > 0 && (
          <div className="mt-4 pt-3 border-t border-silver-grey">
            <p className="text-[10px] uppercase tracking-wider text-on-surface-variant mb-1.5">Daily Market Brief — top stories</p>
            <ul className="space-y-1">
              {panel.topMarketStories.map((t, i) => (
                <li key={i} className="text-label-sm text-on-surface-variant truncate">• {t}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

const SupplyTab = ({ panel }: { panel: ReturnType<typeof buildMarketPanel> }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div className="border border-silver-grey rounded-xl p-5 bg-surface-container-lowest">
      <h3 className="text-label-sm font-semibold uppercase tracking-wider text-on-surface mb-2">Supply Chain Watch</h3>
      <p className="text-label-sm text-on-surface leading-relaxed">{panel.supplyChainNote}</p>
      <div className="mt-4 space-y-2">
        <Metric label="Chokepoints at elevated risk" value={String(panel.chokepointDisruptions)} color="text-amber-400" />
        <Metric label="Red Sea rerouting" value="Active" color="text-error" />
        <Metric label="Trade routes tracked" value="6" color="text-on-surface" />
        <Metric label="OFAC programs (trade-impacting)" value="14" color="text-on-surface" />
      </div>
    </div>
    <div className="border border-silver-grey rounded-xl p-5 bg-surface-container-lowest">
      <h3 className="text-label-sm font-semibold uppercase tracking-wider text-on-surface mb-2">Trade Policy Signals</h3>
      <ul className="space-y-1.5 text-label-sm text-on-surface-variant">
        <li>• Tariff headlines tracked from the live feed — {panel.marketMentions > 0 ? `${panel.marketMentions} market/economy items` : 'feed warming up'}.</li>
        <li>• Sanctions programs monitored for export-control impact.</li>
        <li>• Chokepoint insurance/freight pressure correlates with {panel.chokepointDisruptions} elevated chokepoints.</li>
      </ul>
    </div>
  </div>
);

const EnergyTab = ({ panel }: { panel: ReturnType<typeof buildMarketPanel> }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div className="border border-silver-grey rounded-xl p-5 bg-surface-container-lowest md:col-span-2">
      <h3 className="text-label-sm font-semibold uppercase tracking-wider text-on-surface mb-2">Energy Complex</h3>
      <p className="text-label-sm text-on-surface leading-relaxed mb-4">{panel.energyNote}</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric label="Nuclear sites (IAEA)" value={String(panel.nuclearCount)} color="text-amber-400" />
        <Metric label="Fuel-crisis zones" value={String(panel.fuelCrisisCount)} color="text-error" />
        <Metric label="Pipelines tracked" value="11" color="text-on-surface" />
        <Metric label="LNG/chokepoint watch" value="Hormuz · Malacca" color="text-on-surface" />
      </div>
    </div>
  </div>
);

const ClimateTab = () => {
  const layerPoints = useIntelLayerPoints(['climate-anomalies', 'fires']);
  const anomalies = [...(layerPoints.get('climate-anomalies') || [])];
  const fires = [...(layerPoints.get('fires') || [])];
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="border border-silver-grey rounded-xl p-5 bg-surface-container-lowest">
        <h3 className="text-label-sm font-semibold uppercase tracking-wider text-on-surface mb-3">
          Climate Anomalies ({anomalies.length})
        </h3>
        <ul className="space-y-2">
          {anomalies.map((a) => (
            <li key={a.label} className="flex items-start gap-2 text-label-sm text-on-surface-variant">
              <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: a.severity >= 0.6 ? '#ffe600' : '#22c55e' }} />
              <span>
                <span className="text-on-surface font-medium">{a.label}</span>
                {a.detail ? ` — ${a.detail}` : ''}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="border border-silver-grey rounded-xl p-5 bg-surface-container-lowest">
        <h3 className="text-label-sm font-semibold uppercase tracking-wider text-on-surface mb-3">
          Fire Risk Zones ({fires.length})
        </h3>
        <ul className="space-y-2">
          {fires.map((a) => (
            <li key={a.label} className="flex items-start gap-2 text-label-sm text-on-surface-variant">
              <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 bg-error" />
              <span>
                <span className="text-on-surface font-medium">{a.label}</span>
                {a.detail ? ` — ${a.detail}` : ''}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

const BigMacTab = () => (
  <div className="border border-silver-grey rounded-xl overflow-hidden">
    <div className="px-4 py-3 border-b border-silver-grey bg-surface-container-low flex items-center justify-between">
      <h3 className="text-label-sm font-semibold uppercase tracking-wider text-on-surface">
        Big Mac Index — The Economist
      </h3>
      <span className="text-[10px] text-on-surface-variant">US$ price vs. USD benchmark (latest published)</span>
    </div>
    <div className="max-h-[65vh] overflow-y-auto">
      <table className="w-full text-left">
        <thead className="bg-surface-container-low text-[10px] uppercase tracking-wider text-on-surface-variant sticky top-0">
          <tr>
            <th className="px-4 py-2.5">Country</th>
            <th className="px-4 py-2.5 w-32">Price (US$)</th>
            <th className="px-4 py-2.5 w-40">Implied FX vs USD</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-silver-grey">
          {BIG_MAC_INDEX.map((b) => {
            const over = b.implied.startsWith('+');
            return (
              <tr key={b.country} className="hover:bg-surface-container-lowest/60">
                <td className="px-4 py-2 text-label-sm font-medium text-on-surface">{b.country}</td>
                <td className="px-4 py-2 text-label-sm text-on-surface">${b.price.toFixed(2)}</td>
                <td className="px-4 py-2">
                  <span className={`text-[11px] font-semibold ${over ? 'text-error' : 'text-transparency-teal'}`}>
                    {b.implied === '—' ? 'benchmark' : b.implied}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
);

const MetalsTab = ({ metals, live }: { metals: MetalQuote[]; live: boolean }) => (
  <div className="border border-silver-grey rounded-xl overflow-hidden">
    <div className="px-4 py-3 border-b border-silver-grey bg-surface-container-low flex items-center justify-between">
      <h3 className="text-label-sm font-semibold uppercase tracking-wider text-on-surface">
        Metals & Materials
      </h3>
      <span
        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
          live ? 'bg-transparency-teal/15 text-transparency-teal' : 'bg-amber-400/15 text-amber-400'
        }`}
      >
        {live ? 'LIVE SPOT' : 'REFERENCE ESTIMATES'}
      </span>
    </div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-silver-grey">
      {metals.map((m) => (
        <div key={m.symbol} className="bg-surface-container-lowest p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-on-surface-variant">{m.symbol}</span>
            {m.live && <span className="text-[9px] font-bold text-transparency-teal">LIVE</span>}
          </div>
          <p className="text-label-md font-semibold text-on-surface">{m.name}</p>
          <p className="text-lg font-bold text-on-surface mt-0.5">
            {m.price >= 1000 ? m.price.toLocaleString() : m.price.toFixed(2)}
            <span className="text-[10px] font-normal text-on-surface-variant ml-1">{m.unit}</span>
          </p>
          <p className="text-[10px] text-on-surface-variant/70 mt-1">{m.note}</p>
        </div>
      ))}
    </div>
  </div>
);

const ImpactTab = ({ impacts }: { impacts: ReturnType<typeof buildMarketImpact> }) => (
  <div className="border border-silver-grey rounded-xl overflow-hidden">
    <div className="px-4 py-3 border-b border-silver-grey bg-surface-container-low">
      <h3 className="text-label-sm font-semibold uppercase tracking-wider text-on-surface">
        News-to-Market Impact Model
      </h3>
      <p className="text-[10px] text-on-surface-variant mt-0.5">
        Directional impact scored from live headline sentiment — an analytical model, not advice.
      </p>
    </div>
    {impacts.length === 0 ? (
      <p className="p-4 text-label-sm text-on-surface-variant/60">
        No market-impacting stories in the current feed yet.
      </p>
    ) : (
      <div className="divide-y divide-silver-grey">
        {impacts.map((i) => (
          <div key={i.id} className="flex items-start gap-3 px-4 py-2.5 hover:bg-surface-container-lowest/60">
            <span
              className={`flex items-center justify-center w-7 h-7 rounded-lg shrink-0 mt-0.5 ${
                i.direction === 'bearish'
                  ? 'bg-error/15 text-error'
                  : i.direction === 'bullish'
                  ? 'bg-transparency-teal/15 text-transparency-teal'
                  : 'bg-on-surface-variant/10 text-on-surface-variant'
              }`}
            >
              {i.direction === 'bearish' ? (
                <TrendingDown className="w-4 h-4" />
              ) : i.direction === 'bullish' ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <span className="text-[10px] font-bold">=</span>
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-label-sm text-on-surface leading-snug line-clamp-2">{i.title}</p>
              <p className="text-[10px] text-on-surface-variant mt-0.5">
                {i.source} • {i.asset} • {i.reason}
              </p>
            </div>
            <div className="shrink-0 flex items-center gap-1.5 mt-1">
              <div className="w-16 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${i.magnitude * 10}%`,
                    backgroundColor:
                      i.direction === 'bearish' ? '#ef4444' : i.direction === 'bullish' ? '#22c55e' : '#0a0a0a',
                  }}
                />
              </div>
              <span className="text-[11px] font-bold text-on-surface w-4">{i.magnitude}</span>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

const ChinaTab = () => (
  <div className="border border-silver-grey rounded-xl overflow-hidden">
    <div className="px-4 py-3 border-b border-silver-grey bg-surface-container-low">
      <h3 className="text-label-sm font-semibold uppercase tracking-wider text-on-surface">
        China Logistics Corridors
      </h3>
      <p className="text-[10px] text-on-surface-variant mt-0.5">
        Operational status of the Belt & Road trade corridors — rail, road, and maritime.
      </p>
    </div>
    <div className="divide-y divide-silver-grey">
      {CHINA_CORRIDORS.map((c) => (
        <div key={c.name} className="flex items-start gap-3 px-4 py-3 hover:bg-surface-container-lowest/60">
          <span
            className={`mt-1 shrink-0 w-2 h-2 rounded-full ${
              c.tone === 'active' ? 'bg-transparency-teal' : c.tone === 'watch' ? 'bg-amber-400' : 'bg-error'
            }`}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-label-sm font-semibold text-on-surface">{c.name}</p>
              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                  c.tone === 'active'
                    ? 'bg-transparency-teal/15 text-transparency-teal'
                    : c.tone === 'watch'
                    ? 'bg-amber-400/15 text-amber-400'
                    : 'bg-error/15 text-error'
                }`}
              >
                {c.status.toUpperCase()}
              </span>
            </div>
            <p className="text-[11px] text-on-surface-variant mt-0.5">{c.note}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const Tab = ({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
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
  </button>
);

const Metric = ({ label, value, color }: { label: string; value: string; color: string }) => (
  <div className="flex items-center justify-between border border-silver-grey rounded-lg px-3 py-2">
    <span className="text-[11px] text-on-surface-variant">{label}</span>
    <span className={`text-label-sm font-bold ${color}`}>{value}</span>
  </div>
);

export default IntelMarketsView;
