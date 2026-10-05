"use client";

import type { ApiEnvelope } from "@/types";
import { useEffect, useState } from "react";

export type ApiState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; data: T }
  | { status: "unavailable" };

export type ApiStatus = ApiState<unknown>["status"];

const TIMEOUT_MS = 12_000;
const RETRY_DELAY_MS = 1_500;

async function request<T>(url: string, outer: AbortSignal): Promise<ApiState<T>> {
  const attempt = new AbortController();
  const abort = () => attempt.abort();
  outer.addEventListener("abort", abort);
  const timer = setTimeout(abort, TIMEOUT_MS);
  try {
    const response = await fetch(url, { cache: "no-store", signal: attempt.signal });
    const payload = (await response.json()) as ApiEnvelope<T>;
    return response.ok && payload.ok && payload.data !== undefined
      ? { status: "ready", data: payload.data }
      : { status: "unavailable" };
  } catch {
    return { status: "unavailable" };
  } finally {
    clearTimeout(timer);
    outer.removeEventListener("abort", abort);
  }
}

/** Retries once (cold serverless/Yahoo session); never hangs and never returns another URL's data. */
export function useApiData<T>(url: string | null): ApiState<T> {
  const [settled, setSettled] = useState<{ url: string; state: ApiState<T> } | null>(null);

  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();

    (async () => {
      let state = await request<T>(url, controller.signal);
      if (state.status !== "ready" && !controller.signal.aborted) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        if (!controller.signal.aborted) state = await request<T>(url, controller.signal);
      }
      if (!controller.signal.aborted) setSettled({ url, state });
    })();

    return () => controller.abort();
  }, [url]);

  if (!url) return { status: "idle" };
  return settled?.url === url ? settled.state : { status: "loading" };
}
