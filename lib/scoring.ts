import { OptionQuote, ScannerResult, ScoreBreakdown, StrategyTag } from "@/types";

export interface ScannerFilters {
  minDelta: number;
  maxDelta: number;
  minIV: number;
  maxIV: number;
  minVolume: number;
  maxDTE?: number;
}

export const DEFAULT_FILTERS: ScannerFilters = {
  minDelta: 0.2,
  maxDelta: 0.4,
  minIV: 0.15,
  maxIV: 0.9,
  minVolume: 100,
  maxDTE: 45,
};

const clamp = (n: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, n));

/**
 * Score a single contract 0-100 with a naked-put bias:
 * - PUT delta inside the target band (cash-secured put sweet spot)
 * - strong theta yield relative to strike (time decay income)
 * - IV percentile in the 30-70 band (premium is rich but not chaos)
 * - liquid (tight spread, real volume + OI)
 * - strike at/below support
 */
export function scoreContract(
  q: OptionQuote,
  filters: ScannerFilters,
  supportLevel: number | null,
  resistanceLevel: number | null
): ScannerResult {
  const absDelta = Math.abs(q.greeks.delta);

  // 1. Delta fit — peak in middle of the target band
  const bandMid = (filters.minDelta + filters.maxDelta) / 2;
  const bandHalf = Math.max((filters.maxDelta - filters.minDelta) / 2, 0.01);
  const deltaFit = clamp(100 * (1 - Math.abs(absDelta - bandMid) / (bandHalf * 2)));

  // 2. Theta yield — daily decay as % of strike (annualized-ish income proxy)
  const thetaYieldPct = (Math.abs(q.greeks.theta) / q.strike) * 100;
  const thetaYield = clamp(thetaYieldPct * 2500); // ~0.04%/day => 100

  // 3. IV fit — sweet spot at 30-70 percentile
  const ivFit =
    q.ivPercentile >= 30 && q.ivPercentile <= 70
      ? 100
      : clamp(100 - Math.min(Math.abs(q.ivPercentile - 50) - 20, 50) * 2.5);

  // 4. Liquidity — spread width + volume + OI
  const spreadPct = q.mid > 0 ? (q.ask - q.bid) / q.mid : 1;
  const spreadScore = clamp(100 * (1 - spreadPct / 0.1)); // 10% spread => 0
  const volScore = clamp((q.volume / 1000) * 50 + (q.openInterest / 5000) * 50);
  const liquidity = clamp(spreadScore * 0.6 + volScore * 0.4);

  // 5. Support proximity — for puts: strike at/below support is ideal
  let supportProximity = 50;
  if (supportLevel && q.type === "PUT") {
    const dist = (supportLevel - q.strike) / supportLevel; // >0 => strike below support (good)
    supportProximity = dist >= 0 ? clamp(100 - dist * 400) : clamp(70 + dist * 900);
  } else if (resistanceLevel && q.type === "CALL") {
    const dist = (q.strike - resistanceLevel) / resistanceLevel;
    supportProximity = dist >= 0 ? clamp(100 - dist * 400) : clamp(70 + dist * 900);
  }

  const breakdown: ScoreBreakdown = {
    deltaFit: Math.round(deltaFit),
    thetaYield: Math.round(thetaYield),
    ivFit: Math.round(ivFit),
    liquidity: Math.round(liquidity),
    supportProximity: Math.round(supportProximity),
  };

  const score = Math.round(
    deltaFit * 0.3 + thetaYield * 0.15 + ivFit * 0.15 + liquidity * 0.25 + supportProximity * 0.15
  );

  return {
    ...q,
    supportLevel,
    resistanceLevel,
    score,
    scoreBreakdown: breakdown,
    strategyTag: tagStrategy(q, supportLevel),
  };
}

function tagStrategy(q: OptionQuote, supportLevel: number | null): StrategyTag {
  if (q.type === "PUT") {
    if (supportLevel && q.strike <= supportLevel && q.ivPercentile >= 30) return "NAKED_PUT";
    return q.ivPercentile > 70 ? "IRON_CONDOR" : "CREDIT_SPREAD";
  }
  return q.ivPercentile > 70 ? "IRON_CONDOR" : "COVERED_CALL";
}

/** Filter + score + rank an options chain. Returns the top N. */
export function scanChain(
  chain: OptionQuote[],
  filters: ScannerFilters,
  supportLevel: number | null,
  resistanceLevel: number | null,
  topN = 10
): ScannerResult[] {
  return chain
    .filter((q) => {
      const absDelta = Math.abs(q.greeks.delta);
      const spreadPct = q.mid > 0 ? (q.ask - q.bid) / q.mid : 1;
      return (
        absDelta >= filters.minDelta &&
        absDelta <= filters.maxDelta &&
        q.iv >= filters.minIV &&
        q.iv <= filters.maxIV &&
        q.volume >= filters.minVolume &&
        (filters.maxDTE === undefined || q.dte <= filters.maxDTE) &&
        spreadPct <= 0.1 && // reject illiquid: spread > 10% of mid
        q.openInterest >= 100
      );
    })
    .map((q) => scoreContract(q, filters, supportLevel, resistanceLevel))
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}
