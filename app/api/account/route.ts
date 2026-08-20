import { ok, fail } from "@/lib/api";
import { computeAccountStats } from "@/lib/paperAccount";
import { getPositions } from "@/lib/paperTrading";

export async function GET() {
  try {
    const [open, closed] = await Promise.all([getPositions("OPEN"), getPositions("CLOSED")]);
    return ok(computeAccountStats([...open, ...closed]));
  } catch (e) {
    return fail("ACCOUNT_ERROR", e instanceof Error ? e.message : "Account stats failed", 500);
  }
}
