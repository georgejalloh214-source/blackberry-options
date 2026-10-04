import { AUTO_EXIT_CONFIG } from "@/lib/bot/autoExitConfig";
import { AutoExitDecision } from "@/lib/bot/autoExitTypes";

export function evaluateAutoExit(trade: { pnlPct: number; riskLevel: number }): AutoExitDecision | null {
  if (trade.pnlPct <= AUTO_EXIT_CONFIG.maxLossPct) {
    return decision("STOP_LOSS", trade);
  }
  if (trade.pnlPct >= AUTO_EXIT_CONFIG.takeProfitPct) {
    return decision("TAKE_PROFIT", trade);
  }
  if (trade.riskLevel < AUTO_EXIT_CONFIG.riskLevelFloor) {
    return decision("RISK_ENVIRONMENT", trade);
  }
  return null;
}

function decision(reason: AutoExitDecision["reason"], trade: { pnlPct: number; riskLevel: number }): AutoExitDecision {
  return { reason, pnlPct: trade.pnlPct, riskLevel: trade.riskLevel, timestamp: new Date().toISOString() };
}
