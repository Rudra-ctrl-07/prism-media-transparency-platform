import React, { useEffect, useState } from "react";
import Gauge from "../components/Gauge";
import BiasCompass from "../components/BiasCompass";
import NewsTicker from "../components/NewsTicker";
import { fetchArticles } from "../services/dataService";
import { Article } from "../types";

/**
 * Marketing landing — neo-brutalist rebuild: electric yellow canvas, black
 * ink, thick outlines, hard offset shadows, arcade accent cards.
 *
 * Sections in order:
 *   1. Hero (skull badge + headline + stat counters + LIVE tag + headlines)
 *   2. Feature / nav card grid (color-coded arcade cards)
 *   3. Live feed preview (real ingested articles)
 *   4. Bias Compass callout
 *   5. Pricing teaser
 */
export default function Landing({ onCtaClick }: { onCtaClick?: () => void }) {
  const [liveArticles, setLiveArticles] = useState<Article[]>([]);
  const [liveMode, setLiveMode] = useState<"live" | "empty" | "offline">("offline");

  useEffect(() => {
    let cancelled = false;
    fetchArticles({ limit: 5 }).then((result) => {
      if (cancelled) return;
      setLiveArticles(result.data);
      setLiveMode(result.mode);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const sources = new Set(liveArticles.map((a) => a.sourceName)).size;
  const avgCred =
    liveArticles.length > 0
      ? Math.round(
          (liveArticles.reduce((s, a) => s + a.sourceCredibility, 0) / liveArticles.length) * 100,
        )
      : 0;

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b-2 border-arcade-ink">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(60% 50% at 75% 30%, rgba(255,79,216,0.18), transparent 70%)",
          }}
        />
        <div className="relative z-10 max-w-[1280px] mx-auto px-16 py-24 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div>
            {/* Top status badge — black pill */}
            <span className="inline-flex items-center gap-2 bg-arcade-ink text-white px-4 py-1.5 border-2 border-arcade-ink shadow-brutal-sm text-[12px] font-bold uppercase tracking-widest mb-8">
              💀 Media Credibility, Forensically Dissected
            </span>

            <h1 className="font-display text-[56px] leading-[1.06] tracking-brutal mb-8 text-arcade-ink">
              See the process.
              <br />
              <span className="bg-arcade-yellow inline-block px-2 -rotate-1 border-2 border-arcade-ink shadow-brutal-sm">
                Not just the label.
              </span>
            </h1>

            <p className="font-body text-[20px] font-medium text-arcade-ink/80 leading-relaxed max-w-xl mb-10">
              Every other tool asks you to trust a label. PRISM streams real
              coverage from the world&rsquo;s newsrooms, geolocates it,
              clusters it into stories, and runs three independent analytical
              voices over each headline — converging into a transparent
              verdict.
            </p>

            {/* Stat counters — framed blocks */}
            <div className="flex flex-wrap gap-3 mb-10">
              <div className="bg-white border-2 border-arcade-ink shadow-brutal px-4 py-2">
                <span className="font-display text-[28px] text-arcade-ink block leading-none">
                  {liveArticles.length || "—"}
                </span>
                <span className="font-body text-[10px] font-bold uppercase tracking-widest text-arcade-ink/60">
                  Live headlines
                </span>
              </div>
              <div className="bg-arcade-green text-white border-2 border-arcade-ink shadow-brutal px-4 py-2">
                <span className="font-display text-[28px] block leading-none">
                  {sources || "7"}
                </span>
                <span className="font-body text-[10px] font-bold uppercase tracking-widest opacity-90">
                  Sources
                </span>
              </div>
              <div className="bg-arcade-blue text-arcade-ink border-2 border-arcade-ink shadow-brutal px-4 py-2">
                <span className="font-display text-[28px] block leading-none">
                  {avgCred || "—"}%
                </span>
                <span className="font-body text-[10px] font-bold uppercase tracking-widest text-arcade-ink/70">
                  Avg credibility
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <button
                type="button"
                onClick={onCtaClick}
                className="px-8 py-4 bg-arcade-ink text-arcade-yellow font-body text-[14px] font-bold uppercase tracking-widest border-2 border-arcade-ink shadow-brutal hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none transition-all"
              >
                Open the Dashboard
              </button>
              <a
                href="#/methodology"
                className="px-8 py-4 bg-white text-arcade-ink font-body text-[14px] font-bold uppercase tracking-widest border-2 border-arcade-ink shadow-brutal hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none transition-all"
              >
                How It Works
              </a>
            </div>

            {/* Arcade marquee — live headline ticker */}
            <div className="mt-10 max-w-xl border-2 border-arcade-ink shadow-brutal">
              <NewsTicker articles={liveArticles} label="LIVE TICKER" />
            </div>
          </div>

          {/* LIVE headlines panel — white card with pulsing live tag */}
          <div className="w-full max-w-[480px] ml-auto">
            <div className="bg-white border-2 border-arcade-ink shadow-brutal-lg p-6">
              <div className="flex items-center justify-between mb-5">
                <span className="font-body text-[11px] font-bold uppercase tracking-[0.18em] text-arcade-ink/60">
                  Live Coverage
                </span>
                <span
                  className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest ${
                    liveMode === "live"
                      ? "text-red-600"
                      : liveMode === "empty"
                      ? "text-amber-500"
                      : "text-arcade-ink/60"
                  }`}
                >
                  <span className="relative flex h-1.5 w-1.5">
                    {liveMode === "live" && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-70" />
                    )}
                    <span
                      className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                        liveMode === "live"
                          ? "bg-red-500"
                          : liveMode === "empty"
                          ? "bg-amber-500"
                          : "bg-arcade-ink/40"
                      }`}
                    />
                  </span>
                  {liveMode === "live" ? "LIVE" : liveMode === "empty" ? "No Data" : "Connecting…"}
                </span>
              </div>

              <div className="space-y-3 mb-5">
                {liveArticles.length === 0 ? (
                  <div className="space-y-2.5">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="animate-pulse h-10 border-2 border-arcade-ink/20 bg-arcade-yellow/30" />
                    ))}
                  </div>
                ) : (
                  liveArticles.slice(0, 4).map((a) => (
                    <div
                      key={a.id}
                      className="flex items-start gap-3 px-3 py-2.5 border-2 border-arcade-ink bg-white hover:bg-arcade-yellow/30 transition-colors"
                    >
                      <span
                        className="mt-1.5 w-2.5 h-2.5 border-2 border-arcade-ink shrink-0"
                        style={{
                          backgroundColor:
                            a.sourceCredibility >= 0.8
                              ? "#22c55e"
                              : a.sourceCredibility >= 0.5
                              ? "#ffe600"
                              : "#ef4444",
                        }}
                      />
                      <div className="min-w-0">
                        <p className="font-body text-[13px] font-semibold text-arcade-ink leading-snug line-clamp-2">
                          {a.title}
                        </p>
                        <p className="font-body text-[11px] font-semibold text-arcade-ink/50 mt-1">
                          {a.sourceName} • {Math.round(a.sourceCredibility * 100)}% credibility
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex items-center justify-between border-t-2 border-arcade-ink pt-4">
                <span className="font-body text-[11px] font-bold text-arcade-ink/60">
                  {liveMode === "live" ? "Ingested from 7 live RSS feeds" : "7 sources monitored"}
                </span>
                <Gauge value={88} size={72} strokeWidth={6} label="Consensus" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature / navigation card grid — color-coded arcade cards ─────── */}
      <section className="border-b-2 border-arcade-ink py-24">
        <div className="max-w-[1280px] mx-auto px-16">
          <div className="mb-12">
            <span className="font-body text-[12px] font-bold uppercase tracking-[0.2em] text-arcade-ink/60 block mb-4">
              Pick Your Tool
            </span>
            <h2 className="font-display text-[40px] leading-tight tracking-brutal text-arcade-ink">
              Loot the intelligence.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Green — Story Tracker */}
            <a
              href="#/"
              onClick={onCtaClick}
              className="group bg-arcade-green text-white border-2 border-arcade-ink shadow-brutal p-6 hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none transition-all"
            >
              <span className="text-[32px] block mb-4">🕸️</span>
              <h3 className="font-display text-[20px] leading-snug mb-2">Story Tracker</h3>
              <p className="font-body text-[13px] font-medium opacity-90 leading-relaxed">
                Live story clustering with corroboration counts across outlets.
              </p>
              <span className="inline-block mt-4 font-body text-[11px] font-bold uppercase tracking-widest underline underline-offset-4">
                Open →
              </span>
            </a>

            {/* Light blue — Bias Compare */}
            <a
              href="#/"
              onClick={onCtaClick}
              className="group bg-arcade-blue text-arcade-ink border-2 border-arcade-ink shadow-brutal p-6 hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none transition-all"
            >
              <span className="text-[32px] block mb-4">⚖️</span>
              <h3 className="font-display text-[20px] leading-snug mb-2">Bias Compare</h3>
              <p className="font-body text-[13px] font-bold opacity-80 leading-relaxed">
                Radar-compare 2–3 articles across 8 bias dimensions.
              </p>
              <span className="inline-block mt-4 font-body text-[11px] font-bold uppercase tracking-widest underline underline-offset-4">
                Open →
              </span>
            </a>

            {/* Yellow — Markets & Feeds */}
            <a
              href="#/"
              onClick={onCtaClick}
              className="group bg-arcade-yellow text-arcade-ink border-2 border-arcade-ink shadow-brutal p-6 hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none transition-all"
            >
              <span className="text-[32px] block mb-4">📡</span>
              <h3 className="font-display text-[20px] leading-snug mb-2">Markets & Feeds</h3>
              <p className="font-body text-[13px] font-bold opacity-80 leading-relaxed">
                Live broadcasts, webcams, market stress and the Big Mac Index.
              </p>
              <span className="inline-block mt-4 font-body text-[11px] font-bold uppercase tracking-widest underline underline-offset-4">
                Open →
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* ── Live feed preview ────────────────────────────────────────────── */}
      <section className="border-b-2 border-arcade-ink py-24 bg-white">
        <div className="max-w-[1280px] mx-auto px-16">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 border-b-2 border-arcade-ink pb-8">
            <div>
              <span className="font-body text-[12px] font-bold uppercase tracking-[0.2em] text-arcade-ink/60 block mb-4">
                Sample Feed
              </span>
              <h2 className="font-display text-[40px] leading-none tracking-brutal text-arcade-ink">
                Transparency, Live
              </h2>
            </div>
            <a
              href="#/"
              onClick={onCtaClick}
              className="font-body text-[14px] font-bold text-arcade-ink bg-arcade-yellow border-2 border-arcade-ink px-4 py-2 shadow-brutal-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex items-center gap-1 mt-4 md:mt-0"
            >
              Open the dashboard →
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {liveArticles.length > 0
              ? liveArticles.slice(0, 3).map((card) => (
                  <article
                    key={card.id}
                    className="bg-arcade-yellow border-2 border-arcade-ink shadow-brutal p-6 flex flex-col hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
                  >
                    <span className="font-body text-[12px] font-bold uppercase tracking-widest text-arcade-ink/60 mb-6">
                      {card.sourceName} • Live
                    </span>
                    <div className="flex justify-center mb-6">
                      <Gauge
                        value={Math.round(card.sourceCredibility * 100)}
                        size={140}
                        strokeWidth={8}
                        label="Score"
                      />
                    </div>
                    <h3 className="font-display text-[20px] leading-snug tracking-brutal mb-3 text-arcade-ink">
                      {card.title}
                    </h3>
                    <p className="font-body text-[14px] font-medium text-arcade-ink/70 leading-relaxed mb-4 line-clamp-3">
                      {card.excerpt}
                    </p>
                    <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4 border-t-2 border-arcade-ink">
                      <span className="font-body text-[12px] text-arcade-ink font-bold">
                        {card.sourceName}
                      </span>
                      <span
                        className={`font-body text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 border-2 border-arcade-ink ${
                          card.sourceCredibility >= 0.8
                            ? "bg-arcade-green text-white"
                            : "bg-white text-arcade-ink"
                        }`}
                      >
                        {Math.round(card.sourceCredibility * 100)}% credibility
                      </span>
                    </div>
                  </article>
                ))
              : [0, 1, 2].map((i) => (
                  <div key={i} className="animate-pulse h-72 border-2 border-arcade-ink bg-arcade-yellow/40 shadow-brutal" />
                ))}
          </div>
        </div>
      </section>

      {/* ── Bias Compass callout ─────────────────────────────────────────── */}
      <section className="border-b-2 border-arcade-ink py-24">
        <div className="max-w-[1280px] mx-auto px-16 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div>
            <span className="font-body text-[12px] font-bold uppercase tracking-[0.2em] text-arcade-ink/60 block mb-4">
              Multi-Dimensional
            </span>
            <h2 className="font-display text-[40px] leading-tight tracking-brutal mb-6 text-arcade-ink">
              Beyond a single axis.
            </h2>
            <p className="font-body text-[20px] font-medium text-arcade-ink/80 leading-relaxed mb-6">
              Other tools flatten every story into one American political
              spectrum. PRISM reports three named, non-political dimensions:{" "}
              <strong className="bg-arcade-yellow border-2 border-arcade-ink px-1">Emotion</strong>,{" "}
              <strong className="bg-arcade-pink text-white border-2 border-arcade-ink px-1">Omission</strong>, and{" "}
              <strong className="bg-arcade-blue border-2 border-arcade-ink px-1">Framing</strong> —
              because editorial bias rarely points one direction.
            </p>
            <a
              href="#/methodology"
              className="font-body text-[14px] font-bold text-arcade-ink bg-white border-2 border-arcade-ink px-4 py-2 shadow-brutal-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all inline-flex items-center gap-1"
            >
              Read the methodology →
            </a>
          </div>
          <div className="flex justify-center">
            <div className="bg-white border-2 border-arcade-ink shadow-brutal p-12">
              <BiasCompass axes={{ Emotion: 72, Omission: 45, Framing: 60 }} size={360} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing teaser ───────────────────────────────────────────────── */}
      <section className="py-24 bg-arcade-ink">
        <div className="max-w-[1280px] mx-auto px-16">
          <div className="text-center mb-12">
            <span className="font-body text-[12px] font-bold uppercase tracking-[0.2em] text-arcade-yellow block mb-4">
              Pricing
            </span>
            <h2 className="font-display text-[40px] leading-tight tracking-brutal mb-6 text-arcade-yellow">
              Free forever. Honest upgrades.
            </h2>
            <p className="font-body text-[20px] font-medium text-arcade-yellow/70 max-w-2xl mx-auto leading-relaxed">
              The essential verification experience is and will always be free.
              Paid tiers fund deeper multi-agent cross-referencing — not access
              to the truth.
            </p>
          </div>
          <div className="text-center mt-8">
            <a
              href="#/pricing"
              className="px-10 py-4 bg-arcade-yellow text-arcade-ink font-body text-[14px] font-bold uppercase tracking-widest border-2 border-arcade-yellow shadow-brutal hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none transition-all inline-block"
            >
              See full pricing
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
