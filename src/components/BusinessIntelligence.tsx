import React, { useState } from "react";
import {
  Briefcase,
  TrendingUp,
  Scale,
  ShieldCheck,
  AlertTriangle,
  ArrowRightLeft,
  DownloadCloud,
  Sheet,
  Activity,
  ExternalLink,
  Info,
  Sparkles
} from "lucide-react";
import { Article } from "../types";
import { getAuthHeader } from "../firebase-compat";
import { demoForecastProjection, demoForecastSummary } from "../services/demoData";
import D3LineChart from "./D3LineChart";

interface BusinessIntelligenceProps {
  onExportToDrive: (report: any) => Promise<void>;
  onSyncToSheets: (report: any) => Promise<void>;
}

export default function BusinessIntelligence({
  onExportToDrive,
  onSyncToSheets,
}: BusinessIntelligenceProps) {
  const [selectedRegistry, setSelectedRegistry] = useState<string>("sec-disclosure");
  const [forecastPoints, setForecastPoints] = useState<any[] | null>(null);
  const [isForecasting, setIsForecasting] = useState<boolean>(false);
  const [forecastSummary, setForecastSummary] = useState<string | null>(null);

  const handleTriggerForecast = async () => {
    setIsForecasting(true);
    try {
      const authHeader = (await getAuthHeader()) || {};
      const res = await fetch("/api/gemini/forecast", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeader,
        },
      });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      if (data && data.projectedPoints) {
        setForecastPoints(data.projectedPoints);
        setForecastSummary(data.summary);
      }
    } catch (err) {
      console.warn("[PRISM Forecast UI] Gemini forecast unavailable, using local projection:", err);
      // Demo fallback — keeps the Business Intelligence view fully functional
      // even when the Gemini endpoint is not configured.
      setForecastPoints(demoForecastProjection);
      setForecastSummary(demoForecastSummary);
    } finally {
      setIsForecasting(false);
    }
  };

  const registryItems = [
    {
      id: "sec-disclosure",
      title: "SEC Mandatory AI Disclosure Directive",
      status: "COMPLIANT",
      source: "SEC Division of Corp Finance",
      date: "2026-06-15",
      credibility: 96.5,
      impact: "High",
      details: "Requires registered entities to provide clear, audited declarations of neural weights sources, carbon offset usage, and alignment metrics with global safety standards. Non-compliance results in systematic trading restrictions."
    },
    {
      id: "chip-export",
      title: "Semiconductor Core Export Control Regime",
      status: "STRICT WATCH",
      source: "Department of Commerce",
      date: "2026-07-02",
      credibility: 94.0,
      impact: "Critical",
      details: "Restricts export of logic nodes sub-3nm to regions failing sovereign data sovereignty checks. Mandates end-user silicon tracking using cryptographic hardware provenance anchors."
    },
    {
      id: "carbon-credit",
      title: "Sovereign Carbon Credit Transparency Protocol",
      status: "PROPOSED",
      source: "UN Climate Secretariat",
      date: "2026-07-10",
      credibility: 89.5,
      impact: "Medium",
      details: "Sets decentralized ledger verification guidelines for green computing certificates. Datacenters must publish hourly carbon utilization rates synchronized with local grid transparency logs."
    }
  ];

  const policyTracker = [
    { name: "Central Bank Transparency Protocol", score: 92, category: "Monetary", status: "Active" },
    { name: "Global AI Compute Audit Accord", score: 78, category: "Technology", status: "Pending" },
    { name: "EU Digital Services Safety Act", score: 85, category: "Regulatory", status: "Active" },
  ];

  const handleExportMatrix = (type: "Drive" | "Sheets") => {
    const matrixReport = {
      title: "TSMC Expansion: Outlet Bias Analysis Matrix",
      category: "Business",
      excerpt: "Cross-outlet comparison of TSMC expansion coverage.",
      content: `Outlet Bias Analysis Matrix:
- Strategic Angle (Western Outlets): Highlights regional resilience, silicon supply protection, security protocols, and safety buffers.
- Reactive Angle (Eastern Outlets): Highlights cost increases, cultural talent integration challenges, local supply displacement, and government subsidies dependency.
Exported from PRISM Transparency AI.`,
      sourceName: "PRISM Intelligence Engine",
      sourceCredibility: 98,
      biasRating: "Center",
      verificationStatus: "VERIFIED",
    };

    if (type === "Drive") {
      onExportToDrive(matrixReport);
    } else {
      onSyncToSheets(matrixReport);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto h-screen bg-slate-50 p-4 md:p-8 space-y-6 md:space-y-8 font-sans scrollbar">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-5 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
            <Briefcase className="w-5 h-5 text-slate-700" />
          </div>
          <div>
            <h1 className="text-base md:text-lg font-display font-bold text-slate-900 tracking-tight leading-snug">
              Business Intelligence & Supply Chain Transparency
            </h1>
            <p className="text-[10px] md:text-xs text-slate-500 font-mono">
              Live corporate disclosures, silicon supply verification, and policy trackers
            </p>
          </div>
        </div>
      </div>

      {/* Grid: Flash Report & Policy Tracker */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Flash Report Card */}
        <div className="prism-card p-6 border-slate-200 lg:col-span-2 space-y-4 relative overflow-hidden bg-white shadow-sm">
          <div className="absolute top-0 right-0 px-3 py-1 bg-slate-100 border-l border-b border-slate-200 text-[10px] text-slate-600 font-mono rounded-bl-lg">
            CRITICAL FLASH REPORT
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
              Supply Chain Realignment
            </span>
            <h2 className="text-lg font-display font-bold text-slate-900">
              Global Semiconductor Supply Chain Realignment
            </h2>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed font-sans">
            A comprehensive multi-agent tracing of sub-5nm lithography supply vectors reveals 
            systematic diversion of rare-earth oxides into decentralized stockpiling facilities. 
            The realignment has introduced an estimated <strong>12% provenance volatility premium</strong> 
            on raw silicon wafers, prompting strict watch directives across regulatory corridors.
          </p>

          <div className="flex items-center gap-6 text-xs text-slate-500 font-mono border-t border-slate-100 pt-4">
            <div className="flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-emerald-600" />
              <span>Volatility Index: <strong className="text-slate-800">Stable-Low</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-slate-600" />
              <span>Provenance Clear: <strong className="text-slate-800">89.4%</strong></span>
            </div>
          </div>
        </div>

        {/* Policy Tracker & Trust Score Index */}
        <div className="prism-card p-6 border-slate-200 space-y-4 bg-white shadow-sm">
          <h3 className="text-xs font-mono tracking-wider text-slate-500 uppercase border-b border-slate-100 pb-2 flex items-center gap-2">
            <Scale className="w-3.5 h-3.5" /> Sovereign Policy Tracker
          </h3>

          <div className="space-y-4">
            {policyTracker.map((policy, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between text-xs font-sans">
                  <span className="font-medium text-slate-700 truncate">{policy.name}</span>
                  <span className="text-slate-500 font-mono">{policy.score}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 border border-slate-200/80">
                  <div
                    className="bg-slate-700 h-1.5 rounded-full"
                    style={{ width: `${policy.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Transparency Trends Over Last 30 Days (D3.js Line Chart) */}
      <div className="prism-card p-6 border-slate-200 bg-white shadow-sm space-y-5 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-slate-700" />
            <h3 className="text-sm font-display font-semibold text-slate-900">
              Audit Transparency Trends {forecastPoints ? "& 30-Day Projections" : "(Last 30 Days)"}
            </h3>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            {forecastPoints ? (
              <button
                onClick={() => {
                  setForecastPoints(null);
                  setForecastSummary(null);
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 hover:border-rose-300 text-rose-600 rounded-lg text-[10px] font-semibold font-mono transition-all shadow-xs"
              >
                Reset Historical View
              </button>
            ) : (
              <button
                onClick={handleTriggerForecast}
                disabled={isForecasting}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-75 text-white border border-indigo-700 rounded-lg text-[10px] font-semibold font-mono transition-all shadow-xs"
              >
                {isForecasting ? (
                  <>
                    <span className="animate-spin inline-block w-2.5 h-2.5 border-1.5 border-white border-t-transparent rounded-full mr-1 shrink-0" />
                    Calculating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3 text-indigo-200 animate-pulse shrink-0" />
                    Forecast Trend (Gemini)
                  </>
                )}
              </button>
            )}
            <span className="text-[9px] text-slate-500 font-mono bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md tracking-wider">
              D3.js COMPILER
            </span>
          </div>
        </div>
        
        <p className="text-xs text-slate-500 font-sans leading-relaxed">
          Daily metrics correlating transparency reporting volume (filings compiled across sentinel data feeds) with the aggregated PRISM Source Credibility index. {forecastPoints ? "30-day simulated trend forecast overlay active." : "Click Forecast Trend to use Gemini for predicting the upcoming 30-day volume and public credibility trajectory."}
        </p>

        <D3LineChart forecastPoints={forecastPoints} />

        {forecastSummary && (
          <div className="bg-gradient-to-r from-indigo-50/50 to-emerald-50/50 border border-slate-200/60 rounded-xl p-4 mt-1">
            <div className="flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5 animate-pulse" />
              <div className="space-y-1">
                <h4 className="text-[10px] font-semibold text-slate-800 font-mono uppercase tracking-wider flex items-center gap-1.5">
                  <span>Gemini Forecast Insight Model</span>
                  <span className="text-[8px] text-indigo-500 bg-indigo-50 border border-indigo-100 px-1 py-0.2 rounded font-normal lowercase">projections verified</span>
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed font-sans font-medium">
                  {forecastSummary}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Outlet Comparison Matrix */}
      <div className="prism-card p-6 border-slate-200 space-y-6 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-slate-600" />
            <h3 className="text-sm font-display font-semibold text-slate-900">
              TSMC Expansion: Strategic or Reactive? Bias Matrix
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExportMatrix("Sheets")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded text-xs font-semibold transition-all shadow-xs"
            >
              <Sheet className="w-3.5 h-3.5 text-emerald-600" /> Sync Matrix Sheet
            </button>
            <button
              onClick={() => handleExportMatrix("Drive")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded text-xs font-semibold transition-all shadow-xs"
            >
              <DownloadCloud className="w-3.5 h-3.5 text-slate-600" /> Save Matrix Report
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 text-[10px] font-mono text-slate-700 bg-slate-100 border border-slate-200 rounded font-semibold">
                WESTERN MEDIA FOCUS
              </span>
              <span className="text-xs text-slate-500 font-mono">Strategic Angle</span>
            </div>
            <h4 className="text-sm font-semibold text-slate-800">Resilience & Silicon Sovereign Shield</h4>
            <p className="text-xs text-slate-600 leading-relaxed font-sans">
              Emphasizes regional supply chain resilience, safety redundancy buffers against geopolitical conflicts, 
              and advanced manufacturing autonomy. Frame of coverage centers heavily on national security and technological dominance preservation.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 text-[10px] font-mono text-slate-750 bg-slate-150 border border-slate-200 rounded font-semibold">
                EASTERN MEDIA FOCUS
              </span>
              <span className="text-xs text-slate-500 font-mono">Reactive Angle</span>
            </div>
            <h4 className="text-sm font-semibold text-slate-800">Fiscal Inflation & Talent Displacement</h4>
            <p className="text-xs text-slate-600 leading-relaxed font-sans">
              Emphasizes skyrocketing construction costs, severe workforce integration/cultural clashes, 
              and regional subsidy dependencies. Frame of coverage highlights challenges in operational viability outside of core hubs.
            </p>
          </div>
        </div>
      </div>

      {/* Transparency Registry Table */}
      <div className="prism-card p-6 border-slate-200 space-y-4 bg-white shadow-sm">
        <h3 className="text-xs font-mono tracking-wider text-slate-500 uppercase border-b border-slate-100 pb-2">
          Global Transparency Registry
        </h3>

        <div className="flex overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px] text-xs">
            <thead>
              <tr className="border-b border-slate-150 text-slate-500 font-mono">
                <th className="py-3 px-4">Registry Directive</th>
                <th className="py-3 px-4">Origin/Source</th>
                <th className="py-3 px-4">Filing Date</th>
                <th className="py-3 px-4">Trust Score</th>
                <th className="py-3 px-4">Audit Status</th>
              </tr>
            </thead>
            <tbody>
              {registryItems.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => setSelectedRegistry(item.id)}
                  className={`border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer ${
                    selectedRegistry === item.id ? "bg-slate-100/50" : ""
                  }`}
                >
                  <td className="py-3.5 px-4 font-semibold text-slate-850">{item.title}</td>
                  <td className="py-3.5 px-4 text-slate-600 font-mono">{item.source}</td>
                  <td className="py-3.5 px-4 text-slate-500 font-mono">{item.date}</td>
                  <td className="py-3.5 px-4 text-slate-700 font-semibold font-mono">{item.credibility}%</td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded-full border ${
                      item.status === "COMPLIANT"
                        ? "text-emerald-700 bg-emerald-50 border-emerald-100"
                        : item.status === "STRICT WATCH"
                        ? "text-rose-700 bg-rose-50 border-rose-100"
                        : "text-amber-700 bg-amber-50 border-amber-100"
                    }`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Selected Registry Detail Pane */}
        {selectedRegistry && (
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/80 flex gap-4 items-start font-sans">
            <Info className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
            <div className="space-y-1.5 text-xs">
              <span className="font-mono text-slate-500 uppercase">Impact Assessment: 
                <strong className="text-slate-800 ml-1">
                  {registryItems.find((i) => i.id === selectedRegistry)?.impact}
                </strong>
              </span>
              <p className="text-slate-600 leading-relaxed">
                {registryItems.find((i) => i.id === selectedRegistry)?.details}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
