/**
 * cli.ts — CLI entry for the 24/7 earnings loop.
 *
 * Usage:
 *   npm run loop:start          → run the daemon forever
 *   npm run loop:status         → print one-shot status
 *   npm run loop:start -- --once → run a single tick and exit
 */

import { runEarningsLoop, loadLoopConfig, loopStatus } from './earningsLoop';

const isOnce = process.argv.includes('--once');
const isStatus = process.argv.includes('status');

async function main(): Promise<void> {
  const config = loadLoopConfig();

  if (isStatus) {
    const status = await loopStatus(config);
    console.log(JSON.stringify({
      automatonInstalled: status.automatonInstalled,
      automaton: status.automaton,
      runsCompleted: status.state.runsCompleted,
      postsProduced: status.state.postsProduced,
      lastRunAt: status.state.lastRunAt,
      consecutiveFailures: status.state.consecutiveFailures,
      totalRevenue: status.totalRevenue,
      historyDays: status.history.length,
      dataDir: config.dataDir,
    }, null, 2));
    return;
  }

  const controller = new AbortController();
  process.on('SIGINT', () => controller.abort());
  process.on('SIGTERM', () => controller.abort());

  if (isOnce) {
    // Single tick for manual / cron usage.
    const { runLoopTick } = await import('./earningsLoop');
    const { loadLoopState } = await import('./state');
    const state = loadLoopState(`${config.dataDir}/state.json`);
    const result = await runLoopTick(config, state);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  await runEarningsLoop(config, controller.signal);
}

main().catch((err) => {
  console.error('Loop exited with error:', err);
  process.exit(1);
});
