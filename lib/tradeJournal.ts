import { PaperPosition } from "@/types";
import { ClosedPosition, JournalEntry, JournalFilters } from "@/types/features";

export function toJournalEntries(positions: PaperPosition[]): JournalEntry[] {
  return positions
    .filter((p): p is ClosedPosition => p.status === "CLOSED" && !!p.closedAt)
    .map((p) => {
      const pnl = p.realizedPnl ?? 0;
      return {
        id: p.id,
        symbol: p.symbol,
        contract: `${p.symbol} $${p.optionContract.strike}${p.optionContract.type[0]} ${p.optionContract.expiry}`,
        strategy: p.strategy,
        side: p.side === "SELL_TO_OPEN" ? "SHORT" : "LONG",
        quantity: p.quantity,
        entryPrice: p.entryPrice,
        exitPrice: p.currentPrice,
        realizedPnl: pnl,
        result: pnl > 0 ? "WIN" : pnl < 0 ? "LOSS" : "FLAT",
        openedAt: p.openedAt,
        closedAt: p.closedAt,
        holdDays: Math.max(
          0,
          Math.round(
            (new Date(p.closedAt).getTime() - new Date(p.openedAt).getTime()) / 86_400_000
          )
        ),
        notes: p.notes,
      } satisfies JournalEntry;
    })
    .sort((a, b) => b.closedAt.localeCompare(a.closedAt));
}

export function filterJournal(entries: JournalEntry[], f: JournalFilters): JournalEntry[] {
  return entries.filter((e) => {
    if (f.symbol && e.symbol !== f.symbol.toUpperCase()) return false;
    if (f.strategy && e.strategy !== f.strategy) return false;
    if (f.result && e.result !== f.result) return false;
    if (f.from && e.closedAt.slice(0, 10) < f.from) return false;
    if (f.to && e.closedAt.slice(0, 10) > f.to) return false;
    return true;
  });
}

/** CSV export helper — feed to a Blob download on the client. */
export function journalToCsv(entries: JournalEntry[]): string {
  const header = [
    "id", "symbol", "contract", "strategy", "side", "quantity",
    "entryPrice", "exitPrice", "realizedPnl", "result",
    "openedAt", "closedAt", "holdDays", "notes",
  ];
  const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = entries.map((e) =>
    [
      e.id, e.symbol, e.contract, e.strategy, e.side, e.quantity,
      e.entryPrice, e.exitPrice, e.realizedPnl, e.result,
      e.openedAt, e.closedAt, e.holdDays, e.notes ?? "",
    ].map(escape).join(",")
  );
  return [header.join(","), ...rows].join("\n");
}
