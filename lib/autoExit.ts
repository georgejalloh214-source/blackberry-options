import { evaluateExit } from "@/lib/exitTiming";
import { getProvider } from "@/lib/marketData";
import { closeTrade, getPositions } from "@/lib/paperTrading";
import { kvGetJson, kvSetJson } from "@/lib/store";
import { AutoExitConfig, AutoExitEvent, AutoExitReason } from "@/types/features";

const CONFIG_KEY = "bbo:auto-exit:config";
const EVENTS_KEY = "bbo:auto-exit:events";

export const DEFAULT_AUTO_EXIT: AutoExitConfig = {
  enabled: false,
  profitTargetPct: 60,
  stopLossMultiple: 2,
  maxAbsDelta: 0.75,
  exitDTE: 1,
  respectRiskManager: true,
};

export async function getAutoExitConfig(): Promise<AutoExitConfig> {
  return kvGetJson(CONFIG_KEY, DEFAULT_AUTO_EXIT);
}

export async function setAutoExitConfig(cfg: AutoExitConfig): Promise<void> {
  await kvSetJson(CONFIG_KEY, cfg);
}

export async function getAutoExitEvents(): Promise<AutoExitEvent[]> {
  return kvGetJson<AutoExitEvent[]>(EVENTS_KEY, []);
}

/**
 * One sweep over open positions. Called by the client poller (and later by
 * Vercel Cron pointed at POST /api/auto-exit { run: true }).
 */
export async function runAutoExitSweep(): Promise<AutoExitEvent[]> {
  const cfg = await getAutoExitConfig();
  if (!cfg.enabled) return [];

  const open = await getPositions("OPEN");
  const fired: AutoExitEvent[] = [];

  for (const p of open) {
    const isShort = p.side === "SELL_TO_OPEN";
    const premium = p.entryPrice * 100 * p.quantity;
    const pnlPctOfMax = isShort && premium > 0 ? (p.pnl / premium) * 100 : 0;
    const dte = Math.max(
      0,
      Math.round((new Date(p.optionContract.expiry).getTime() - Date.now()) / 86_400_000)
    );

    let reason: AutoExitReason | null = null;
    let detail = "";

    if (isShort && pnlPctOfMax >= cfg.profitTargetPct) {
      reason = "PROFIT_TARGET";
      detail = `Captured ${pnlPctOfMax.toFixed(1)}% of max profit (target ${cfg.profitTargetPct}%).`;
    } else if (isShort && p.pnl < 0 && Math.abs(p.pnl) >= cfg.stopLossMultiple * premium) {
      reason = "STOP_LOSS";
      detail = `Loss ${p.pnl.toFixed(0)} exceeded ${cfg.stopLossMultiple}x premium collected.`;
    } else if (isShort && Math.abs(p.greeks.delta) >= cfg.maxAbsDelta) {
      reason = "DELTA_RISK";
      detail = `|delta| ${Math.abs(p.greeks.delta).toFixed(2)} >= ${cfg.maxAbsDelta} — assignment risk too high.`;
    } else if (dte <= cfg.exitDTE) {
      reason = "EXPIRATION";
      detail = `${dte} DTE <= exit window (${cfg.exitDTE}).`;
    } else if (cfg.respectRiskManager) {
      const quote = await getProvider().getQuote(p.symbol);
      const verdict = evaluateExit(
        {
          symbol: p.symbol,
          entryPrice: p.entryPrice,
          currentPrice: p.currentPrice,
          quantity: p.quantity,
          side: p.side,
          optionContract: p.optionContract,
          openedAt: p.openedAt,
        },
        quote
      );
      if (verdict.exitSignal === "EXIT_NOW") {
        reason = "RISK_MANAGER";
        detail = verdict.reasons[0] ?? "RiskManager EXIT NOW.";
      }
    }

    if (reason) {
      const closed = await closeTrade(p.id);
      fired.push({
        id: crypto.randomUUID(),
        positionId: p.id,
        symbol: p.symbol,
        contract: `${p.symbol} $${p.optionContract.strike}${p.optionContract.type[0]} ${p.optionContract.expiry}`,
        reason,
        detail,
        pnl: closed.realizedPnl ?? 0,
        at: new Date().toISOString(),
      });
    }
  }

  if (fired.length) {
    const prev = await getAutoExitEvents();
    await kvSetJson(EVENTS_KEY, [...fired, ...prev].slice(0, 50));
  }
  return fired;
}
