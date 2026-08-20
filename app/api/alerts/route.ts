import { ok, fail } from "@/lib/api";
import { checkAlerts, getAlertEvents, getRules, saveRules } from "@/lib/alerts";
import { AlertRule } from "@/types/features";

export async function GET(request: Request) {
  const check = new URL(request.url).searchParams.get("check") === "1";
  try {
    const fired = check ? await checkAlerts() : [];
    const [rules, events] = await Promise.all([getRules(), getAlertEvents()]);
    return ok({ rules, events, fired });
  } catch (e) {
    return fail("ALERTS_ERROR", e instanceof Error ? e.message : "Alerts failed", 500);
  }
}

export async function POST(request: Request) {
  let body: { rule?: Omit<AlertRule, "id" | "createdAt">; deleteId?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return fail("BAD_JSON", "Request body must be valid JSON.");
  }
  try {
    let rules = await getRules();
    if (body.deleteId) rules = rules.filter((r) => r.id !== body.deleteId);
    if (body.rule) {
      rules.push({ ...body.rule, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
    }
    await saveRules(rules);
    return ok({ rules });
  } catch (e) {
    return fail("ALERTS_ERROR", e instanceof Error ? e.message : "Alerts failed", 500);
  }
}
