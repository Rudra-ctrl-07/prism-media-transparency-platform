/**
 * SearchBar.tsx — global article search overlay.
 *
 * A keyboard-shortcut-activated (Ctrl/Cmd+K) search that filters the live
 * article feed by title, excerpt, source, and category. Results are shown
 * in a dropdown with article previews. Pressing Enter on a result opens
 * the article detail modal. Escape closes the overlay.
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search, X, ExternalLink } from 'lucide-react';
import { Article } from '../types';

interface SearchBarProps {
  articles: Article[];
  onSelectArticle: (article: Article) => void;
}

export function SearchBar({ articles, onSelectArticle }: SearchBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Global keyboard shortcut: Ctrl/Cmd + K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  // Filter articles based on query
  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    return articles
      .filter((a) => {
        const haystack = `${a.title} ${a.excerpt} ${a.sourceName} ${a.category}`.toLowerCase();
        return haystack.includes(q);
      })
      .slice(0, 12);
  }, [query, articles]);

  const handleSelect = useCallback(
    (article: Article) => {
      onSelectArticle(article);
      setIsOpen(false);
    },
    [onSelectArticle],
  );

  // Credibility badge color
  const credColor = (cred: number) =>
    cred >= 0.85
      ? 'bg-emerald-100 text-emerald-800'
      : cred >= 0.7
      ? 'bg-amber-100 text-amber-800'
      : 'bg-red-100 text-red-800';

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 px-2.5 py-1 bg-white border-2 border-arcade-ink text-[11px] font-bold shadow-brutal-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
        title="Search articles (Ctrl+K)"
      >
        <Search className="w-3 h-3" />
        <span className="hidden lg:inline">Search</span>
        <kbd className="hidden lg:inline text-[9px] text-arcade-ink/50 font-mono">⌘K</kbd>
      </button>

      {/* Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Search panel */}
          <div className="relative z-10 w-full max-w-xl bg-white border-2 border-arcade-ink shadow-brutal-lg">
            {/* Input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b-2 border-arcade-ink">
              <Search className="w-4 h-4 text-arcade-ink/60 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search articles, sources, topics…"
                className="flex-1 bg-transparent text-[14px] font-semibold text-arcade-ink placeholder:text-arcade-ink/40 focus:outline-none"
              />
              <button
                onClick={() => setIsOpen(false)}
                className="text-arcade-ink/50 hover:text-arcade-ink"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Results */}
            <div className="max-h-[50vh] overflow-y-auto">
              {query.trim() === '' ? (
                <div className="px-4 py-6 text-center text-[12px] text-arcade-ink/50 font-semibold">
                  Type to search across {articles.length} articles…
                  <br />
                  <span className="text-[10px]">
                    Search by title, source, category, or topic keyword
                  </span>
                </div>
              ) : results.length === 0 ? (
                <div className="px-4 py-6 text-center text-[12px] text-arcade-ink/50 font-semibold">
                  No articles match "{query}"
                </div>
              ) : (
                <ul className="divide-y divide-arcade-ink/10">
                  {results.map((article) => (
                    <li key={article.id}>
                      <button
                        onClick={() => handleSelect(article)}
                        className="w-full text-left px-4 py-3 hover:bg-arcade-yellow/30 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-bold text-arcade-ink line-clamp-1">
                              {article.title}
                            </p>
                            <p className="text-[11px] text-arcade-ink/60 mt-0.5 line-clamp-1">
                              {article.excerpt}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-[10px] font-bold text-arcade-ink/70">
                                {article.sourceName}
                              </span>
                              <span className="text-[10px] text-arcade-ink/40">•</span>
                              <span className="text-[10px] text-arcade-ink/50">{article.category}</span>
                              <span className="text-[10px] text-arcade-ink/40">•</span>
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 ${credColor(
                                  article.sourceCredibility,
                                )}`}
                              >
                                {Math.round(article.sourceCredibility * 100)}%
                              </span>
                            </div>
                          </div>
                          <ExternalLink className="w-3 h-3 text-arcade-ink/30 mt-1 shrink-0" />
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Footer hint */}
            <div className="px-4 py-2 border-t border-arcade-ink/10 bg-arcade-yellow/20 text-[10px] text-arcade-ink/50 font-semibold flex items-center gap-4">
              <span>
                <kbd className="px-1 py-0.5 bg-white border border-arcade-ink/20 text-[9px] font-mono">
                  ↵
                </kbd>{' '}
                to select
              </span>
              <span>
                <kbd className="px-1 py-0.5 bg-white border border-arcade-ink/20 text-[9px] font-mono">
                  esc
                </kbd>{' '}
                to close
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
