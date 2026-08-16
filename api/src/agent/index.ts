/**
 * index.ts — barrel export for the PRISM Content & Affiliate Agent.
 *
 * The agent is an autonomous Observe → Think → Act loop:
 *   - Brain (LLM)          → brain.ts
 *   - Brainstem (prompts)  → brainstem.ts
 *   - Hands (tools)        → tools/ (research, affiliate, publisher)
 *   - Memory (long-term)   → memory.ts
 *   - Loop (orchestration) → agentLoop.ts
 */

export { runAgentRun, isBlockedTopic } from './agentLoop';
export type { RunAgentOptions } from './agentLoop';
export { loadAgentConfig } from './config';
export { AgentMemoryStore, createMemoryStore } from './memory';
export {
  matchAffiliateKeywords,
  insertAffiliateLinks,
  buildSearchUrl,
} from './tools/affiliate';
export { observeTrends, nicheRelevance, deriveWinnerTopics } from './tools/research';
export type { Topic, ObserveOptions } from './tools/research';
export { renderPostMarkdown, saveDraft, publishToWordPress } from './tools/publisher';
export * from './types';
