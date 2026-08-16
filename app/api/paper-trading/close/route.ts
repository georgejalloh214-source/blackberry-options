import { fail, ok } from "@/lib/api";
import { closeTrade } from "@/lib/paperTrading";

export async function POST(request: Request) {
  let body: { positionId?: string };
  try {
    body = (await request.json()) as { positionId?: string };
  } catch {
    return fail("BAD_JSON", "Request body must be valid JSON.");
  }
  if (!body.positionId) return fail("MISSING_FIELDS", "Required: positionId.");
  try {
    const position = await closeTrade(body.positionId);
    return ok(position);
  } catch (e) {
    return fail("CLOSE_TRADE_ERROR", e instanceof Error ? e.message : "Could not close trade", 500);
  }
}
