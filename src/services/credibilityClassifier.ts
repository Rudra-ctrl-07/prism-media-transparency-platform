/**
 * credibilityClassifier.ts — ML-powered news credibility analysis.
 *
 * Uses the existing HuggingFace transformers infrastructure (MobileBERT
 * zero-shot classifier + MiniLM embeddings) combined with heuristic
 * rules to produce a credibility score and detailed analysis for each
 * article or headline.
 *
 * The classifier evaluates:
 * 1. Emotional / sensational language detection (clickbait signals)
 * 2. Factual claim vs opinion classification
 * 3. Source credibility cross-reference
 * 4. Hedging language and uncertainty markers
 * 5. Named entity density (more entities = more factual)
 * 6. Headline structure analysis (questions, ALL CAPS, exclamation)
 */

import CredibilityWorker from '../workers/credibility.worker?worker';

export interface CredibilityResult {
  score: number;           // 0–100 credibility score
  confidence: number;      // 0–1 confidence in the score
  label: 'high' | 'medium' | 'low' | 'unreliable';
  signals: Signal[];       // Individual analysis signals
  headlineAnalysis: HeadlineAnalysis;
  factualityScore: number; // 0–1 (0 = opinion, 1 = factual)
}

export interface Signal {
  name: string;
  score: number;     // -1 to 1 (negative = suspicious, positive = trustworthy)
  weight: number;    // How much this signal contributes
  detail: string;
}

export interface HeadlineAnalysis {
  emotionalLanguage: boolean;
  clickbaitScore: number;   // 0–1
  questionHeadline: boolean;
  allCaps: boolean;
  exclamationCount: number;
  superlatives: string[];
  hedging: string[];
}

// Singleton worker management
let worker: Worker | null = null;
let pendingResolve: ((result: CredibilityResult) => void) | null = null;
let pendingReject: ((err: Error) => void) | null = null;

function getWorker(): Worker {
  if (!worker) {
    worker = new CredibilityWorker();
    worker.addEventListener('message', (event) => {
      const { type, result, error } = event.data;
      if (type === 'result' && pendingResolve) {
        pendingResolve(result);
        pendingResolve = null;
        pendingReject = null;
      } else if (type === 'error' && pendingReject) {
        pendingReject(new Error(error));
        pendingResolve = null;
        pendingReject = null;
      }
    });
  }
  return worker;
}

/**
 * Analyze a headline and article excerpt for credibility signals.
 * Returns a comprehensive credibility assessment.
 */
export async function analyzeCredibility(
  headline: string,
  excerpt: string,
  sourceName: string,
  sourceCredibility: number,
): Promise<CredibilityResult> {
  return new Promise((resolve, reject) => {
    pendingResolve = resolve;
    pendingReject = reject;

    try {
      const w = getWorker();
      w.postMessage({
        type: 'analyze',
        payload: { headline, excerpt, sourceName, sourceCredibility },
      });
    } catch (err) {
      // Worker not available — fall back to heuristic-only analysis
      resolve(heuristicAnalysis(headline, excerpt, sourceName, sourceCredibility));
      pendingResolve = null;
      pendingReject = null;
    }
  });
}

/**
 * Batch-analyze multiple articles (for feed views).
 * Processes sequentially to avoid memory spikes.
 */
export async function analyzeBatch(
  articles: Array<{
    id: string;
    title: string;
    excerpt: string;
    sourceName: string;
    sourceCredibility: number;
  }>,
): Promise<Map<string, CredibilityResult>> {
  const results = new Map<string, CredibilityResult>();

  // Process in batches of 5 to manage memory
  const batchSize = 5;
  for (let i = 0; i < articles.length; i += batchSize) {
    const batch = articles.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((a) =>
        analyzeCredibility(a.title, a.excerpt, a.sourceName, a.sourceCredibility).then(
          (r) => ({ id: a.id, result: r }),
        ),
      ),
    );
    for (const { id, result } of batchResults) {
      results.set(id, result);
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Heuristic-only analysis (fallback when ML worker is unavailable)
// ---------------------------------------------------------------------------

function heuristicAnalysis(
  headline: string,
  excerpt: string,
  sourceName: string,
  sourceCredibility: number,
): CredibilityResult {
  const signals: Signal[] = [];
  const headlineAnalysis = analyzeHeadline(headline);

  // Source credibility signal
  signals.push({
    name: 'Source Track Record',
    score: sourceCredibility * 2 - 1, // Map 0–1 to -1–1
    weight: 0.25,
    detail: `${sourceName} has a baseline credibility of ${Math.round(sourceCredibility * 100)}%`,
  });

  // Clickbait detection
  const clickbaitScore = headlineAnalysis.clickbaitScore;
  signals.push({
    name: 'Clickbait Analysis',
    score: 1 - clickbaitScore * 2,
    weight: 0.2,
    detail: clickbaitScore > 0.6
      ? 'Headline shows strong clickbait patterns'
      : clickbaitScore > 0.3
      ? 'Headline shows moderate emotional framing'
      : 'Headline appears factually structured',
  });

  // Emotional language
  const emotionScore = detectEmotionalLanguage(headline + ' ' + excerpt);
  signals.push({
    name: 'Emotional Language',
    score: 1 - emotionScore * 2,
    weight: 0.15,
    detail: emotionScore > 0.5
      ? 'Content uses heavily emotional language'
      : 'Content maintains neutral tone',
  });

  // Named entity density
  const entityDensity = calculateEntityDensity(headline + ' ' + excerpt);
  signals.push({
    name: 'Named Entity Density',
    score: Math.min(1, entityDensity * 3) * 2 - 1,
    weight: 0.15,
    detail: `Found ${entityDensity.toFixed(1)} named entities per sentence — ${
      entityDensity > 2 ? 'high specificity' : entityDensity > 1 ? 'moderate specificity' : 'low specificity'
    }`,
  });

  // Hedging language
  const hedging = detectHedging(excerpt);
  signals.push({
    name: 'Hedging Language',
    score: hedging.length > 2 ? -0.3 : hedging.length > 0 ? 0 : 0.3,
    weight: 0.1,
    detail: hedging.length > 0
      ? `Contains hedging: "${hedging.slice(0, 3).join('", "')}"`
      : 'No hedging detected — assertive claims',
  });

  // Factuality indicators
  const factualitySignals = detectFactuality(excerpt);
  signals.push({
    name: 'Factual Content',
    score: factualitySignals.score,
    weight: 0.15,
    detail: factualitySignals.detail,
  });

  // Calculate weighted score
  let totalWeight = 0;
  let weightedScore = 0;
  for (const s of signals) {
    // Normalize score from -1–1 to 0–1
    const normalized = (s.score + 1) / 2;
    weightedScore += normalized * s.weight;
    totalWeight += s.weight;
  }

  const rawScore = totalWeight > 0 ? (weightedScore / totalWeight) * 100 : 50;
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));

  // Calculate confidence based on signal agreement
  const signalScores = signals.map((s) => (s.score + 1) / 2);
  const mean = signalScores.reduce((a, b) => a + b, 0) / signalScores.length;
  const variance = signalScores.reduce((a, b) => a + (b - mean) ** 2, 0) / signalScores.length;
  const confidence = Math.max(0.3, Math.min(1, 1 - Math.sqrt(variance)));

  // Factuality score
  const factualityScore = factualitySignals.factuality;

  return {
    score,
    confidence,
    label: score >= 75 ? 'high' : score >= 50 ? 'medium' : score >= 25 ? 'low' : 'unreliable',
    signals,
    headlineAnalysis,
    factualityScore,
  };
}

// ---------------------------------------------------------------------------
// Headline analysis
// ---------------------------------------------------------------------------

const EMOTIONAL_WORDS = [
  'shocking', 'unbelievable', 'outrageous', 'incredible', 'breaking',
  'urgent', 'just in', 'exclusive', 'bombshell', 'devastating',
  'terrifying', 'horrifying', 'explosive', 'slams', 'blasts',
  'destroys', 'annihilates', 'rips', 'rips into', 'furious',
  'rage', 'panic', 'crisis', 'collapse', 'doom', 'apocalypse',
  'secret', 'hidden', 'they don\'t want you to know', 'miracle',
  'game-changer', 'revolutionary', 'never before seen',
];

const SUPERLATIVES = [
  'best', 'worst', 'greatest', 'biggest', 'most', 'least',
  'never', 'always', 'every', 'all', 'none', 'first',
  'last', 'only', 'ultimate', 'definitive',
];

const HEDGING_WORDS = [
  'reportedly', 'allegedly', 'sources say', 'according to',
  'it appears', 'suggests', 'may', 'might', 'could',
  'some say', 'critics argue', 'it\'s possible', 'unclear',
];

const FACTUAL_MARKERS = [
  /\b\d{4}\b/,                    // Years
  /\b\d+[%$€£]\b/,               // Percentages and currency
  /\b\d+ (million|billion|trillion)\b/i, // Large numbers
  /\bstud(?:y|ies) (?:found|shows?|suggests?)\b/i, // Study citations
  /\baccording to\b/i,            // Attribution
  /\bstatistic(?:s|al)\b/i,       // Statistics references
];

function analyzeHeadline(headline: string): HeadlineAnalysis {
  const lower = headline.toLowerCase();
  const words = headline.split(/\s+/);

  // Emotional language
  const emotionalMatches = EMOTIONAL_WORDS.filter((w) => lower.includes(w));

  // Clickbait score
  let clickbaitScore = 0;
  if (emotionalMatches.length > 0) clickbaitScore += 0.3;
  if (headline.includes('?')) clickbaitScore += 0.2;
  if (words.length < 6) clickbaitScore += 0.15;
  if (/\d+\s*(?:reasons|ways|things|secrets|tips)/i.test(headline)) clickbaitScore += 0.25;
  if (/(?:you won't believe|this is why|what happens|the truth about)/i.test(lower)) clickbaitScore += 0.3;

  // Question headline
  const questionHeadline = headline.includes('?');

  // ALL CAPS (ignore first word)
  const allCapsWords = words.filter((w) => w.length > 2 && w === w.toUpperCase() && /[A-Z]/.test(w));
  const allCaps = allCapsWords.length > words.length * 0.4;

  // Exclamation marks
  const exclamationCount = (headline.match(/!/g) || []).length;

  // Superlatives
  const foundSuperlatives = SUPERLATIVES.filter((s) => lower.includes(s));

  // Hedging
  const foundHedging = HEDGING_WORDS.filter((h) => lower.includes(h));

  return {
    emotionalLanguage: emotionalMatches.length > 0,
    clickbaitScore: Math.min(1, clickbaitScore),
    questionHeadline,
    allCaps,
    exclamationCount,
    superlatives: foundSuperlatives,
    hedging: foundHedging,
  };
}

// ---------------------------------------------------------------------------
// Text analysis helpers
// ---------------------------------------------------------------------------

function detectEmotionalLanguage(text: string): number {
  const lower = text.toLowerCase();
  const matches = EMOTIONAL_WORDS.filter((w) => lower.includes(w));
  return Math.min(1, matches.length / 5);
}

function calculateEntityDensity(text: string): number {
  // Simple heuristic: count capitalized words that aren't at sentence start
  // and common organization/entity suffixes
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  if (sentences.length === 0) return 0;

  let entityCount = 0;
  const entityPatterns = [
    /\b[A-Z][a-z]+ (?:Inc|Corp|Ltd|LLC|Co|Group|Agency|Ministry|Department)\b/g,
    /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, // Proper nouns (two-word names)
    /\b(?:UN|EU|NATO|WHO|IMF|WTO|FBI|CIA|NSA|DOJ|SEC|FDA|CDC)\b/g, // Acronyms
  ];

  for (const pattern of entityPatterns) {
    const matches = text.match(pattern);
    if (matches) entityCount += matches.length;
  }

  return entityCount / sentences.length;
}

function detectHedging(text: string): string[] {
  const lower = text.toLowerCase();
  return HEDGING_WORDS.filter((h) => lower.includes(h));
}

function detectFactuality(text: string): { score: number; factuality: number; detail: string } {
  let factualSignals = 0;
  let opinionSignals = 0;

  // Check for factual markers
  for (const pattern of FACTUAL_MARKERS) {
    if (pattern.test(text)) factualSignals++;
  }

  // Check for opinion markers
  const opinionPatterns = [
    /\b(?:i think|in my opinion|we believe|it seems|arguably)\b/i,
    /\b(?:should|must|need to|have to)\b/g,
    /\b(?:right|wrong|good|bad|best|worst)\b/g,
  ];
  for (const pattern of opinionPatterns) {
    const matches = text.match(pattern);
    if (matches) opinionSignals += matches.length;
  }

  const total = factualSignals + opinionSignals;
  const factuality = total > 0 ? factualSignals / total : 0.5;
  const score = factuality * 2 - 1;

  return {
    score,
    factuality,
    detail: factualSignals > opinionSignals
      ? `Contains ${factualSignals} factual indicators (numbers, citations, statistics)`
      : opinionSignals > factualSignals
      ? `Contains ${opinionSignals} opinion indicators (subjective language, value judgments)`
      : 'Mixed factual and opinion content',
  };
}

/**
 * Get a color class for a credibility score.
 */
export function credibilityColor(score: number): string {
  if (score >= 75) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
  if (score >= 50) return 'text-amber-700 bg-amber-50 border-amber-200';
  if (score >= 25) return 'text-orange-700 bg-orange-50 border-orange-200';
  return 'text-red-700 bg-red-50 border-red-200';
}

/**
 * Get a credibility badge label.
 */
export function credibilityBadge(score: number): string {
  if (score >= 75) return 'HIGH CREDIBILITY';
  if (score >= 50) return 'MEDIUM CREDIBILITY';
  if (score >= 25) return 'LOW CREDIBILITY';
  return 'UNRELIABLE';
}
