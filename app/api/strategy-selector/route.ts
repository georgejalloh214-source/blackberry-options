import { fail, ok } from "@/lib/api";
import { getProvider } from "@/lib/marketData";
import { selectStrategy, UserProfile } from "@/lib/strategy";
import { OptionContractRef } from "@/types";

interface Body {
  symbol?: string;
  optionContract?: OptionContractRef;
  userProfile?: UserProfile;
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return fail("BAD_JSON", "Request body must be valid JSON.");
  }
  const { symbol, optionContract, userProfile } = body;
  if (!symbol || !optionContract || !userProfile) {
    return fail("MISSING_FIELDS", "Required: symbol, optionContract, userProfile.");
  }
  try {
    const provider = getProvider();
    const [quote, chain] = await Promise.all([
      provider.getQuote(symbol.toUpperCase()),
      provider.getOptionsChain(symbol.toUpperCase()),
    ]);
    const contract = chain.find(
      (c) =>
        c.expiry === optionContract.expiry &&
        c.strike === optionContract.strike &&
        c.type === optionContract.type
    );
    const result = selectStrategy(quote, contract, userProfile);
    return ok(result);
  } catch (e) {
    return fail("STRATEGY_ERROR", e instanceof Error ? e.message : "Strategy selection failed", 500);
  }
}
