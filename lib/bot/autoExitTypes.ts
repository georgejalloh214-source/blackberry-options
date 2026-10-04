export type AutoExitReason = "STOP_LOSS" | "TAKE_PROFIT" | "RISK_ENVIRONMENT";

export type AutoExitDecision = {
  reason: AutoExitReason;
  pnlPct: number;
  riskLevel: number;
  timestamp: string;
};
