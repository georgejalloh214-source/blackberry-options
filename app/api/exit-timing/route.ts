import { fail, ok } from "@/lib/api";
import { evaluateExit, ExitInput } from "@/lib/exitTiming";
import { getProvider } from "@/lib/marketData";

interface Body {
  position?: ExitInput;
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return fail("BAD_JSON", "Request body must be valid JSON.");
  }
  const p = body.position;
  if (!p?.symbol || p.entryPrice === undefined || p.currentPrice === undefined || !p.optionContract) {
    return fail(
      "MISSING_FIELDS",
      "Required: position { symbol, entryPrice, currentPrice, quantity, side, optionContract, openedAt }."
    );
  }
  try {
    const quote = await getProvider().getQuote(p.symbol.toUpperCase());
    const result = evaluateExit({ ...p, quantity: p.quantity ?? 1, side: p.side ?? "SELL_TO_OPEN" }, quote);
    return ok(result);
  } catch (e) {
    return fail("EXIT_TIMING_ERROR", e instanceof Error ? e.message : "Exit timing failed", 500);
  }
}
