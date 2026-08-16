import { round } from "@/lib/blackScholes";
import { OptionQuote, RecommendedStrategy, StockQuote, StrategyResult } from "@/types";

export interface UserProfile {
  riskTolerance: "LOW" | "MEDIUM" | "HIGH";
  accountSize: number;
  ownsShares: boolean;
}

export function selectStrategy(
  quote: StockQuote,
  contract: OptionQuote | undefined,
  profile: UserProfile
): StrategyResult {
  const ivp = contract?.ivPercentile ?? 50;
  const mid = contract?.mid ?? 1;
  const strike = contract?.strike ?? quote.price;
  const absDelta = Math.abs(contract?.greeks.delta ?? 0.3);
  const pop = round((1 - absDelta) * 100, 1); // rough POP for short premium

  const cspCollateral = strike * 100;
  const nearSupport = strike <= quote.supportLevel * 1.02;
  const rangeBound =
    quote.price > quote.supportLevel * 1.015 && quote.price < quote.resistanceLevel * 0.985;
  const directional = Math.abs(quote.changePct) > 1;

  const rationale: string[] = [];
  const alternatives: StrategyResult["alternatives"] = [];
  let strategy: RecommendedStrategy;

  const cspAffordable = cspCollateral <= profile.accountSize;

  if (profile.ownsShares && rangeBound) {
    strategy = "COVERED_CALL";
    rationale.push(
      "You own shares and price action is neutral/range-bound — selling calls against stock harvests premium without added directional risk.",
      `Resistance at $${quote.resistanceLevel} gives a natural strike zone for the short call.`
    );
    alternatives.push({ strategy: "CASH_SECURED_PUT", whyNot: "Adds new downside exposure on top of shares you already hold." });
  } else if (profile.riskTolerance === "LOW" && ivp >= 40 && nearSupport && cspAffordable) {
    strategy = "CASH_SECURED_PUT";
    rationale.push(
      `IV percentile ${ivp} means premium is rich — selling puts gets paid well.`,
      `Strike $${strike} sits at/below support ($${quote.supportLevel}) — you'd be assigned at a price you already like.`,
      `Estimated probability of profit ~${pop}%.`
    );
    alternatives.push({ strategy: "CREDIT_SPREAD", whyNot: "Caps risk but also caps premium; CSP fits your collateral and support setup better." });
  } else if (ivp > 70 && rangeBound) {
    strategy = "IRON_CONDOR";
    rationale.push(
      `IV percentile ${ivp} is elevated and price is pinned between support ($${quote.supportLevel}) and resistance ($${quote.resistanceLevel}).`,
      "Selling both sides collects inflated premium with defined risk on each wing."
    );
    alternatives.push({ strategy: "CASH_SECURED_PUT", whyNot: "One-sided; a condor monetizes the full range when direction is unclear." });
  } else if (!cspAffordable || profile.riskTolerance !== "LOW" || directional) {
    strategy = "CREDIT_SPREAD";
    rationale.push(
      directional
        ? `Directional move of ${quote.changePct.toFixed(1)}% today — a defined-risk spread expresses the bias without unlimited exposure.`
        : "Defined-risk structure fits the profile better than full collateral.",
      !cspAffordable
        ? `CSP would require $${cspCollateral.toLocaleString()} collateral vs your $${profile.accountSize.toLocaleString()} account — blocked by position-sizing guardrail.`
        : `Estimated probability of profit ~${pop}%.`
    );
    if (!cspAffordable)
      alternatives.push({ strategy: "CASH_SECURED_PUT", whyNot: `Requires $${cspCollateral.toLocaleString()} collateral — exceeds account size.` });
  } else {
    strategy = "CASH_SECURED_PUT";
    rationale.push(
      `Balanced setup: IV percentile ${ivp}, support at $${quote.supportLevel}.`,
      `Estimated probability of profit ~${pop}%.`
    );
    alternatives.push({ strategy: "IRON_CONDOR", whyNot: `IV percentile ${ivp} isn't elevated enough to justify selling both sides.` });
  }

  const premium = mid * 100;
  const keyParameters =
    strategy === "CASH_SECURED_PUT"
      ? { maxLossEstimate: round(cspCollateral - premium), probabilityOfProfitEstimate: pop, marginRequiredEstimate: round(cspCollateral) }
      : strategy === "CREDIT_SPREAD"
        ? { maxLossEstimate: round(500 - premium), probabilityOfProfitEstimate: pop, marginRequiredEstimate: 500 }
        : strategy === "IRON_CONDOR"
          ? { maxLossEstimate: round(500 - premium * 1.6), probabilityOfProfitEstimate: round(Math.min(pop + 8, 95), 1), marginRequiredEstimate: 500 }
          : { maxLossEstimate: round(quote.price * 100 - premium), probabilityOfProfitEstimate: round(Math.min(pop + 15, 95), 1), marginRequiredEstimate: 0 };

  return { recommendedStrategy: strategy, rationale, keyParameters, alternatives };
}
