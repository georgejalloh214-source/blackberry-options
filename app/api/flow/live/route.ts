import { ok, fail } from "@/lib/api";
import { applyFlowFilters, getLiveFlow } from "@/lib/flow/liveFlow";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol") ?? undefined;
  const minPremium = Number(searchParams.get("minPremium") ?? 0);
  const sentiment = searchParams.get("sentiment") ?? "ALL";
  const orderType = searchParams.get("orderType") ?? "ALL";
  try {
    const events = await getLiveFlow(symbol);
    const filtered = applyFlowFilters(events, {
      minPremium,
      sentiment: sentiment as never,
      orderType: orderType as never,
    });
    return ok({ events: filtered, source: process.env.FLOW_DATA_API_KEY ? "LIVE" : "SAMPLE" });
  } catch (e) {
    return fail("FLOW_ERROR", e instanceof Error ? e.message : "Live flow failed", 500);
  }
}
