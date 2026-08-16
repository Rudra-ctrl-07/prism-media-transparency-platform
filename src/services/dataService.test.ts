import { describe, it, expect } from 'vitest';
import { demoArticles, demoSources } from './demoData';
import { synthesizeVerification, toVerificationInputs } from './dataService';

describe('demo dataset integrity', () => {
  it('provides articles that cover all views (coords, debate, bias axes)', () => {
    expect(demoArticles.length).toBeGreaterThanOrEqual(20);

    // Every demo article must carry coordinates so Map and Globe views work.
    const withCoords = demoArticles.filter(
      (a) => typeof a.latitude === 'number' && typeof a.longitude === 'number',
    );
    expect(withCoords.length).toBe(demoArticles.length);

    // Every demo article carries a per-article multi-agent debate analysis.
    const withDebate = demoArticles.filter((a) => a.biasAnalysis?.moderator?.text);
    expect(withDebate.length).toBe(demoArticles.length);

    // Bias axes are present and within range.
    for (const a of demoArticles) {
      if (a.biasAxes) {
        for (const key of ['Emotion', 'Omission', 'Framing'] as const) {
          expect(a.biasAxes[key]).toBeGreaterThanOrEqual(0);
          expect(a.biasAxes[key]).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('provides a non-empty source roster with credibility and bias ratings', () => {
    expect(demoSources.length).toBeGreaterThanOrEqual(8);
    for (const s of demoSources) {
      expect(s.credibility).toBeGreaterThanOrEqual(0);
      expect(s.credibility).toBeLessThanOrEqual(100);
      expect(['Left', 'Center-Left', 'Center', 'Center-Right', 'Right']).toContain(s.biasRating);
    }
  });
});

describe('synthesizeVerification', () => {
  it('produces a debate with all four voices and a confidence score', () => {
    const article = demoArticles[0];
    const result = synthesizeVerification(article);

    expect(result.articleId).toBe(article.id);
    expect(result.credibility).toBe(article.sourceCredibility);
    expect(result.status).toBe(article.verificationStatus);
    expect(result.debate).toBeDefined();
    expect(result.debate?.progressive.length).toBeGreaterThan(10);
    expect(result.debate?.conservative.length).toBeGreaterThan(10);
    expect(result.debate?.omissionFocused.length).toBeGreaterThan(10);
    expect(result.debate?.moderatorVerdict.length).toBeGreaterThan(10);
    expect(result.debate?.confidence).toBeGreaterThanOrEqual(0);
    expect(result.debate?.confidence).toBeLessThanOrEqual(1);
  });

  it('falls back to a generic balanced analysis when no bias analysis exists', () => {
    const bare = {
      id: 'x',
      title: 'Test',
      excerpt: 'A test article.',
      category: 'Home' as const,
      sourceName: 'Test Source',
      sourceCredibility: 0.5,
      biasRating: 'Center' as const,
      verificationStatus: 'PENDING' as const,
      timestamp: new Date().toISOString(),
    };
    const result = synthesizeVerification(bare);
    expect(result.debate?.moderatorVerdict.length).toBeGreaterThan(10);
    expect(result.debate?.confidence).toBeGreaterThanOrEqual(0);
  });
});

describe('toVerificationInputs', () => {
  it('maps articles into BiasComparison-compatible inputs with debate text', () => {
    const inputs = toVerificationInputs(demoArticles.slice(0, 5));

    expect(inputs.length).toBe(5);
    for (const input of inputs) {
      expect(input.articleId).toBeTruthy();
      expect(input.title).toBeTruthy();
      expect(input.source).toBeTruthy();
      expect(typeof input.sourceCredibility).toBe('number');
      expect(input.debate).toBeDefined();
      expect(input.debate.omissionFocused).toBeTruthy();
      expect(input.debate.moderatorVerdict).toBeTruthy();
      expect(typeof input.debate.confidence).toBe('number');
      expect(input.verificationType).toBe('deep');
    }
  });
});
