import { round } from "@/lib/blackScholes";
import { PaperPosition } from "@/types";
import { AccountStats, ClosedPosition } from "@/types/features";

export const STARTING_BALANCE = 100_000;

export function computeAccountStats(positions: PaperPosition[]): AccountStats {
  const open = positions.filter((p) => p.status === "OPEN");
  const closed = positions
    .filter((p): p is ClosedPosition => p.status === "CLOSED" && !!p.closedAt)
    .sort((a, b) => a.closedAt.localeCompare(b.closedAt));

  const realizedPnl = round(closed.reduce((s, p) => s + (p.realizedPnl ?? 0), 0));
  const unrealizedPnl = round(open.reduce((s, p) => s + p.pnl, 0));
  const balance = round(STARTING_BALANCE + realizedPnl);
  const equity = round(balance + unrealizedPnl);
  const marginReserved = round(open.reduce((s, p) => s + p.marginRequired, 0));

  const wins = closed.filter((p) => (p.realizedPnl ?? 0) > 0);
  const losses = closed.filter((p) => (p.realizedPnl ?? 0) < 0);
  const avgWin = wins.length
    ? round(wins.reduce((s, p) => s + (p.realizedPnl ?? 0), 0) / wins.length)
    : 0;
  const avgLoss = losses.length
    ? round(losses.reduce((s, p) => s + (p.realizedPnl ?? 0), 0) / losses.length)
    : 0;

  let peak = STARTING_BALANCE;
  let cur = STARTING_BALANCE;
  let maxDrawdown = 0;
  for (const p of closed) {
    cur += p.realizedPnl ?? 0;
    if (cur > peak) peak = cur;
    maxDrawdown = Math.max(maxDrawdown, peak - cur);
  }

  const largestMargin = open.reduce((m, p) => Math.max(m, p.marginRequired), 0);

  return {
    startingBalance: STARTING_BALANCE,
    balance,
    equity,
    realizedPnl,
    unrealizedPnl,
    marginReserved,
    buyingPower: round(balance - marginReserved),
    marginUtilizationPct: balance > 0 ? round((marginReserved / balance) * 100, 1) : 0,
    openPositions: open.length,
    closedTrades: closed.length,
    winRate: closed.length ? round((wins.length / closed.length) * 100, 1) : 0,
    avgWin,
    avgLoss,
    avgRiskReward: avgLoss !== 0 ? round(avgWin / Math.abs(avgLoss), 2) : 0,
    maxDrawdown: round(maxDrawdown),
    maxDrawdownPct: round((maxDrawdown / STARTING_BALANCE) * 100, 2),
    largestPositionMarginPct:
      balance > 0 ? round((largestMargin / balance) * 100, 1) : 0,
  };
}

export function canReserveMargin(stats: AccountStats, marginNeeded: number): boolean {
  return marginNeeded <= stats.buyingPower;
}
