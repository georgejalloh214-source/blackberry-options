import { fail, ok } from "@/lib/api";
import { getEntryTiming } from "@/lib/bots";
import { OptionContractRef } from "@/types";

interface Body {
  symbol?: string;
  optionContract?: OptionContractRef;
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return fail("BAD_JSON", "Request body must be valid JSON.");
  }
  const { symbol, optionContract } = body;
  if (!symbol || !optionContract?.expiry || !optionContract.strike || !optionContract.type) {
    return fail("MISSING_FIELDS", "Required: symbol, optionContract { expiry, strike, type }.");
  }
  try {
    const result = await getEntryTiming(symbol.toUpperCase(), optionContract);
    return ok(result);
  } catch (e) {
    return fail("ENTRY_TIMING_ERROR", e instanceof Error ? e.message : "Entry timing failed", 500);
  }
}
