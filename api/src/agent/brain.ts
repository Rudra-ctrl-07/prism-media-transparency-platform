/**
 * brain.ts — the agent's "brain": the foundational LLM wrapper.
 *
 * Mirrors the cascade pattern used across the API (`services/gemini/index.ts`):
 * tries Gemini models in order, then falls back to a deterministic sandbox
 * stub so the agent loop always runs — even with no API key configured.
 */

import { GoogleGenAI } from '@google/genai';

let _ai: GoogleGenAI | null = null;

function getAI(): GoogleGenAI | null {
  if (_ai) return _ai;
  const key = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!key) return null;
  _ai = new GoogleGenAI({ apiKey: key });
  return _ai;
}

const MODEL_CANDIDATES = ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];

/** Extract a JSON object from an LLM response (strips fences / prose). */
export function extractJson(raw: string): any | null {
  if (!raw) return null;
  let text = raw.trim();
  // Strip markdown code fences if present.
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  // If there's prose around the JSON, grab the first {...} block.
  const brace = text.indexOf('{');
  const endBrace = text.lastIndexOf('}');
  if (brace !== -1 && endBrace > brace) {
    text = text.slice(brace, endBrace + 1);
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export interface BrainResponse<T = any> {
  data: T | null;
  model: string;
  sandbox: boolean;
}

/**
 * Call the LLM with a user prompt + system instruction, expecting JSON.
 * Returns the parsed object, or null when no model is reachable.
 */
export async function brainJson(
  prompt: string,
  systemInstruction: string,
): Promise<BrainResponse> {
  const ai = getAI();
  if (ai) {
    for (const model of MODEL_CANDIDATES) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
          },
        });
        const text = response.text;
        if (text) {
          const data = extractJson(text);
          if (data !== null) {
            return { data, model, sandbox: false };
          }
          console.warn(`[agent brain] Model ${model} returned unparseable JSON, trying next.`);
        }
      } catch (err: any) {
        console.warn(`[agent brain] Model ${model} failed:`, err.message || err);
      }
    }
  }
  return { data: null, model: 'sandbox-fallback', sandbox: true };
}
