/**
 * state.ts — durable state for the 24/7 earnings loop.
 *
 * Persisted to `data/loop/state.json` (zero-config, same pattern as the agent
 * memory store) so the loop resumes its schedule after a process restart
 * instead of losing its position.
 */

import fs from 'fs';
import path from 'path';

export interface LoopState {
  /** ISO timestamp of the last completed agent run. */
  lastRunAt: string | null;
  /** Total agent runs completed by this loop instance. */
  runsCompleted: number;
  /** Total posts produced across all runs. */
  postsProduced: number;
  /** Total revenue recorded in the agent memory (snapshot). */
  lastKnownRevenue: number;
  /** Consecutive failures (reset on success) — used for backoff. */
  consecutiveFailures: number;
  /** Automaton runtime health: last seen tier / credits. */
  automaton: {
    lastSeenAt: string | null;
    lastTier: string | null;
    lastCredits: number;
    restarts: number;
  };
  updatedAt: string;
}

export function emptyLoopState(): LoopState {
  return {
    lastRunAt: null,
    runsCompleted: 0,
    postsProduced: 0,
    lastKnownRevenue: 0,
    consecutiveFailures: 0,
    automaton: { lastSeenAt: null, lastTier: null, lastCredits: 0, restarts: 0 },
    updatedAt: new Date().toISOString(),
  };
}

/** Load loop state from disk; returns a fresh state when missing/corrupt. */
export function loadLoopState(filePath: string): LoopState {
  try {
    if (fs.existsSync(filePath)) {
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      return { ...emptyLoopState(), ...parsed };
    }
  } catch (err) {
    console.warn('[loop state] Failed to load, starting fresh:', (err as Error).message);
  }
  return emptyLoopState();
}

/** Persist loop state (creates parent dirs). */
export function saveLoopState(filePath: string, state: LoopState): void {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify({ ...state, updatedAt: new Date().toISOString() }, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[loop state] Failed to persist:', (err as Error).message);
  }
}
