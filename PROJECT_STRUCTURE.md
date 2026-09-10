# Black Berry Options Project Structure

## Current Architecture

This project uses Next.js App Router with client-side interactive trading views.

```text
blackberry-options/
├── app/
│   ├── layout.tsx                  # AppShell and global metadata
│   ├── page.tsx                    # Dashboard / paper trading home
│   ├── paper-trading/page.tsx      # Paper trading workspace
│   ├── analytics/page.tsx          # Equity curve and trade analytics
│   ├── overview/page.tsx           # Market Overview dashboard
│   ├── settings/page.tsx           # Local workspace settings
│   ├── symbol/[symbol]/page.tsx    # Client-side dynamic symbol terminal
│   └── api/
│       ├── bot/brain/route.ts
│       ├── market/quote/route.ts
│       ├── market/options/route.ts
│       ├── market/flow/route.ts
│       └── paper-trading/positions/route.ts
├── components/
│   ├── AppShell.tsx
│   ├── header.tsx
│   ├── TickerSearch.tsx
│   ├── BotIntelligence.tsx
│   ├── OptionsChain.tsx
│   ├── StrategyRecommendation.tsx
│   ├── PayoffDiagram.tsx
│   ├── PriceChart.tsx
│   ├── MultiLegBuilder.tsx
│   ├── FlowTape.tsx
│   ├── DarkPoolTape.tsx
│   ├── TradeJournal.tsx
│   └── ui/
├── lib/
│   ├── bot/
│   │   ├── brain.ts              # Weighted trade score and strategy label
│   │   ├── computeInputs.ts      # Trend, flow, IV, Greeks, and risk scores
│   │   ├── strategyEngine.ts     # Exact vertical-spread recommendations
│   │   └── payoff.ts             # Expiration P/L calculations
│   ├── marketData.ts             # Provider abstraction and sample data
│   ├── paperTrading.ts           # Paper position lifecycle
│   ├── multiLegRisk.ts           # Multi-leg risk summary
│   └── store.ts                  # Local memory or Upstash KV storage
├── types/
│   ├── index.ts
│   └── features.ts
└── .env.local                    # Local secrets; never commit
```

## Symbol Page Order

The symbol page remains a client component because it contains polling and interactive controls.

1. Quote and price context
2. Price path chart
3. Bot Intelligence
4. Strategy Recommendation
5. Risk / Payoff Diagram
6. Sentiment and alerts
7. Options flow and dark-pool context
8. Options chain and historical flow
9. Paper-trading and multi-leg actions where applicable

Do not replace `app/symbol/[symbol]/page.tsx` with a server-only template.

## Bot Inputs

The bot receives five bounded scores from the existing application data:

- **TrendScore:** quote percentage change
- **FlowScore:** bullish versus bearish options premium imbalance
- **IVScore:** inverse average options IV percentile
- **GreeksScore:** delta, theta, and gamma quality across the chain
- **RiskScore:** inverse assignment risk across open paper positions

`lib/bot/brain.ts` is the scoring source of truth. `lib/bot/computeInputs.ts` maps provider data into its inputs.

## Strategy And Payoff

`lib/bot/strategyEngine.ts` selects same-expiration vertical spread legs when the score, trend, and flow align. `components/StrategyRecommendation.tsx` displays the suggested contracts.

`lib/bot/payoff.ts` calculates expiration P/L using the standard 100-share options contract multiplier. `components/PayoffDiagram.tsx` visualizes the resulting payoff curve with Recharts.

Recommendations are decision support only. Users should review liquidity, spread width, maximum loss, and assignment risk before placing paper trades.

## Market Overview

`app/overview/page.tsx` provides:

- Major index performance for SPY, QQQ, DIA, and IWM
- Top gainers and losers from the watchlist
- Flow-based MarketScore
- Unusual options activity by ticker
- Sector heatmap
- Volatility context with a clearly labeled VIX proxy

Without provider credentials, market data is deterministic sample data. It is not live market data.

## Chart Data And Future Candlesticks

The current `PriceChart` is a modeled quote-range chart because the provider currently exposes quote values, not historical bars.

A true candle uses this format:

```ts
type Candle = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};
```

## Future Upgrade: True Candlestick Charts

- Requires real OHLC candle data from a provider
- Uses `Candle[]` with time, open, high, low, close, and optional volume
- Needs an `/api/market/candles` route
- Needs provider response mapping into `Candle[]`
- Needs a chart renderer:
  - `lightweight-charts` is recommended for a trading-terminal experience
  - or custom Recharts candlestick shapes

Recharts does not include a native candlestick series. The current implementation is modeled quote-range data only. No candlestick changes are required until a provider supports historical candles.

## Local Development

```powershell
cd C:\dev\blackberry-options
npm install
npm run dev
```

Open `http://localhost:3000` and use the ticker search bar to visit routes such as `/symbol/AAPL`, `/symbol/TSLA`, or `/symbol/NVDA`.

Keep API keys and KV credentials in `.env.local`. Never commit `.env.local` or real secrets.
