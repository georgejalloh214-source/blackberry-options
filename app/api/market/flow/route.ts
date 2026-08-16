import { fail, ok } from "@/lib/api";
import { getProvider } from "@/lib/marketData";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol")?.trim().toUpperCase() || undefined;
  try {
    const flow = await getProvider().getFlow(symbol);
    return ok({ flow, source: process.env.FLOW_DATA_API_KEY ? "LIVE" : "MOCK" });
  } catch (e) {
    return fail("FLOW_ERROR", e instanceof Error ? e.message : "Flow fetch failed", 500);
  }
}
