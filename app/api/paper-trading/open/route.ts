import { fail, ok } from "@/lib/api";
import { openTrade, OpenTradeInput } from "@/lib/paperTrading";

export async function POST(request: Request) {
  let body: Partial<OpenTradeInput>;
  try {
    body = (await request.json()) as Partial<OpenTradeInput>;
  } catch {
    return fail("BAD_JSON", "Request body must be valid JSON.");
  }
  const { symbol, optionContract, quantity, side, strategy } = body;
  if (!symbol || !optionContract || !side) {
    return fail("MISSING_FIELDS", "Required: symbol, optionContract, side.");
  }
  try {
    const position = await openTrade({
      symbol,
      optionContract,
      quantity: quantity && quantity > 0 ? Math.floor(quantity) : 1,
      side,
      strategy: strategy || "UNSPECIFIED",
      notes: body.notes,
    });
    return ok(position);
  } catch (e) {
    return fail("OPEN_TRADE_ERROR", e instanceof Error ? e.message : "Could not open trade", 500);
  }
}
