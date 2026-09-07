import { useState, useEffect } from 'react';
import { BiasVisualization } from './BiasVisualization';
import { Article } from '../types';
import { fetchVerification } from '../services/dataService';

interface VerificationResult {
  // Basic info (from article)
  articleId: string;
  title: string;
  source: string;
  sourceCredibility: number; // 0-1
  summary: string;
  // Deep verification details (only present if deep=true)
  debate?: {
    progressive: string;
    conservative: string;
    omissionFocused: string;
    moderatorVerdict: string;
    confidence: number; // 0-1
  };
  verificationTimestamp: number; // unix timestamp
  verificationType: 'basic' | 'deep';
}

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  articleId: string;
  title: string;
  source: string;
  summary: string;
  sourceCredibility: number;
  /** Full article (optional) — used to synthesize per-article analysis in demo mode. */
  article?: Article | null;
}

export const VerificationModal = ({
  isOpen,
  onClose,
  articleId,
  title,
  source,
  summary,
  sourceCredibility,
  article,
}: VerificationModalProps) => {
  const [verification, setVerification] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'live' | 'empty'>('live');

  // Fetch real verification data when modal opens or articleId changes.
  // Tries the live `/api/articles/:id/verify?deep=true` endpoint; when the
  // backend is unreachable it synthesizes analysis from the article's own
  // bias analysis (unique per article, never a canned block).
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const fetchVerificationData = async () => {
      setLoading(true);
      setError(null);
      try {
        const articleLike: Article =
          article ||
          ({
            id: articleId,
            title,
            excerpt: summary,
            sourceName: source,
            sourceCredibility,
            biasRating: 'Center',
            verificationStatus: 'PENDING',
            category: 'Home',
            timestamp: new Date().toISOString(),
          } as Article);

        const result = await fetchVerification(articleLike);
        if (cancelled) return;
        setVerification({
          articleId,
          title,
          source,
          sourceCredibility,
          summary,
          debate: result.data.debate,
          verificationTimestamp: Date.now(),
          verificationType: 'deep',
          confidence: result.data.confidence,
          status: result.data.status,
        });
        setMode(result.mode);
      } catch (err) {
        console.error('Error fetching verification:', err);
        if (!cancelled) setError('Failed to load analysis. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchVerificationData();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, articleId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative bg-surface rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-on-surface-variant/60 hover:text-on-surface-variant transition-colors p-1"
          aria-label="Close"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        <div className="pt-8 pb-4">
          {/* Article Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="font-headline-lg text-headline-lg">{title}</h2>
            </div>
            <div className="flex items-center gap-3 text-body-sm text-on-surface-variant">
              <span>{source}</span>
              <span className="w-0.5 h-0.5 bg-on-surface-variant/20 rounded-full mx-2"></span>
              <span>{Math.round(sourceCredibility * 100)}% Credibility</span>
              {mode === 'empty' && (
                <span className="px-2 py-0.5 rounded-full border border-amber-500/40 bg-amber-500/10 text-label-sm text-amber-700">
                  LOCAL ANALYSIS
                </span>
              )}
            </div>
          </div>

          {/* Article Summary */}
          <p className="font-body-md text-body-md mb-6">{summary}</p>

          {/* Verification Tabs */}
          <div className="mb-4">
            <div className="flex border-b border-silver-grey">
              <button className="text-label-sm font-label-sm text-primary border-b-2 border-primary px-4 py-2 transition-colors">
                Analysis
              </button>
              <button className="text-label-sm font-label-sm text-on-surface-variant/60 hover:text-on-surface-variant transition-colors px-4 py-2">
                Sources
              </button>
            </div>
          </div>

          {/* Analysis Content */}
          <div className="space-y-6">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full border-4 border-primary/20 border-t-primary w-8 h-8"></div>
                <span className="ml-2 text-body-sm">Loading analysis...</span>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-label-sm text-on-surface-variant">{error}</p>
              </div>
            ) : (
              <>
                {/* Bias Visualization */}
                <div className="border-t border-silver-grey pt-6">
                  <h3 className="font-hankenGrotesk text-[12px] font-bold uppercase tracking-widest text-primary mb-4">
                    Bias Analysis
                  </h3>
                  <BiasVisualization verification={verification} />
                </div>

                {/* Detailed Perspectives */}
                <div className="space-y-4">
                  <div className="border border-silver-grey rounded-lg p-4">
                    <h4 className="font-hankenGrotesk text-[12px] font-bold uppercase tracking-widest text-primary mb-3">
                      Progressive Perspective
                    </h4>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      {verification?.debate?.progressive || 'No data available'}
                    </p>
                  </div>

                  <div className="border border-silver-grey rounded-lg p-4">
                    <h4 className="font-hankenGrotesk text-[12px] font-bold uppercase tracking-widest text-primary mb-3">
                      Conservative Perspective
                    </h4>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      {verification?.debate?.conservative || 'No data available'}
                    </p>
                  </div>

                  <div className="border border-silver-grey rounded-lg p-4">
                    <h4 className="font-hankenGrotesk text-[12px] font-bold uppercase tracking-widest text-primary mb-3">
                      Omission Analysis
                    </h4>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      {verification?.debate?.omissionFocused || 'No data available'}
                    </p>
                  </div>

                  <div className="border border-silver-grey rounded-lg p-4">
                    <h4 className="font-hankenGrotesk text-[12px] font-bold uppercase tracking-widest text-primary mb-3">
                      Moderator's Synthesis
                    </h4>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      {verification?.debate?.moderatorVerdict || 'No data available'}
                    </p>
                    <p className="mt-2 text-body-xs text-on-surface-variant/60">
                      Confidence: {Math.round((verification?.debate?.confidence || 0) * 100)}%
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
