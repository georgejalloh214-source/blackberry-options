export type OptionType = "PUT" | "CALL";

export interface OptionContractRef {
  expiry: string; // ISO date
  strike: number;
  type: OptionType;
}

export interface Greeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
}

export interface OptionQuote extends OptionContractRef {
  symbol: string;
  iv: number; // implied volatility (decimal, e.g. 0.32)
  ivPercentile: number; // 0-100
  bid: number;
  ask: number;
  mid: number;
  volume: number;
  openInterest: number;
  dte: number; // days to expiry
  greeks: Greeks;
}

export interface ScoreBreakdown {
  deltaFit: number;
  thetaYield: number;
  ivFit: number;
  liquidity: number;
  supportProximity: number;
}

export type StrategyTag =
  | "NAKED_PUT"
  | "CREDIT_SPREAD"
  | "COVERED_CALL"
  | "IRON_CONDOR";

export interface ScannerResult extends OptionQuote {
  supportLevel: number | null;
  resistanceLevel: number | null;
  score: number; // 0-100
  scoreBreakdown: ScoreBreakdown;
  strategyTag: StrategyTag;
}

export interface StockQuote {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  volume: number;
  prevClose: number;
  changePct: number;
  dayHigh: number;
  dayLow: number;
  supportLevel: number;
  resistanceLevel: number;
}

export interface FlowItem {
  id: string;
  symbol: string;
  contract: string; // human readable e.g. "AAPL 210P 09/19"
  type: OptionType;
  tradeType: "SWEEP" | "BLOCK" | "SPLIT";
  premium: number; // total $ premium
  size: number; // contracts
  sentiment: "BULLISH" | "BEARISH" | "NEUTRAL";
  time: string; // ISO
}

export type EntrySignal = "ENTER_NOW" | "WAIT" | "AVOID";
export type ExitSignal = "TAKE_PROFIT" | "HOLD" | "EXIT_NOW";

export interface EntryTimingResult {
  signal: EntrySignal;
  reasons: string[];
  riskScore: number; // 0-100
  botStatus: "LIVE" | "MOCK";
}

export type RecommendedStrategy =
  | "CASH_SECURED_PUT"
  | "CREDIT_SPREAD"
  | "COVERED_CALL"
  | "IRON_CONDOR";

export interface StrategyResult {
  recommendedStrategy: RecommendedStrategy;
  rationale: string[];
  keyParameters: {
    maxLossEstimate: number;
    probabilityOfProfitEstimate: number;
    marginRequiredEstimate: number;
  };
  alternatives: Array<{ strategy: RecommendedStrategy; whyNot: string }>;
}

export interface ExitTimingResult {
  exitSignal: ExitSignal;
  reasons: string[];
  pnlEstimate: number;
  pnlPercentOfMax: number;
}

export type PositionSide = "SELL_TO_OPEN" | "BUY_TO_OPEN";

export interface PaperPosition {
  id: string;
  symbol: string;
  optionContract: OptionContractRef;
  quantity: number;
  side: PositionSide;
  strategy: string;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  greeks: Greeks;
  marginRequired: number;
  assignmentRiskScore: number; // 0-100
  status: "OPEN" | "CLOSED";
  openedAt: string;
  closedAt?: string;
  realizedPnl?: number;
  notes?: string;
}

export interface ApiEnvelope<T> {
  ok: boolean;
  data?: T;
  error?: { code: string; message: string };
  asOf: string;
  dataDelayMinutes: number;
}
