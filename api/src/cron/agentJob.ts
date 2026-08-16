/**
 * cron/agentJob.ts — scheduled Content & Affiliate Agent run.
 *
 * Callable by an external cron scheduler (Vercel Cron, GitHub Actions, a
 * host cron daemon, etc.) so the agent produces content on a cadence.
 * Wired into the existing cron endpoint as `POST /api/cron/agent`.
 */

import { runAgentRun } from '../agent/agentLoop';
import { loadAgentConfig } from '../agent/config';

export async function runAgentJob(): Promise<{ success: boolean; result?: any }> {
  const config = loadAgentConfig();
  if (!config.enabled) {
    console.log('[agent job] Agent is disabled (AGENT_ENABLED=false), skipping.');
    return { success: true, result: { skipped: 'disabled' } };
  }
  console.log('Running scheduled content agent job at:', new Date().toISOString());
  const result = await runAgentRun();
  console.log(
    `[agent job] completed: ${result.postsCreated} posts, ` +
      `${result.skipped.length} skipped, ${result.errors.length} errors, sandbox=${result.sandbox}`,
  );
  return { success: true, result };
}

// If run directly, execute the job
if (require.main === module) {
  runAgentJob()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Agent job failed:', error);
      process.exit(1);
    });
}
