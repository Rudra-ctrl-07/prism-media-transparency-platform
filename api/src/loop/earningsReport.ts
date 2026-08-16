/**
 * earningsReport.ts — aggregates earnings from the agent memory store and
 * appends daily snapshots to `data/loop/earnings.jsonl` so the loop's money
 * generation is measurable over time.
 */

import fs from 'fs';
import path from 'path';

export interface DailyEarnings {
  date: string; // YYYY-MM-DD
  revenue: number;
  newPosts: number;
  published: number;
  clicks: number;
  automatonCredits: number;
}

/** Snapshot of the agent's memory at report time. */
export interface EarningsSnapshot {
  revenue: number;
  posts: number;
  published: number;
  clicks: number;
  automatonCredits?: number;
}

/**
 * Read daily snapshots from the JSONL history file (oldest first).
 */
export function readEarningsHistory(historyFile: string): DailyEarnings[] {
  if (!fs.existsSync(historyFile)) return [];
  const lines = fs.readFileSync(historyFile, 'utf-8').split('\n').filter(Boolean);
  const entries: DailyEarnings[] = [];
  for (const line of lines) {
    try {
      entries.push(JSON.parse(line));
    } catch {
      // skip malformed lines
    }
  }
  return entries;
}

/**
 * Append today's snapshot to the history file. If an entry for today already
 * exists (e.g. the loop ticked twice), merge by taking the max revenue and
 * summing new posts so the log stays one row per day.
 */
export function appendDailyEarnings(
  historyFile: string,
  today: DailyEarnings,
): DailyEarnings[] {
  fs.mkdirSync(path.dirname(historyFile), { recursive: true });
  const existing = readEarningsHistory(historyFile);
  const idx = existing.findIndex((e) => e.date === today.date);
  if (idx !== -1) {
    const prev = existing[idx];
    existing[idx] = {
      ...prev,
      revenue: Math.max(prev.revenue, today.revenue),
      newPosts: prev.newPosts + today.newPosts,
      published: prev.published + today.published,
      clicks: Math.max(prev.clicks, today.clicks),
      automatonCredits: Math.max(prev.automatonCredits || 0, today.automatonCredits || 0),
    };
  } else {
    existing.push(today);
  }
  fs.writeFileSync(historyFile, existing.map((e) => JSON.stringify(e)).join('\n') + '\n', 'utf-8');
  return existing;
}

/** Sum total revenue across the history. */
export function totalRevenue(history: DailyEarnings[]): number {
  return history.reduce((s, e) => s + e.revenue, 0);
}

/** Human-readable markdown summary of the earnings history. */
export function renderEarningsMarkdown(history: DailyEarnings[]): string {
  const lines = ['# PRISM Earnings Report', ''];
  lines.push(`Total revenue: $${totalRevenue(history).toFixed(2)}`);
  lines.push(`Days tracked: ${history.length}`, '');
  lines.push('| Date | Revenue | New posts | Published | Clicks | Automaton credits |');
  lines.push('| --- | --- | --- | --- | --- | --- |');
  for (const e of history) {
    lines.push(
      `| ${e.date} | $${e.revenue.toFixed(2)} | ${e.newPosts} | ${e.published} | ${e.clicks} | ${e.automatonCredits} |`,
    );
  }
  return lines.join('\n') + '\n';
}

/** Write today's markdown report to disk (data/loop/REPORT.md). */
export function writeMarkdownReport(reportFile: string, history: DailyEarnings[]): void {
  fs.mkdirSync(path.dirname(reportFile), { recursive: true });
  fs.writeFileSync(reportFile, renderEarningsMarkdown(history), 'utf-8');
}
