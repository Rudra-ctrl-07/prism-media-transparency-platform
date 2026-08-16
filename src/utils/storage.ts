/**
 * storage.ts — localStorage-backed persistence helpers.
 *
 * The dashboard remembers user state across sessions: saved articles,
 * dismissed alerts, watch alerts, and the last active tab.
 */

import { Dispatch, SetStateAction, useEffect, useState } from 'react';

export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    // Malformed or unavailable storage — fall back to the initial value.
    return fallback;
  }
}

export function saveJSON(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked (e.g. private mode) — state just won't persist.
  }
}

/**
 * useState that transparently persists to localStorage under `key`.
 * The stored value survives reloads and is written back on every change.
 */
export function useLocalStorageState<T>(
  key: string,
  initial: T,
): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => loadJSON(key, initial));

  useEffect(() => {
    saveJSON(key, state);
  }, [key, state]);

  return [state, setState];
}
