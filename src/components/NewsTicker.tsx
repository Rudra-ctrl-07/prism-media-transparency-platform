/**
 * NewsTicker — the arcade marquee: a black strip that scrolls live headlines
 * continuously (CSS keyframe animation, seamless loop via duplicated content).
 * Pauses on hover. Plays nice with the neo-brutalist palette.
 */
import { useMemo } from 'react';
import { Article } from '../types';

interface NewsTickerProps {
  articles: Article[];
  /** Optional prefix label shown as a static block before the marquee. */
  label?: string;
  /** Fallback text when there are no articles yet. */
  emptyText?: string;
}

const SEPARATOR = '✦';

export const NewsTicker = ({
  articles,
  label = 'LIVE INTELLIGENCE',
  emptyText = 'Scanning the world’s newsrooms…',
}: NewsTickerProps) => {
  const items = useMemo(() => {
    const source = articles.length > 0 ? articles : [];
    if (source.length === 0) {
      // Pad the fallback so the marquee still scrolls
      return Array.from({ length: 6 }, (_, i) => `${emptyText} ${SEPARATOR}`);
    }
    // Expand to at least 8 entries so the loop reads as continuous
    const expanded: string[] = [];
    let i = 0;
    while (expanded.length < 12) {
      const a = source[i % source.length];
      expanded.push(
        `${a.sourceName.toUpperCase()}: ${a.title}` +
          (typeof a.sourceCredibility === 'number'
            ? ` • ${Math.round(a.sourceCredibility * 100)}%`
            : ''),
      );
      i++;
    }
    return expanded;
  }, [articles, emptyText]);

  // Two copies of the run for a seamless scroll
  const run = (keyPrefix: string) => (
    <div className="flex shrink-0 items-center" aria-hidden={keyPrefix === 'b'}>
      {items.map((item, i) => (
        <span key={`${keyPrefix}-${i}`} className="flex items-center shrink-0">
          <span className="px-5 text-[12px] font-bold tracking-wide whitespace-nowrap">
            {item}
          </span>
          <span className="text-arcade-pink text-[11px]">💀</span>
        </span>
      ))}
    </div>
  );

  return (
    <div className="flex items-stretch bg-arcade-ink text-arcade-yellow border-b-2 border-arcade-ink overflow-hidden">
      {/* Static label block */}
      <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-arcade-pink text-white font-display text-[11px] tracking-widest uppercase border-r-2 border-arcade-ink z-10">
        <span className="inline-block w-2 h-2 bg-white animate-pulse" />
        {label}
      </div>
      {/* Scrolling run */}
      <div className="relative flex-1 overflow-hidden group/ticker">
        <div className="marquee-track flex w-max group-hover/ticker:[animation-play-state:paused]">
          {run('a')}
          {run('b')}
        </div>
      </div>
    </div>
  );
};

export default NewsTicker;
