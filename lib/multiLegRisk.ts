import type { MultiLegOption } from "@/components/MultiLegBuilder";

export interface RiskLeg {
  option: MultiLegOption;
  side: "BUY" | "SELL";
  quantity: number;
}

export interface MultiLegRiskSummary {
  netPremium: number;
  netCredit: number;
  maxProfit: number;
  maxLoss: number;
  breakevens: number[];
  spreadDelta: number | null;
  spreadTheta: number | null;
}

export function calculateBearCallCreditSpread(
  shortCall: RiskLeg,
  longCall: RiskLeg,
  spreadDelta: number | null,
  spreadTheta: number | null
): MultiLegRiskSummary {
  const shortPrice = shortCall.option.bid ?? 0;
  const longPrice = longCall.option.ask ?? 0;
  const netCreditPerShare = shortPrice - longPrice;
  const widthPerShare = longCall.option.strike - shortCall.option.strike;
  const contracts = shortCall.quantity;
  const maxProfit = netCreditPerShare * 100 * contracts;
  const maxLoss = (widthPerShare - netCreditPerShare) * 100 * contracts;

  return {
    netPremium: Number(netCreditPerShare.toFixed(2)),
    netCredit: Number(Math.max(netCreditPerShare, 0).toFixed(2)),
    maxProfit: Number(maxProfit.toFixed(2)),
    maxLoss: Number(maxLoss.toFixed(2)),
    breakevens: [Number((shortCall.option.strike + netCreditPerShare).toFixed(2))],
    spreadDelta: spreadDelta === null ? null : Number(spreadDelta.toFixed(4)),
    spreadTheta: spreadTheta === null ? null : Number(spreadTheta.toFixed(4)),
  };
}

export function calculateMultiLegRisk(legs: RiskLeg[]): MultiLegRiskSummary {
  const netPremium = legs.reduce((total, leg) => {
    const price = leg.side === "BUY" ? leg.option.ask ?? 0 : leg.option.bid ?? 0;
    return total + (leg.side === "SELL" ? price : -price) * leg.quantity;
  }, 0);
  const isBearCall = legs.length === 2
    && legs.every((leg) => leg.option.type.toUpperCase() === "CALL")
    && legs[0].quantity === legs[1].quantity
    && legs.some((leg) => leg.side === "SELL")
    && legs.some((leg) => leg.side === "BUY");
  const shortCall = isBearCall ? legs.find((leg) => leg.side === "SELL") : undefined;
  const longCall = isBearCall ? legs.find((leg) => leg.side === "BUY") : undefined;
  const spreadDelta = legs.every((leg) => typeof leg.option.delta === "number")
    ? legs.reduce((total, leg) => total + (leg.side === "BUY" ? 1 : -1) * (leg.option.delta ?? 0), 0)
    : null;
  const spreadTheta = legs.every((leg) => typeof leg.option.theta === "number")
    ? legs.reduce((total, leg) => total + (leg.side === "BUY" ? 1 : -1) * (leg.option.theta ?? 0), 0)
    : null;

  if (shortCall && longCall && shortCall.option.strike < longCall.option.strike) {
    return calculateBearCallCreditSpread(shortCall, longCall, spreadDelta, spreadTheta);
  }

  const strikes = legs.map((leg) => leg.option.strike).sort((a, b) => a - b);
  const width = strikes.length > 1 ? Math.max(...strikes) - Math.min(...strikes) : 0;
  const netValue = netPremium * 100;
  const maxProfit = netValue >= 0 ? netValue : Math.max(0, width * 100 + netValue);
  const maxLoss = netValue < 0 ? Math.abs(netValue) : Math.max(0, width * 100 - netValue);

  return {
    netPremium: Number(netPremium.toFixed(2)),
    netCredit: Number(Math.max(netPremium, 0).toFixed(2)),
    maxProfit: Number(maxProfit.toFixed(2)),
    maxLoss: Number(maxLoss.toFixed(2)),
    breakevens: strikes.length && netPremium !== 0
      ? [Number((strikes[Math.floor(strikes.length / 2)] + Math.abs(netPremium)).toFixed(2))]
      : [],
    spreadDelta: spreadDelta === null ? null : Number(spreadDelta.toFixed(4)),
    spreadTheta: spreadTheta === null ? null : Number(spreadTheta.toFixed(4)),
  };
}