import { OptionType, PaperPosition } from "@/types";

/* ---------- Paper Account ---------- */
export interface AccountStats {
  startingBalance: number;
  balance: number;
  equity: number;
  realizedPnl: number;
  unrealizedPnl: number;
  marginReserved: number;
  buyingPower: number;
  marginUtilizationPct: number;
  openPositions: number;
  closedTrades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  avgRiskReward: number;
  maxDrawdown: number;
  maxDrawdownPct: number;
  largestPositionMarginPct: number;
}

/* ---------- Trade Journal ---------- */
export interface JournalEntry {
  id: string;
  symbol: string;
  contract: string;
  strategy: string;
  side: "SHORT" | "LONG";
  quantity: number;
  entryPrice: number;
  exitPrice: number;
  realizedPnl: number;
  result: "WIN" | "LOSS" | "FLAT";
  openedAt: string;
  closedAt: string;
  holdDays: number;
  notes?: string;
}

export interface JournalFilters {
  symbol?: string;
  strategy?: string;
  result?: "WIN" | "LOSS";
  from?: string;
  to?: string;
}

/* ---------- Sentiment ---------- */
export type SentimentLabel = "BULLISH" | "NEUTRAL" | "BEARISH";

export interface SentimentSource {
  name: "Reddit" | "X" | "Yahoo Finance" | "News";
  label: SentimentLabel;
  score: number;
  sampleSize: number;
}

export interface SentimentReport {
  symbol: string;
  overall: SentimentLabel;
  score: number;
  sources: SentimentSource[];
  topThemes: string[];
  majorPlayers: string[];
  digest: string;
  isSample: boolean;
}

/* ---------- Auto-Exit ---------- */
export interface AutoExitConfig {
  enabled: boolean;
  profitTargetPct: number;
  stopLossMultiple: number;
  maxAbsDelta: number;
  exitDTE: number;
  respectRiskManager: boolean;
}

export type AutoExitReason =
  | "PROFIT_TARGET"
  | "STOP_LOSS"
  | "DELTA_RISK"
  | "EXPIRATION"
  | "RISK_MANAGER";

export interface AutoExitEvent {
  id: string;
  positionId: string;
  symbol: string;
  contract: string;
  reason: AutoExitReason;
  detail: string;
  pnl: number;
  at: string;
}

/* ---------- Flow ---------- */
export type FlowOrderType = "SWEEP" | "BLOCK" | "SPLIT";

export interface LiveFlowEvent {
  id: string;
  symbol: string;
  contract: string;
  type: OptionType;
  orderType: FlowOrderType;
  premium: number;
  size: number;
  strike: number;
  expiry: string;
  sentiment: SentimentLabel;
  spotAtPrint: number;
  time: string;
  darkPool: false;
}

export interface DarkPoolPrint {
  id: string;
  symbol: string;
  price: number;
  size: number;
  notional: number;
  venue: string;
  aboveAsk: boolean;
  belowBid: boolean;
  time: string;
  darkPool: true;
}

export interface PriceCluster {
  price: number;
  totalNotional: number;
  printCount: number;
  kind: "SUPPORT" | "RESISTANCE";
}

export interface FlowFiltersState {
  minPremium: number;
  strike?: number;
  expiry?: string;
  sentiment?: SentimentLabel | "ALL";
  orderType?: FlowOrderType | "ALL";
  venue?: "ALL" | "LIT" | "DARK";
}

export interface HistoricalFlowQuery extends FlowFiltersState {
  symbol: string;
  from: string;
  to: string;
  limit?: number;
}

/* ---------- Alerts ---------- */
export type AlertRuleType =
  | "SWEEP_PREMIUM"
  | "BLOCK_PREMIUM"
  | "SENTIMENT_CHANGE"
  | "PRICE_LEVEL"
  | "ORDER_TYPE";

export interface AlertRule {
  id: string;
  type: AlertRuleType;
  symbol: string;
  minPremium?: number;
  priceLevel?: number;
  direction?: "ABOVE" | "BELOW";
  orderType?: FlowOrderType;
  audio: boolean;
  createdAt: string;
}

export interface AlertEvent {
  id: string;
  ruleId: string;
  ruleType: AlertRuleType;
  symbol: string;
  message: string;
  audio: boolean;
  at: string;
}

export type ClosedPosition = PaperPosition & { closedAt: string; realizedPnl: number };
