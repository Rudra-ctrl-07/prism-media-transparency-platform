import { describe, it, expect, afterAll } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { loadLoopState, saveLoopState, emptyLoopState } from './state';
import {
  appendDailyEarnings,
  readEarningsHistory,
  totalRevenue,
  renderEarningsMarkdown,
  DailyEarnings,
} from './earningsReport';
import { loadLoopConfig } from './earningsLoop';
import { isAutomatonInstalled } from './automatonSupervisor';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'loop-test-'));

// ──────────────────────────────────────────────────────────────────────
// state.ts — durable loop state
// ──────────────────────────────────────────────────────────────────────
describe('loop state', () => {
  const file = path.join(tmpDir, 'state.json');

  it('returns a fresh state when the file is missing', () => {
    const state = loadLoopState(path.join(tmpDir, 'missing.json'));
    expect(state.runsCompleted).toBe(0);
    expect(state.lastRunAt).toBeNull();
  });

  it('persists and reloads', () => {
    const s = emptyLoopState();
    s.runsCompleted = 4;
    s.postsProduced = 9;
    s.lastKnownRevenue = 42.5;
    s.automaton.restarts = 2;
    saveLoopState(file, s);

    const loaded = loadLoopState(file);
    expect(loaded.runsCompleted).toBe(4);
    expect(loaded.postsProduced).toBe(9);
    expect(loaded.lastKnownRevenue).toBe(42.5);
    expect(loaded.automaton.restarts).toBe(2);
  });

  it('tolerates a corrupt file', () => {
    fs.writeFileSync(path.join(tmpDir, 'corrupt.json'), 'not json{{{', 'utf-8');
    const state = loadLoopState(path.join(tmpDir, 'corrupt.json'));
    expect(state.runsCompleted).toBe(0);
  });
});

// ──────────────────────────────────────────────────────────────────────
// earningsReport.ts — daily aggregation + history
// ──────────────────────────────────────────────────────────────────────
describe('earnings report', () => {
  const historyFile = path.join(tmpDir, 'earnings.jsonl');

  it('appends a new daily entry', () => {
    const day: DailyEarnings = { date: '2026-08-16', revenue: 12.5, newPosts: 2, published: 1, clicks: 30, automatonCredits: 100 };
    appendDailyEarnings(historyFile, day);
    const history = readEarningsHistory(historyFile);
    expect(history).toHaveLength(1);
    expect(history[0].revenue).toBe(12.5);
  });

  it('merges a second tick on the same day (max revenue, summed posts)', () => {
    appendDailyEarnings(historyFile, { date: '2026-08-16', revenue: 20, newPosts: 1, published: 2, clicks: 45, automatonCredits: 150 });
    const history = readEarningsHistory(historyFile);
    expect(history).toHaveLength(1);
    expect(history[0].revenue).toBe(20); // max
    expect(history[0].newPosts).toBe(3); // summed
    expect(history[0].published).toBe(3); // summed
    expect(history[0].clicks).toBe(45); // max
    expect(history[0].automatonCredits).toBe(150); // max
  });

  it('appends separate days as separate rows', () => {
    appendDailyEarnings(historyFile, { date: '2026-08-17', revenue: 5, newPosts: 1, published: 1, clicks: 10, automatonCredits: 0 });
    expect(readEarningsHistory(historyFile)).toHaveLength(2);
  });

  it('sums total revenue across history', () => {
    expect(totalRevenue(readEarningsHistory(historyFile))).toBeCloseTo(25, 5);
  });

  it('renders a markdown table', () => {
    const md = renderEarningsMarkdown(readEarningsHistory(historyFile));
    expect(md).toContain('# PRISM Earnings Report');
    expect(md).toContain('| Date | Revenue |');
    expect(md).toContain('2026-08-16');
  });
});

// ──────────────────────────────────────────────────────────────────────
// earningsLoop.ts — config loading
// ──────────────────────────────────────────────────────────────────────
describe('loadLoopConfig', () => {
  it('applies defaults when env is empty', () => {
    const cfg = loadLoopConfig({} as NodeJS.ProcessEnv);
    expect(cfg.intervalSeconds).toBe(6 * 60 * 60);
    expect(cfg.runContentAgent).toBe(true);
    expect(cfg.superviseAutomaton).toBe(true);
    expect(cfg.automatonPort).toBe(7777);
  });

  it('honors env overrides and clamps interval to a minimum of 60s', () => {
    const cfg = loadLoopConfig({
      EARNINGS_LOOP_INTERVAL_SECONDS: '30',
      EARNINGS_LOOP_AGENT: 'false',
      EARNINGS_LOOP_AUTOMATON: 'false',
      AUTOMATON_PORT: '9999',
      PRISM_ROOT: '/tmp/prism',
    } as NodeJS.ProcessEnv);
    expect(cfg.intervalSeconds).toBe(60); // clamped
    expect(cfg.runContentAgent).toBe(false);
    expect(cfg.superviseAutomaton).toBe(false);
    expect(cfg.automatonPort).toBe(9999);
    expect(cfg.automatonDir).toBe('/tmp/prism/automaton');
  });
});

// ──────────────────────────────────────────────────────────────────────
// automatonSupervisor.ts — install detection
// ──────────────────────────────────────────────────────────────────────
describe('isAutomatonInstalled', () => {
  it('reports not installed for a missing dir', () => {
    expect(isAutomatonInstalled(path.join(tmpDir, 'no-automaton'))).toBe(false);
  });

  it('reports installed only when dist/index.js exists', () => {
    const fake = path.join(tmpDir, 'fake-automaton');
    fs.mkdirSync(path.join(fake, 'dist'), { recursive: true });
    expect(isAutomatonInstalled(fake)).toBe(false);
    fs.writeFileSync(path.join(fake, 'dist', 'index.js'), 'export {}', 'utf-8');
    expect(isAutomatonInstalled(fake)).toBe(true);
  });
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});
