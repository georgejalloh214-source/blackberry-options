import { ok, fail } from "@/lib/api";
import { HISTORY_START, queryHistoricalFlow } from "@/lib/flow/history";

export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  const symbol = p.get("symbol")?.trim().toUpperCase();
  if (!symbol) return fail("MISSING_SYMBOL", "Query param 'symbol' is required.");
  const today = new Date().toISOString().slice(0, 10);
  try {
    const events = queryHistoricalFlow({
      symbol,
      from: p.get("from") ?? HISTORY_START,
      to: p.get("to") ?? today,
      minPremium: Number(p.get("minPremium") ?? 0),
      strike: p.get("strike") ? Number(p.get("strike")) : undefined,
      expiry: p.get("expiry") ?? undefined,
      sentiment: (p.get("sentiment") ?? "ALL") as never,
      orderType: (p.get("orderType") ?? "ALL") as never,
      limit: Number(p.get("limit") ?? 100),
    });
    return ok({ events, source: "SAMPLE_ARCHIVE" });
  } catch (e) {
    return fail("HISTORY_ERROR", e instanceof Error ? e.message : "History query failed", 500);
  }
}
