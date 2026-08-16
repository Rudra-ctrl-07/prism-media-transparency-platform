/**
 * automatonSupervisor.ts — keeps the Conway Automaton runtime alive.
 *
 * The Conway Automaton is a sovereign agent runtime that runs its own
 * Think → Act → Observe loop and earns compute credits via x402 paid
 * inference on Conway Cloud. This supervisor makes sure the runtime
 * process is (a) built, (b) running, and (c) restarted if it dies, so it
 * can operate 24/7 alongside PRISM's content agent.
 *
 * Zero-config: with no automaton checkout present, `ensureRunning` reports
 * `sandbox` state and the PRISM bridge falls back to stubs — the loop keeps
 * running on the content agent alone.
 */

import { spawn, execFile } from 'child_process';
import fs from 'fs';
import path from 'path';

export interface AutomatonStatus {
  reachable: boolean;
  pid?: number;
  tier: string;
  credits: number;
  /** True when the runtime is running but couldn't report credits. */
  degraded?: boolean;
  /** True when the automaton repo is not cloned/built locally. */
  notInstalled?: boolean;
  note?: string;
}

export interface SupervisorOptions {
  /** Root of the cloned automaton repo. */
  automatonDir: string;
  /** Port the PRISM bridge expects (for env wiring). */
  port?: number;
  /** Max seconds to wait for the runtime to report health on boot. */
  bootTimeoutMs?: number;
  /** Backoff before attempting a restart after a crash. */
  restartDelayMs?: number;
}

const DEFAULTS = {
  bootTimeoutMs: 20_000,
  restartDelayMs: 10_000,
};

/** True when the runtime dist exists and the repo looks installed. */
export function isAutomatonInstalled(automatonDir: string): boolean {
  const distEntry = path.join(automatonDir, 'dist', 'index.js');
  return fs.existsSync(distEntry);
}

/**
 * Query the runtime's own health. The automaton does not expose an HTTP
 * server out of the box; instead we ask the running process's CLI, or if
 * AUTOMATON_BASE_URL is set we probe the PRISM bridge contract.
 */
export async function checkRuntime(
  automatonDir: string,
  baseUrl?: string,
  timeoutMs = 5_000,
): Promise<AutomatonStatus> {
  if (!isAutomatonInstalled(automatonDir)) {
    return {
      reachable: false,
      tier: 'not_installed',
      credits: 0,
      notInstalled: true,
      note: 'Automaton repo not built. Run the bootstrap script or `pnpm build` in ./automaton.',
    };
  }

  // If a bridge URL is configured, probe it (matches the PRISM /api/automaton bridge).
  if (baseUrl) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);
      const res = await fetch(`${baseUrl}/status`, { signal: ctrl.signal });
      clearTimeout(timer);
      if (res.ok) {
        const data = (await res.json()) as { tier?: string; credits?: number };
        return {
          reachable: true,
          tier: data.tier || 'normal',
          credits: data.credits ?? 0,
        };
      }
    } catch (err) {
      // fall through to process-level check
    }
  }

  // Process-level check via the CLI's own --status (non-interactive).
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      ['dist/index.js', '--status'],
      { cwd: automatonDir, timeout: timeoutMs, windowsHide: true },
      (err, stdout) => {
        if (err || !stdout) {
          return resolve({
            reachable: false,
            tier: 'stopped',
            credits: 0,
            note: 'Automaton runtime is not running.',
          });
        }
        // --status prints a human block; pull what we can.
        const tier = /Tier:\s*(\S+)/i.exec(stdout)?.[1] ?? 'normal';
        const credits = Number(/Credits?:\s*([\d.]+)/i.exec(stdout)?.[1] ?? 0);
        const reachable = /State:\s*(?!stopped|dead)/i.test(stdout) || /Turns:\s*\d+/i.test(stdout);
        resolve({ reachable, tier, credits: isNaN(credits) ? 0 : credits });
      },
    );
  });
}

/** Spawn the runtime detached so it survives the loop process. */
export function spawnRuntime(automatonDir: string, logFile: string): { pid?: number; error?: string } {
  if (!isAutomatonInstalled(automatonDir)) {
    return { error: 'Automaton not built — run the bootstrap script first.' };
  }
  try {
    fs.mkdirSync(path.dirname(logFile), { recursive: true });
    const out = fs.openSync(logFile, 'a');
    const child = spawn(process.execPath, ['dist/index.js', '--run'], {
      cwd: automatonDir,
      detached: true,
      stdio: ['ignore', out, out],
      windowsHide: true,
    });
    child.unref();
    return { pid: child.pid };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export interface EnsureResult {
  status: AutomatonStatus;
  action: 'already_running' | 'spawned' | 'skipped';
}

/**
 * Ensure the runtime is up: check → spawn if missing → poll briefly.
 * Returns the resulting status plus what we did.
 */
export async function ensureRunning(opts: SupervisorOptions): Promise<EnsureResult> {
  const { automatonDir, port = 7777, bootTimeoutMs = DEFAULTS.bootTimeoutMs } = opts;
  const baseUrl = process.env.AUTOMATON_BASE_URL || `http://localhost:${port}`;

  const initial = await checkRuntime(automatonDir, baseUrl);
  if (initial.reachable) {
    return { status: initial, action: 'already_running' };
  }

  if (initial.notInstalled) {
    return { status: initial, action: 'skipped' };
  }

  const logFile = path.join(automatonDir, '..', 'logs', 'automaton.log');
  const spawned = spawnRuntime(automatonDir, logFile);
  if (spawned.error) {
    return { status: { reachable: false, tier: 'error', credits: 0, note: spawned.error }, action: 'skipped' };
  }

  // Poll a few times for the runtime to come up.
  const deadline = Date.now() + bootTimeoutMs;
  let status = initial;
  while (Date.now() < deadline) {
    await sleep(2_000);
    status = await checkRuntime(automatonDir, baseUrl);
    if (status.reachable) break;
  }
  return {
    status: status.reachable ? status : { ...status, note: 'Runtime spawned but not yet healthy — retrying next tick.' },
    action: 'spawned',
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
