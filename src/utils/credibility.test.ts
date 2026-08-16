import { describe, it, expect } from 'vitest';
import { getCredibilityCategory, getCredibilityColorHex } from './credibility';

describe('Credibility Utility Tests', () => {
  it('categorizes credibility scores correctly', () => {
    expect(getCredibilityCategory(0.9)).toBe('high');
    expect(getCredibilityCategory(0.8)).toBe('high');
    expect(getCredibilityCategory(0.7)).toBe('medium');
    expect(getCredibilityCategory(0.5)).toBe('medium');
    expect(getCredibilityCategory(0.4)).toBe('low');
    expect(getCredibilityCategory(0.0)).toBe('low');
  });

  it('returns corresponding hex colors for scores', () => {
    expect(getCredibilityColorHex(0.85)).toBe('#008080');
    expect(getCredibilityColorHex(0.65)).toBe('#F9A825');
    expect(getCredibilityColorHex(0.2)).toBe('#BA1A1A');
  });
});
