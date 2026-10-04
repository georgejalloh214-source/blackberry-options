import { RecommendedLeg } from "@/lib/bot/strategyEngine";

export type PayoffPoint = { price: number; payoff: number };

export function computePayoff(legs: RecommendedLeg[], currentPrice: number, points = 41): PayoffPoint[] {
  if (legs.length === 0) return [];
  const strikes = legs.map((leg) => leg.strike);
  const low = Math.max(0.01, Math.min(...strikes, currentPrice) * 0.85);
  const high = Math.max(...strikes, currentPrice) * 1.15;
  const step = (high - low) / (points - 1);

  return Array.from({ length: points }, (_, index) => {
    const price = low + step * index;
    const payoff = legs.reduce((total, leg) => {
      const intrinsic = leg.type === "CALL"
        ? Math.max(0, price - leg.strike)
        : Math.max(0, leg.strike - price);
      const perShare = leg.action === "BUY"
        ? intrinsic - leg.premium
        : leg.premium - intrinsic;
      return total + perShare * 100;
    }, 0);
    return { price: Number(price.toFixed(2)), payoff: Number(payoff.toFixed(2)) };
  });
}
