# PRISM — Media Transparency Platform

[![CI](https://github.com/Rudra-ctrl-07/prism-media-transparency-platform/actions/workflows/ci.yml/badge.svg)](https://github.com/Rudra-ctrl-07/prism-media-transparency-platform/actions/workflows/ci.yml)

Unified merge of three project iterations (**New_Prizm**, **Prizm_Large**, **prism**)
plus an integration with the **Conway Automaton** sovereign AI agent runtime.

## What's inside

### Frontend (`src/`)
- **Map-centered Dashboard** — the home screen is a three-pane intelligence dashboard, not a tab
  list: a compact live feed rail (source filter chips + save/bookmark), the credibility world map
  as the dominant surface (credibility-colored markers, grid clustering, light tiles, legend), and
  a right rail with a dismissible alerts list plus a corroborated-stories summary. Tool views
  (Bias Compare, Debate, Business, Globe, Sources, Chat) live behind the header's **Tools** menu
  with a breadcrumb back to the dashboard.
- **Neo-brutalist arcade theme** — the full app (dashboard, tools, landing, pricing, methodology)
  renders on an electric-yellow canvas with black ink, thick black outlines, hard offset shadows,
  and blocky Archivo Black / Space Grotesk typography. Accent cards come in emerald green, hot
  pink and light blue (`arcade-*` tokens in `tailwind.config.cjs`); semantic token classes flip
  everything in one place, with targeted overrides in `src/index.css` for legacy hardcoded colors
  and light Leaflet tiles. The header LIVE badge is a black pill with a pulsing red dot.
- **Live stats** — LIVE indicator with 60s auto-refresh (and a 20s re-probe while in demo mode
  so the app flips to LIVE as soon as the backend is reachable), per-source article counts,
  avg credibility, flagged items, and a dismissible alerts rail for low-credibility / misleading
  items plus user-defined watch alerts
- **Persisted user state** — saved articles (bookmark any feed card, view via the feed's
  "Saved" filter), dismissed alerts, user watch alerts (keyword + source), and the last active
  tab all survive reloads via `localStorage` (`src/utils/storage.ts`); saved articles store a
  durable snapshot so they remain viewable even after dropping out of the live feed
- **Story Tracker** — a live view that groups articles into stories by topic keyword overlap
  (`src/services/storyClustering.ts`: stemmed-title matching + union-find), showing how many
  distinct outlets corroborate each story (badges + source dots), shared keywords, credibility
  ranges, a most-corroborated / most-recent sort, per-article verification, and a collapsible
  solo-coverage section; refreshes live with the feed
- **Feed / Map / Globe** — multi-view live RSS article browser with source / category /
  credibility filters and JSON + CSV export. The map color-codes markers by credibility and
  grid-clusters them when zoomed out (no plugin needed); the globe offers credibility-colored
  points or hexbin clusters via a Points / Clusters toggle
- **Bias Analysis** — radar / bar / pie charts, multi-article comparison, similarity canvas.
  A comparison workflow lets you tick **Compare** on feed cards (a floating bar tracks the
  selection) or pick articles in the Bias Compare panel's searchable list; the radar charts
  exactly the 2–3 selected articles, with the selection persisted and capped at 3 for readability
- **Multi-Agent Debate** — 3-voice debate engine with moderator verdict
- **Business Intelligence** — D3 forecast charts + 30-day projections (local projection fallback)
- **Source Directory** — publisher roster with credibility / bias audit cards + Maps-grounded search
- **Gemini Chatbot** — multi-persona chat (provenance / bias / corporate)
- **Account Identity** — Google OAuth, Drive export, Sheets sync, notes
- **Sovereign Agent Panel** — Conway Automaton bridge for paid, decentralized AI verification
- **Intel Map** — interactive Global Situation Map with 2D/3D projection toggle, time-range
  filters (1h/6h/24h/48h/7d/all), and **41 toggleable intel layers** across five categories
  (Security & Defense, Nuclear & Energy, Transport & Chokepoints, Disruptions & Hazards,
  Socio-Political & Economic). Layers render as severity-scaled markers colored by category
  (plus line layers for pipelines/trade routes/rail corridors); **weather alerts (NWS) and
  earthquakes (USGS) are LIVE keyless feeds**, everything else is curated real-world data
  (`src/data/intelData.ts`). Selection + time range persist via localStorage
- **Intel Brief** — AI Insights: a World Brief synthesized from the live feed + layer activity,
  a Threat Timeline (Critical/High/Medium/Low per country/date), Strategic Posture (air/naval
  deployment across Baltic, Black Sea, Iran, Taiwan, South China Sea, Red Sea), AI Forecasts
  (probability models across Conflict/Market/Supply Chain/Political/Military/Cyber), a live
  Country Instability Index (base model + article-activity delta), and a Strategic Risk Overview
  (convergence score, infrastructure counters, OFAC alerts)
- **Markets & Feeds** — live news broadcasts + global webcams (real public streams), a Market
  Stress monitor derived from feed sentiment + chokepoint signals, Supply Chain / Trade Policy /
  Energy Complex / Climate Anomaly panels, and the Big Mac Index (The Economist data)
- **Editorial pages** — Landing, Methodology, Pricing, full-page Verification Report

### Live / demo data modes
Run **both** terminals and the dashboard streams **real articles** from live RSS feeds (the
header shows a pulsing **LIVE** badge). A shared data layer (`src/services/dataService.ts`)
calls the live backend through the Vite `/api` proxy; when the backend is unreachable or empty
it falls back to a clearly-badged demo dataset (`src/services/demoData.ts`) covering every view
— geo-tagged articles with per-article multi-agent debate analyses, a source roster, and
forecast projections — so the product is fully explorable even with zero servers running.
While in demo mode the dashboard re-probes every 20 seconds and flips to **LIVE** automatically
once the backend comes up.

### 24/7 earnings loop (`api/src/loop/`)
- A daemon that runs the content agent on a schedule, keeps the **Conway
  Automaton** sovereign runtime alive (so it can earn compute credits via x402
  paid inference), and writes a daily earnings report to `data/loop/REPORT.md`
  (`state.json` + `earnings.jsonl` persist so it resumes after restarts)
- Start/stop/status: `npm run loop:up | loop:down | loop:status` (see
  `DEPLOY.md` for the systemd 24/7 setup and the PRIZM domain guide)

### Backend (`api/`)
- Express + modular routes (`articles`, `votes`, `cron`, `analytics`)
- **Real RSS ingestion with zero config** — on boot (and every 15 min) the server fetches live
  articles in parallel from 7 working public feeds (BBC, NPR, The Guardian, Al Jazeera, Deutsche
  Welle, France 24, NBC) and geocodes them with a deterministic keyword + bundled-place-table
  geocoder (`api/src/services/geocoder.ts`). Articles persist to **Firestore when a
  `FIREBASE_SERVICE_ACCOUNT` is configured, otherwise an in-memory store** (`articleStore.ts`)
  — so `npm run dev` in `api/` serves real headlines with no credentials. Auth is a pass-through
  in zero-config mode and enforces tokens when Firebase is configured; deep verification runs the
  multi-agent analyzer (Gemini when a key is set, keyword-based fallback otherwise).
- **MCP server** (`/mcp/*`) — Model Context Protocol for AI-agent queries
- **Stripe** checkout + webhooks for Pro tier
- **Upstash Redis** caching for verification results
- **Gemini endpoints** (`/api/gemini/*`) — analyze, forecast, maps, speech, chat, image-gen
- **Automaton bridge** (`/api/automaton/*`) — sovereign agent verify / status / logs
- **Content & Affiliate Agent** (`/api/agent/*`) — autonomous observe→think→act loop that turns
  live trending topics into affiliate-linked articles you can publish, with a control panel under
  the Tools menu (**Agent Studio**) to run it, browse/publish posts, and log payouts (see below)

### Conway Automaton integration
PRISM ships a thin HTTP bridge to the [Conway Automaton](https://github.com/Conway-Research/automaton) runtime. With no runtime configured, endpoints return sandbox stubs. To enable live sovereign-agent verification:

```bash
git clone https://github.com/Conway-Research/automaton.git
cd automaton && pnpm install && pnpm build
node dist/index.js --run
```

Then set `AUTOMATON_BASE_URL` in `.env` and the bridge proxies `/verify`, `/status`, `/logs` to the running runtime.

## Quick start

```bash
# Frontend (root)
npm install
npm run dev          # http://localhost:5173

# Backend (in another terminal)
cd api && npm install
npm run dev          # http://localhost:3000
```

## Content & Affiliate Agent (`/api/agent/*`)

PRISM ships an autonomous content agent built on the standard agent architecture
(**Brain** = Gemini LLM, **Brainstem** = system-prompt contract, **Hands** = research / affiliate / publisher tools,
**Memory** = long-term file store, **Loop** = observe→think→act). It watches the live RSS feed for
niche-relevant trends, plans and writes an article, inserts affiliate links, saves drafts, and
records what it published — so the content can start earning affiliate revenue.

A **control panel** lives in the frontend under the header's **Tools** menu → **Agent Studio**
(`src/components/AgentPanel.tsx`): run the loop with a custom niche/topic list, browse drafts,
publish them (human-in-the-loop), record affiliate payouts per post, and inspect long-term memory.

### Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/agent/status` | config summary + memory stats (posts, revenue, last run) |
| POST | `/api/agent/run` | run one observe→think→act cycle (body: `{ niche?, maxPosts?, topics? }`) |
| GET | `/api/agent/posts` | list produced posts (`?status=draft\|published`) |
| GET | `/api/agent/posts/:id` | full post (markdown content + affiliate links) |
| POST | `/api/agent/posts/:id/publish` | human-in-the-loop: push live (WordPress when configured) |
| POST | `/api/agent/posts/:id/revenue` | record an affiliate payout: `{ amount, source? }` |
| POST | `/api/agent/posts/:id/metrics` | record engagement: `{ clicks?, impressions?, conversions? }` |
| GET | `/api/agent/memory` | long-term memory (posts, mistakes, preferences, revenue) |

### Learning from what earns (double down on winners)

The observe step learns from performance. Log engagement for each published post
(`POST /api/agent/posts/:id/metrics` with clicks/impressions, or the revenue endpoint)
and the agent:

- **Aggregates performance by keyword** (clicks, impressions, CTR, revenue per click)
- **Boosts topics similar to winners** — a candidate topic sharing tokens with a
  proven keyword scores higher in the observe step
- **Demotes topics similar to losers** — keywords with ≥50 impressions but zero
  clicks are steered away from
- **Derives follow-up topics from winners** — each run surfaces fresh angles
  ("Best X for 2026", "X buying guide") built on the keywords that already earned

The current winners/losers show in `GET /api/agent/status` (`memory.winners`,
`memory.losers`) and in a human-readable `memory.md` next to the memory file, and
are visualized in the Agent Studio panel.

### Env vars (all optional — zero-config demo mode by default)

```bash
AGENT_ENABLED=true
AGENT_NICHE="smart home security"                 # what the agent writes about
AGENT_MAX_POSTS_PER_RUN=2                          # posts per run
AGENT_MAX_ITERATIONS=3                             # observe→think→act cap (guardrail)
AGENT_MAX_AFFILIATE_LINKS_PER_POST=3               # affiliate link cap per post (guardrail)
AGENT_AFFILIATE_KEYWORDS='{"security camera":"https://amzn.to/xxx","video doorbell":"https://amzn.to/yyy"}'
AGENT_AFFILIATE_TAG="your-tag-20"                 # builds Amazon search links for unmatched keywords
AGENT_OUTPUT_DIR="data/agent-posts"               # draft markdown files
AGENT_MEMORY_FILE="data/agent-memory.json"        # long-term memory (+ human-readable .md mirror)
AGENT_AUTO_PUBLISH=false                           # true = skip human approval (requires WP creds)
AGENT_WORDPRESS_URL="https://yourblog.com"         # optional live publishing
AGENT_WORDPRESS_USER="admin"
AGENT_WORDPRESS_APP_PASSWORD="xxxx xxxx xxxx xxxx"
```

With no vars set, the loop still runs end-to-end (sandbox LLM, seed topics, drafts only) so it is
fully explorable. To actually earn: set `GOOGLE_API_KEY` for real articles, add your affiliate
keyword→URL map (or `AGENT_AFFILIATE_TAG`), then publish drafts — either manually via
`POST /api/agent/posts/:id/publish` (human-in-the-loop) or automatically with WordPress credentials.
Run it on a schedule with `POST /api/cron/agent` (`X-Cron-Secret` header) or
`npm run agent`-style invocation of `api/src/cron/agentJob.ts`.

## Pro tier & Stripe (paid content generation)

The agent's `POST /api/agent/run` endpoint is **Pro-gated**: running content generation costs LLM
tokens, so only subscribers can trigger it. In production (Firebase service account configured) the
`authorizePro` middleware checks Firestore `users/<uid>.isPro` and returns `403 Forbidden` otherwise;
in zero-config demo mode auth passes through so the app stays explorable.

The real payment flow:

1. Frontend **Upgrade to Pro** button calls `POST /api/stripe/checkout` (authenticated).
2. Stripe Checkout collects the subscription payment; the user is redirected to
   `FRONTEND_URL/upgrade?success=1`.
3. The Stripe webhook (`POST /api/stripe/webhook`, raw body) verifies the signature and grants
   `isPro: true` on the Firestore `users/<uid>` doc (`checkout.session.completed`), and revokes it on
   `customer.subscription.deleted`.
4. `authorizePro` sees `isPro === true` and the agent run proceeds.

Required env vars (see `api/.env.example`):

```bash
STRIPE_SECRET_KEY=sk_test_xxx        # Stripe secret key
STRIPE_WEBHOOK_SECRET=whsec_xxx      # webhook signing secret
STRIPE_PRICE_ID=price_xxx            # Pro subscription price id
FRONTEND_URL=http://localhost:5173   # CORS + checkout redirect base
```

Without Stripe configured, `POST /api/stripe/checkout` returns `503 { demo: true }` and the Upgrade
page falls back to the local demo upgrade (no payment) so the flow remains testable.

Tests: `npm test` (vitest — 76 tests across frontend utils/services, the content agent
(`api/src/agent/agent.test.ts`), and the Stripe webhook grant/revoke flow
(`api/src/services/stripe.test.ts`). The Stripe tests generate real signed webhook
payloads via `stripe.webhooks.generateTestHeaderString` against a mocked Firestore, so
the Pro grant/revoke path is verifiable without real payments or a live Stripe account.
Build: `npm run build`.

## Project structure

```
New_Prizm/
├── automaton/                 # Conway Automaton sovereign-agent runtime (cloned)
├── api/src/loop/              # 24/7 earnings loop daemon + automaton supervisor
│   ├── earningsLoop.ts        #   the daemon (agent + automaton + record)
│   ├── automatonSupervisor.ts #   boots / health-checks / restarts the runtime
│   ├── earningsReport.ts      #   daily earnings aggregation + reports
│   ├── state.ts               #   durable loop state
│   └── cli.ts                 #   loop:start / loop:once / loop:status
├── scripts/                   # bootstrap-automaton, loop-up/down/status
├── api/                       # Express backend (modular)
│   └── src/
│       ├── routes/            # articles, votes, cron, analytics, automaton, agent
│       ├── services/          # gemini/, ingestion, llmRouter, stripe, redis
│       ├── agent/             # content & affiliate agent (brain, brainstem, memory, tools, loop)
│       ├── middleware/        # auth, etc.
│       ├── mcp/               # Model Context Protocol server
│       └── cron/              # scheduled ingestion + agent runs
├── src/                       # React + Vite frontend
│   ├── components/            # 23 components (TransparencyFeed, GlobeView, …)
│   ├── pages/                 # Landing, Methodology, Pricing, VerificationReport
│   ├── services/              # biasEngine (HuggingFace transformers)
│   ├── workers/               # bias.worker.ts (WebGPU → WASM pipeline)
│   ├── design/                # tokens.ts (single source of design truth)
│   └── utils/                 # credibility, color helpers
├── docs/                       # docs/plans (architecture), docs/ui (mockups), MEMORY.md, SUMMARY.md
└── tsconfig.json              # unified TS config
```

## Bin folder

All "useless" artifacts (old monolithic `server.ts` files, `mingit/`, `new_ui/`
mockups, deployment caches, etc.) are preserved at `../bin/` per the merge brief —
**nothing was deleted**, just relocated.

## Architecture documents

The full architecture PDFs are hosted as GitHub Release assets (excluded from the
repo itself due to GitHub's file-size limits):

- [`ARCHI_MERGED_DOC.pdf` — complete merged architecture doc (168 MB)](https://github.com/Rudra-ctrl-07/prism-media-transparency-platform/releases/download/architecture-docs/ARCHI_MERGED_DOC.pdf)
- [`ARCHI_MERGED_DOC_compressed.pdf` — compressed version (64 MB)](https://github.com/Rudra-ctrl-07/prism-media-transparency-platform/releases/download/architecture-docs/ARCHI_MERGED_DOC_compressed.pdf)

Smaller docs (target architecture, RFLP, scaling roadmap, SVG diagrams) live in
[`docs/plans/`](docs/plans/).

## License

MIT (per Conway Automaton's license — adopted across the merge).
