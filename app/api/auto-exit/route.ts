import { ok, fail } from "@/lib/api";
import {
  DEFAULT_AUTO_EXIT,
  getAutoExitConfig,
  getAutoExitEvents,
  runAutoExitSweep,
  setAutoExitConfig,
} from "@/lib/autoExit";
import { AutoExitConfig } from "@/types/features";

export async function GET() {
  try {
    const [config, events] = await Promise.all([getAutoExitConfig(), getAutoExitEvents()]);
    return ok({ config, events });
  } catch (e) {
    return fail("AUTO_EXIT_ERROR", e instanceof Error ? e.message : "Auto-exit failed", 500);
  }
}

export async function POST(request: Request) {
  let body: { config?: Partial<AutoExitConfig>; run?: boolean };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return fail("BAD_JSON", "Request body must be valid JSON.");
  }
  try {
    if (body.config) {
      const merged = { ...DEFAULT_AUTO_EXIT, ...(await getAutoExitConfig()), ...body.config };
      await setAutoExitConfig(merged);
    }
    const fired = body.run ? await runAutoExitSweep() : [];
    const config = await getAutoExitConfig();
    return ok({ config, fired });
  } catch (e) {
    return fail("AUTO_EXIT_ERROR", e instanceof Error ? e.message : "Auto-exit failed", 500);
  }
}
