# Black Berry Options

Live options tools + paper trading. Navy & gold, Montserrat, built for clarity.

> **Decision support only — not financial advice.**

## What's inside (v1)

| Tool | What it does |
| --- | --- |
| **Opportunity Scanner** | Ranks an options chain 0–100 with a naked-put bias (delta band, theta yield, IV sweet spot, liquidity, support proximity) with a transparent score breakdown |
| **Entry Timing** | ENTER NOW / WAIT / AVOID with reasons — proxies the Python bots (MarketTrend, EntrySignals, WhaleHunter, RiskManager) via `BOT_API_URL`, mock adapter until the bot API is live |
| **Strategy Selector** | Recommends CSP / credit spread / covered call / iron condor with rationale, max loss, POP, margin — plus why the alternatives lost |
| **Exit Timing** | TAKE PROFIT / HOLD / EXIT NOW: 50–70% profit target, support/resistance breaks, 2× premium max-loss guardrail, DTE gamma-risk rule |
| **Live Dashboard** | Delayed quote + big-money flow + ranked scanner results, 45s polling |
| **Paper Trading** | Mid-price fills, live P/L + Greeks + margin + assignment risk, closed trades double as the trade journal |

## Architecture

- **Next.js 15 (App Router) + TypeScript strict + Tailwind CSS + shadcn/ui**
- API routes in `app/api/*` return a standard envelope:
  `{ ok, data?, error?, asOf, dataDelayMinutes }`
- `lib/marketData.ts` — provider abstraction. v1 ships a deterministic mock
  (Black-Scholes-priced chains, seeded per symbol/hour). Add a Finnhub/Polygon
  provider behind the same interface when `MARKET_DATA_API_KEY` is set.
- `lib/blackScholes.ts` — pricing + full Greeks (delta, gamma, theta, vega, rho)
- `lib/scoring.ts` — pure, testable scanner scoring
- `lib/store.ts` — paper trades in Upstash/Vercel KV (`KV_REST_API_URL` +
  `KV_REST_API_TOKEN`); in-memory fallback for local dev only
- Python bots stay in their **own repo** — this site only calls `BOT_API_URL`

## Env vars

See `.env.example`. Everything is optional in v1 — the app runs fully on mock
data with zero keys.

## Run locally

```bash
npm install
npm run dev
```

## Roadmap

- Phase 2: real flow data, Daily Big Money Picks, websockets, AI trade
  assistant grounded in the Options Trading QuickStart Guide, auth/multi-user
  (Postgres + Prisma).
