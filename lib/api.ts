import { NextResponse } from "next/server";
import { ApiEnvelope } from "@/types";
import { DATA_DELAY_MINUTES } from "@/lib/marketData";

export function ok<T>(data: T, delayMinutes: number = DATA_DELAY_MINUTES) {
  const body: ApiEnvelope<T> = {
    ok: true,
    data,
    asOf: new Date().toISOString(),
    dataDelayMinutes: delayMinutes,
  };
  return NextResponse.json(body);
}

export function fail(code: string, message: string, status = 400) {
  const body: ApiEnvelope<never> = {
    ok: false,
    error: { code, message },
    asOf: new Date().toISOString(),
    dataDelayMinutes: 0,
  };
  return NextResponse.json(body, { status });
}
