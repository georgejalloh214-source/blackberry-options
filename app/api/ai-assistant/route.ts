import { fail, ok } from "@/lib/api";
import { AssistantTask, ContractInput, createAssistantAnswer } from "@/lib/aiAssistant";

export const runtime = "nodejs";

const tasks = new Set<AssistantTask>([
  "analysis",
  "option-explainer",
  "trade-thesis",
  "earnings-copilot",
]);

function isContract(value: unknown): value is ContractInput {
  if (!value || typeof value !== "object") return false;
  const contract = value as Record<string, unknown>;
  const expiration = typeof contract.expiration === "string"
    ? new Date(`${contract.expiration}T00:00:00.000Z`)
    : null;
  return typeof contract.strike === "number" && Number.isFinite(contract.strike) && contract.strike > 0 &&
    typeof contract.expiration === "string" && /^\d{4}-\d{2}-\d{2}$/.test(contract.expiration) &&
    !!expiration && !Number.isNaN(expiration.getTime()) && expiration > new Date() &&
    (contract.optionType === "CALL" || contract.optionType === "PUT") &&
    (contract.impliedVolatility == null ||
      (typeof contract.impliedVolatility === "number" && Number.isFinite(contract.impliedVolatility) && contract.impliedVolatility >= 0 && contract.impliedVolatility <= 100));
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("INVALID_JSON", "Request body must be valid JSON.");
  }

  if (!body || typeof body !== "object") return fail("INVALID_REQUEST", "A request object is required.");
  const input = body as Record<string, unknown>;
  const symbol = typeof input.symbol === "string" ? input.symbol.trim().toUpperCase() : "";
  const task = input.task;

  if (!/^[A-Z0-9.^=-]{1,20}$/.test(symbol)) {
    return fail("INVALID_SYMBOL", "Enter a valid ticker symbol.");
  }
  if (typeof task !== "string" || !tasks.has(task as AssistantTask)) {
    return fail("INVALID_TASK", "Choose a supported AI analysis task.");
  }
  if (task === "option-explainer" && !isContract(input.contract)) {
    return fail("INVALID_CONTRACT", "Provide a positive strike, valid expiration, call/put type, and optional IV from 0 to 100.");
  }
  if (!process.env.MAGICA_API_KEY?.trim()) {
    return fail("AI_NOT_CONFIGURED", "Add MAGICA_API_KEY to the server environment to enable AI features.", 503);
  }

  try {
    const result = await createAssistantAnswer(
      task as AssistantTask,
      symbol,
      task === "option-explainer" ? input.contract as ContractInput : undefined,
    );
    return ok(result);
  } catch (error) {
    return fail(
      "AI_REQUEST_FAILED",
      error instanceof Error ? error.message : "AI analysis could not be completed.",
      502,
    );
  }
}