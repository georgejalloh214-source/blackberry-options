import { AutoExitDecision } from "@/lib/bot/autoExitTypes";
import { closeTrade } from "@/lib/paperTrading";

export async function closeAutoExitTrade(tradeId: string, decision: AutoExitDecision) {
  const closed = await closeTrade(tradeId);
  return {
    ...closed,
    notes: `${closed.notes ? `${closed.notes} ` : ""}AUTO_EXIT: ${decision.reason}; P/L ${decision.pnlPct.toFixed(1)}%; risk level ${decision.riskLevel}.`,
  };
}
