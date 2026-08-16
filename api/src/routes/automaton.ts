/**
 * Automaton Integration Bridge
 *
 * Conway-Research/automaton is a sovereign AI agent runtime. Per its
 * architecture, the runtime exposes its capabilities via the Conway REST
 * API (`api.conway.tech`) and the Creator CLI (`status`, `logs`, `fund`).
 *
 * For the PRIZM integration we expose a lightweight HTTP bridge so the
 * React frontend can:
 *   - POST  /api/automaton/verify    → kick off a verification turn for a claim
 *   - GET   /api/automaton/status    → check whether a runtime is reachable
 *   - GET   /api/automaton/logs      → tail the runtime audit log
 *
 * The runtime is expected to be running on the same host (or in the same
 * Kubernetes pod) under `process.env.AUTOMATON_BASE_URL` if you want to
 * dispatch live requests. With no runtime configured, these endpoints
 * return stub data so the frontend can still render the agent UI.
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth';

export const automatonRouter = Router();

const AUTOMATON_BASE_URL = process.env.AUTOMATON_BASE_URL || '';
const AUTOMOBILE_API_KEY = process.env.AUTOMATON_API_KEY || '';

interface AutomatonVerifyRequest {
  claim: string;
  context?: string;
  priority?: 'low' | 'normal' | 'high';
}

interface AutomatonVerifyResponse {
  agentId: string;
  tier: 'normal' | 'low_compute' | 'critical' | 'dead';
  reply: string;
  creditsUsed: number;
  creditsRemaining: number;
  isSandbox: boolean;
  timestamp: string;
}

async function callAutomatonRuntime(path: string, body: any): Promise<any | null> {
  if (!AUTOMATON_BASE_URL) return null;
  try {
    const res = await fetch(`${AUTOMATON_BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(AUTOMOBILE_API_KEY ? { 'X-Automaton-Key': AUTOMOBILE_API_KEY } : {}),
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err: any) {
    console.warn(`[automaton] Runtime call failed (${path}):`, err.message || err);
    return null;
  }
}

automatonRouter.get('/status', authenticate, async (_req: any, res: any) => {
  const live = await callAutomatonRuntime('/status', {});
  if (live) {
    return res.json({
      reachable: true,
      agentId: live.agentId,
      tier: live.tier,
      credits: live.credits,
      uptime: live.uptime,
    });
  }
  res.json({
    reachable: false,
    agentId: null,
    tier: 'sandbox',
    credits: 0,
    uptime: 0,
    note:
      'No running automaton runtime detected. Start one with `node dist/index.js --run` ' +
      'and set AUTOMATON_BASE_URL to enable sovereign AI verification.',
  });
});

automatonRouter.post('/verify', authenticate, async (req: any, res: any) => {
  const { claim, context, priority }: AutomatonVerifyRequest = req.body || {};
  if (!claim) return res.status(400).json({ error: 'claim is required' });

  const live = await callAutomatonRuntime('/verify', { claim, context, priority });
  if (live) {
    const payload: AutomatonVerifyResponse = {
      agentId: live.agentId,
      tier: live.tier,
      reply: live.reply,
      creditsUsed: live.creditsUsed,
      creditsRemaining: live.creditsRemaining,
      isSandbox: false,
      timestamp: new Date().toISOString(),
    };
    return res.json(payload);
  }

  // Sandbox fallback — return a deterministic stub so the UI can render.
  const reply = [
    `[Sandbox] Sovereign agent received claim: "${claim.slice(0, 200)}"`,
    priority === 'high'
      ? 'High priority — escalation queue accepted.'
      : 'Normal priority — runtime would dispatch through x402 paid inference.',
    'Live verification requires a running automaton runtime with credits.',
  ].join('\n');

  const payload: AutomatonVerifyResponse = {
    agentId: 'sandbox-agent-0001',
    tier: 'normal',
    reply,
    creditsUsed: 0,
    creditsRemaining: 0,
    isSandbox: true,
    timestamp: new Date().toISOString(),
  };
  res.json(payload);
});

automatonRouter.get('/logs', authenticate, async (req: any, res: any) => {
  const tail = Number(req.query.tail) || 20;
  const live = await callAutomatonRuntime('/logs', { tail });
  if (live) {
    return res.json({ lines: live.lines, isSandbox: false });
  }
  res.json({
    isSandbox: true,
    lines: [
      `[sandbox] ${new Date().toISOString()} Automaton runtime not running.`,
      '[sandbox] Start with `pnpm build && node dist/index.js --run` in the automaton directory.',
      `[sandbox] Tail requested: ${tail} lines.`,
    ],
  });
});
