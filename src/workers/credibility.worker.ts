/**
 * credibility.worker.ts — Web Worker for ML-powered credibility analysis.
 *
 * Loads a zero-shot classification model from HuggingFace (MobileBERT-MNLI)
 * and uses it alongside heuristic rules to classify news headlines and
 * article excerpts as factual, opinion, or misleading.
 */

import { pipeline, env } from '@huggingface/transformers';

env.allowLocalModels = false;

let classifier: any = null;
let device = 'wasm';

// Classification labels for news credibility
const CREDIBILITY_LABELS = [
  'factual reporting',
  'opinion or commentary',
  'misleading or sensationalized',
  'satire or parody',
];

const FACTUALITY_LABELS = [
  'factual claim',
  'opinion or editorial',
];

async function initClassifier() {
  if (classifier) return;

  try {
    // Try WebGPU first
    if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
      try {
        const adapter = await (navigator as any).gpu.requestAdapter();
        if (adapter) device = 'webgpu';
      } catch {
        device = 'wasm';
      }
    }

    console.log(`[CredibilityWorker] Loading classifier on ${device}...`);

    classifier = await pipeline(
      'zero-shot-classification',
      'onnx-community/MobileBERT-uncased-MNLI',
      { device: device as any },
    );

    console.log('[CredibilityWorker] Classifier ready');
  } catch (err) {
    console.error('[CredibilityWorker] Failed to load classifier:', err);
    throw err;
  }
}

// Heuristic rules (same as credibilityClassifier.ts, duplicated for worker isolation)

const EMOTIONAL_WORDS = [
  'shocking', 'unbelievable', 'outrageous', 'incredible', 'breaking',
  'urgent', 'just in', 'exclusive', 'bombshell', 'devastating',
  'terrifying', 'horrifying', 'explosive', 'slams', 'blasts',
  'destroys', 'annihilates', 'rips', 'furious', 'rage',
  'panic', 'crisis', 'collapse', 'doom', 'apocalypse',
  'secret', 'hidden', 'miracle', 'game-changer', 'revolutionary',
];

function analyzeHeadlineHeuristic(headline: string) {
  const lower = headline.toLowerCase();
  const words = headline.split(/\s+/);

  let clickbaitScore = 0;

  // Emotional words
  const emotionalMatches = EMOTIONAL_WORDS.filter((w) => lower.includes(w));
  if (emotionalMatches.length > 0) clickbaitScore += 0.3;

  // Question headline
  if (headline.includes('?')) clickbaitScore += 0.2;

  // Short headline (often clickbait)
  if (words.length < 6) clickbaitScore += 0.15;

  // Listicle pattern
  if (/\d+\s*(?:reasons|ways|things|secrets|tips)/i.test(headline)) clickbaitScore += 0.25;

  // Classic clickbait phrases
  if (/(?:you won't believe|this is why|what happens|the truth about)/i.test(lower)) {
    clickbaitScore += 0.3;
  }

  return { clickbaitScore: Math.min(1, clickbaitScore) };
}

function calculateEntityDensity(text: string): number {
  const sentences = text.split(/[.!?]+/).filter((s: string) => s.trim().length > 0);
  if (sentences.length === 0) return 0;

  let entityCount = 0;
  const patterns = [
    /\b[A-Z][a-z]+ (?:Inc|Corp|Ltd|LLC|Co|Group|Agency|Ministry|Department)\b/g,
    /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g,
    /\b(?:UN|EU|NATO|WHO|IMF|WTO|FBI|CIA|NSA|DOJ|SEC|FDA|CDC)\b/g,
  ];

  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches) entityCount += matches.length;
  }

  return entityCount / sentences.length;
}

function calculateFactualMarkers(text: string): number {
  let count = 0;
  const patterns = [
    /\b\d{4}\b/,
    /\b\d+[%$€£]\b/,
    /\b\d+ (?:million|billion|trillion)\b/i,
    /\bstud(?:y|ies) (?:found|shows?|suggests?)\b/i,
    /\baccording to\b/i,
  ];

  for (const pattern of patterns) {
    if (pattern.test(text)) count++;
  }

  return count;
}

// Message handler
self.addEventListener('message', async (event: MessageEvent) => {
  const { type, payload } = event.data;

  if (type === 'analyze') {
    const { headline, excerpt, sourceName, sourceCredibility } = payload;

    try {
      await initClassifier();

      const text = `${headline}. ${excerpt}`;

      // ML classification: factual vs opinion vs misleading
      const mlResult = await classifier(text, CREDIBILITY_LABELS, {
        multi_label: false,
      });

      // ML factuality: factual claim vs opinion
      const factualityResult = await classifier(text, FACTUALITY_LABELS, {
        multi_label: false,
      });

      // Heuristic analysis
      const headlineAnalysis = analyzeHeadlineHeuristic(headline);
      const entityDensity = calculateEntityDensity(text);
      const factualMarkers = calculateFactualMarkers(text);

      // Build signals
      const signals = [];

      // ML credibility signal
      const mlScore = mlResult.scores[0]; // "factual reporting" score
      const mlMisleading = mlResult.scores[2]; // "misleading" score
      const mlConfidence = mlResult.scores[0] - mlResult.scores[2];
      signals.push({
        name: 'ML Classification',
        score: mlConfidence,
        weight: 0.3,
        detail: `Model: ${Math.round(mlScore * 100)}% factual, ${Math.round(mlMisleading * 100)}% misleading`,
      });

      // Source credibility
      signals.push({
        name: 'Source Track Record',
        score: sourceCredibility * 2 - 1,
        weight: 0.2,
        detail: `${sourceName}: ${Math.round(sourceCredibility * 100)}% baseline`,
      });

      // Clickbait
      const clickbaitScore = headlineAnalysis.clickbaitScore;
      signals.push({
        name: 'Clickbait Detection',
        score: 1 - clickbaitScore * 2,
        weight: 0.15,
        detail: clickbaitScore > 0.5 ? 'Clickbait patterns detected' : 'No significant clickbait signals',
      });

      // Entity density
      signals.push({
        name: 'Named Entity Density',
        score: Math.min(1, entityDensity * 3) * 2 - 1,
        weight: 0.15,
        detail: `${entityDensity.toFixed(1)} entities/sentence`,
      });

      // Factual markers
      signals.push({
        name: 'Factual Indicators',
        score: Math.min(1, factualMarkers / 3) * 2 - 1,
        weight: 0.2,
        detail: `${factualMarkers} factual markers found`,
      });

      // Calculate weighted score
      let totalWeight = 0;
      let weightedScore = 0;
      for (const s of signals) {
        const normalized = (s.score + 1) / 2;
        weightedScore += normalized * s.weight;
        totalWeight += s.weight;
      }

      const rawScore = totalWeight > 0 ? (weightedScore / totalWeight) * 100 : 50;
      const score = Math.max(0, Math.min(100, Math.round(rawScore)));

      // Confidence
      const signalScores = signals.map((s) => (s.score + 1) / 2);
      const mean = signalScores.reduce((a: number, b: number) => a + b, 0) / signalScores.length;
      const variance = signalScores.reduce((a: number, b: number) => a + (b - mean) ** 2, 0) / signalScores.length;
      const confidence = Math.max(0.3, Math.min(1, 1 - Math.sqrt(variance)));

      // Factuality
      const factualityScore = factualityResult.scores[0]; // "factual claim" score

      const result = {
        score,
        confidence,
        label: score >= 75 ? 'high' : score >= 50 ? 'medium' : score >= 25 ? 'low' : 'unreliable',
        signals,
        headlineAnalysis: {
          emotionalLanguage: headlineAnalysis.clickbaitScore > 0.3,
          clickbaitScore: headlineAnalysis.clickbaitScore,
          questionHeadline: headline.includes('?'),
          allCaps: false,
          exclamationCount: (headline.match(/!/g) || []).length,
          superlatives: [],
          hedging: [],
        },
        factualityScore,
      };

      self.postMessage({ type: 'result', result });
    } catch (err: any) {
      console.error('[CredibilityWorker] Analysis failed:', err);

      // Fallback to heuristic-only
      const headlineAnalysis = analyzeHeadlineHeuristic(headline);
      const entityDensity = calculateEntityDensity(`${headline} ${excerpt}`);
      const factualMarkers = calculateFactualMarkers(`${headline} ${excerpt}`);

      const sourceScore = sourceCredibility * 2 - 1;
      const clickbaitScore = headlineAnalysis.clickbaitScore;
      const entityScore = Math.min(1, entityDensity * 3) * 2 - 1;
      const factualScore = Math.min(1, factualMarkers / 3) * 2 - 1;

      const weights = [0.25, 0.25, 0.25, 0.25];
      const scores = [sourceScore, 1 - clickbaitScore * 2, entityScore, factualScore];
      const totalWeight = weights.reduce((a, b) => a + b, 0);
      const weightedScore = scores.reduce((s, v, i) => s + v * weights[i], 0);
      const rawScore = (weightedScore / totalWeight + 1) / 2 * 100;
      const score = Math.max(0, Math.min(100, Math.round(rawScore)));

      const result = {
        score,
        confidence: 0.5,
        label: score >= 75 ? 'high' : score >= 50 ? 'medium' : score >= 25 ? 'low' : 'unreliable',
        signals: [
          { name: 'Source Track Record', score: sourceScore, weight: 0.25, detail: `${sourceName}` },
          { name: 'Clickbait Detection', score: 1 - clickbaitScore * 2, weight: 0.25, detail: `Score: ${clickbaitScore.toFixed(2)}` },
          { name: 'Named Entity Density', score: entityScore, weight: 0.25, detail: `${entityDensity.toFixed(1)} entities/sentence` },
          { name: 'Factual Indicators', score: factualScore, weight: 0.25, detail: `${factualMarkers} markers` },
        ],
        headlineAnalysis: {
          emotionalLanguage: clickbaitScore > 0.3,
          clickbaitScore,
          questionHeadline: headline.includes('?'),
          allCaps: false,
          exclamationCount: (headline.match(/!/g) || []).length,
          superlatives: [],
          hedging: [],
        },
        factualityScore: factualMarkers > 2 ? 0.8 : factualMarkers > 0 ? 0.6 : 0.4,
      };

      self.postMessage({ type: 'result', result });
    }
  }
});
