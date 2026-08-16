import { fail, ok } from "@/lib/api";
import { getPositions } from "@/lib/paperTrading";

export async function GET() {
  try {
    const positions = await getPositions("OPEN");
    return ok({ positions });
  } catch (e) {
    return fail("POSITIONS_ERROR", e instanceof Error ? e.message : "Could not load positions", 500);
  }
}
