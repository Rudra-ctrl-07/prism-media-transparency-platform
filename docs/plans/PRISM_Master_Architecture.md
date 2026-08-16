# PRISM — Complete System Architecture (Master Document)

This is the single, consolidated architecture — it supersedes the earlier roadmap/target-architecture/RFLP docs by pulling them into one coherent spec. Reference this one going forward.

---

## 1. System overview

PRISM is a media transparency platform that scores news articles for bias and credibility, with two verification depths: a free, always-on classical ML pass, and an on-demand multi-agent LLM debate for flagged or user-requested stories. The architecture is built to run at near-zero cost for a solo developer while remaining swappable and scalable as real usage grows.

**Four tiers** (see diagram above):
1. **Client tier** — what runs in the user's browser
2. **Application tier** — your serverless backend logic
3. **Data tier** — persistence and caching
4. **External services** — third-party APIs you depend on

---

## 2. Component inventory

| Tier | Component | Technology | Status |
|---|---|---|---|
| Client | React web app | React 19 + Vite | Exists |
| Client | Client ML worker | `bias.worker.ts` — ONNX (MobileBERT + MiniLM), WebGPU/WASM | Exists, underused — expand its role (see §4) |
| Application | API service | Express in `api/index.ts`, deployed as Vercel serverless function | Exists, needs restructuring (see §4) |
| Application | Cron ingestion job | New: `api/cron/ingest.ts`, Vercel Cron | To build |
| Data | Primary database | Firestore (via existing `firebase-admin`) | Partially exists — auth works, data persistence doesn't yet |
| Data | Cache / dedup | Upstash Redis | To add |
| External | LLM providers | Gemini (existing) + Claude (to add) + Groq (free-tier option) | Partial |
| External | Auth | Firebase Auth | Exists, working |
| External | Payments | Stripe | To add |
| External | Error monitoring | Sentry | To add |
| External | Email (Pro digests) | Resend | To add |
| External | Analytics | PostHog | To add |
| External | Vector DB (future) | Pinecone — semantic dedup, future MCP queries | Deferred to post-MVP |

---

## 3. Data flow — the two paths

### Path A: Ingestion (background, no user involved)
```
Scheduled trigger (every 15–30 min)
  → Cron ingestion job fetches real RSS/GNews sources
  → Dedup check against Upstash (same story from multiple outlets = 1 entry)
  → Classical ML scoring runs server-side (bias label, initial credibility estimate)
  → Result written to Firestore
```
No LLM call happens here. This path must never run `generateSandboxGNewsArticles()` or any synthetic content generator — real sources only, or an honest empty state.

### Path B: Verification (user-triggered)
```
User views article (already has classical ML score, free, instant)
  → User clicks "Verify" OR system auto-flags as trending/high-uncertainty
  → API checks Upstash cache by story hash
     → Cache hit: return cached multi-agent result immediately
     → Cache miss: Tiered LLM Router selects provider
         → Free tier default: Gemini/Groq free quota
         → Pro tier or flagged-critical: Claude API
     → Multi-agent debate runs (progressive / conservative / omission / moderator)
     → Result cached in Upstash + persisted to Firestore
  → Result rendered in Transparency Feed + Fact Log panel
```

---

## 4. Key structural changes to the existing codebase

This is the concrete "what to actually change" list, cross-referenced to real files:

1. **Remove all fabricated content generation** — delete `generateSandboxGNewsArticles()` in `api/index.ts` and the hardcoded `INITIAL_ARTICLES`/`INITIAL_SOURCES` in `App.tsx`. Replace with real fetches from Firestore; show an honest empty state if no data exists yet. This is the non-negotiable first step.
2. **Move `votesStore` from in-memory array to Firestore** — currently resets on every redeploy.
3. **Split `/api/gemini/analyze` into two paths** — a cheap default (classical ML result, near-instant) and an expensive explicit path (`?deep=true`, full multi-agent debate) — instead of always running the full Gemini pipeline.
4. **Extend `biasEngine.ts` beyond `BiasSimilarityCanvas`** — currently only used for the similarity graph feature. Also run it during ingestion so every article gets a first-pass classification for free, before any LLM is involved.
5. **Add Upstash cache lookup before every LLM call** — keyed by a hash of the query/story, so repeat verifications don't cost money twice.
6. **Add a Claude candidate to the existing model-fallback chain** — you already have a good defensive pattern (`gemini-3.5-flash` → `gemini-3.1-flash-lite` → ...); extend it for Pro-tier requests specifically rather than replacing it.
7. **Add `verificationTier` and `verifiedBy` fields to `Article` in `types.ts`** — so the frontend can honestly display *how* a verdict was reached (classical-ML vs. Gemini vs. Claude), reinforcing the transparency pitch rather than undermining it.

---

## 5. Cost model (recap, tied to this architecture)

| Layer | Cost |
|---|---|
| Client tier, Data tier, most of External services | $0 — free tiers throughout |
| Classical ML scoring (ingestion path) | $0 — runs via ONNX, no per-call billing |
| Verification path, cache hits | $0 — served from Upstash |
| Verification path, cache misses, free-tier LLM | $0, rate-limited |
| Verification path, cache misses, Claude/Pro tier | ~$0.01–0.03 per call — the only real variable cost |

Realistic total: **$0/month pre-launch, $0–15/month through early real usage**, scaling only as verification volume (and ideally Pro revenue) grows.

---

## 6. Build sequencing (do not reorder)

1. Remove fabricated data (§4.1) — trust foundation, blocks everything else
2. Real ingestion + Firestore persistence for articles and votes (§4.2)
3. Wire `biasEngine.ts` into ingestion, not just the canvas view (§4.4)
4. Add Upstash caching in front of LLM calls (§4.5)
5. Split the analyze endpoint into cheap/expensive paths (§4.3)
6. Add Claude candidate + formal tiered router (§4.6)
7. Only after the above is stable: Stripe billing, Sentry, PostHog, Resend digests, MCP server

---

## 7. What "done" looks like for MVP

A user can open PRISM, see a feed of real (not fabricated) articles each with a free classical ML bias/credibility score and a working source link, click "Verify" on any of them to get a real multi-agent debate result (cached for everyone after the first request), and — if they're a Pro subscriber — get priority access to Claude-quality verification instead of the free-tier model. That's the whole architecture, end to end.
