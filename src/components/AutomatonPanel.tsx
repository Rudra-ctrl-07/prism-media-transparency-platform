/**
 * AutomatonPanel — UI for triggering sovereign AI agent verification
 * of a claim via the Conway Automaton runtime integration.
 *
 * When a user clicks "Verify with Sovereign Agent", the panel:
 *  1. Calls GET  /api/automaton/status  to confirm a runtime is reachable.
 *  2. Sends the claim to POST /api/automaton/verify.
 *  3. Streams the agent's reply into the in-card transcript.
 *
 * The component is self-contained — no global state — so it can be
 * embedded in any page or modal.
 */

import React, { useState } from 'react';

interface AutomatonStatus {
  reachable: boolean;
  agentId: string | null;
  tier: string;
  credits: number;
  uptime: number;
  note?: string;
}

interface AutomatonVerifyResponse {
  agentId: string;
  tier: string;
  reply: string;
  creditsUsed: number;
  creditsRemaining: number;
  isSandbox: boolean;
  timestamp: string;
}

interface AutomatonPanelProps {
  defaultClaim?: string;
  onClose?: () => void;
}

const API_BASE = (import.meta as any).env?.VITE_API_BASE || '';

async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    const auth = await (window as any).__getAuthHeader?.();
    return auth || {};
  } catch {
    return {};
  }
}

export const AutomatonPanel: React.FC<AutomatonPanelProps> = ({ defaultClaim = '', onClose }) => {
  const [claim, setClaim] = useState<string>(defaultClaim);
  const [status, setStatus] = useState<AutomatonStatus | null>(null);
  const [result, setResult] = useState<AutomatonVerifyResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const checkStatus = async () => {
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/automaton/status`, {
        headers: await getAuthHeader(),
      });
      setStatus(await res.json());
    } catch (e) {
      console.error('automaton status failed:', e);
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (!claim.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/automaton/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeader()) },
        body: JSON.stringify({ claim, priority: 'normal' }),
      });
      const data = (await res.json()) as AutomatonVerifyResponse;
      setResult(data);
    } catch (e) {
      console.error('automaton verify failed:', e);
    } finally {
      setBusy(false);
    }
  };

  const fetchLogs = async () => {
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/automaton/logs?tail=20`, {
        headers: await getAuthHeader(),
      });
      const data = await res.json();
      setLogs(data.lines || []);
    } catch (e) {
      console.error('automaton logs failed:', e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="automaton-panel rounded-lg border border-silver-grey bg-surface p-4 shadow-sm font-body-md">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display-lg text-lg text-primary">Sovereign Agent Verification</h3>
        {onClose && (
          <button onClick={onClose} className="text-on-surface-variant text-sm hover:text-primary">
            ✕
          </button>
        )}
      </div>

      <p className="text-sm text-on-surface-variant mb-3">
        Verify a claim using Conway Automaton — a sovereign AI runtime that earns its own compute credits.
      </p>

      <textarea
        className="w-full rounded border border-silver-grey bg-surface p-2 text-sm font-body-md"
        rows={3}
        placeholder="Paste a claim to verify…"
        value={claim}
        onChange={(e) => setClaim(e.target.value)}
      />

      <div className="flex flex-wrap gap-2 mt-3">
        <button
          onClick={checkStatus}
          disabled={busy}
          className="px-3 py-1.5 rounded bg-primary text-on-primary text-sm font-medium disabled:opacity-50"
        >
          Check Status
        </button>
        <button
          onClick={verify}
          disabled={busy || !claim.trim()}
          className="px-3 py-1.5 rounded bg-accent text-on-primary text-sm font-medium disabled:opacity-50"
        >
          Verify with Sovereign Agent
        </button>
        <button
          onClick={fetchLogs}
          disabled={busy}
          className="px-3 py-1.5 rounded border border-silver-grey text-sm font-medium disabled:opacity-50"
        >
          Tail Logs
        </button>
      </div>

      {status && (
        <div className="mt-3 rounded bg-surface/50 border border-silver-grey p-2 text-xs">
          <div>
            <span className="font-semibold">Reachability:</span>{' '}
            {status.reachable ? '🟢 live' : '🟡 sandbox'}
          </div>
          <div>
            <span className="font-semibold">Tier:</span> {status.tier}
          </div>
          <div>
            <span className="font-semibold">Credits:</span> {status.credits}
          </div>
          {status.note && <div className="text-on-surface-variant mt-1">{status.note}</div>}
        </div>
      )}

      {result && (
        <div className="mt-3 rounded bg-surface/50 border border-silver-grey p-2 text-sm">
          <div className="font-mono text-xs text-on-surface-variant mb-1">
            agent={result.agentId} • tier={result.tier} •{' '}
            {result.isSandbox ? 'SANDBOX' : 'LIVE'} • {new Date(result.timestamp).toLocaleString()}
          </div>
          <pre className="whitespace-pre-wrap font-body-md">{result.reply}</pre>
        </div>
      )}

      {logs.length > 0 && (
        <details className="mt-3 text-xs">
          <summary className="cursor-pointer text-on-surface-variant">Runtime logs ({logs.length})</summary>
          <pre className="mt-1 bg-black/80 text-green-300 p-2 rounded font-mono">
            {logs.join('\n')}
          </pre>
        </details>
      )}
    </div>
  );
};

export default AutomatonPanel;
