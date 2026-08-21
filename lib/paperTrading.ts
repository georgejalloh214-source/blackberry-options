import { round } from "@/lib/blackScholes";
import { getProvider } from "@/lib/marketData";
import { loadPositions, savePositions } from "@/lib/store";
import { OptionContractRef, PaperPosition, PositionSide } from "@/types";

export interface OpenTradeInput {
  symbol: string;
  optionContract: OptionContractRef;
  quantity: number;
  side: PositionSide;
  strategy: string;
  notes?: string;
}

export async function openTrade(input: OpenTradeInput): Promise<PaperPosition> {
  const provider = getProvider();
  const chain = await provider.getOptionsChain(input.symbol);
  const contract = chain.find(
    (c) =>
      c.expiry === input.optionContract.expiry &&
      c.strike === input.optionContract.strike &&
      c.type === input.optionContract.type
  );
  if (!contract) {
    throw new Error(
      `Contract not found in chain: ${input.symbol} ${input.optionContract.strike}${input.optionContract.type[0]} ${input.optionContract.expiry}`
    );
  }

  const entryPrice = contract.mid; // fill at mid — realistic paper fill
  const isShort = input.side === "SELL_TO_OPEN";
  const marginRequired = isShort
    ? round(input.optionContract.strike * 100 * input.quantity)
    : round(entryPrice * 100 * input.quantity);

  const position: PaperPosition = {
    id: crypto.randomUUID(),
    symbol: input.symbol.toUpperCase(),
    optionContract: input.optionContract,
    quantity: input.quantity,
    side: input.side,
    strategy: input.strategy,
    entryPrice,
    currentPrice: entryPrice,
    pnl: 0,
    greeks: contract.greeks,
    marginRequired,
    assignmentRiskScore: assignmentRisk(contract.greeks.delta, contract.dte, isShort),
    status: "OPEN",
    openedAt: new Date().toISOString(),
    notes: input.notes,
  };

  const positions = await loadPositions();
  positions.push(position);
  await savePositions(positions);
  return position;
}

export async function closeTrade(positionId: string): Promise<PaperPosition> {
  const positions = await loadPositions();
  const pos = positions.find((p) => p.id === positionId && p.status === "OPEN");
  if (!pos) throw new Error("Open position not found");
  const refreshed = await refreshPosition(pos);
  refreshed.status = "CLOSED";
  refreshed.closedAt = new Date().toISOString();
  refreshed.realizedPnl = refreshed.pnl;
  await savePositions(positions.map((p) => (p.id === positionId ? refreshed : p)));
  return refreshed;
}

export async function getPositions(status?: "OPEN" | "CLOSED"): Promise<PaperPosition[]> {
  const positions = await loadPositions();
  const filtered = status ? positions.filter((p) => p.status === status) : positions;
  if (status === "CLOSED") return filtered;
  const refreshed = await Promise.all(
    filtered.map((p) => (p.status === "OPEN" ? refreshPosition(p) : Promise.resolve(p)))
  );
  const all = positions.map((p) => refreshed.find((r) => r.id === p.id) ?? p);
  await savePositions(all);
  return refreshed;
}

async function refreshPosition(pos: PaperPosition): Promise<PaperPosition> {
  const provider = getProvider();
  const chain = await provider.getOptionsChain(pos.symbol);
  const contract = chain.find(
    (c) =>
      c.expiry === pos.optionContract.expiry &&
      c.strike === pos.optionContract.strike &&
      c.type === pos.optionContract.type
  );
  if (!contract) return pos;

  const isShort = pos.side === "SELL_TO_OPEN";
  const currentPrice = contract.mid;
  const perContract = isShort ? pos.entryPrice - currentPrice : currentPrice - pos.entryPrice;
  return {
    ...pos,
    currentPrice,
    pnl: round(perContract * 100 * pos.quantity),
    greeks: contract.greeks,
    assignmentRiskScore: assignmentRisk(contract.greeks.delta, contract.dte, isShort),
  };
}

function assignmentRisk(delta: number, dte: number, isShort: boolean): number {
  if (!isShort) return 0;
  const base = Math.abs(delta) * 100;
  const expiryBoost = dte <= 5 ? 15 : dte <= 10 ? 8 : 0;
  return Math.min(100, Math.round(base + (Math.abs(delta) > 0.5 ? expiryBoost : expiryBoost / 2)));
}
