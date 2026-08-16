/**
 * BiasComparePanel — pick 2–3 articles and render the Bias Comparison radar
 * with exactly those. The selection is shared with the feed (checkboxes +
 * floating compare bar) via the dashboard shell, and persisted to
 * localStorage so it survives reloads.
 */

import { useMemo, useState } from 'react';
import { Search, X, Scale } from 'lucide-react';
import { Article } from '../types';
import { BiasComparison } from './BiasComparison';
import { toVerificationInputs } from '../services/dataService';

/** Radar comparisons get unreadable past 3 articles. */
export const MAX_COMPARE = 3;

interface BiasComparePanelProps {
  articles: Article[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onClear: () => void;
}

export const BiasComparePanel = ({
  articles,
  selectedIds,
  onToggle,
  onClear,
}: BiasComparePanelProps) => {
  const [query, setQuery] = useState('');

  const selected = useMemo(() => {
    const byId = new Map(articles.map((a) => [a.id, a]));
    return selectedIds
      .map((id) => byId.get(id))
      .filter((a): a is Article => Boolean(a));
  }, [articles, selectedIds]);

  const verifications = useMemo(() => toVerificationInputs(selected), [selected]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return articles;
    return articles.filter((a) =>
      `${a.title} ${a.sourceName} ${a.excerpt}`.toLowerCase().includes(q),
    );
  }, [articles, query]);

  const atCap = selectedIds.length >= MAX_COMPARE;

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header + selection status */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-headline-lg text-headline-lg mb-1">Bias Compare</h2>
          <p className="text-body-md text-on-surface-variant">
            Select {2}–{MAX_COMPARE} articles and compare their bias profiles side by side.
          </p>
        </div>
        {selectedIds.length > 0 && (
          <button
            onClick={onClear}
            className="px-3 py-1.5 rounded-lg border border-silver-grey text-label-sm font-medium hover:bg-surface-container-low transition-colors"
          >
            Clear selection ({selectedIds.length})
          </button>
        )}
      </div>

      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg border border-transparency-teal/40 bg-transparency-teal/5">
          <span className="text-label-sm font-semibold text-transparency-teal whitespace-nowrap">
            Comparing {selected.length} of {MAX_COMPARE}:
          </span>
          {selected.map((a) => (
            <span
              key={a.id}
              className="flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full border border-silver-grey bg-surface text-label-sm"
            >
              {a.sourceName}: {a.title.length > 40 ? a.title.slice(0, 40) + '…' : a.title}
              <button
                onClick={() => onToggle(a.id)}
                title="Remove from comparison"
                className="text-on-surface-variant hover:text-error transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Picker */}
        <div className="lg:col-span-1 border border-silver-grey rounded-lg bg-surface-container-lowest p-4 space-y-3 h-fit">
          <div className="flex items-center gap-2 border border-silver-grey rounded-lg bg-surface px-3 py-2">
            <Search className="w-4 h-4 text-on-surface-variant shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search articles to compare…"
              className="w-full bg-transparent text-label-sm text-on-surface focus:outline-none placeholder:text-on-surface-variant/50"
            />
          </div>

          {atCap && (
            <p className="text-label-sm text-amber-700">
              Maximum {MAX_COMPARE} articles for a readable comparison — remove one to add another.
            </p>
          )}

          <ul className="space-y-1 max-h-[480px] overflow-y-auto scrollbar-thin pr-1">
            {filtered.map((a) => {
              const isSelected = selectedIds.includes(a.id);
              const disabled = !isSelected && atCap;
              return (
                <li key={a.id}>
                  <label
                    className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-transparency-teal bg-transparency-teal/5'
                        : 'border-silver-grey bg-surface hover:bg-surface-container-low'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={disabled}
                      onChange={() => onToggle(a.id)}
                      className="mt-1 accent-transparency-teal"
                    />
                    <span className="min-w-0">
                      <span className="block text-label-sm text-on-surface leading-snug">
                        {a.title}
                      </span>
                      <span className="block text-label-sm text-on-surface-variant/70">
                        {a.sourceName} • {Math.round(a.sourceCredibility * 100)}% credibility
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
            {filtered.length === 0 && (
              <li className="text-label-sm text-on-surface-variant/60 py-4 text-center">
                No articles match “{query}”.
              </li>
            )}
          </ul>
        </div>

        {/* Radar */}
        <div className="lg:col-span-2 border border-silver-grey rounded-lg bg-surface-container-lowest p-6">
          {verifications.length === 0 ? (
            <div className="min-h-[400px] flex flex-col items-center justify-center text-center text-on-surface-variant">
              <Scale className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-body-md">Select 2–{MAX_COMPARE} articles from the list (or tick “Compare” on feed cards) to chart their bias profiles.</p>
            </div>
          ) : (
            <BiasComparison verifications={verifications} />
          )}
        </div>
      </div>
    </div>
  );
};

export default BiasComparePanel;
