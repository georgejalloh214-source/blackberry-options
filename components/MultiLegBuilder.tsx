"use client";

import { calculateMultiLegRisk } from "@/lib/multiLegRisk";
import { useMemo, useState } from "react";

export interface MultiLegOption {
  symbol: string;
  strike: number;
  expiration: string | number;
  type: string;
  bid?: number;
  ask?: number;
  delta?: number;
  theta?: number;
}

interface Leg {
  id: string;
  option: MultiLegOption;
  side: "BUY" | "SELL";
  quantity: number;
}

export function MultiLegBuilder({
  symbol,
  options,
  onTradePlaced,
}: {
  symbol: string;
  options: MultiLegOption[];
  onTradePlaced?: () => void | Promise<void>;
}) {
  const [legs, setLegs] = useState<Leg[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const summary = useMemo(() => calculateMultiLegRisk(legs), [legs]);

  const addLeg = (side: "BUY" | "SELL") => {
    const option = options[0];
    if (!option) return;
    setLegs((current) => [...current, { id: crypto.randomUUID(), option, side, quantity: 1 }]);
  };

  const submit = async () => {
    setMessage(null);
    if (legs.length < 2 || legs.some((leg) => !Number.isFinite(leg.option.bid) && !Number.isFinite(leg.option.ask))) {
      setMessage("Add at least two legs with valid prices.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/paper-trading/multi-leg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          strategy: "MULTI_LEG",
          metadata: { strategyType: "MULTI_LEG", ...summary, source: "MANUAL" },
          legs: legs.map((leg) => ({
            optionContract: {
              strike: leg.option.strike,
              expiry: String(leg.option.expiration),
              type: leg.option.type,
              bid: leg.option.bid,
              ask: leg.option.ask,
            },
            quantity: leg.quantity,
            side: leg.side,
          })),
        }),
      });
      if (!response.ok) throw new Error("Could not open multi-leg trade");
      setLegs([]);
      setMessage("Multi-leg trade opened.");
      await onTradePlaced?.();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not open multi-leg trade");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mt-4 rounded-lg border p-3" aria-labelledby="multi-leg-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="multi-leg-title" className="text-sm font-semibold">Multi-leg builder</h2>
        <div className="flex gap-2">
          <button type="button" onClick={() => addLeg("SELL")} disabled={!options.length || submitting} className="rounded-md border px-3 py-1 text-xs">Sell leg</button>
          <button type="button" onClick={() => addLeg("BUY")} disabled={!options.length || submitting} className="rounded-md border px-3 py-1 text-xs">Buy leg</button>
        </div>
      </div>
      <div className="mt-3 space-y-2">
        {legs.map((leg, index) => (
          <div key={leg.id} className="grid gap-2 rounded-md bg-muted/20 p-2 sm:grid-cols-[1fr_90px_80px_auto]">
            <label className="text-xs">Leg {index + 1}
              <select value={options.indexOf(leg.option)} onChange={(event) => setLegs((current) => current.map((item) => item.id === leg.id ? { ...item, option: options[Number(event.target.value)] } : item))} className="mt-1 block w-full rounded-md border bg-background px-2 py-1">
                {options.map((option, optionIndex) => <option key={`${option.strike}-${option.type}-${option.expiration}`} value={optionIndex}>${option.strike} {option.type} {String(option.expiration)}</option>)}
              </select>
            </label>
            <label className="text-xs">Side
              <select value={leg.side} onChange={(event) => setLegs((current) => current.map((item) => item.id === leg.id ? { ...item, side: event.target.value as "BUY" | "SELL" } : item))} className="mt-1 block w-full rounded-md border bg-background px-2 py-1"><option value="BUY">Buy</option><option value="SELL">Sell</option></select>
            </label>
            <label className="text-xs">Qty
              <input type="number" min={1} step={1} value={leg.quantity} onChange={(event) => setLegs((current) => current.map((item) => item.id === leg.id ? { ...item, quantity: Math.max(1, Number(event.target.value) || 1) } : item))} className="mt-1 block w-full rounded-md border bg-background px-2 py-1" />
            </label>
            <button type="button" onClick={() => setLegs((current) => current.filter((item) => item.id !== leg.id))} className="self-end rounded-md border px-2 py-1 text-xs text-red-400">Remove</button>
          </div>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs tabular-nums sm:grid-cols-4">
        <div>Net premium<br /><strong>{summary.netPremium.toFixed(2)}</strong></div>
        <div>Max profit<br /><strong className="text-emerald-400">${summary.maxProfit.toFixed(2)}</strong></div>
        <div>Max loss<br /><strong className="text-red-400">${summary.maxLoss.toFixed(2)}</strong></div>
        <div>Breakeven<br /><strong>{summary.breakevens.join(", ") || "-"}</strong></div>
      </div>
      {message && <p className="mt-3 text-xs text-muted-foreground">{message}</p>}
      <button type="button" onClick={submit} disabled={submitting || legs.length < 2} className="mt-3 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50">{submitting ? "Opening..." : "Open multi-leg trade"}</button>
    </section>
  );
}