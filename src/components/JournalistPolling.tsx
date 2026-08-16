import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  Check, 
  X, 
  MessageSquare, 
  UserCheck, 
  ThumbsUp, 
  ThumbsDown, 
  ChevronDown, 
  ChevronUp, 
  ShieldAlert 
} from "lucide-react";
import { Article } from "../types";
import { getAuthHeader } from "../firebase-compat";

interface JournalistPollingProps {
  article: Article;
}

export default function JournalistPolling({ article }: JournalistPollingProps) {
  const [journalistToken, setJournalistToken] = useState<string>(() => {
    return localStorage.getItem("prism_journalist_token") || "press_auditor_alpha";
  });
  
  const [votesData, setVotesData] = useState<Record<string, {
    agreeCount: number;
    disagreeCount: number;
    percentage: number;
    comments: Array<{ journalistId: string; comment: string; timestamp: string }>;
  }>>({});

  const [voteComments, setVoteComments] = useState<Record<string, string>>({
    progressive: "",
    conservative: "",
    omission: "",
    moderator: ""
  });

  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({
    progressive: false,
    conservative: false,
    omission: false,
    moderator: false
  });

  const [isSubmitting, setIsSubmitting] = useState<Record<string, boolean>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check if current user is "verified" (e.g. has a press token containing words like 'press', 'journo', 'auditor', or simply non-empty)
  const isVerified = journalistToken.trim().length > 3;

  useEffect(() => {
    localStorage.setItem("prism_journalist_token", journalistToken);
  }, [journalistToken]);

  const fetchVotes = async () => {
    if (!article.id) return;
    try {
      const res = await fetch(`/api/votes/aggregate/${article.id}`);
      if (res.ok) {
        const data = await res.json();
        setVotesData(data.aggregates || {});
      }
    } catch (err) {
      console.error("[JournalistPolling] Error retrieving votes:", err);
    }
  };

  useEffect(() => {
    fetchVotes();
    // Poll updates every 15 seconds to ensure live collaborative updates
    const interval = setInterval(fetchVotes, 15000);
    return () => clearInterval(interval);
  }, [article.id]);

  const handleVoteSubmit = async (
    agentKey: "progressive" | "conservative" | "omission" | "moderator", 
    agree: boolean
  ) => {
    if (!isVerified) {
      setErrorMessage("Please enter a valid Press ID (minimum 4 characters) to cast a verified audit vote.");
      return;
    }
    setErrorMessage(null);

    setIsSubmitting(prev => ({ ...prev, [agentKey]: true }));
    const commentText = voteComments[agentKey];

    const payload = {
      articleId: article.id,
      agent: agentKey,
      journalistId: journalistToken.trim(),
      agree,
      comment: commentText.trim() || undefined
    };

    try {
      const authHeader = (await getAuthHeader()) || {};
      const res = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error("Server responded with error during vote submission");
      }

      // Reset specific comment box upon success
      setVoteComments(prev => ({ ...prev, [agentKey]: "" }));
      // Fetch fresh aggregates
      await fetchVotes();
    } catch (err: any) {
      console.error("[JournalistPolling] Submit vote failed:", err);
      setErrorMessage("Network issue. Failed to record press audit vote.");
    } finally {
      setIsSubmitting(prev => ({ ...prev, [agentKey]: false }));
    }
  };

  const toggleComments = (agentKey: string) => {
    setExpandedComments(prev => ({ ...prev, [agentKey]: !prev[agentKey] }));
  };

  const agentsList = [
    { key: "progressive", label: "Progressive Alignment", color: "indigo" },
    { key: "conservative", label: "Conservative Alignment", color: "rose" },
    { key: "omission", label: "Omission Audit", color: "amber" },
    { key: "moderator", label: "Moderator Consensus", color: "purple" }
  ] as const;

  if (!article.biasAnalysis) {
    return (
      <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-6 text-center">
        <p className="text-xs text-slate-500 font-sans">
          Bias evaluation data is not initialized for this information feed item. Submit a live analysis query first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 border-t border-slate-100 pt-6">
      {/* Verification Header */}
      <div className="bg-gradient-to-r from-slate-50 to-white border border-slate-200/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-slate-950 font-display flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" /> Live Journalist & Press Audit Polling
            </h4>
            {isVerified ? (
              <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-mono px-2 py-0.5 rounded-full border border-emerald-200 font-bold">
                <UserCheck className="w-3 h-3" /> VERIFIED PRESS
              </span>
            ) : (
              <span className="flex items-center gap-1 bg-slate-100 text-slate-500 text-[10px] font-mono px-2 py-0.5 rounded-full border border-slate-200 font-bold">
                UNAUTHORIZED
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 leading-snug">
            Verify bias evaluations, log feedback notes, and view global consensus percentages.
          </p>
        </div>

        {/* Credentials Editor */}
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-1.5 shadow-sm shrink-0">
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase px-1.5">Press Token:</span>
          <input
            type="text"
            value={journalistToken}
            onChange={(e) => setJournalistToken(e.target.value)}
            placeholder="e.g. journo_ap_01"
            className="bg-slate-50 border border-slate-100 rounded px-2 py-1 text-xs font-mono font-bold text-slate-800 outline-none w-44 focus:ring-1 focus:ring-indigo-500 focus:bg-white"
          />
        </div>
      </div>

      {errorMessage && (
        <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-lg text-xs leading-relaxed">
          <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Grid of Agents Findings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {agentsList.map(({ key, label, color }) => {
          const finding = article.biasAnalysis?.[key];
          if (!finding) return null;

          const agg = votesData[key] || { agreeCount: 0, disagreeCount: 0, percentage: 100, comments: [] };
          const totalVotes = agg.agreeCount + agg.disagreeCount;
          const isCommentsExpanded = expandedComments[key];
          const hasComments = agg.comments && agg.comments.length > 0;

          // Compute style configurations dynamically
          const borderHighlight = 
            color === "indigo" ? "hover:border-indigo-200 focus-within:border-indigo-300" :
            color === "rose" ? "hover:border-rose-200 focus-within:border-rose-300" :
            color === "amber" ? "hover:border-amber-200 focus-within:border-amber-300" :
            "hover:border-purple-200 focus-within:border-purple-300";

          const bgHighlight = 
            color === "indigo" ? "bg-indigo-50/50 border-indigo-100 text-indigo-700" :
            color === "rose" ? "bg-rose-50/50 border-rose-100 text-rose-700" :
            color === "amber" ? "bg-amber-50/50 border-amber-100 text-amber-700" :
            "bg-purple-50/50 border-purple-100 text-purple-700";

          const progressColor = 
            color === "indigo" ? "bg-indigo-600" :
            color === "rose" ? "bg-rose-600" :
            color === "amber" ? "bg-amber-500" :
            "bg-purple-600";

          return (
            <div 
              key={key} 
              className={`p-4 border border-slate-200 rounded-xl bg-white flex flex-col justify-between space-y-4 transition-all duration-250 ${borderHighlight}`}
            >
              <div className="space-y-2.5">
                {/* Finding Header badge and rating percentage */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${bgHighlight}`}>
                    {label}
                  </span>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-slate-800">
                      {agg.percentage}% Agree
                    </span>
                    <span className="text-[10px] font-sans text-slate-400 block">
                      {totalVotes} {totalVotes === 1 ? "vote" : "votes"}
                    </span>
                  </div>
                </div>

                {/* Finding Content */}
                <p className="text-xs text-slate-700 font-sans leading-relaxed italic bg-slate-50/60 p-2.5 rounded-lg border border-slate-100">
                  "{finding.text}"
                </p>

                {/* Percentage Progress Bar */}
                <div className="space-y-1">
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden shadow-inner">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ease-out ${progressColor}`}
                      style={{ width: `${agg.percentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[9px] font-mono text-slate-400 px-0.5">
                    <span>{agg.agreeCount} Agree</span>
                    <span>{agg.disagreeCount} Disagree</span>
                  </div>
                </div>

                {/* Collapsible Journalist Notes */}
                {hasComments && (
                  <div className="pt-1.5 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => toggleComments(key)}
                      className="text-[10px] text-indigo-600 hover:text-indigo-800 font-mono font-bold flex items-center gap-1 focus:outline-none transition-colors"
                    >
                      {isCommentsExpanded ? (
                        <>
                          Hide Audit Notes <ChevronUp className="w-3 h-3" />
                        </>
                      ) : (
                        <>
                          View Audit Notes ({agg.comments.length}) <ChevronDown className="w-3 h-3" />
                        </>
                      )}
                    </button>

                    {isCommentsExpanded && (
                      <div className="mt-2 space-y-2 max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 bg-slate-50/80 border border-slate-200/60 rounded-lg p-2.5">
                        {agg.comments.map((comment, index) => (
                          <div 
                            key={index} 
                            className="text-[10px] leading-relaxed text-slate-600 border-b border-slate-100 pb-1.5 last:border-none last:pb-0"
                          >
                            <div className="flex justify-between items-center text-[9px] font-mono text-slate-500 mb-0.5">
                              <span className="font-bold text-slate-800 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                                {comment.journalistId}
                              </span>
                              <span>{new Date(comment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <p className="font-sans text-slate-700 pl-2.5 border-l border-slate-200">
                              {comment.comment}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Verified Voting Mini-Form */}
              <div className="border-t border-slate-100 pt-3">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder={isVerified ? "Optional audit comment..." : "Login/Enter Press Token first"}
                      disabled={!isVerified || isSubmitting[key]}
                      value={voteComments[key]}
                      onChange={(e) => setVoteComments(prev => ({ ...prev, [key]: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 focus:bg-white disabled:opacity-50 transition-colors font-sans"
                    />
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={!isVerified || isSubmitting[key]}
                      onClick={() => handleVoteSubmit(key, true)}
                      className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 disabled:opacity-50 border border-emerald-200 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 shrink-0 hover:shadow-xs active:scale-95"
                      title="Agree with alignment"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>Agree</span>
                    </button>
                    <button
                      type="button"
                      disabled={!isVerified || isSubmitting[key]}
                      onClick={() => handleVoteSubmit(key, false)}
                      className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 disabled:opacity-50 border border-rose-200 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 shrink-0 hover:shadow-xs active:scale-95"
                      title="Disagree with alignment"
                    >
                      <ThumbsDown className="w-3.5 h-3.5" />
                      <span>Disagree</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
