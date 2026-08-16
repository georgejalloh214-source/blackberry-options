import { fail, ok } from "@/lib/api";
import { getPositions } from "@/lib/paperTrading";

export async function GET() {
  try {
    const positions = await getPositions("CLOSED");
    return ok({ positions });
  } catch (e) {
    return fail("HISTORY_ERROR", e instanceof Error ? e.message : "Could not load history", 500);
  }
}
