# PRISM — Final Stack Summary & Cost Calculation

## 1. The architecture we landed on

**Hybrid tiered system** (not pure LLM, not pure local — a layered approach):

| Layer | What it does | Powered by |
|---|---|---|
| **Bulk layer** (every article) | Source link + outlet metadata + bias/credibility score | Classical ML classifier (TF-IDF/logistic regression → later DistilBERT) — trained once, runs cheap forever |
| **Default verification** | Multi-agent debate on flagged/trending stories | Free-tier open model (Groq/Gemini) or local model via Ollama for dev |
| **Premium/Pro verification** | Full multi-agent debate, deepest quality | Claude API — reserved for paying users or high-stakes flagged stories |
| **Caching** | Same story verified once, served to everyone who asks | Upstash (free tier) |

This is the structure that makes the cost math below actually work — cost scales with real usage and tiering, not with raw article volume.

---

## 2. Full cost table

| Item | Cost | Notes |
|---|---|---|
| Claude (you, as engineer/dev assistant) | **$0** | Free access you already have |
| Domain | **$0** | Free access you already have |
| Hosting (Vercel/Railway) | **$0** | Free tier |
| Database (Supabase) | **$0** | Free tier |
| Auth (Clerk) | **$0** | Free tier |
| Caching (Upstash) | **$0** | Free tier |
| Error monitoring (Sentry) | **$0** | Free tier |
| Email (Resend) | **$0** | Free tier |
| Analytics (PostHog) | **$0** | Free tier |
| Vector DB (Pinecone) | **$0** | Free tier |
| Classical ML bias/credibility scoring | **$0** | Runs on CPU, no per-call cost |
| Bulk multi-agent verification (Groq/Gemini free tier) | **$0** (rate-limited) | Free quota; breaks down only at high traffic |
| Local dev/testing model (Ollama) | **$0** | Your machine, dev only |
| Premium Claude-powered verification (Pro tier / flagged stories only) | **~$0.01–0.03 per verification** | Only real variable cost |
| Stripe | **2.9% + $0.30** | Only charged when you earn revenue |

---

## 3. Realistic monthly total, by stage

| Stage | Verify-clicks/month | Estimated real cost |
|---|---|---|
| **Pre-launch / testing** | ~0 | **$0** |
| **Early users** (friends, campus, first real testers) | ~500 | **$0–5** (mostly absorbed by free tiers + caching) |
| **Small real traction** | ~5,000 | **~$15–40** (some spill into paid Claude tier for Pro users) |
| **Meaningful traction** | ~20,000+ | **~$50–150** (this is the point revenue should already be covering it via Pro subscriptions) |

**Bottom line: PRISM can realistically launch and run for $0/month while you build and test, and stay under ~$5-15/month through early real usage** — as long as the bulk layer stays on classical ML + free-tier models, and Claude-quality verification is reserved for Pro users or genuinely high-stakes stories.

---

## 4. The one thing worth remembering
None of this is "fully free forever" if PRISM actually succeeds — and that's fine. **Cost only grows when usage grows, and usage growing is the good outcome.** The design goal was never zero cost at scale; it was zero cost *risk* while you're solo, unfunded, and still validating the idea. That's exactly what this stack achieves.

---

*Ready when you want to move into the actual Phase 0 build checklist (real ingestion pipeline, provenance fixes, and wiring up this tiered verification system).*
