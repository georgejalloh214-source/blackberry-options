import { round } from "@/lib/blackScholes";
import { ExitTimingResult, OptionContractRef, PositionSide, StockQuote } from "@/types";

export interface ExitInput {
  symbol: string;
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  side: PositionSide;
  optionContract: OptionContractRef;
  openedAt: string;
}

export function evaluateExit(input: ExitInput, quote: StockQuote): ExitTimingResult {
  const { entryPrice, currentPrice, quantity, side, optionContract } = input;
  const isShort = side === "SELL_TO_OPEN";
  const perContract = isShort ? entryPrice - currentPrice : currentPrice - entryPrice;
  const pnl = round(perContract * 100 * quantity);
  // For short premium, max profit = premium collected
  const maxProfit = isShort ? entryPrice * 100 * quantity : Infinity;
  const pnlPercentOfMax = isShort && maxProfit > 0 ? round((pnl / maxProfit) * 100, 1) : 0;

  const dte = Math.max(
    0,
    Math.round((new Date(optionContract.expiry).getTime() - Date.now()) / 86_400_000)
  );

  const reasons: string[] = [];
  let exitSignal: ExitTimingResult["exitSignal"] = "HOLD";

  // 1. Profit target: 50-70% of max profit for short premium
  if (isShort && pnlPercentOfMax >= 50) {
    exitSignal = "TAKE_PROFIT";
    reasons.push(`Captured ${pnlPercentOfMax}% of max profit — inside the 50-70% take-profit zone. Remaining reward doesn't justify remaining risk.`);
  }

  // 2. Trend break against the position
  const supportBroken = quote.price < quote.supportLevel;
  const resistanceBroken = quote.price > quote.resistanceLevel;
  if (optionContract.type === "PUT" && isShort && supportBroken) {
    exitSignal = "EXIT_NOW";
    reasons.push(`Price ($${quote.price}) broke below support ($${quote.supportLevel}) — short put thesis invalidated.`);
  }
  if (optionContract.type === "CALL" && isShort && resistanceBroken) {
    exitSignal = "EXIT_NOW";
    reasons.push(`Price ($${quote.price}) broke above resistance ($${quote.resistanceLevel}) — short call under pressure.`);
  }

  // 3. Deep loss guardrail (2x premium for short positions)
  if (isShort && pnl < 0 && Math.abs(pnl) > 2 * entryPrice * 100 * quantity) {
    exitSignal = "EXIT_NOW";
    reasons.push("Loss exceeds 2x premium collected — max-loss guardrail triggered.");
  }

  // 4. DTE with little reward left
  if (exitSignal === "HOLD" && isShort && dte < 7 && pnlPercentOfMax >= 80) {
    exitSignal = "TAKE_PROFIT";
    reasons.push(`${dte} days to expiry with ${pnlPercentOfMax}% of max profit captured — gamma risk outweighs the last ${round(100 - pnlPercentOfMax, 1)}%.`);
  }

  if (exitSignal === "HOLD") {
    reasons.push(
      isShort
        ? `Position at ${pnlPercentOfMax}% of max profit; price holding between support ($${quote.supportLevel}) and resistance ($${quote.resistanceLevel}). Theta is working for you.`
        : `P/L $${pnl}; no exit trigger hit.`
    );
    if (dte <= 10) reasons.push(`${dte} DTE — watch gamma risk as expiry approaches.`);
  }

  return { exitSignal, reasons, pnlEstimate: pnl, pnlPercentOfMax };
}
