import { fail, ok } from "@/lib/api";
import { MultiLegTradeInput, openMultiLegTrade } from "@/lib/paperTrading";

export async function POST(request: Request) {
  let body: Partial<MultiLegTradeInput>;
  try {
    body = (await request.json()) as Partial<MultiLegTradeInput>;
  } catch {
    return fail("BAD_JSON", "Request body must be valid JSON.");
  }
  if (!body.symbol || !body.strategy || !Array.isArray(body.legs) || body.legs.length < 2) {
    return fail("MISSING_FIELDS", "Required: symbol, strategy, and at least two legs.");
  }
  try {
    return ok(await openMultiLegTrade({ symbol: body.symbol, strategy: body.strategy, legs: body.legs, metadata: body.metadata }));
  } catch (error) {
    return fail("MULTI_LEG_ERROR", error instanceof Error ? error.message : "Could not open multi-leg trade", 500);
  }
}