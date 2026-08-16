import React, { useState, useEffect } from "react";
import { MessageSquare, BarChart3, HelpCircle, Activity } from "lucide-react";
import { Article } from "../types";
import JournalistPolling from "./JournalistPolling";

interface JournalistPollingTabProps {
  articles: Article[];
  user: any;
  onLogin: () => void;
}

export default function JournalistPollingTab({ articles, user, onLogin }: JournalistPollingTabProps) {
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({});

  const articlesWithBias = articles.filter(a => a.biasAnalysis);
  const activeArticle = articlesWithBias.find(a => a.id === selectedArticleId) || articlesWithBias[0] || null;

  // Fetch all vote counts for articles to display a badge
  const fetchAllVoteCounts = async () => {
    const counts: Record<string, number> = {};
    for (const art of articlesWithBias) {
      try {
        const res = await fetch(`/api/votes/aggregate/${art.id}`);
        if (res.ok) {
          const data = await res.json();
          let total = 0;
          Object.values(data.aggregates || {}).forEach((agg: any) => {
            total += (agg.agreeCount || 0) + (agg.disagreeCount || 0);
          });
          counts[art.id] = total;
        }
      } catch (e) {
        console.error(e);
      }
    }
    setVoteCounts(counts);
  };

  useEffect(() => {
    fetchAllVoteCounts();
    const interval = setInterval(fetchAllVoteCounts, 15000);
    return () => clearInterval(interval);
  }, [articles]);

  useEffect(() => {
    if (activeArticle && !selectedArticleId) {
      setSelectedArticleId(activeArticle.id);
    }
  }, [activeArticle]);

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50 font-sans">
      
      {/* Header */}
      <header className="px-4 md:px-8 py-4 md:py-5 border-b border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
            <BarChart3 className="w-5 h-5 text-slate-700" />
          </div>
          <div>
            <h1 className="text-base md:text-lg font-display font-bold text-slate-900 tracking-tight leading-snug">
              Journalist & Public Polling Central
            </h1>
            <p className="text-[10px] md:text-xs text-slate-500 font-mono">
              Review and audit community evaluations on news bias in real-time
            </p>
          </div>
        </div>
      </header>

      {/* Main split grid */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Left Side: Articles Selection list */}
        <div className="w-full lg:w-96 border-b lg:border-b-0 lg:border-r border-slate-200 bg-white flex flex-col overflow-y-auto shrink-0 h-64 lg:h-full scrollbar">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <span className="text-[10px] font-mono tracking-wider text-slate-500 uppercase font-semibold">
              Select Article for Audit
            </span>
          </div>
          <div className="divide-y divide-slate-150">
            {articlesWithBias.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No articles with active bias analyses found. Evaluate articles in the feed tab first.
              </div>
            ) : (
              articlesWithBias.map((art) => {
                const isSelected = activeArticle?.id === art.id;
                const voteCount = voteCounts[art.id] || 0;
                return (
                  <div
                    key={art.id}
                    onClick={() => setSelectedArticleId(art.id)}
                    className={`p-4 hover:bg-slate-50 cursor-pointer transition-all ${
                      isSelected ? "bg-slate-100/80 border-l-4 border-slate-700 font-medium" : ""
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-mono text-slate-500 uppercase bg-slate-100 px-1.5 py-0.5 rounded">
                          {art.category}
                        </span>
                        <span className="text-[10px] font-mono text-slate-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100 font-bold">
                          {voteCount} {voteCount === 1 ? "audit note" : "audit notes"}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 leading-snug line-clamp-2">
                        {art.title}
                      </h4>
                      <p className="text-[10px] text-slate-500 line-clamp-1">
                        By {art.sourceName}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Polling Details Form */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 scrollbar bg-slate-50/30">
          {activeArticle ? (
            <div className="prism-card p-6 border-slate-200 bg-white shadow-sm space-y-6">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                  Currently Auditing
                </span>
                <h2 className="text-lg font-bold text-slate-900 leading-snug mt-1">
                  {activeArticle.title}
                </h2>
                <p className="text-xs text-slate-500 font-mono mt-1 text-slate-600">
                  Publisher Bias Rating: <span className="font-semibold text-slate-800">{activeArticle.biasRating}</span> | Credibility: <span className="font-semibold text-slate-800">{activeArticle.sourceCredibility}%</span>
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl">
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 block mb-1">
                  Article Excerpt
                </span>
                <p className="text-xs text-slate-700 leading-relaxed italic">
                  "{activeArticle.excerpt}"
                </p>
              </div>

              {user ? (
                <JournalistPolling article={activeArticle} />
              ) : (
                <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-8 text-center flex flex-col items-center justify-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  </div>
                  <div className="space-y-1 max-w-sm">
                    <h4 className="text-sm font-semibold text-slate-850">Verification Access Required</h4>
                    <p className="text-xs text-slate-500 leading-relaxed font-sans">
                      To submit verification audit votes and post comments, you must first connect your identity session. Guest mode is read-only.
                    </p>
                  </div>
                  <button
                    onClick={onLogin}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow transition-all active:scale-95"
                  >
                    Google Sign-In
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 font-mono text-xs p-8 text-center">
              <MessageSquare className="w-8 h-8 text-slate-350 mb-2 animate-bounce" />
              <span>Select an article from the left pane to participate in collaborative news auditing.</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
