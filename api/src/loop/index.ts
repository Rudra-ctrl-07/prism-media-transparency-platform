/**
 * index.ts — barrel export for the 24/7 earnings loop.
 *
 *   loop/earningsLoop.ts       — the daemon (tick: agent + automaton + record)
 *   loop/automatonSupervisor.ts— boots / health-checks / restarts the runtime
 *   loop/earningsReport.ts     — daily earnings aggregation + reports
 *   loop/state.ts              — durable loop state (resumes after restarts)
 */

export {
  runEarningsLoop,
  runLoopTick,
  loadLoopConfig,
  loopStatus,
  stateFile,
  historyFile,
  reportFile,
} from './earningsLoop';
export type { LoopConfig, LoopRunResult } from './earningsLoop';
export {
  ensureRunning,
  checkRuntime,
  isAutomatonInstalled,
} from './automatonSupervisor';
export type { AutomatonStatus, SupervisorOptions } from './automatonSupervisor';
export {
  appendDailyEarnings,
  readEarningsHistory,
  totalRevenue,
  renderEarningsMarkdown,
} from './earningsReport';
export type { DailyEarnings, EarningsSnapshot } from './earningsReport';
export { loadLoopState, saveLoopState, emptyLoopState } from './state';
export type { LoopState } from './state';
