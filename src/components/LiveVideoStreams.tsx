/**
 * LiveVideoStreams.tsx — Embedded live video streams
 *
 * Provides:
 *   - Broadcast news network live streams (Bloomberg, Sky News, Euronews, etc.)
 *   - Strategic live webcams across key regions
 *   - Category filtering (News, Financial, Regional, Strategic)
 *   - Region filtering (Global, Americas, Europe, MENA, Asia)
 */

import { useMemo, useState } from 'react';
import { Tv, Camera, Play, Pause, ExternalLink, Globe, Filter } from 'lucide-react';
import { liveNewsFeeds, liveWebcams } from '../data/intelData';

type StreamCategory = 'all' | 'news' | 'financial' | 'regional' | 'strategic';
type StreamRegion = 'all' | 'Americas' | 'Europe' | 'MENA' | 'Asia';

const VIDEO_EMBEDS: Record<string, string> = {
  'bloomberg': 'https://www.youtube.com/embed/GtL1huin9EE?autoplay=0&mute=1',
  'sky-news': 'https://www.youtube.com/embed/9hMAsb5hV6s?autoplay=0&mute=1',
  'euronews': 'https://www.youtube.com/embed/e51VJ77HnKo?autoplay=0&mute=1',
  'dw': 'https://www.youtube.com/embed/F-p4rbzKpC0?autoplay=0&mute=1',
  'cnbc': 'https://www.youtube.com/embed/5kaMv7N_ydg?autoplay=0&mute=1',
  'cnn': 'https://www.youtube.com/embed/jfKfPfyJRdk?autoplay=0&mute=1',
  'france24': 'https://www.youtube.com/embed/aZ5Q3Fpnl0o?autoplay=0&mute=1',
  'alarabiya': 'https://www.youtube.com/embed/0ORBzvfWmD4?autoplay=0&mute=1',
  'aljazeera': 'https://www.youtube.com/embed/gCNeDWCI0vo?autoplay=0&mute=1',
  'nhk': 'https://www.youtube.com/embed/f0lYDy3g4wI?autoplay=0&mute=1',
};

export function LiveVideoStreams() {
  const [category, setCategory] = useState<StreamCategory>('all');
  const [region, setRegion] = useState<StreamRegion>('all');
  const [selectedFeed, setSelectedFeed] = useState<string | null>(null);
  const [expandedWebcam, setExpandedWebcam] = useState<string | null>(null);

  const filteredFeeds = useMemo(() => {
    let feeds = liveNewsFeeds;
    if (category !== 'all') feeds = feeds.filter((f) => f.category === category);
    if (region !== 'all') feeds = feeds.filter((f) => f.region === region);
    return feeds;
  }, [category, region]);

  const filteredWebcams = useMemo(() => {
    let cams = liveWebcams;
    if (region !== 'all') cams = cams.filter((c) => c.region === region);
    return cams;
  }, [region]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-silver-grey bg-surface/80 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-2">
          <Tv className="w-4 h-4 text-blue-500" />
          <h2 className="font-headline-md text-[15px] font-semibold text-on-surface">
            Live Video Streams
          </h2>
          <span className="text-[10px] px-1.5 py-0.5 bg-red-500 text-white font-bold rounded animate-pulse">
            LIVE
          </span>
        </div>

        {/* Category filter */}
        <div className="flex gap-1 mb-2">
          {(['all', 'news', 'financial', 'regional'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`text-[9px] px-1.5 py-0.5 font-bold uppercase ${
                category === cat ? 'bg-primary text-on-primary' : 'bg-surface border border-silver-grey'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Region filter */}
        <div className="flex gap-1">
          {(['all', 'Americas', 'Europe', 'MENA', 'Asia'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRegion(r)}
              className={`text-[9px] px-1.5 py-0.5 font-bold ${
                region === r ? 'bg-on-surface text-surface' : 'bg-surface border border-silver-grey'
              }`}
            >
              {r === 'all' ? 'Global' : r}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Selected video player */}
        {selectedFeed && (
          <div className="border border-silver-grey rounded-lg overflow-hidden bg-black">
            <div className="aspect-video w-full">
              <iframe
                src={VIDEO_EMBEDS[selectedFeed] || ''}
                className="w-full h-full"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Live stream"
              />
            </div>
            <div className="flex items-center justify-between px-3 py-2 bg-surface">
              <span className="text-[11px] font-bold text-on-surface">
                {liveNewsFeeds.find((f) => f.id === selectedFeed)?.name}
              </span>
              <button
                onClick={() => setSelectedFeed(null)}
                className="text-[10px] text-on-surface-variant hover:text-on-surface"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* News feeds grid */}
        <div>
          <h3 className="text-[11px] font-bold text-on-surface uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Tv className="w-3 h-3" />
            Broadcast News
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {filteredFeeds.map((feed) => (
              <button
                key={feed.id}
                onClick={() => setSelectedFeed(feed.id)}
                className={`flex items-center gap-2 p-2 border rounded transition-all ${
                  selectedFeed === feed.id
                    ? 'border-primary bg-primary/10'
                    : 'border-silver-grey hover:bg-surface-container-low'
                }`}
              >
                <div className={`w-8 h-8 flex items-center justify-center shrink-0 ${
                  feed.category === 'financial' ? 'bg-green-500/10 text-green-500' :
                  feed.category === 'regional' ? 'bg-orange-500/10 text-orange-500' :
                  'bg-blue-500/10 text-blue-500'
                }`}>
                  <Play className="w-4 h-4" />
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-[10px] font-semibold text-on-surface truncate">{feed.name}</p>
                  <p className="text-[8px] text-on-surface-variant">{feed.network} • {feed.region}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Webcam feeds */}
        <div>
          <h3 className="text-[11px] font-bold text-on-surface uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Camera className="w-3 h-3" />
            Strategic Webcams
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {filteredWebcams.map((cam) => (
              <a
                key={cam.id}
                href={cam.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2 border border-silver-grey rounded hover:bg-surface-container-low transition-colors group"
              >
                <div className={`w-8 h-8 flex items-center justify-center shrink-0 ${
                  cam.category === 'conflict' ? 'bg-red-500/10 text-red-500' :
                  cam.category === 'strategic' ? 'bg-orange-500/10 text-orange-500' :
                  cam.category === 'diplomatic' ? 'bg-blue-500/10 text-blue-500' :
                  'bg-surface-container-low text-on-surface-variant'
                }`}>
                  <Camera className="w-4 h-4" />
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-[10px] font-semibold text-on-surface truncate">{cam.name}</p>
                  <p className="text-[8px] text-on-surface-variant">{cam.city} • {cam.region}</p>
                </div>
                <ExternalLink className="w-3 h-3 text-on-surface-variant opacity-0 group-hover:opacity-100 shrink-0" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LiveVideoStreams;
