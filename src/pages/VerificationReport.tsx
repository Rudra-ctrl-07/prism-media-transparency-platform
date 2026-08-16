import React, { useEffect, useState } from "react";
import Gauge from "../components/Gauge";
import BiasCompass from "../components/BiasCompass";
import DebateEngine from "../components/DebateEngine";
import { Article } from "../types";
import { getAuthHeader } from "../firebase-compat";

interface VerificationReportProps {
  article: Article;
  onBack: () => void;
}

interface VoteAggregate {
  agreeCount: number;
  disagreeCount: number;
  percentage: number;
  comments: Array<{ journalistId: string; comment: string; timestamp: string }>;
}

const AGENT_KEYS = ["progressive", "conservative", "omission", "moderator"] as const;
const AGENT_LABELS: Record<typeof AGENT_KEYS[number], string> = {
  progressive: "Progressive Alignment",
  conservative: "Conservative Alignment",
  omission: "Omission Audit",
  moderator: "Moderator Consensus",
};

/**
 * Deep-dive verification report for a single article.
 *
 * Sections: hero header (Gauge + meta), main 8/4 grid (DebateEngine +
 * Dialogue Feed on the left; BiasCompass + Journalist Polling on the
 * right), and the static Narrative Drift timeline.
 *
 * Journalist polling posts to /api/votes and polls /api/votes/aggregate/:id
 * every 15s — same flow as the legacy JournalistPolling component,
 * restyled with the new design tokens.
 */
export default function VerificationReport({ article, onBack }: VerificationReportProps) {
  return (
    <section className="max-w-[1280px] mx-auto px-16 pt-12 pb-32">
      {/* Back button */}
      <button
        onClick={onBack}
        className="font-body text-[12px] uppercase tracking-widest text-on-surface-variant hover:text-deep-charcoal mb-8 flex items-center gap-1"
      >
        <span className="material-symbols-outlined text-[16px]">arrow_back</span>
        Back to Feed
      </button>

      {/* Hero */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-12 border-b border-silver-grey pb-12">
        <div className="max-w-2xl">
          <span className="font-body text-[12px] font-medium uppercase tracking-[0.02em] text-transparency-teal mb-4 block">
            Verification Complete
          </span>
          <h1 className="font-display text-[40px] leading-[1.2] font-medium text-deep-charcoal mb-4">
            {article.title}
          </h1>
          <div className="flex items-center gap-3 text-on-surface-variant font-body text-[14px]">
            <span>
              Source: <strong className="text-deep-charcoal">{article.sourceName}</strong>
            </span>
            <span className="w-1 h-1 bg-silver-grey rounded-full" />
            <span>
              {new Date(article.timestamp).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
            <span className="w-1 h-1 bg-silver-grey rounded-full" />
            <span>{article.category}</span>
          </div>
        </div>
        <Gauge
          value={article.sourceCredibility}
          size={144}
          strokeWidth={10}
          label="Verified"
        />
      </div>

      {/* Main 8/4 grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Left 8 cols */}
        <div className="lg:col-span-8">
          <div className="mb-8 flex justify-between items-center">
            <h2 className="font-display text-[28px] font-medium text-deep-charcoal">
              Multi-Agent Debate Engine
            </h2>
            <div className="flex items-center gap-2 text-on-surface-variant font-body text-[12px]">
              <span className="material-symbols-outlined text-[16px]">sync</span>
              Live Neural Synthesis
            </div>
          </div>

          <div className="bg-soft-white border border-silver-grey p-8">
            <div className="mb-12">
              <DebateEngine
                statement={article.title}
                width={600}
                height={420}
              />
            </div>

            {/* Dialogue Feed */}
            <div className="space-y-6 border-t border-silver-grey pt-8 max-w-3xl mx-auto">
              <DialogueQuote
                agent="progressive"
                text={article.biasAnalysis?.progressive.text}
              />
              <DialogueQuote
                agent="conservative"
                text={article.biasAnalysis?.conservative.text}
              />
              <DialogueQuote
                agent="omission"
                text={article.biasAnalysis?.omission.text}
              />
              <DialogueQuote
                agent="moderator"
                text={article.biasAnalysis?.moderator.text}
              />
            </div>
          </div>
        </div>

        {/* Right 4 cols */}
        <div className="lg:col-span-4 space-y-8">
          {article.biasAxes && (
            <div className="bg-soft-white border border-silver-grey p-6">
              <h3 className="font-body text-[12px] font-bold uppercase tracking-widest text-deep-charcoal mb-6 border-b border-silver-grey pb-4">
                Bias Compass
              </h3>
              <BiasCompass axes={article.biasAxes} size={260} />
              <p className="text-[12px] text-on-surface-variant mt-6 leading-relaxed">
                Three named, non-political dimensions: Emotion (affective
                intensity), Omission (missing context), and Framing
                (ideological angle).
              </p>
            </div>
          )}

          <JournalistPollingCard article={article} />
        </div>
      </div>

      {/* Narrative Drift Timeline */}
      <NarrativeDrift article={article} />
    </section>
  );
}

function DialogueQuote({
  agent,
  text,
}: {
  agent: "progressive" | "conservative" | "omission" | "moderator";
  text?: string;
}) {
  const barColor =
    agent === "progressive"
      ? "#008080"
      : agent === "conservative"
      ? "#E0E0E0"
      : agent === "omission"
      ? "#ba1a1a"
      : "#1a1c1c";
  const labelColor =
    agent === "progressive"
      ? "#008080"
      : agent === "conservative"
      ? "#444748"
      : agent === "omission"
      ? "#ba1a1a"
      : "#1a1c1c";

  if (!text) return null;

  return (
    <div className="flex gap-4">
      <div className="w-1 shrink-0" style={{ backgroundColor: barColor }} />
      <div>
        <p className="font-display text-[20px] italic leading-relaxed text-deep-charcoal">
          "{text}"
        </p>
        <span
          className="font-body text-[11px] font-bold uppercase tracking-widest mt-2 block"
          style={{ color: labelColor }}
        >
          {AGENT_LABELS[agent]}
        </span>
      </div>
    </div>
  );
}

function JournalistPollingCard({ article }: { article: Article }) {
  const [token, setToken] = useState(
    () => localStorage.getItem("prism_journalist_token") || "press_auditor_alpha"
  );
  const [votes, setVotes] = useState<Record<string, VoteAggregate>>({});
  const [comments, setComments] = useState<Record<string, string>>(
    Object.fromEntries(AGENT_KEYS.map((k) => [k, ""]))
  );
  const [error, setError] = useState<string | null>(null);

  const isVerified = token.trim().length > 3;

  useEffect(() => {
    localStorage.setItem("prism_journalist_token", token);
  }, [token]);

  const fetchVotes = async () => {
    try {
      const res = await fetch(`/api/votes/aggregate/${article.id}`);
      if (res.ok) {
        const data = await res.json();
        setVotes(data.aggregates || {});
      }
    } catch (e) {
      console.error("[Polling] fetch failed", e);
    }
  };

  useEffect(() => {
    fetchVotes();
    const t = setInterval(fetchVotes, 15000);
    return () => clearInterval(t);
  }, [article.id]);

  const submit = async (agentKey: typeof AGENT_KEYS[number], agree: boolean) => {
    if (!isVerified) {
      setError("Press token required (4+ characters).");
      return;
    }
    setError(null);
    try {
      const auth = (await getAuthHeader()) || {};
      const res = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...auth },
        body: JSON.stringify({
          articleId: article.id,
          agent: agentKey,
          journalistId: token.trim(),
          agree,
          comment: comments[agentKey].trim() || undefined,
        }),
      });
      if (res.ok) {
        setComments((p) => ({ ...p, [agentKey]: "" }));
        fetchVotes();
      } else {
        setError("Vote rejected by server.");
      }
    } catch {
      setError("Network error during vote submission.");
    }
  };

  return (
    <div className="bg-soft-white border border-silver-grey p-6">
      <h3 className="font-body text-[12px] font-bold uppercase tracking-widest text-deep-charcoal mb-6 border-b border-silver-grey pb-4">
        Journalist Polling
      </h3>

      <div className="mb-6">
        <label className="block font-body text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">
          Press Token
        </label>
        <input
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="e.g. journo_ap_01"
          className="w-full px-3 py-2 border border-silver-grey focus:border-deep-charcoal outline-none font-body text-[13px] bg-white"
        />
      </div>

      {error && (
        <div className="mb-4 px-3 py-2 border border-error text-error font-body text-[12px]">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {AGENT_KEYS.map((k) => {
          const agg = votes[k] || { agreeCount: 0, disagreeCount: 0, percentage: 100, comments: [] };
          const total = agg.agreeCount + agg.disagreeCount;
          return (
            <div key={k} className="border border-silver-grey bg-white p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-body text-[10px] font-bold uppercase tracking-widest text-deep-charcoal">
                  {AGENT_LABELS[k]}
                </span>
                <span className="font-body text-[12px] font-bold text-deep-charcoal">
                  {agg.percentage}% Agree
                </span>
              </div>
              <div className="h-1 w-full bg-silver-grey">
                <div
                  className="h-full bg-transparency-teal transition-all duration-500"
                  style={{ width: `${agg.percentage}%` }}
                />
              </div>
              <div className="mt-1 flex justify-between font-body text-[10px] text-on-surface-variant">
                <span>{agg.agreeCount} agree</span>
                <span>{agg.disagreeCount} disagree</span>
                <span>{total} {total === 1 ? "vote" : "votes"}</span>
              </div>
              {isVerified && (
                <div className="mt-3 flex gap-2">
                  <input
                    value={comments[k]}
                    onChange={(e) => setComments((p) => ({ ...p, [k]: e.target.value }))}
                    placeholder="Optional comment…"
                    className="flex-1 px-2 py-1 border border-silver-grey focus:border-deep-charcoal outline-none font-body text-[12px] bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => submit(k, true)}
                    className="px-3 py-1 border border-silver-grey hover:bg-soft-white text-[12px] font-body font-semibold"
                  >
                    Agree
                  </button>
                  <button
                    type="button"
                    onClick={() => submit(k, false)}
                    className="px-3 py-1 border border-silver-grey hover:bg-soft-white text-[12px] font-body font-semibold"
                  >
                    Disagree
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NarrativeDrift({ article }: { article: Article }) {
  // Static illustrative timeline anchored on the article timestamp.
  const stops = [
    { time: "08:00", height: 80, color: "#008080", borderColor: "#008080", label: "Initial framing" },
    { time: "12:00", height: 48, color: "#E0E0E0", borderColor: "#E0E0E0", label: "Consolidation" },
    { time: "16:00", height: 112, color: "#ba1a1a", borderColor: "#ba1a1a", label: "Narrative shift" },
    { time: "20:00", height: 64, color: "#008080", borderColor: "#008080", label: "PRISM correction" },
    { time: "00:00", height: 32, color: "#E0E0E0", borderColor: "#E0E0E0", label: "Stability" },
  ];

  return (
    <div className="mt-32">
      <div className="flex items-end gap-4 mb-8">
        <h2 className="font-display text-[28px] font-medium text-deep-charcoal">
          Narrative Drift
        </h2>
        <span className="font-body text-[12px] text-on-surface-variant mb-1">
          Illustrative 24-hour cycle for this verification report
        </span>
      </div>
      <div className="bg-soft-white border border-silver-grey p-8">
        <div className="relative h-48 flex items-end justify-between px-12">
          <div className="absolute bottom-12 left-0 w-full h-[1px] bg-silver-grey" />
          {stops.map((s, i) => (
            <div key={i} className="relative flex flex-col items-center group">
              <div
                className="w-[1px] group-hover:scale-y-110 transition-transform"
                style={{
                  height: `${s.height}px`,
                  backgroundColor: s.color,
                  transformOrigin: "bottom",
                }}
              />
              <div
                className="absolute w-3 h-3 bg-white border-2"
                style={{
                  borderColor: s.borderColor,
                  bottom: `${s.height + 50}px`,
                }}
              />
              <div className="text-[10px] font-bold uppercase mt-2 text-deep-charcoal">
                {s.time}
              </div>
              <div className="absolute -top-8 text-[12px] text-on-surface-variant whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                {s.label}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-6 font-body text-[12px] text-on-surface-variant italic">
          Anchor: {article.sourceName} • {new Date(article.timestamp).toLocaleString()}
        </p>
      </div>
    </div>
  );
}