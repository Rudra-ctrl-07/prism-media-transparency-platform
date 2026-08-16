import React, { useState } from "react";
import {
  Search,
  Globe,
  Award,
  Compass,
  ArrowRight,
  ExternalLink,
  MapPin,
  Sparkles,
  CheckCircle,
  ShieldCheck,
  AlertCircle
} from "lucide-react";
import { Source } from "../types";

interface SourceDirectoryProps {
  sources: Source[];
  onSearchMaps: (query: string, lat?: number, lng?: number) => Promise<any>;
  mapsGroundingResult: { text: string; mapsGrounding: any[] } | null;
  isSearchingMaps: boolean;
}

export default function SourceDirectory({
  sources,
  onSearchMaps,
  mapsGroundingResult,
  isSearchingMaps,
}: SourceDirectoryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);
  const [geoQuery, setGeoQuery] = useState("");

  const activeSource = selectedSource || sources[0] || null;

  const filteredSources = sources.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleGeoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (geoQuery.trim()) {
      onSearchMaps(geoQuery.trim());
    }
  };

  const getBiasColor = (bias: string) => {
    switch (bias) {
      case "Left":
        return "text-blue-700 bg-blue-50 border-blue-100";
      case "Center-Left":
        return "text-cyan-700 bg-cyan-50 border-cyan-100";
      case "Center":
        return "text-emerald-700 bg-emerald-50 border-emerald-100";
      case "Center-Right":
        return "text-amber-700 bg-amber-50 border-amber-100";
      case "Right":
        return "text-rose-700 bg-rose-50 border-rose-100";
      default:
        return "text-slate-600 bg-slate-50 border-slate-100";
    }
  };

  return (
    <div className="flex-1 overflow-y-auto h-screen bg-slate-50 p-4 md:p-8 space-y-6 md:space-y-8 font-sans scrollbar">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-5 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
            <Globe className="w-5 h-5 text-slate-700" />
          </div>
          <div>
            <h1 className="text-base md:text-lg font-display font-bold text-slate-900 tracking-tight leading-snug">
              Truth Verified / Source Directory
            </h1>
            <p className="text-[10px] md:text-xs text-slate-500 font-mono">
              Audit reports, credibility scores, and provenance matrices of news publishers
            </p>
          </div>
        </div>

        {/* Search directory */}
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search publisher directory..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 text-slate-900 font-sans shadow-sm"
          />
        </div>
      </div>

      {/* Grid: Featured Source Bento & Search Directory List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Featured Source (Bento Card Large) */}
        {activeSource && (
          <div className="prism-card p-6 border-slate-200 lg:col-span-2 space-y-6 relative overflow-hidden group bg-white shadow-sm">
            <div className="absolute top-0 right-0 w-64 h-64 bg-slate-500/2 rounded-full filter blur-3xl opacity-30 pointer-events-none" />

            <div className="flex items-center justify-between relative">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-display font-bold text-slate-800 text-lg">
                  {activeSource.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-lg font-display font-bold text-slate-900 flex items-center gap-2">
                    {activeSource.name} <Award className="w-4 h-4 text-amber-500" />
                  </h2>
                  <span className="text-[10px] font-mono text-slate-500 uppercase">{activeSource.category}</span>
                </div>
              </div>

              <span className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded border ${
                activeSource.verificationStatus === "Fully Provenance-Clear"
                  ? "text-emerald-700 bg-emerald-50 border-emerald-100"
                  : "text-amber-700 bg-amber-50 border-amber-100"
              }`}>
                {activeSource.verificationStatus}
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-sans">
              {activeSource.description}
            </p>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-4 border-y border-slate-100 py-4 font-mono text-xs">
              <div className="space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-200/60">
                <span className="text-slate-500 block">Credibility Index</span>
                <span className="text-base font-bold text-emerald-600">{activeSource.credibility}%</span>
              </div>
              <div className="space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-200/60">
                <span className="text-slate-500 block">Bias Rating</span>
                <span className={`px-2 py-0.5 rounded text-[10px] inline-block font-semibold border ${getBiasColor(activeSource.biasRating)}`}>
                  {activeSource.biasRating}
                </span>
              </div>
              <div className="space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-200/60">
                <span className="text-slate-500 block">Audit Ratio</span>
                <span className="text-xs font-semibold text-slate-800">
                  {activeSource.verifiedCount}V / {activeSource.flaggedCount}F
                </span>
              </div>
            </div>

            <div className="text-xs text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-200 leading-relaxed font-sans shadow-xs">
              <strong>Audit Evaluation Takeaway:</strong> Publisher maintains high-quality journalistic rigor with fully cleared provenance pipelines. Bias distribution is centered within normal statistical bounds.
            </div>
          </div>
        )}

        {/* Directory Grid of other publishers */}
        <div className="prism-card p-6 border-slate-200 flex flex-col justify-between h-full space-y-4 bg-white shadow-sm">
          <div>
            <h3 className="text-xs font-mono tracking-wider text-slate-500 uppercase border-b border-slate-100 pb-2 mb-3">
              Publisher Roster
            </h3>
            <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar pr-1">
              {filteredSources.map((source) => (
                <div
                  key={source.id}
                  onClick={() => setSelectedSource(source)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer flex justify-between items-center ${
                    activeSource?.id === source.id
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-slate-100 bg-slate-50 hover:border-slate-200"
                  }`}
                >
                  <div className="space-y-0.5 overflow-hidden">
                    <span className="text-xs font-semibold text-slate-800 truncate block">
                      {source.name}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      Credibility: {source.credibility}%
                    </span>
                  </div>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded border ${getBiasColor(source.biasRating)}`}>
                    {source.biasRating}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="text-[10px] text-slate-400 font-mono leading-relaxed border-t border-slate-100 pt-3">
            Scores are recalculated dynamically based on multi-agent fact-check alignment feeds.
          </div>
        </div>
      </div>

      {/* Global Provenance Map pin query (Google Maps Grounding) */}
      <div className="prism-card p-6 border-slate-200 space-y-6 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-slate-650 animate-bounce" />
            <h3 className="text-sm font-display font-semibold text-slate-900">
              Global Corporate Transparency & Registry Locator
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-500">
            Powered by Gemini with Google Maps Grounding
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Query input form */}
          <div className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed font-sans">
              Enter any city or region (e.g. "Tokyo", "London", "San Jose") to locate and inspect regional corporate registries, public transparency offices, or semiconductor fabrication hubs nearby.
            </p>

            <form onSubmit={handleGeoSubmit} className="space-y-2">
              <label className="text-[10px] font-mono text-slate-500 uppercase block">Search Region</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Taipei, Taiwan"
                  value={geoQuery}
                  onChange={(e) => setGeoQuery(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 text-slate-900 font-sans shadow-sm"
                />
                <button
                  type="submit"
                  disabled={isSearchingMaps}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isSearchingMaps ? "Researching..." : "Query Map"}</span>
                </button>
              </div>
            </form>

            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-700 font-sans leading-relaxed shadow-xs">
              <strong>Interactive Notice:</strong> Map queries use real-time GPS coordinates and retrieve verified locations complete with external Google Maps navigation links.
            </div>
          </div>

          {/* Results Area */}
          <div className="lg:col-span-2 bg-slate-50 p-5 rounded-xl border border-slate-200/80 min-h-[300px] flex flex-col justify-between shadow-xs">
            {isSearchingMaps ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 py-10 text-slate-500 font-sans">
                <Globe className="w-8 h-8 text-slate-500 animate-spin" />
                <span className="text-xs font-mono">Querying Maps Grounding APIs...</span>
              </div>
            ) : mapsGroundingResult ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
                {/* Left Column: Text description & external links */}
                <div className="space-y-4 flex flex-col justify-between h-full">
                  <div className="text-xs text-slate-700 leading-relaxed font-sans max-h-48 overflow-y-auto scrollbar pr-1">
                    <p className="whitespace-pre-line">{mapsGroundingResult.text}</p>
                  </div>

                  {mapsGroundingResult.mapsGrounding && mapsGroundingResult.mapsGrounding.length > 0 && (
                    <div className="border-t border-slate-150 pt-3.5 space-y-2">
                      <span className="text-[10px] font-mono text-slate-500 uppercase block">Verified Maps Location Channels:</span>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto scrollbar pr-1">
                        {mapsGroundingResult.mapsGrounding.map((place: any, index: number) => (
                          <a
                            key={index}
                            href={place.uri}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-between p-2 rounded bg-white hover:bg-slate-50 border border-slate-200 text-xs text-slate-700 hover:text-slate-900 transition-all font-mono shadow-xs"
                          >
                            <span className="truncate max-w-[150px] font-medium">{place.title || "Registry Hub Location"}</span>
                            <ExternalLink className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column: Live Interactive Google Maps Embed */}
                <div className="h-[250px] md:h-full w-full rounded-lg overflow-hidden border border-slate-250 shadow-inner bg-slate-100 relative min-h-[220px]">
                  <iframe
                    title="Interactive Regional Registry Map"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    allowFullScreen
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(geoQuery || "Taipei")}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
                  />
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 py-10 text-slate-500 font-sans border border-dashed border-slate-200 rounded-lg bg-white">
                <MapPin className="w-6 h-6 text-slate-400" />
                <span className="text-xs">No active map research results loaded. Search a region above.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
