import { Greeks, OptionType } from "@/types";

/** Standard normal CDF via Abramowitz-Stegun erf approximation. */
function normCdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804014327 * Math.exp((-x * x) / 2);
  const p =
    d *
    t *
    (0.319381530 +
      t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x >= 0 ? 1 - p : p;
}

function normPdf(x: number): number {
  return Math.exp((-x * x) / 2) / Math.sqrt(2 * Math.PI);
}

export interface BsInput {
  spot: number;
  strike: number;
  /** time to expiry in years */
  t: number;
  /** implied volatility, decimal */
  iv: number;
  /** risk-free rate, decimal */
  r?: number;
  type: OptionType;
}

export interface BsResult extends Greeks {
  price: number;
}

/** Black-Scholes price + Greeks. Theta is per-day, vega/rho per 1% move. */
export function blackScholes({ spot, strike, t, iv, r = 0.045, type }: BsInput): BsResult {
  const tt = Math.max(t, 1 / 365 / 24); // avoid div by zero
  const sqrtT = Math.sqrt(tt);
  const d1 = (Math.log(spot / strike) + (r + (iv * iv) / 2) * tt) / (iv * sqrtT);
  const d2 = d1 - iv * sqrtT;
  const isCall = type === "CALL";

  const price = isCall
    ? spot * normCdf(d1) - strike * Math.exp(-r * tt) * normCdf(d2)
    : strike * Math.exp(-r * tt) * normCdf(-d2) - spot * normCdf(-d1);

  const delta = isCall ? normCdf(d1) : normCdf(d1) - 1;
  const gamma = normPdf(d1) / (spot * iv * sqrtT);
  const thetaAnnual = isCall
    ? (-spot * normPdf(d1) * iv) / (2 * sqrtT) - r * strike * Math.exp(-r * tt) * normCdf(d2)
    : (-spot * normPdf(d1) * iv) / (2 * sqrtT) + r * strike * Math.exp(-r * tt) * normCdf(-d2);
  const theta = thetaAnnual / 365; // per day
  const vega = (spot * normPdf(d1) * sqrtT) / 100; // per 1% IV
  const rho = isCall
    ? (strike * tt * Math.exp(-r * tt) * normCdf(d2)) / 100
    : (-strike * tt * Math.exp(-r * tt) * normCdf(-d2)) / 100;

  return {
    price: Math.max(price, 0.01),
    delta: round(delta, 4),
    gamma: round(gamma, 4),
    theta: round(theta, 4),
    vega: round(vega, 4),
    rho: round(rho, 4),
  };
}

export function round(n: number, dp = 2): number {
  const f = Math.pow(10, dp);
  return Math.round(n * f) / f;
}
