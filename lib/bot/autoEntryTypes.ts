export type AutoEntryLeg = {
  action: "BUY" | "SELL";
  type: "CALL" | "PUT";
  strike: number;
  expiration: string;
  premium: number;
  quantity: number;
};

export type AutoEntryTrade = {
  symbol: string;
  legs: AutoEntryLeg[];
  tradeScore: number;
  riskLevel: number;
  source: "AUTO_ENTRY";
};
