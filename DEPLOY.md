# Deploying PRISM + the 24/7 Earnings Loop

This project is a Vite React frontend + Express API that deploys to **Vercel**
(the `vercel.json` at the root wires the frontend build and rewrites `/api/*`
to the serverless function). This guide covers:

1. Deploying the app to Vercel
2. Registering the **PRIZM** domain
3. Wiring DNS + environment variables
4. Running the 24/7 earnings loop on a server

---

## 1. Deploy the app to Vercel

```bash
# From the project root
npx vercel
```

Or connect the Git repo in the [Vercel dashboard](https://vercel.com/new).
The build command and output directory are already configured in `vercel.json`.
Set these env vars in the Vercel project settings:

| Variable | Purpose |
| --- | --- |
| `GOOGLE_API_KEY` | Live LLM content for the agent (sandbox without it) |
| `FIREBASE_SERVICE_ACCOUNT` | Persistence + Pro-tier auth enforcement |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID` | Pro payments |
| `CRON_SECRET` | Protect `/api/cron/*` endpoints |
| `FRONTEND_URL` | Your domain (e.g. `https://prizm.tech`) — used for CORS + Stripe redirects |

## 2. Register the PRIZM domain

Register the domain through **Vercel** so DNS + TLS are handled automatically:

1. Open the Vercel dashboard → your project → **Settings → Domains**.
2. Click **Add**, search for `prizm`, and pick an available TLD
   (`prizm.tech`, `prizm.ai`, `prizm.app`, etc.). `prizm.com` is likely taken —
   Vercel's search will show what's available.
3. Complete checkout (the domain is registered through Vercel's registrar).
4. Vercel auto-configures the DNS `A` / `CNAME` records and issues TLS — no
   manual DNS edits needed when the domain is registered in the same project.
5. Update `FRONTEND_URL` in the Vercel env to the final domain and redeploy.

> If you already own the domain elsewhere, add it under **Settings → Domains**
> and point the `A`/`CNAME` records at Vercel per the on-screen instructions.

## 3. Environment variables for the loop

On the machine that runs the 24/7 loop (see below), copy `api/.env.example` to
`api/.env` and fill in:

```bash
GOOGLE_API_KEY=...            # real articles (sandbox without it)
EARNINGS_LOOP_INTERVAL_SECONDS=21600   # tick every 6h
EARNINGS_LOOP_AGENT=true
EARNINGS_LOOP_AUTOMATON=true
AUTOMATON_DIR=/path/to/project/automaton
```

## 4. Run the 24/7 earnings loop

The loop is a daemon that (a) runs the content agent on a schedule, (b) keeps
the Conway Automaton runtime alive so it can earn compute credits, and (c)
writes a daily earnings report to `data/loop/REPORT.md`.

```bash
# One-time: clone + build the Conway Automaton runtime
npm run automaton:up        # clones into ./automaton, pnpm install + build

# Start the 24/7 loop (detached, logs to logs/earnings-loop.log)
npm run loop:up

# Check on it
npm run loop:status         # daemon + automaton + earnings summary
tail -f logs/earnings-loop.log

# Stop it
npm run loop:down
```

For true 24/7 operation on a VPS, run it under a process supervisor:

```bash
# systemd unit example (/etc/systemd/system/prism-loop.service)
[Unit]
Description=PRISM 24/7 earnings loop
After=network.target

[Service]
WorkingDirectory=/opt/prism
ExecStart=/usr/bin/npm --prefix /opt/prism/api run loop:start
Restart=always
RestartSec=15

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now prism-loop
```
