/**
 * earningsLoop.ts — the 24/7 earnings loop daemon.
 *
 * Runs forever (until SIGINT/SIGTERM), ticking on an interval:
 *
 *   1. OBSERVE + ACT — run the content agent (observe → think → act) to
 *      produce affiliate-linked articles, guided by the performance feedback
 *      loop (winners get double-down topics).
 *   2. AUTOMATON — keep the Conway Automaton sovereign runtime alive so it
 *      can earn compute credits via x402 paid inference alongside PRISM.
 *   3. RECORD — snapshot earnings (agent revenue + automaton credits) into
 *      durable state and a daily history file.
 *
 * Zero-config: with no GOOGLE_API_KEY the agent runs in sandbox mode and with
 * no automaton checkout the supervisor reports `not_installed`; the loop
 * still ticks and records. Real earnings require the usual env (see README).
 */

import { runAgentRun } from '../agent';
import { createMemoryStore } from '../agent/memory';
import { loadAgentConfig } from '../agent/config';
import {
  ensureRunning,
  checkRuntime,
  isAutomatonInstalled,
  AutomatonStatus,
} from './automatonSupervisor';
import { loadLoopState, saveLoopState, LoopState } from './state';
import {
  appendDailyEarnings,
  readEarningsHistory,
  writeMarkdownReport,
  DailyEarnings,
} from './earningsReport';

export interface LoopConfig {
  /** Seconds between ticks. Default 6h (21600). Min 60s for testing. */
  intervalSeconds: number;
  /** Where the automaton repo lives. */
  automatonDir: string;
  /** Data directory for state + reports. */
  dataDir: string;
  /** Automaton port (matches AUTOMATON_PORT / bridge env). */
  automatonPort: number;
  /** True to actually run the content agent each tick. */
  runContentAgent: boolean;
  /** True to spawn/restart the automaton runtime. */
  superviseAutomaton: boolean;
}

export function loadLoopConfig(env: NodeJS.ProcessEnv = process.env): LoopConfig {
  const interval = Number(env.EARNINGS_LOOP_INTERVAL_SECONDS) || 6 * 60 * 60;
  const root = env.PRISM_ROOT || process.cwd();
  return {
    intervalSeconds: Math.max(60, interval),
    automatonDir: env.AUTOMATON_DIR || `${root}/automaton`,
    dataDir: env.EARNINGS_DATA_DIR || `${root}/data/loop`,
    automatonPort: Number(env.AUTOMATON_PORT) || 7777,
    runContentAgent: env.EARNINGS_LOOP_AGENT !== 'false',
    superviseAutomaton: env.EARNINGS_LOOP_AUTOMATON !== 'false',
  };
}

export interface LoopRunResult {
  tick: number;
  startedAt: string;
  postsCreated: number;
  agentSandbox: boolean;
  automaton: AutomatonStatus;
  revenue: number;
  daily: DailyEarnings;
}

/**
 * One full loop tick: run the agent, supervise the automaton, record earnings.
 * Never throws — failures are captured into the result so the daemon survives.
 */
export async function runLoopTick(
  config: LoopConfig,
  state: LoopState,
): Promise<LoopRunResult> {
  const startedAt = new Date().toISOString();
  const agentConfig = loadAgentConfig();
  const store = createMemoryStore(agentConfig.memoryFile);

  // ── 1. Content agent (observe → think → act) ──────────────────────────
  let postsCreated = 0;
  let agentSandbox = true;
  if (config.runContentAgent) {
    try {
      const result = await runAgentRun();
      postsCreated = result.postsCreated;
      agentSandbox = result.sandbox;
      state.postsProduced += result.postsCreated;
      state.runsCompleted += 1;
      state.lastRunAt = new Date().toISOString();
      state.consecutiveFailures = 0;
    } catch (err) {
      state.consecutiveFailures += 1;
      console.error('[earnings loop] Agent run failed:', (err as Error).message);
    }
  }

  // ── 2. Automaton supervision ───────────────────────────────────────────
  let automaton: AutomatonStatus;
  if (config.superviseAutomaton) {
    const result = await ensureRunning({
      automatonDir: config.automatonDir,
      port: config.automatonPort,
    });
    automaton = result.status;
    if (result.action === 'spawned') {
      state.automaton.restarts += 1;
    }
    if (automaton.reachable) {
      state.automaton.lastSeenAt = new Date().toISOString();
      state.automaton.lastTier = automaton.tier;
      state.automaton.lastCredits = automaton.credits;
    }
  } else {
    automaton = { reachable: false, tier: 'disabled', credits: 0, note: 'Automaton supervision disabled.' };
  }

  // ── 3. Record earnings ────────────────────────────────────────────────
  const revenue = store.revenue.reduce((s, r) => s + r.amount, 0);
  state.lastKnownRevenue = revenue;
  saveLoopState(stateFile(config), state);

  const today: DailyEarnings = {
    date: new Date().toISOString().slice(0, 10),
    revenue,
    newPosts: postsCreated,
    published: store.posts.filter((p) => p.status === 'published').length,
    clicks: store.posts.reduce((s, p) => s + (p.metrics?.clicks || 0), 0),
    automatonCredits: automaton.credits || 0,
  };
  const history = appendDailyEarnings(historyFile(config), today);
  writeMarkdownReport(reportFile(config), history);

  return { tick: state.runsCompleted, startedAt, postsCreated, agentSandbox, automaton, revenue, daily: today };
}

// ── paths ─────────────────────────────────────────────────────────────────
export const stateFile = (c: LoopConfig) => `${c.dataDir}/state.json`;
export const historyFile = (c: LoopConfig) => `${c.dataDir}/earnings.jsonl`;
export const reportFile = (c: LoopConfig) => `${c.dataDir}/REPORT.md`;

/**
 * Run the loop forever. Callers pass an abort signal so tests / tooling can
 * stop it cleanly; production runs via `npm run loop:start` (SIGTERM works).
 */
export async function runEarningsLoop(
  config: LoopConfig,
  signal?: AbortSignal,
  onTick?: (result: LoopRunResult) => void,
): Promise<void> {
  console.log(`[earnings loop] starting — tick every ${config.intervalSeconds}s`);
  console.log(`[earnings loop] data dir: ${config.dataDir}`);
  console.log(
    `[earnings loop] agent=${config.runContentAgent ? 'on' : 'off'} automaton=${config.superviseAutomaton ? 'on' : 'off'}`,
  );

  let state = loadLoopState(stateFile(config));

  // First tick immediately so money-generating work starts right away.
  let tick = 0;
  const tickFn = async () => {
    tick += 1;
    try {
      const result = await runLoopTick(config, state);
      console.log(
        `[earnings loop] tick #${tick}: ${result.postsCreated} post(s), revenue $${result.revenue.toFixed(2)}, ` +
          `automaton ${result.automaton.tier} (${result.automaton.credits} credits)`,
      );
      onTick?.(result);
    } catch (err) {
      console.error('[earnings loop] tick failed:', (err as Error).message);
      state.consecutiveFailures += 1;
      saveLoopState(stateFile(config), state);
    }
  };

  await tickFn();

  if (signal?.aborted) return;
  await new Promise<void>((resolve) => {
    const timer = setInterval(() => {
      tickFn();
    }, config.intervalSeconds * 1000);
    const cleanup = () => {
      clearInterval(timer);
      resolve();
    };
    signal?.addEventListener('abort', cleanup, { once: true });
    process.once('SIGINT', cleanup);
    process.once('SIGTERM', cleanup);
  });
}

/** Export for status tooling: current automaton install + runtime state. */
export async function loopStatus(config: LoopConfig): Promise<{
  automatonInstalled: boolean;
  automaton: AutomatonStatus;
  state: LoopState;
  history: DailyEarnings[];
  totalRevenue: number;
}> {
  const state = loadLoopState(stateFile(config));
  const history = readEarningsHistory(historyFile(config));
  const automaton = isAutomatonInstalled(config.automatonDir)
    ? await checkRuntime(config.automatonDir, process.env.AUTOMATON_BASE_URL)
    : { reachable: false, tier: 'not_installed', credits: 0 } as AutomatonStatus;
  return {
    automatonInstalled: isAutomatonInstalled(config.automatonDir),
    automaton,
    state,
    history,
    totalRevenue: history.reduce((s, e) => s + e.revenue, 0),
  };
}
