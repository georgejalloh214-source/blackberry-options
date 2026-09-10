import { fail, ok } from "@/lib/api";
import { BotInputs, computeTradeScore } from "@/lib/bot/brain";

function isScore(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<BotInputs>;
    const keys: Array<keyof BotInputs> = ["priceTrendScore", "flowScore", "ivScore", "greeksScore", "riskScore"];
    if (keys.some((key) => !isScore(body[key]))) {
      return fail("INVALID_BOT_INPUT", "All five bot input scores must be finite numbers.", 400);
    }
    return ok(computeTradeScore(body as BotInputs));
  } catch {
    return fail("INVALID_BOT_REQUEST", "Bot input must be valid JSON.", 400);
  }
}
