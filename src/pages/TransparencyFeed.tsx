import React, { useState } from "react";
import Gauge from "../components/Gauge";
import BiasCompass from "../components/BiasCompass";
import DebateEngine from "../components/DebateEngine";
import { Article } from "../types";

interface TransparencyFeedProps {
  articles: Article[];
  selectedArticle: Article | null;
  setSelectedArticle: (article: Article) => void;
  onAnalyzeTopic: (query: string, category: string) => Promise<void>;
  isAnalyzing: boolean;
  onOpenReport: (article: Article) => void;
}

const CATEGORIES = ["All", "Home", "Business", "Politics", "Science", "Tech"];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/**
 * Living feed — primary surface per design brief position #3.
 * Editorial rhythm: EB Garamond serif headlines, generous body copy,
 * hairline silver-grey dividers, restrained teal accents.
 *
 * Each card's "View Reasoning" expands a panel showing the credibility
 * Gauge, the standardized 3-axis BiasCompass, and a citation checklist.
 * The right sidebar carries the DebateEngine + a fresh BiasCompass for
 * the active article.
 */
export default function TransparencyFeed({
  articles,
  selectedArticle,
  setSelectedArticle,
  onAnalyzeTopic,
  isAnalyzing,
  onOpenReport,
}: TransparencyFeedProps) {
  const [activeCategory, setActiveCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Politics");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered =
    activeCategory === "All"
      ? articles
      : articles.filter((a) => a.category === activeCategory);

  const active = selectedArticle || filtered[0] || null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) onAnalyzeTopic(query.trim(), category);
  };

  return (
    <section className="max-w-[1280px] mx-auto px-16 flex flex-col md:flex-row gap-12">
      {/* Main feed column */}
      <div className="flex-1 min-w-0 py-12 md:pr-12 md:border-r md:border-silver-grey">
        {/* Header + verify form */}
        <div className="mb-12">
          <h1 className="font-display text-[64px] leading-[1.1] tracking-[-0.02em] font-medium mb-4">
            The Feed
          </h1>
          <p className="font-body text-[20px] text-on-surface-variant max-w-xl mb-8">
            Curated analysis of global narratives through the lens of multi-agent verification.
          </p>

          <form onSubmit={submit} className="flex items-center gap-3 max-w-2xl">
            <div className="relative flex-1">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Verify a claim or policy (e.g. EU Carbon Credit)..."
                className="w-full px-4 py-3 text-[14px] bg-white border border-silver-grey focus:border-deep-charcoal outline-none font-body"
              />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="absolute right-2 top-2 bg-soft-white border border-silver-grey px-2 py-1 text-[11px] font-body outline-none"
              >
                <option>Politics</option>
                <option>Tech</option>
                <option>Business</option>
                <option>Science</option>
                <option>Home</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={isAnalyzing}
              className="px-6 py-3 bg-deep-charcoal text-white font-body text-[14px] font-semibold uppercase tracking-widest disabled:opacity-50 active:scale-95 transition-transform"
            >
              {isAnalyzing ? "Verifying..." : "Analyze"}
            </button>
          </form>

          {/* Category chips */}
          <div className="mt-6 flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setActiveCategory(c)}
                className={`px-4 py-1.5 text-[12px] font-body font-semibold uppercase tracking-widest transition-colors ${
                  activeCategory === c
                    ? "bg-deep-charcoal text-white"
                    : "border border-silver-grey text-on-surface-variant hover:text-deep-charcoal"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Analyzing skeleton */}
        {isAnalyzing && (
          <div className="border border-silver-grey p-8 mb-8 animate-pulse flex items-center justify-between bg-white">
            <div className="space-y-3 w-2/3">
              <div className="h-3 w-24 bg-silver-grey" />
              <div className="h-5 w-full bg-silver-grey/60" />
              <div className="h-3 w-4/5 bg-silver-grey/40" />
            </div>
            <span className="font-body text-[12px] uppercase tracking-widest text-on-surface-variant">
              Google Search Grounding Active…
            </span>
          </div>
        )}

        {/* Article cards */}
        <div className="space-y-16">
          {filtered.map((article) => {
            const isExpanded = expandedId === article.id;
            const isSelected = active?.id === article.id;
            return (
              <article
                key={article.id}
                className={`pb-16 border-b border-silver-grey last:border-b-0 ${
                  isSelected ? "bg-soft-white/50" : ""
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <span className="font-body text-[12px] uppercase tracking-widest text-on-surface-variant">
                    {article.category} • {timeAgo(article.timestamp)}
                  </span>
                  <VerificationBadge status={article.verificationStatus} />
                </div>

                <h2
                  onClick={() => setSelectedArticle(article)}
                  className="font-display text-[40px] leading-[1.2] font-medium mb-4 cursor-pointer hover:text-transparency-teal transition-colors"
                >
                  {article.title}
                </h2>
                <p className="font-body text-[20px] text-on-surface-variant mb-6 line-clamp-3 leading-relaxed">
                  {article.excerpt}
                </p>

                <div className="flex flex-wrap items-center gap-6 mb-4">
                  <span className="font-body text-[14px] text-deep-charcoal font-semibold">
                    Source: {article.sourceName}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedId(isExpanded ? null : article.id)
                    }
                    className="font-body text-[14px] font-semibold text-deep-charcoal flex items-center gap-1 hover:text-transparency-teal transition-colors"
                  >
                    {isExpanded ? "Hide Reasoning" : "View Reasoning"}
                    <span
                      className={`material-symbols-outlined text-[16px] transition-transform ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    >
                      expand_more
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenReport(article)}
                    className="font-body text-[14px] font-semibold text-on-surface-variant hover:text-deep-charcoal transition-colors flex items-center gap-1"
                  >
                    Open Verification Report
                    <span className="material-symbols-outlined text-[14px]">
                      arrow_forward
                    </span>
                  </button>
                </div>

                {isExpanded && (
                  <ReasoningPanel article={article} />
                )}
              </article>
            );
          })}

          {filtered.length === 0 && !isAnalyzing && (
            <div className="text-center py-16 text-on-surface-variant font-body">
              No verification reports in this category. Submit a topic above to query one.
            </div>
          )}
        </div>
      </div>

      {/* Right sidebar */}
      <aside className="w-full md:w-[400px] py-12 md:pl-12">
        {active ? (
          <div className="sticky top-28 space-y-12">
            <div>
              <h3 className="font-body text-[12px] font-bold uppercase tracking-[0.2em] mb-4">
                Multi-Agent Debate
              </h3>
              <p className="font-body text-[12px] text-on-surface-variant mb-6">
                Active voices verifying "{active.title.slice(0, 60)}
                {active.title.length > 60 ? "…" : ""}"
              </p>
              <DebateEngine
                statement={active.title}
                width={400}
                height={260}
              />
              {active.biasAnalysis?.moderator && (
                <blockquote className="mt-4 p-4 bg-soft-white border border-silver-grey italic text-[13px] text-on-surface-variant border-l-2 border-l-transparency-teal">
                  "{active.biasAnalysis.moderator.text}"
                </blockquote>
              )}
            </div>

            {active.biasAxes && (
              <div>
                <h3 className="font-body text-[12px] font-bold uppercase tracking-[0.2em] mb-6">
                  Bias Compass
                </h3>
                <div className="border border-silver-grey p-6 bg-white">
                  <BiasCompass axes={active.biasAxes} size={280} />
                  <p className="mt-4 text-[12px] text-on-surface-variant leading-relaxed">
                    Three named, non-political dimensions — Emotion (affective
                    intensity), Omission (missing context), and Framing
                    (ideological angle).
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="font-body text-[13px] text-on-surface-variant">
            Select an article to see its multi-agent debate and bias compass.
          </div>
        )}
      </aside>
    </section>
  );
}

function VerificationBadge({ status }: { status: Article["verificationStatus"] }) {
  const cfg = {
    VERIFIED: { label: "High Transparency", color: "#008080", icon: "verified" },
    PENDING: { label: "Pending", color: "#444748", icon: "schedule" },
    MISLEADING: { label: "Low Transparency", color: "#ba1a1a", icon: "warning" },
    UNVERIFIED: { label: "Unverified", color: "#444748", icon: "help" },
  }[status];

  return (
    <div
      className="flex items-center gap-1.5"
      style={{ color: cfg.color }}
    >
      <span
        className="material-symbols-outlined"
        style={{ fontSize: "18px", fontVariationSettings: "'FILL' 1" }}
      >
        {cfg.icon}
      </span>
      <span className="font-body text-[14px] font-medium">{cfg.label}</span>
    </div>
  );
}

function ReasoningPanel({ article }: { article: Article }) {
  return (
    <div className="overflow-hidden bg-soft-white border border-silver-grey p-8 mt-4">
      <div className="grid md:grid-cols-2 gap-10 items-center">
        <div className="flex flex-col items-center text-center">
          <Gauge value={article.sourceCredibility} size={192} strokeWidth={10} label="PRISM SCORE" />
          <p className="mt-4 font-body text-[13px] max-w-[200px] text-on-surface-variant">
            High alignment across analytical models based on source provenance.
          </p>
        </div>
        <div>
          {article.biasAxes && (
            <div className="flex justify-center mb-6">
              <BiasCompass axes={article.biasAxes} size={220} />
            </div>
          )}
          <h4 className="font-body text-[12px] font-bold uppercase tracking-wider mb-3">
            Analysis Highlights
          </h4>
          <ul className="space-y-3">
            {(article.groundingUrls || []).slice(0, 4).map((g, i) => (
              <li key={i} className="flex gap-3 items-start text-[13px]">
                <span className="material-symbols-outlined text-transparency-teal text-[18px]">
                  check_circle
                </span>
                <span className="text-on-surface">{g.title}</span>
              </li>
            ))}
            {article.biasAnalysis?.omission && (
              <li className="flex gap-3 items-start text-[13px] text-on-surface-variant">
                <span className="material-symbols-outlined text-[18px]">info</span>
                <span className="italic">
                  {article.biasAnalysis.omission.text}
                </span>
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}